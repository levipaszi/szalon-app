/* ==========================================================================
   Firebase Cloud Messaging Háttér Service Worker (firebase-messaging-sw.js)
   FONTOS: A telepítéskor illeszd be ugyanazokat a Firebase adatokat ide is,
   amiket a js/config.js fájlba beírtál!
   ========================================================================== */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const FIREBASE_SW_CONFIG = {
  apiKey: 'AIzaSyCWBtRZiNMzDgbRoRWa22E-FZv8CDBFEDY',
  authDomain: 'szalon-app-1d656.firebaseapp.com',
  projectId: 'szalon-app-1d656',
  storageBucket: 'szalon-app-1d656.firebasestorage.app',
  messagingSenderId: '49793984267',
  appId: '1:49793984267:web:664ce0fb23bc060888e40e'
};

const isConfigured =
  FIREBASE_SW_CONFIG.apiKey &&
  !FIREBASE_SW_CONFIG.apiKey.startsWith('IDE_ILLESZD');

if (isConfigured) {
  firebase.initializeApp(FIREBASE_SW_CONFIG);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title =
      (payload.notification && payload.notification.title) ||
      (payload.data && payload.data.title) ||
      'Forfex VIP';
    const body =
      (payload.notification && payload.notification.body) ||
      (payload.data && payload.data.body) ||
      'Új értesítésed érkezett a szalontól.';
    const targetUrl = (payload.data && payload.data.url) || './index.html';
    const icon =
      targetUrl.includes('admin')
        ? './icons/admin-192.png'
        : './icons/guest-192.png';

    const isUrgent = /sos|késés|villám|változott|1 óra/i.test(`${title} ${body}`);
    const tag = /sos/i.test(title)
      ? 'atelier-sos'
      : /késés/i.test(title)
        ? 'atelier-late'
        : /villám/i.test(title)
          ? 'atelier-flash'
          : 'atelier-notice';

    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      tag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: isUrgent ? [320, 120, 320, 120, 500] : [200, 100, 200],
      actions: [{ action: 'open', title: 'Megnyitás most' }],
      data: { url: targetUrl }
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
