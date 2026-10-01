import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { INITIAL_PREFERENCES, INITIAL_REMINDERS } from './src/data/defaultSchedule';
import { DeviceSubscription, NotificationLog, ReminderItem, UserPreferences } from './src/types/notifications';

const app = express();
const PORT = 3000;
const DATA_FILE = path.resolve('.fitbudget-data.json');
const VAPID_FILE = path.resolve('.fitbudget-vapid.json');

app.use(express.json({ limit: '10mb' }));

// 1. Initialize or load VAPID Keys for Web Push
let vapidKeys: { publicKey: string; privateKey: string };
if (fs.existsSync(VAPID_FILE)) {
  try {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
  } catch {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
  }
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
}

webpush.setVapidDetails(
  'mailto:alerts@fitbudget.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// 2. Persistent Storage (File-backed with Supabase schema support)
interface AppData {
  preferences: UserPreferences;
  reminders: ReminderItem[];
  devices: DeviceSubscription[];
  logs: NotificationLog[];
}

let appData: AppData = {
  preferences: { ...INITIAL_PREFERENCES },
  reminders: [...INITIAL_REMINDERS],
  devices: [],
  logs: [
    {
      id: 'log-welcome',
      title: 'FitBudget Notification Engine Activated',
      message: 'Background scheduler initialized with Asia/Manila timezone.',
      category: 'summary',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      read: true,
      actionTaken: 'initialized',
    },
  ],
};

if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    appData = {
      preferences: { ...INITIAL_PREFERENCES, ...parsed.preferences },
      reminders: Array.isArray(parsed.reminders) && parsed.reminders.length > 0 ? parsed.reminders : [...INITIAL_REMINDERS],
      devices: Array.isArray(parsed.devices) ? parsed.devices : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : appData.logs,
    };
  } catch (err) {
    console.error('Error loading data file:', err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2));
  } catch (e) {
    console.error('Failed to write data file:', e);
  }
}

// Helper: Get local date and time in user's configured timezone
function getZonedTime(timeZone: string) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    const getVal = (t: string) => parts.find((p) => p.type === t)?.value || '';

    const hour = parseInt(getVal('hour'), 10);
    const minute = parseInt(getVal('minute'), 10);
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const weekdayStr = getVal('weekday').toLowerCase();
    const weekdayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const dayOfWeek = weekdayMap[weekdayStr] ?? now.getDay();

    return { timeStr, dayOfWeek, hour, minute, now };
  } catch {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    return {
      timeStr: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      dayOfWeek: now.getDay(),
      hour,
      minute,
      now,
    };
  }
}

// Check quiet hours
function isInQuietHours(hour: number, minute: number, startStr: string, endStr: string): boolean {
  const currentMins = hour * 60 + minute;
  const [sH, sM] = startStr.split(':').map(Number);
  const [eH, eM] = endStr.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;

  if (startMins <= endMins) {
    return currentMins >= startMins && currentMins < endMins;
  }
  // Crosses midnight (e.g. 23:00 to 06:00)
  return currentMins >= startMins || currentMins < endMins;
}

// 3. Push Delivery to Registered Devices
async function broadcastPushNotification(payload: {
  title: string;
  body: string;
  category: string;
  reminderId?: string;
  isAlarm?: boolean;
  priority?: string;
  soundPreset?: string;
  durationMinutes?: number;
}) {
  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    isWorkoutAlarm: payload.isAlarm,
    vibrate: payload.isAlarm ? [400, 200, 400, 200, 600] : [200, 100, 200],
    requireInteraction: payload.isAlarm ?? true,
    data: {
      reminderId: payload.reminderId,
      reminderType: payload.category,
      priority: payload.priority,
      sound: payload.soundPreset,
      durationMinutes: payload.durationMinutes,
      url: `/?action=open_reminder&id=${payload.reminderId || ''}`,
    },
    actions: [
      { action: 'start_workout', title: '🚀 Start Workout' },
      { action: 'snooze_10', title: '⏱️ Remind in 10m' },
      { action: 'skip_today', title: '❌ Skip Today' },
    ],
  });

  const deadEndpoints: string[] = [];

  for (const device of appData.devices) {
    if (!device.enabled || !device.subscription) continue;

    try {
      await webpush.sendNotification(device.subscription, notificationPayload);
    } catch (err: any) {
      console.warn(`Failed push to ${device.deviceName}:`, err?.statusCode || err?.message);
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        // Expired subscription
        deadEndpoints.push(device.endpoint);
      }
    }
  }

  if (deadEndpoints.length > 0) {
    appData.devices = appData.devices.filter((d) => !deadEndpoints.includes(d.endpoint));
    saveData();
  }
}

