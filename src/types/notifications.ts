export type ReminderCategory =
  | 'workout'
  | 'walking'
  | 'running'
  | 'meal'
  | 'hydration'
  | 'sleep'
  | 'recovery'
  | 'summary';

export type NotificationPriority = 'normal' | 'high' | 'silent';

export type SoundPreset =
  | 'pulse-energy'
  | 'digital-beep'
  | 'zen-chime'
  | 'water-drop'
  | 'dining-bell'
  | 'military-bugle'
  | 'radar-ping'
  | 'custom';

export interface SoundSettings {
  workout: SoundPreset;
  meal: SoundPreset;
  hydration: SoundPreset;
  sleep: SoundPreset;
  recovery: SoundPreset;
  customSoundDataUrl?: string;
  volume: number; // 0 to 1
  vibrateEnabled: boolean;
}

export interface ReminderItem {
  id: string;
  title: string;
  category: ReminderCategory;
  time: string; // "19:00" (24h)
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  durationMinutes?: number;
  message: string;
  enabled: boolean;
  priority: NotificationPriority;
  soundPreset: SoundPreset;
  vibrate: boolean;
  repeatIntervalMinutes?: number; // 0 = once, 5, 10, 15, 30
  isAlarm: boolean; // Triggers full Workout Alarm interface
  completedToday?: boolean;
  skippedToday?: boolean;
  snoozedUntil?: string | null; // ISO Date String
  lastTriggered?: string | null;
  targetMetric?: string; // e.g. "30 min | 4,000 steps"
}

export type StorageMode = 'local_only' | 'cloud_synced';

export interface UserPreferences {
  userName: string;
  timeZone: string;
  storageMode: StorageMode; // 'local_only' (phone data only, zero cloud) or 'cloud_synced'
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "23:00"
  quietHoursEnd: string; // "06:00"
  categories: Record<ReminderCategory, boolean>;
  sounds: SoundSettings;
  hydrationIntervalMinutes: number; // e.g. 60 min
  hydrationStartTime: string; // "08:00"
  hydrationEndTime: string; // "22:00"
  supabaseSyncEnabled: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface DeviceSubscription {
  id: string;
  deviceName: string;
  platform: 'android' | 'ios' | 'desktop' | 'tablet' | 'unknown';
  browser: string;
  endpoint: string;
  subscription: any;
  lastActive: string;
  createdAt: string;
  enabled: boolean;
}

export interface NotificationLog {
  id: string;
  reminderId?: string;
  title: string;
  message: string;
  category: ReminderCategory;
  timestamp: string;
  status: 'delivered' | 'dismissed' | 'snoozed' | 'completed' | 'skipped' | 'failed';
  actionTaken?: string;
  read: boolean;
  device?: string;
  errorMessage?: string;
}

export interface TestResultItem {
  id: number;
  condition: string;
  delivered: boolean | 'partial' | 'n/a';
  audible: boolean | 'partial' | 'n/a';
  vibrating: boolean | 'partial' | 'n/a';
  lockScreen: boolean | 'partial' | 'n/a';
  osRestricted: boolean;
  explanation: string;
  testedAt?: string;
}
