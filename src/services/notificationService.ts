import { DeviceSubscription, NotificationLog, ReminderCategory, ReminderItem, SoundPreset, StorageMode, UserPreferences } from '../types/notifications';
import { soundEngine } from './soundEngine';
import { localDatabase, PhoneStorageStats } from './localDatabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface AlarmIntentResult {
  supported: boolean;
  platform: 'android' | 'ios' | 'desktop';
  method: 'android_intent' | 'ios_calendar' | 'web_alarm' | 'unsupported';
  message: string;
}

class NotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private currentSubscription: PushSubscription | null = null;

  constructor() {
    this.initServiceWorker();
  }

  // Detect platform
  public getPlatform(): 'android' | 'ios' | 'desktop' | 'tablet' {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'android';
    if (/ipad|tablet/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'tablet';
    if (/iphone|ipod/.test(ua)) return 'ios';
    return 'desktop';
  }

  public getBrowserName(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox/')) return 'Firefox';
    return 'Browser';
  }

  // Check current permission status
  public getPermissionStatus(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // Initialize service worker reference
  public async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        this.serviceWorkerRegistration = reg;
        this.currentSubscription = await reg.pushManager.getSubscription();
        return reg;
      } catch (err) {
        console.warn('Service worker not ready yet:', err);
      }
    }
    return null;
  }

  // 11.2 Request notification permission
  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      throw new Error('Notifications are not supported in this browser.');
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await this.registerDevice();
    }
    return permission;
  }

  // 11.1 & 11.9 Register device push subscription with backend
  public async registerDevice(customDeviceName?: string): Promise<PushSubscription | null> {
    try {
      const reg = await this.initServiceWorker();
      if (!reg) return null;

      // Get VAPID public key
      const keyRes = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error('VAPID public key missing from server');

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      this.currentSubscription = sub;

      const platform = this.getPlatform();
      const browser = this.getBrowserName();
      const defaultName = `${platform.toUpperCase()} (${browser})`;

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          deviceName: customDeviceName || defaultName,
          platform,
          browser,
        }),
      });

      return sub;
    } catch (err) {
      console.warn('Push subscription failed (expected in environments without push service):', err);
      return null;
    }
  }

  // Unsubscribe device
  public async unsubscribeDevice(): Promise<boolean> {
    try {
      if (this.currentSubscription) {
        const endpoint = this.currentSubscription.endpoint;
        await this.currentSubscription.unsubscribe();
        this.currentSubscription = null;
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      return true;
    } catch (e) {
      console.error('Error unsubscribing:', e);
      return false;
    }
  }

  // Send local or push notification
  public async showLocalNotification(
    title: string,
    options: {
      body: string;
      category?: ReminderCategory;
      isAlarm?: boolean;
      priority?: 'normal' | 'high' | 'silent';
      soundPreset?: SoundPreset;
      reminderId?: string;
    }
  ): Promise<void> {
    // Play sound if not silent
    if (options.priority !== 'silent' && options.soundPreset) {
      soundEngine.playSound(options.soundPreset);
    }

    if (options.isAlarm) {
      soundEngine.triggerVibration([400, 200, 400, 200, 600]);
    } else {
      soundEngine.triggerVibration([200, 100, 200]);
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const reg = await this.initServiceWorker();
      const actions = options.isAlarm
        ? [
            { action: 'start_workout', title: '🚀 Start Workout' },
            { action: 'snooze_10', title: '⏱️ Remind in 10m' },
            { action: 'skip_today', title: '❌ Skip Today' },
          ]
        : [];

      if (reg) {
        await reg.showNotification(title, {
          body: options.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `fitbudget-${options.reminderId || Date.now()}`,
          requireInteraction: options.isAlarm ?? false,
          actions,
          data: {
            reminderId: options.reminderId,
            reminderType: options.category || 'workout',
            isAlarm: options.isAlarm,
          },
        } as any);
      } else {
        new Notification(title, {
          body: options.body,
          icon: '/pwa-192x192.png',
        });
      }
    }

    // Log to local phone database and backend history
    const logItem: NotificationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      reminderId: options.reminderId,
      title,
      message: options.body,
      category: options.category || 'workout',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      device: `${this.getPlatform()} (${this.getBrowserName()})`,
      read: false,
    };

    await localDatabase.addLog(logItem);

    if (this.getStorageMode() === 'cloud_synced') {
      try {
        await fetch('/api/notifications/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logItem),
        });
      } catch {}
    }
  }

  // 11.5 Device Alarm Integration ("Open in Device Alarm")
  public openInDeviceAlarm(reminder: { title: string; time: string; durationMinutes?: number }): AlarmIntentResult {
    const platform = this.getPlatform();
    const [hours, minutes] = reminder.time.split(':').map(Number);

    if (platform === 'android') {
      try {
        // Official Android Clock Alarm Intent URI
        // Can open Google Clock or Android Clock app directly to set alarm
        const message = encodeURIComponent(`FitBudget: ${reminder.title}`);
        const intentUrl = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.HOUR=${hours};i.android.intent.extra.MINUTES=${minutes};S.android.intent.extra.MESSAGE=${message};B.android.intent.extra.SKIP_UI=false;end`;

        window.location.href = intentUrl;
        return {
          supported: true,
          platform: 'android',
          method: 'android_intent',
          message: 'Opening Android Clock to configure native audible alarm.',
        };
      } catch (e) {
        return {
          supported: false,
          platform: 'android',
          method: 'android_intent',
          message: 'Android intent blocked by browser security. Using in-app high-priority alarm.',
        };
      }
    }

    if (platform === 'ios') {
      // iOS doesn't allow websites to directly write to the iOS Clock app due to Apple sandbox.
      // Supported Apple approach: Generate high-priority .ics calendar event with audio alarm trigger
      // OR open Apple Reminders / Shortcuts scheme if available.
      try {
        this.downloadIcsAlarm(reminder.title, reminder.time, reminder.durationMinutes || 30);
        return {
          supported: true,
          platform: 'ios',
          method: 'ios_calendar',
          message: 'Calendar alert downloaded with audible alarms for iOS. Tap "Add to Calendar" to enable native iOS notification.',
        };
      } catch (e) {
        return {
          supported: false,
          platform: 'ios',
          method: 'ios_calendar',
          message: 'Failed to generate iOS alert. Using in-app workout alarm.',
        };
      }
    }

    // Desktop
    this.downloadIcsAlarm(reminder.title, reminder.time, reminder.durationMinutes || 30);
    return {
      supported: true,
      platform: 'desktop',
      method: 'ios_calendar',
      message: 'Downloaded standard iCal alarm event compatible with Google Calendar, Outlook, and Apple Calendar.',
    };
  }

  // Generate .ics calendar file with VALARM sound trigger
  private downloadIcsAlarm(title: string, time: string, durationMinutes: number) {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatIcsDate = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FitBudget//Workout Alarm//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:fitbudget-${Date.now()}@fitbudget.app`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:FitBudget: ${title}`,
      `DESCRIPTION:FitBudget Workout Alarm scheduled for ${time}. Time to sweat!`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:AUDIO',
      'SOUND:Alarm',
      'ATTACH;VALUE=URI:Basso',
      'DESCRIPTION:FitBudget Workout Alarm',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT5M',
      'ACTION:DISPLAY',
      'DESCRIPTION:5 min reminder: FitBudget Workout',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `FitBudget-${title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Storage Mode Controls
  public getStorageMode(): StorageMode {
    return localDatabase.getStorageMode();
  }

  public setStorageMode(mode: StorageMode): void {
    localDatabase.setStorageMode(mode);
  }

  public async getStorageStats(): Promise<PhoneStorageStats> {
    return localDatabase.getStorageStats();
  }

  public async requestPersistentStorage(): Promise<boolean> {
    return localDatabase.requestPersistentStorage();
  }

  public async exportDatabaseToJson(): Promise<string> {
    return localDatabase.exportDatabaseToJson();
  }

  public async downloadDatabaseFile(): Promise<string> {
    return localDatabase.downloadDatabaseFile();
  }

  public async importDatabaseFromJson(jsonString: string): Promise<{ success: boolean; reminderCount: number; message: string }> {
    const result = await localDatabase.importDatabaseFromJson(jsonString);
    if (result.success && this.getStorageMode() === 'cloud_synced') {
      try {
        const rems = await localDatabase.getReminders();
        const prefs = await localDatabase.getPreferences();
        await fetch('/api/supabase/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminders: rems, preferences: prefs }),
        });
      } catch {}
    }
    return result;
  }

  public async resetDatabaseToDefaults(): Promise<void> {
    await localDatabase.resetToDefaults();
  }

  // 11.4 & 11.9 Synchronize reminders from local phone database or backend API
  public async synchronizeReminders(): Promise<ReminderItem[]> {
    const mode = this.getStorageMode();

    if (mode === 'local_only') {
      return await localDatabase.getReminders();
    }

    try {
      const res = await fetch('/api/reminders');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const reminders = data.reminders || [];
      // Cache locally into phone IndexedDB
      if (reminders.length > 0) {
        await localDatabase.saveReminders(reminders);
      }
      return reminders;
    } catch {
      // Offline fallback to local IndexedDB
      return await localDatabase.getReminders();
    }
  }

  public async scheduleReminder(reminder: Partial<ReminderItem>): Promise<ReminderItem> {
    const newItem: ReminderItem = {
      id: reminder.id || `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: reminder.title || 'Scheduled Activity',
      category: reminder.category || 'workout',
      time: reminder.time || '18:00',
      daysOfWeek: reminder.daysOfWeek || [1, 2, 3, 4, 5],
      durationMinutes: reminder.durationMinutes || 30,
      message: reminder.message || 'Time for your fitness session!',
      enabled: reminder.enabled ?? true,
      priority: reminder.priority || 'high',
      soundPreset: reminder.soundPreset || 'pulse-energy',
      vibrate: reminder.vibrate ?? true,
      repeatIntervalMinutes: reminder.repeatIntervalMinutes || 10,
      isAlarm: reminder.isAlarm ?? true,
      completedToday: false,
      skippedToday: false,
    };

    // Always persist to local device storage
    await localDatabase.saveReminder(newItem);

    if (this.getStorageMode() === 'cloud_synced') {
      try {
        const res = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem),
        });
        const data = await res.json();
        return data.reminder || newItem;
      } catch (e) {
        console.warn('Backend offline, saved locally to phone storage:', e);
      }
    }

    return newItem;
  }

  public async updateReminder(id: string, updates: Partial<ReminderItem>): Promise<ReminderItem> {
    const list = await localDatabase.getReminders();
    const existing = list.find((r) => r.id === id);
    const updated = { ...(existing || { id }), ...updates } as ReminderItem;

    // Save to local device storage
    await localDatabase.saveReminder(updated);

    if (this.getStorageMode() === 'cloud_synced') {
      try {
        const res = await fetch(`/api/reminders/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        return data.reminder || updated;
      } catch (e) {
        console.warn('Backend offline, updated locally on phone:', e);
      }
    }

    return updated;
  }

  public async cancelReminder(id: string): Promise<boolean> {
    await localDatabase.deleteReminder(id);

    if (this.getStorageMode() === 'cloud_synced') {
      try {
        const res = await fetch(`/api/reminders/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        return res.ok;
      } catch {
        return true;
      }
    }
    return true;
  }

  public async snoozeReminder(id: string, delayMinutes: number): Promise<string> {
    const snoozedUntil = new Date(Date.now() + delayMinutes * 60000).toISOString();
    await this.updateReminder(id, { snoozedUntil });

    if (this.getStorageMode() === 'cloud_synced') {
      try {
        const res = await fetch(`/api/reminders/${encodeURIComponent(id)}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delayMinutes }),
        });
        const data = await res.json();
        return data.snoozedUntil || snoozedUntil;
      } catch {}
    }

    return snoozedUntil;
  }

  public async completeWorkout(id: string): Promise<void> {
    await this.updateReminder(id, { completedToday: true, snoozedUntil: null });

    if (this.getStorageMode() === 'cloud_synced') {
      try {
        await fetch(`/api/reminders/${encodeURIComponent(id)}/complete`, {
          method: 'POST',
        });
      } catch {}
    }
  }

  public async skipToday(id: string): Promise<void> {
    await this.updateReminder(id, { skippedToday: true, snoozedUntil: null });

    if (this.getStorageMode() === 'cloud_synced') {
      try {
        await fetch(`/api/reminders/${encodeURIComponent(id)}/skip`, {
          method: 'POST',
        });
      } catch {}
    }
  }

  public async getPreferences(): Promise<UserPreferences> {
    if (this.getStorageMode() === 'local_only') {
      return await localDatabase.getPreferences();
    }

    try {
      const res = await fetch('/api/preferences');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      const prefs = data.preferences;
      if (prefs) {
        await localDatabase.savePreferences(prefs);
        return prefs;
      }
      return await localDatabase.getPreferences();
    } catch {
      return await localDatabase.getPreferences();
    }
  }

  public async updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await localDatabase.getPreferences();
    const updated = { ...current, ...prefs };
    await localDatabase.savePreferences(updated);

    if (prefs.storageMode) {
      this.setStorageMode(prefs.storageMode);
    }

    if (this.getStorageMode() === 'cloud_synced') {
      try {
        const res = await fetch('/api/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prefs),
        });
        const data = await res.json();
        return data.preferences || updated;
      } catch {}
    }

    return updated;
  }

  public async getDevices(): Promise<DeviceSubscription[]> {
    if (this.getStorageMode() === 'local_only') {
      return [];
    }
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      return data.devices || [];
    } catch {
      return [];
    }
  }

  public async getNotificationHistory(): Promise<NotificationLog[]> {
    const localLogs = await localDatabase.getLogs();
    if (this.getStorageMode() === 'local_only') {
      return localLogs;
    }
    try {
      const res = await fetch('/api/notifications/history');
      const data = await res.json();
      const serverLogs = data.logs || [];
      return serverLogs.length > 0 ? serverLogs : localLogs;
    } catch {
      return localLogs;
    }
  }

  public async clearHistory(): Promise<void> {
    await localDatabase.clearLogs();
    if (this.getStorageMode() === 'cloud_synced') {
      try {
        await fetch('/api/notifications/history', { method: 'DELETE' });
      } catch {}
    }
  }

  public async markAllRead(): Promise<void> {
    await localDatabase.markAllLogsRead();
    if (this.getStorageMode() === 'cloud_synced') {
      try {
        await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      } catch {}
    }
  }

  public async testPush(payload: { title?: string; body?: string; isAlarm?: boolean; soundPreset?: SoundPreset }) {
    if (this.getStorageMode() === 'local_only') {
      // Simulate/trigger immediate local notification without needing remote cloud server
      await this.showLocalNotification(payload.title || 'FitBudget Local Workout Alarm', {
        body: payload.body || 'Local reminder fired directly from your phone database.',
        isAlarm: payload.isAlarm ?? true,
        soundPreset: payload.soundPreset || 'pulse-energy',
      });
      return { success: true, message: 'Local test alarm fired directly on this phone.' };
    }

    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
}

export const notificationService = new NotificationService();