// 4. Reliable Server-Side Scheduling Loop (runs every 15 seconds)
let lastCheckedMinute = '';

setInterval(async () => {
  try {
    const { timeStr, dayOfWeek, hour, minute, now } = getZonedTime(appData.preferences.timeZone);

    // Run once per minute for scheduled calendar reminders
    if (lastCheckedMinute !== timeStr) {
      lastCheckedMinute = timeStr;

      const isQuietTime = appData.preferences.quietHoursEnabled &&
        isInQuietHours(hour, minute, appData.preferences.quietHoursStart, appData.preferences.quietHoursEnd);

      for (const reminder of appData.reminders) {
        if (!reminder.enabled) continue;
        if (!appData.preferences.categories[reminder.category]) continue;

        // Quiet hours protection for sleep & workout
        if (isQuietTime && reminder.category !== 'sleep') {
          continue;
        }

        // Check if completed or skipped today
        if (reminder.completedToday || reminder.skippedToday) {
          continue;
        }

        // Check regular scheduled time
        const matchesDay = reminder.daysOfWeek.includes(dayOfWeek);
        const matchesTime = reminder.time === timeStr;

        // Check snoozed status
        let isSnoozeDue = false;
        if (reminder.snoozedUntil) {
          const snoozeDate = new Date(reminder.snoozedUntil);
          if (snoozeDate <= now) {
            isSnoozeDue = true;
          }
        }

        if ((matchesDay && matchesTime) || isSnoozeDue) {
          // Trigger reminder
          reminder.lastTriggered = now.toISOString();
          if (isSnoozeDue) {
            reminder.snoozedUntil = null;
          }

          // Add to log
          const newLog: NotificationLog = {
            id: `log-${Date.now()}-${reminder.id}`,
            reminderId: reminder.id,
            title: reminder.title,
            message: reminder.message,
            category: reminder.category,
            timestamp: now.toISOString(),
            status: 'delivered',
            read: false,
            device: 'All Registered Devices',
          };
          appData.logs.unshift(newLog);
          if (appData.logs.length > 100) appData.logs.pop();
          saveData();

          // Dispatch Web Push to background devices
          await broadcastPushNotification({
            title: reminder.title,
            body: reminder.message,
            category: reminder.category,
            reminderId: reminder.id,
            isAlarm: reminder.isAlarm,
            priority: reminder.priority,
            soundPreset: reminder.soundPreset,
            durationMinutes: reminder.durationMinutes,
          });
        }
      }
    }
  } catch (scheduleErr) {
    console.error('Error in scheduler ticker:', scheduleErr);
  }
}, 15000);

// ==========================================
// REST API ROUTES
// ==========================================

// VAPID Public Key
app.get('/api/push/vapid-public-key', (req: Request, res: Response) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Device Subscription
app.post('/api/push/subscribe', (req: Request, res: Response) => {
  const { subscription, deviceName, platform, browser } = req.body;
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: 'Valid subscription object is required.' });
    return;
  }

  const existingIdx = appData.devices.findIndex((d) => d.endpoint === subscription.endpoint);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    appData.devices[existingIdx] = {
      ...appData.devices[existingIdx],
      deviceName: deviceName || appData.devices[existingIdx].deviceName,
      platform: platform || appData.devices[existingIdx].platform,
      browser: browser || appData.devices[existingIdx].browser,
      subscription,
      lastActive: now,
      enabled: true,
    };
  } else {
    appData.devices.push({
      id: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      deviceName: deviceName || `Device (${platform || 'Browser'})`,
      platform: platform || 'desktop',
      browser: browser || 'Unknown',
      endpoint: subscription.endpoint,
      subscription,
      lastActive: now,
      createdAt: now,
      enabled: true,
    });
  }

  saveData();
  res.json({ success: true, count: appData.devices.length, devices: appData.devices });
});

app.post('/api/push/unsubscribe', (req: Request, res: Response) => {
  const { endpoint } = req.body;
  if (endpoint) {
    appData.devices = appData.devices.filter((d) => d.endpoint !== endpoint);
    saveData();
  }
  res.json({ success: true, count: appData.devices.length });
});

