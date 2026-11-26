/* ==========================================================================
   Atelier Szalon – Egységes PWA + Firebase Cloud Messaging Service Worker
   Egyetlen Service Worker kezeli az offline gyorsítótárat ÉS a háttérben
   érkező Push értesítéseket, így soha nem írják felül egymást!
   ========================================================================== */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const CACHE_NAME = 'forfex-vip-v1.7.1';
const APP_SHELL = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './admin-manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/firebase-service.js',
  './js/pwa-ux.js',
  './js/haircare-data.js',
  './js/qrcode-gen.js',
  './js/guest.js',
  './js/admin.js',
  './icons/guest-icon.svg',
  './icons/admin-icon.svg',
  './icons/guest-192.png',
  './icons/guest-512.png',
  './icons/admin-192.png',
  './icons/admin-512.png'
];

const FIREBASE_SW_CONFIG = {
  apiKey: 'AIzaSyCWBtRZiNMzDgbRoRWa22E-FZv8CDBFEDY',
  authDomain: 'szalon-app-1d656.firebaseapp.com',
  projectId: 'szalon-app-1d656',
  storageBucket: 'szalon-app-1d656.firebasestorage.app',
  messagingSenderId: '49793984267',
  appId: '1:49793984267:web:664ce0fb23bc060888e40e'
};

// ---------------- HÁTTÉR PUSH (FCM) KEZELÉS ----------------
if (typeof firebase !== 'undefined' && FIREBASE_SW_CONFIG.apiKey) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_SW_CONFIG);
    }
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      // Ha a szerver csak data mezőt küld (vagy saját kézbesítés kell), itt jelenítjük meg
      if (payload.notification) return;

      const data = payload.data || {};
      const title = data.title || 'Forfex VIP';
      const body = data.body || 'Új értesítésed érkezett!';
      const targetUrl = data.url || 'https://levipaszi.github.io/szalon-app/index.html';
      const icon = targetUrl.includes('admin')
        ? './icons/admin-192.png'
        : './icons/guest-192.png';

      const isUrgent = /sos|késés|villám|változott|1 óra|teszt/i.test(`${title} ${body}`);
      const tag = /sos/i.test(title)
        ? 'atelier-sos'
        : /késés/i.test(title)
          ? 'atelier-late'
          : /villám/i.test(title)
            ? 'atelier-flash'
            : 'atelier-notice-' + Date.now();

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
  } catch (_) {}
}

// ---------------- OFFLINE PWA GYORSÍTÓTÁR ----------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (
    url.pathname.endsWith('manifest.json') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---------------- KATTINTÁS A HÁTTÉR ÉRTESÍTÉSRE ----------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.url) ||
    './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
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
