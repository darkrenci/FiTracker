import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  Volume2,
  Database,
  ShieldAlert,
  Layers,
  Sparkles,
  Flame,
  Radio,
  Clock,
  Play,
  CheckCircle,
  HelpCircle,
  Settings,
  Share2,
  HardDrive
} from 'lucide-react';
import {
  DeviceSubscription,
  NotificationLog,
  ReminderItem,
  SoundPreset,
  UserPreferences
} from './types/notifications';
import { INITIAL_PREFERENCES, INITIAL_REMINDERS } from './data/defaultSchedule';
import { notificationService } from './services/notificationService';
import { soundEngine } from './services/soundEngine';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { WorkoutAlarmModal } from './components/WorkoutAlarmModal';
import { ActiveWorkoutTracker } from './components/ActiveWorkoutTracker';
import { OnboardingPermissionModal } from './components/OnboardingPermissionModal';
import { SoundSettingsPanel } from './components/SoundSettingsPanel';
import { ScheduleManager } from './components/ScheduleManager';
import { NotificationCenter } from './components/NotificationCenter';
import { DeviceSyncManager } from './components/DeviceSyncManager';
import { PhoneDatabaseManager } from './components/PhoneDatabaseManager';
import { ReliabilityTestingSuite } from './components/ReliabilityTestingSuite';
import { NativeAppArchitecture } from './components/NativeAppArchitecture';