// Test Push to Registered Devices
app.post('/api/push/test', async (req: Request, res: Response) => {
  const { title, body, category = 'workout', isAlarm = true, soundPreset = 'pulse-energy' } = req.body;

  const testTitle = title || 'FitBudget High-Priority Alert';
  const testBody = body || 'Ku, your 30-minute evening walk is scheduled. Ready to get moving?';

  await broadcastPushNotification({
    title: testTitle,
    body: testBody,
    category,
    isAlarm,
    soundPreset,
    durationMinutes: 30,
    reminderId: 'test-alarm-id',
  });

  const newLog: NotificationLog = {
    id: `log-test-${Date.now()}`,
    title: testTitle,
    message: testBody,
    category: category as any,
    timestamp: new Date().toISOString(),
    status: 'delivered',
    read: false,
    actionTaken: 'manual_test',
    device: 'Push Broadcaster',
  };
  appData.logs.unshift(newLog);
  saveData();

  res.json({ success: true, sentToDevices: appData.devices.length });
});

// Reminders CRUD & Actions
app.get('/api/reminders', (req: Request, res: Response) => {
  res.json({ reminders: appData.reminders });
});

app.post('/api/reminders', (req: Request, res: Response) => {
  const reminder: ReminderItem = {
    ...req.body,
    id: req.body.id || `rem-${Date.now()}`,
  };
  appData.reminders.push(reminder);
  saveData();
  res.json({ success: true, reminder });
});

app.put('/api/reminders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = appData.reminders.findIndex((r) => r.id === id);
  if (idx >= 0) {
    appData.reminders[idx] = { ...appData.reminders[idx], ...req.body };
    saveData();
    res.json({ success: true, reminder: appData.reminders[idx] });
  } else {
    res.status(404).json({ error: 'Reminder not found' });
  }
});

app.delete('/api/reminders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  appData.reminders = appData.reminders.filter((r) => r.id !== id);
  saveData();
  res.json({ success: true });
});

// Snooze interactive action
app.post('/api/reminders/:id/snooze', (req: Request, res: Response) => {
  const { id } = req.params;
  const delayMinutes = Number(req.body.delayMinutes) || 10;
  const idx = appData.reminders.findIndex((r) => r.id === id);

  const snoozeDate = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  if (idx >= 0) {
    appData.reminders[idx].snoozedUntil = snoozeDate;
  }

  const log: NotificationLog = {
    id: `log-snooze-${Date.now()}`,
    reminderId: id,
    title: idx >= 0 ? appData.reminders[idx].title : 'Reminder Snoozed',
    message: `Reminder snoozed for ${delayMinutes} minutes (rescheduled for ${new Date(snoozeDate).toLocaleTimeString()}).`,
    category: idx >= 0 ? appData.reminders[idx].category : 'workout',
    timestamp: new Date().toISOString(),
    status: 'snoozed',
    read: true,
    actionTaken: `snoozed_${delayMinutes}m`,
  };
  appData.logs.unshift(log);
  saveData();

  res.json({ success: true, snoozedUntil: snoozeDate, delayMinutes });
});

// Start & Complete workout interactive action
app.post('/api/reminders/:id/complete', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = appData.reminders.findIndex((r) => r.id === id);

  if (idx >= 0) {
    appData.reminders[idx].completedToday = true;
    appData.reminders[idx].snoozedUntil = null;
  }

  const log: NotificationLog = {
    id: `log-complete-${Date.now()}`,
    reminderId: id,
    title: idx >= 0 ? appData.reminders[idx].title : 'Workout Completed',
    message: 'Workout marked completed. Obsolete reminders cancelled for today.',
    category: idx >= 0 ? appData.reminders[idx].category : 'workout',
    timestamp: new Date().toISOString(),
    status: 'completed',
    read: true,
    actionTaken: 'completed_today',
  };
  appData.logs.unshift(log);
  saveData();

  res.json({ success: true, message: 'Workout completed and unnecessary reminders cancelled.' });
});

// Skip today interactive action
app.post('/api/reminders/:id/skip', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = appData.reminders.findIndex((r) => r.id === id);

  if (idx >= 0) {
    appData.reminders[idx].skippedToday = true;
    appData.reminders[idx].snoozedUntil = null;
  }

  const log: NotificationLog = {
    id: `log-skip-${Date.now()}`,
    reminderId: id,
    title: idx >= 0 ? appData.reminders[idx].title : 'Reminder Skipped',
    message: 'Activity skipped for today. No further alerts will be sent.',
    category: idx >= 0 ? appData.reminders[idx].category : 'workout',
    timestamp: new Date().toISOString(),
    status: 'skipped',
    read: true,
    actionTaken: 'skipped_today',
  };
  appData.logs.unshift(log);
  saveData();

  res.json({ success: true, message: 'Skipped for today.' });
});

