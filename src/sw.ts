/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
};

// Clean old caches and precache assets
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Immediately take control
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Real Web Push Notification Listener
self.addEventListener('push', (event: PushEvent) => {
  let payload: any = {
    title: 'FitBudget Alert',
    body: 'Scheduled fitness activity reminder',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'fitbudget-reminder',
    vibrate: [200, 100, 200, 100, 400],
    requireInteraction: true,
    data: {
      url: '/',
      reminderType: 'workout',
      priority: 'high',
    },
    actions: [
      { action: 'start_workout', title: '🚀 Start Workout' },
      { action: 'snooze_10', title: '⏱️ Remind in 10m' },
      { action: 'skip_today', title: '❌ Skip Today' },
    ],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  // Ensure interactive actions are attached for workout reminders
  if (payload.data?.reminderType === 'workout' || payload.isWorkoutAlarm) {
    payload.actions = [
      { action: 'start_workout', title: '🚀 Start Workout' },
      { action: 'snooze_10', title: '⏱️ Remind in 10m' },
      { action: 'skip_today', title: '❌ Skip Today' },
    ];
    payload.requireInteraction = true;
    payload.vibrate = payload.vibrate || [300, 100, 300, 100, 500];
  }

  const notificationPromise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || `fitbudget-${Date.now()}`,
    data: payload.data,
    vibrate: payload.vibrate,
    requireInteraction: payload.requireInteraction ?? true,
    actions: payload.actions,
  } as any);

  // Notify active client windows so in-app alarm sounds or banners can trigger
  const notifyClientsPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        payload,
      });
    }
  });

  event.waitUntil(Promise.all([notificationPromise, notifyClientsPromise]));
});

// Interactive Notification Action Handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const reminderId = data.reminderId || '';

  const urlToOpen = new URL(data.url || '/', self.location.origin);
  if (action === 'start_workout') {
    urlToOpen.searchParams.set('action', 'start_workout');
    if (reminderId) urlToOpen.searchParams.set('reminderId', reminderId);
  } else if (action?.startsWith('snooze')) {
    const minutes = action === 'snooze_5' ? 5 : action === 'snooze_15' ? 15 : 10;
    urlToOpen.searchParams.set('action', 'snooze');
    urlToOpen.searchParams.set('minutes', String(minutes));
    if (reminderId) urlToOpen.searchParams.set('reminderId', reminderId);
  } else if (action === 'skip_today') {
    urlToOpen.searchParams.set('action', 'skip_today');
    if (reminderId) urlToOpen.searchParams.set('reminderId', reminderId);
  }

  // Notify backend API if possible (e.g. for snoozing or skipping in background)
  const apiCallPromise = (async () => {
    try {
      if (action?.startsWith('snooze') && reminderId) {
        const minutes = action === 'snooze_5' ? 5 : action === 'snooze_15' ? 15 : 10;
        await fetch(`/api/reminders/${encodeURIComponent(reminderId)}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delayMinutes: minutes }),
        });
      } else if (action === 'skip_today' && reminderId) {
        await fetch(`/api/reminders/${encodeURIComponent(reminderId)}/skip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminderId }),
        });
      }

      // Log interaction in history
      await fetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderId,
          title: event.notification.title,
          action: action || 'opened',
          timestamp: new Date().toISOString(),
          status: action === 'skip_today' ? 'skipped' : action?.startsWith('snooze') ? 'snoozed' : 'delivered',
        }),
      });
    } catch {
      // Offline fallback
    }
  })();

  // Focus existing open window or open new window
  const windowPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ('focus' in client) {
        client.postMessage({
          type: 'NOTIFICATION_ACTION_CLICKED',
          action: action || 'default',
          reminderId,
          data,
        });
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(urlToOpen.href);
    }
  });

  event.waitUntil(Promise.all([apiCallPromise, windowPromise]));
});

// Handle notification dismissal by user
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  const data = event.notification.data || {};
  event.waitUntil(
    fetch('/api/notifications/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reminderId: data.reminderId || null,
        title: event.notification.title,
        action: 'dismissed',
        timestamp: new Date().toISOString(),
        status: 'dismissed',
      }),
    }).catch(() => {})
  );
});

// Client message listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
