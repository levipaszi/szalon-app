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
      'Atelier Szalon';
    const body =
      (payload.notification && payload.notification.body) ||
      (payload.data && payload.data.body) ||
      'Új értesítésed érkezett a szalontól.';
    const targetUrl = (payload.data && payload.data.url) || './index.html';
    const icon =
      targetUrl.includes('admin')
        ? './icons/admin-192.png'
        : './icons/guest-192.png';

    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      vibrate: [180, 80, 180],
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