// Reset day (for testing & daily rollover)
app.post('/api/reminders/reset-day', (req: Request, res: Response) => {
  for (const r of appData.reminders) {
    r.completedToday = false;
    r.skippedToday = false;
    r.snoozedUntil = null;
  }
  saveData();
  res.json({ success: true, reminders: appData.reminders });
});

// Preferences & Sound Settings
app.get('/api/preferences', (req: Request, res: Response) => {
  res.json({ preferences: appData.preferences });
});

app.put('/api/preferences', (req: Request, res: Response) => {
  appData.preferences = { ...appData.preferences, ...req.body };
  saveData();
  res.json({ success: true, preferences: appData.preferences });
});

// Devices list
app.get('/api/devices', (req: Request, res: Response) => {
  res.json({ devices: appData.devices });
});

app.delete('/api/devices/:id', (req: Request, res: Response) => {
  appData.devices = appData.devices.filter((d) => d.id !== req.params.id);
  saveData();
  res.json({ success: true, devices: appData.devices });
});

// Notification History & Center
app.get('/api/notifications/history', (req: Request, res: Response) => {
  res.json({ logs: appData.logs });
});

app.post('/api/notifications/log', (req: Request, res: Response) => {
  const log: NotificationLog = {
    id: req.body.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    reminderId: req.body.reminderId,
    title: req.body.title || 'Notification',
    message: req.body.message || '',
    category: req.body.category || 'workout',
    timestamp: req.body.timestamp || new Date().toISOString(),
    status: req.body.status || 'delivered',
    read: req.body.read ?? false,
    actionTaken: req.body.action || req.body.actionTaken,
    device: req.body.device,
  };
  appData.logs.unshift(log);
  if (appData.logs.length > 200) appData.logs.pop();
  saveData();
  res.json({ success: true, log });
});

app.post('/api/notifications/mark-all-read', (req: Request, res: Response) => {
  for (const log of appData.logs) {
    log.read = true;
  }
  saveData();
  res.json({ success: true });
});

app.delete('/api/notifications/history', (req: Request, res: Response) => {
  appData.logs = [];
  saveData();
  res.json({ success: true });
});

// Supabase Schema Generator Endpoint (Section 11.9)
app.get('/api/supabase/schema', (req: Request, res: Response) => {
  const sql = `
-- ========================================================
-- FitBudget Supabase Schema: Module 11 Notification System
-- ========================================================

-- 1. Devices Table (Multiple registered push endpoints)
CREATE TABLE IF NOT EXISTS public.fitbudget_devices (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'android' | 'ios' | 'desktop' | 'tablet'
  browser TEXT,
  endpoint TEXT UNIQUE NOT NULL,
  subscription JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. User Preferences & Sound Configurations
CREATE TABLE IF NOT EXISTS public.fitbudget_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT DEFAULT 'Ku',
  timezone TEXT DEFAULT 'Asia/Manila',
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TEXT DEFAULT '23:00',
  quiet_hours_end TEXT DEFAULT '06:00',
  categories JSONB NOT NULL,
  sounds JSONB NOT NULL, -- custom sound assignments per reminder type
  hydration_interval_minutes INT DEFAULT 60,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Scheduled Reminders Table
CREATE TABLE IF NOT EXISTS public.fitbudget_reminders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  time TEXT NOT NULL, -- "19:00"
  days_of_week INT[] NOT NULL,
  duration_minutes INT DEFAULT 30,
  message TEXT,
  enabled BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'high',
  sound_preset TEXT DEFAULT 'pulse-energy',
  vibrate BOOLEAN DEFAULT true,
  repeat_interval_minutes INT DEFAULT 10,
  is_alarm BOOLEAN DEFAULT true,
  completed_today BOOLEAN DEFAULT false,
  skipped_today BOOLEAN DEFAULT false,
  snoozed_until TIMESTAMP WITH TIME ZONE,
  last_triggered TIMESTAMP WITH TIME ZONE,
  target_metric TEXT
);

-- 4. Notification History & Logs
CREATE TABLE IF NOT EXISTS public.fitbudget_notification_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL, -- 'delivered' | 'dismissed' | 'snoozed' | 'completed' | 'skipped' | 'failed'
  action_taken TEXT,
  read BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS) policies
ALTER TABLE public.fitbudget_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitbudget_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitbudget_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitbudget_notification_logs ENABLE ROW LEVEL SECURITY;
`;
  res.type('text/plain').send(sql);
});

// ==========================================
// STATIC ASSETS & VITE INTEGRATION
// ==========================================
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FitBudget] Notification Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
