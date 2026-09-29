import { ReminderItem, UserPreferences, NotificationLog, StorageMode } from '../types/notifications';
import { INITIAL_PREFERENCES, INITIAL_REMINDERS } from '../data/defaultSchedule';

const DB_NAME = 'fitbudget_local_db';
const DB_VERSION = 1;
const STORE_REMINDERS = 'reminders';
const STORE_PREFERENCES = 'preferences';
const STORE_LOGS = 'logs';

export interface PhoneStorageStats {
  mode: StorageMode;
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
  isPersisted: boolean;
  reminderCount: number;
  logCount: number;
  lastBackupDate?: string;
}

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private currentMode: StorageMode = 'local_only';

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('fitbudget_storage_mode') as StorageMode;
      if (savedMode === 'local_only' || savedMode === 'cloud_synced') {
        this.currentMode = savedMode;
      } else {
        // Default to local_only for on-device privacy as requested
        this.currentMode = 'local_only';
        localStorage.setItem('fitbudget_storage_mode', 'local_only');
      }
    }
  }

  // Open / upgrade IndexedDB
  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not supported on this device.'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_REMINDERS)) {
            db.createObjectStore(STORE_REMINDERS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_PREFERENCES)) {
            db.createObjectStore(STORE_PREFERENCES, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_LOGS)) {
            const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  public getStorageMode(): StorageMode {
    return this.currentMode;
  }

  public setStorageMode(mode: StorageMode): void {
    this.currentMode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fitbudget_storage_mode', mode);
    }
  }

  // Request Android / iOS persistent storage
  public async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        return isPersisted;
      } catch {
        return false;
      }
    }
    return false;
  }

  public async isStoragePersisted(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      try {
        return await navigator.storage.persisted();
      } catch {
        return false;
      }
    }
    return false;
  }

  // Get Phone Storage Usage Stats
  public async getStorageStats(): Promise<PhoneStorageStats> {
    let usageBytes = 0;
    let quotaBytes = 0;
    let isPersisted = false;

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
      } catch {}
    }

    isPersisted = await this.isStoragePersisted();
    const reminders = await this.getReminders();
    const logs = await this.getLogs();
    const lastBackupDate = typeof localStorage !== 'undefined' ? localStorage.getItem('fitbudget_last_backup_date') || undefined : undefined;

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      mode: this.currentMode,
      usageBytes,
      quotaBytes,
      usageFormatted: formatBytes(usageBytes),
      quotaFormatted: quotaBytes > 0 ? formatBytes(quotaBytes) : 'Device Managed',
      percentUsed: quotaBytes > 0 ? parseFloat(((usageBytes / quotaBytes) * 100).toFixed(2)) : 0,
      isPersisted,
      reminderCount: reminders.length,
      logCount: logs.length,
      lastBackupDate,
    };
  }

  // --- REMINDERS CRUD ---
  public async getReminders(): Promise<ReminderItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_REMINDERS, 'readonly');
        const store = transaction.objectStore(STORE_REMINDERS);
        const req = store.getAll();
        req.onsuccess = () => {
          const res = req.result as ReminderItem[];
          if (res && res.length > 0) {
            resolve(res);
          } else {
            // Check fallback in localStorage
            const localFallback = localStorage.getItem('fitbudget_local_reminders');
            if (localFallback) {
              try {
                const parsed = JSON.parse(localFallback);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  this.saveReminders(parsed);
                  resolve(parsed);
                  return;
                }
              } catch {}
            }
            // Seed defaults into local database
            this.saveReminders(INITIAL_REMINDERS);
            resolve([...INITIAL_REMINDERS]);
          }
        };
        req.onerror = () => {
          const fallback = localStorage.getItem('fitbudget_local_reminders');
          resolve(fallback ? JSON.parse(fallback) : [...INITIAL_REMINDERS]);
        };
      });
    } catch {
      const fallback = typeof localStorage !== 'undefined' ? localStorage.getItem('fitbudget_local_reminders') : null;
      return fallback ? JSON.parse(fallback) : [...INITIAL_REMINDERS];
    }
  }

  public async saveReminders(items: ReminderItem[]): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fitbudget_local_reminders', JSON.stringify(items));
      }
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_REMINDERS, 'readwrite');
        const store = tx.objectStore(STORE_REMINDERS);
        // Clear and rewrite all
        store.clear();
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Fallback saveReminders to localStorage:', e);
    }
  }

  public async saveReminder(item: ReminderItem): Promise<void> {
    const list = await this.getReminders();
    const idx = list.findIndex((r) => r.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    await this.saveReminders(list);
  }

  public async deleteReminder(id: string): Promise<void> {
    const list = await this.getReminders();
    const filtered = list.filter((r) => r.id !== id);
    await this.saveReminders(filtered);
  }

  // --- PREFERENCES CRUD ---
  public async getPreferences(): Promise<UserPreferences> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_PREFERENCES, 'readonly');
        const store = tx.objectStore(STORE_PREFERENCES);
        const req = store.get('user_preferences');
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve({ ...INITIAL_PREFERENCES, ...req.result.data, storageMode: this.currentMode });
          } else {
            const fallback = localStorage.getItem('fitbudget_local_preferences');
            if (fallback) {
              resolve({ ...INITIAL_PREFERENCES, ...JSON.parse(fallback), storageMode: this.currentMode });
            } else {
              this.savePreferences(INITIAL_PREFERENCES);
              resolve({ ...INITIAL_PREFERENCES, storageMode: this.currentMode });
            }
          }
        };
        req.onerror = () => {
          resolve({ ...INITIAL_PREFERENCES, storageMode: this.currentMode });
        };
      });
    } catch {
      return { ...INITIAL_PREFERENCES, storageMode: this.currentMode };
    }
  }

  public async savePreferences(prefs: UserPreferences): Promise<void> {
    const fullPrefs = { ...prefs, storageMode: this.currentMode };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fitbudget_local_preferences', JSON.stringify(fullPrefs));
    }
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PREFERENCES, 'readwrite');
        const store = tx.objectStore(STORE_PREFERENCES);
        store.put({ key: 'user_preferences', data: fullPrefs });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Fallback savePreferences to localStorage:', e);
    }
  }

  // --- NOTIFICATION LOGS CRUD ---
  public async getLogs(): Promise<NotificationLog[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_LOGS, 'readonly');
        const store = tx.objectStore(STORE_LOGS);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as NotificationLog[]) || [];
          // sort descending by timestamp
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      const fallback = typeof localStorage !== 'undefined' ? localStorage.getItem('fitbudget_local_logs') : null;
      return fallback ? JSON.parse(fallback) : [];
    }
  }

  public async addLog(log: NotificationLog): Promise<void> {
    const list = await this.getLogs();
    const updated = [log, ...list.slice(0, 99)]; // Keep latest 100 on phone
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fitbudget_local_logs', JSON.stringify(updated));
    }
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_LOGS, 'readwrite');
      const store = tx.objectStore(STORE_LOGS);
      store.put(log);
    } catch {}
  }

  public async clearLogs(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('fitbudget_local_logs');
    }
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_LOGS, 'readwrite');
      const store = tx.objectStore(STORE_LOGS);
      store.clear();
    } catch {}
  }

  public async markAllLogsRead(): Promise<void> {
    const list = await this.getLogs();
    const updated = list.map((l) => ({ ...l, read: true }));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fitbudget_local_logs', JSON.stringify(updated));
    }
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_LOGS, 'readwrite');
      const store = tx.objectStore(STORE_LOGS);
      for (const item of updated) {
        store.put(item);
      }
    } catch {}
  }

  // --- EXPORT & DOWNLOAD DATABASE TO PHONE ---
  public async exportDatabaseToJson(): Promise<string> {
    const reminders = await this.getReminders();
    const preferences = await this.getPreferences();
    const logs = await this.getLogs();

    const exportPayload = {
      app: 'FitBudget',
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'mobile',
      storageMode: this.currentMode,
      database: {
        reminders,
        preferences,
        logs,
      },
    };

    return JSON.stringify(exportPayload, null, 2);
  }

  // Triggers immediate file download into phone's Downloads or Files folder
  public async downloadDatabaseFile(): Promise<string> {
    const jsonStr = await this.exportDatabaseToJson();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `fitbudget-phone-backup-${dateStr}.json`;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fitbudget_last_backup_date', now.toISOString());
    }

    return fileName;
  }

  // --- IMPORT & RESTORE DATABASE FROM PHONE FILE ---
  public async importDatabaseFromJson(jsonString: string): Promise<{ success: boolean; reminderCount: number; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.database) {
        throw new Error('Invalid FitBudget database backup format.');
      }

      const { reminders, preferences, logs } = parsed.database;

      if (Array.isArray(reminders)) {
        await this.saveReminders(reminders);
      }

      if (preferences && typeof preferences === 'object') {
        await this.savePreferences({ ...INITIAL_PREFERENCES, ...preferences });
      }

      if (Array.isArray(logs)) {
        for (const log of logs) {
          if (log.id && log.title) {
            await this.addLog(log);
          }
        }
      }

      return {
        success: true,
        reminderCount: Array.isArray(reminders) ? reminders.length : 0,
        message: `Successfully restored ${reminders?.length || 0} reminders and preferences from phone backup!`,
      };
    } catch (err: any) {
      return {
        success: false,
        reminderCount: 0,
        message: `Failed to restore database: ${err.message || 'Corrupt or incompatible JSON file.'}`,
      };
    }
  }

  // --- RESET DATABASE TO FACTORY DEFAULTS ---
  public async resetToDefaults(): Promise<void> {
    await this.saveReminders([...INITIAL_REMINDERS]);
    await this.savePreferences({ ...INITIAL_PREFERENCES, storageMode: this.currentMode });
    await this.clearLogs();
  }
}

export const localDatabase = new LocalDatabase();