export default function App() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'sounds' | 'history' | 'devices' | 'phone_db' | 'reliability' | 'native'>('schedule');
  
  // Data State
  const [reminders, setReminders] = useState<ReminderItem[]>([...INITIAL_REMINDERS]);
  const [preferences, setPreferences] = useState<UserPreferences>({ ...INITIAL_PREFERENCES });
  const [devices, setDevices] = useState<DeviceSubscription[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  // Modals
  const [activeAlarmReminder, setActiveAlarmReminder] = useState<ReminderItem | null>(null);
  const [activeWorkoutSession, setActiveWorkoutSession] = useState<ReminderItem | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bannerAlert, setBannerAlert] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // Initialize data on mount
  useEffect(() => {
    // Check permission status
    setPermissionStatus(notificationService.getPermissionStatus());

    // Show onboarding if permission is default and user hasn't seen it
    const hasSeenOnboarding = localStorage.getItem('fitbudget_onboarding_completed');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Load from server
    fetchData();

    // Listen to Service Worker postMessages
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload, action, reminderId } = event.data || {};
        if (type === 'PUSH_NOTIFICATION_RECEIVED') {
          // Play in-app alarm chime if alarm
          if (payload?.isWorkoutAlarm) {
            const found = reminders.find((r) => r.id === payload.data?.reminderId);
            if (found) {
              setActiveAlarmReminder(found);
            }
          }
          fetchData();
        } else if (type === 'NOTIFICATION_ACTION_CLICKED') {
          if (action === 'start_workout') {
            const found = reminders.find((r) => r.id === reminderId);
            if (found) {
              setActiveWorkoutSession(found);
            }
          }
          fetchData();
        }
      });
    }

    // Check URL search params for deep linked actions from service worker clicks
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const reminderId = urlParams.get('reminderId') || urlParams.get('id');

    if (action === 'start_workout' && reminderId) {
      const found = reminders.find((r) => r.id === reminderId);
      if (found) setActiveWorkoutSession(found);
    } else if (action === 'open_reminder' && reminderId) {
      const found = reminders.find((r) => r.id === reminderId);
      if (found) setActiveAlarmReminder(found);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [remList, prefs, devList, logList] = await Promise.all([
        notificationService.synchronizeReminders().catch(() => INITIAL_REMINDERS),
        notificationService.getPreferences().catch(() => INITIAL_PREFERENCES),
        notificationService.getDevices().catch(() => []),
        notificationService.getNotificationHistory().catch(() => []),
      ]);

      if (remList && remList.length > 0) setReminders(remList);
      if (prefs) setPreferences(prefs);
      if (devList) setDevices(devList);
      if (logList) setLogs(logList);
    } catch (e) {
      console.warn('Backend fetch fallback to defaults:', e);
    }
  };

  const showBanner = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setBannerAlert({ message, type });
    setTimeout(() => setBannerAlert(null), 4000);
  };

  // Actions
  const handleUpdateReminder = async (id: string, updates: Partial<ReminderItem>) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    await notificationService.updateReminder(id, updates);
    showBanner('Reminder schedule updated.');
  };

  const handleAddReminder = async (newItem: Partial<ReminderItem>) => {
    const created = await notificationService.scheduleReminder(newItem);
    setReminders((prev) => [...prev, created]);
    showBanner('New reminder added to schedule.');
  };

  const handleDeleteReminder = async (id: string) => {
    await notificationService.cancelReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    showBanner('Reminder removed.');
  };

  const handleUpdatePreferences = async (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
    await notificationService.updatePreferences(updates);
    showBanner('Preferences synchronized with Supabase.');
  };

  // Alarm modal handlers
  const handleStartWorkout = (reminder: ReminderItem) => {
    setActiveAlarmReminder(null);
    setActiveWorkoutSession(reminder);
  };

  const handleSnooze = async (reminder: ReminderItem, minutes: number) => {
    setActiveAlarmReminder(null);
    await notificationService.snoozeReminder(reminder.id, minutes);
    await fetchData();
    showBanner(`Reminder snoozed for ${minutes} minutes.`, 'info');
  };

  const handleSkipToday = async (reminder: ReminderItem) => {
    setActiveAlarmReminder(null);
    await notificationService.skipToday(reminder.id);
    await fetchData();
    showBanner('Activity skipped for today.', 'warn');
  };

  const handleFinishWorkout = async (reminder: ReminderItem, durationSeconds: number) => {
    setActiveWorkoutSession(null);
    await notificationService.completeWorkout(reminder.id);
    await fetchData();
    showBanner(`Workout completed! Great job. (${Math.round(durationSeconds / 60)} mins logged)`, 'success');
  };

  // Quick Test Alarm Trigger
  const triggerQuickTestAlarm = () => {
    const firstWorkout = reminders.find((r) => r.isAlarm) || reminders[0];
    setActiveAlarmReminder(firstWorkout);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
      <OfflineIndicator />

      {/* Top Banner Alert */}
      {bannerAlert && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur-md border animate-in slide-in-from-top duration-300 ${
            bannerAlert.type === 'success'
              ? 'bg-emerald-500/90 text-slate-950 border-emerald-400'
              : bannerAlert.type === 'warn'
              ? 'bg-rose-500/90 text-white border-rose-400'
              : 'bg-cyan-500/90 text-slate-950 border-cyan-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{bannerAlert.message}</span>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Module Tag */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 shadow-md shadow-emerald-500/20 text-slate-950">
              <Bell className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">FitBudget</h1>
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                  MODULE 11
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Smart Notification, Workout Alarm & Reminder System
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Test Alarm Button */}
            <button
              onClick={triggerQuickTestAlarm}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition"
              title="Test high-priority workout alarm immediately"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-300" />
              <span className="hidden sm:inline">Test Workout Alarm</span>
              <span className="sm:hidden">Alarm</span>
            </button>

            {/* Storage Mode Quick Switch Button */}
            <button
              onClick={() => setActiveTab('phone_db')}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                preferences.storageMode === 'local_only'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                  : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40'
              }`}
              title="Click to view Local Phone Database, storage usage, and backups"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {preferences.storageMode === 'local_only' ? 'Phone Local DB' : 'Cloud Synced'}
              </span>
              <span className="md:hidden">DB</span>
            </button>

            {/* Notification Permission Indicator */}
            <button
              onClick={() => setShowOnboarding(true)}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                permissionStatus === 'granted'
                  ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-950/40 text-amber-300'
              }`}
              title="Click to manage notification permissions"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="capitalize hidden md:inline">{permissionStatus}</span>
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton onOpenPhoneDatabase={() => setActiveTab('phone_db')} />
          </div>
        </div>

        {/* Primary Sub-Navigation Bar */}
        <div className="border-t border-slate-900 bg-slate-950/90 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-1 py-1.5">
            {[
              { id: 'schedule', label: '📅 Schedule & Alarms', icon: Calendar },
              { id: 'sounds', label: '🔊 Custom Sounds', icon: Volume2 },
              { id: 'history', label: `🔔 History (${logs.filter((l) => !l.read).length})`, icon: Bell },
              { id: 'phone_db', label: '💾 Phone Database & Download', icon: HardDrive },
              { id: 'devices', label: `📱 Multi-Device (${devices.length})`, icon: Database },
              { id: 'reliability', label: '🧪 10-Condition Test', icon: ShieldAlert },
              { id: 'native', label: '🏗️ Native Architecture', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'schedule' && (
          <ScheduleManager
            reminders={reminders}
            preferences={preferences}
            onUpdateReminder={handleUpdateReminder}
            onAddReminder={handleAddReminder}
            onDeleteReminder={handleDeleteReminder}
            onTriggerAlarmModal={(rem) => setActiveAlarmReminder(rem)}
            onUpdatePreferences={handleUpdatePreferences}
            onNavigateToPhoneDb={() => setActiveTab('phone_db')}
          />
        )}

        {activeTab === 'sounds' && (
          <SoundSettingsPanel
            sounds={preferences.sounds}
            onUpdateSounds={(updated) =>
              handleUpdatePreferences({
                sounds: { ...preferences.sounds, ...updated },
              })
            }
          />
        )}

        {activeTab === 'history' && (
          <NotificationCenter
            logs={logs}
            upcomingReminders={reminders.filter((r) => r.enabled)}
            onClearHistory={async () => {
              await notificationService.clearHistory();
              setLogs([]);
              showBanner('Notification center history cleared.');
            }}
            onMarkAllRead={async () => {
              await notificationService.markAllRead();
              setLogs((prev) => prev.map((l) => ({ ...l, read: true })));
            }}
            onTriggerAlarmModal={(rem) => setActiveAlarmReminder(rem)}
          />
        )}

        {activeTab === 'phone_db' && (
          <PhoneDatabaseManager
            preferences={preferences}
            reminders={reminders}
            onUpdatePreferences={handleUpdatePreferences}
            onRefreshData={fetchData}
          />
        )}

        {activeTab === 'devices' && (
          <DeviceSyncManager
            devices={devices}
            preferences={preferences}
            onRefreshDevices={fetchData}
            onUpdatePreferences={handleUpdatePreferences}
            onNavigateToPhoneDb={() => setActiveTab('phone_db')}
            onDeleteDevice={async (id) => {
              await fetch(`/api/devices/${id}`, { method: 'DELETE' });
              fetchData();
              showBanner('Device subscription removed.');
            }}
          />
        )}

        {activeTab === 'reliability' && <ReliabilityTestingSuite />}

        {activeTab === 'native' && <NativeAppArchitecture />}
      </main>

      {/* Active Workout Alarm Modal (High Priority) */}
      {activeAlarmReminder && (
        <WorkoutAlarmModal
          reminder={activeAlarmReminder}
          onStartWorkout={handleStartWorkout}
          onSnooze={handleSnooze}
          onSkipToday={handleSkipToday}
          onDismiss={() => setActiveAlarmReminder(null)}
          soundPreset={activeAlarmReminder.soundPreset || preferences.sounds.workout}
        />
      )}

      {/* Active Workout Session Tracker */}
      {activeWorkoutSession && (
        <ActiveWorkoutTracker
          reminder={activeWorkoutSession}
          onFinishWorkout={handleFinishWorkout}
          onCancel={() => setActiveWorkoutSession(null)}
        />
      )}

      {/* Onboarding Permission Modal */}
      {showOnboarding && (
        <OnboardingPermissionModal
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          onComplete={() => {
            localStorage.setItem('fitbudget_onboarding_completed', 'true');
            setShowOnboarding(false);
            setPermissionStatus(notificationService.getPermissionStatus());
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold text-white">FitBudget</span>
            <span>•</span>
            <span>Module 11 Notification Engine</span>
            <span>•</span>
            <span>PWA & Service Worker Active</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Timezone: <strong className="text-emerald-400 font-mono">{preferences.timeZone}</strong></span>
            <span>•</span>
            <button
              onClick={() => setShowOnboarding(true)}
              className="hover:text-slate-300 underline underline-offset-2"
            >
              Permission Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
