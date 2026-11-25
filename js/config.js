/* ==========================================================================
   KÖZPONTI BEÁLLÍTÁSOK – js/config.js
   ========================================================================== */

window.APP_CONFIG = {
  // 1. Szalon alapadatok (szabadon átírhatod a saját szalonod nevére)
  SALON_NAME: 'Atelier Szalon',
  SOS_PHONE_RAW: '+36702155375',
  SOS_PHONE_DISPLAY: '+36 70 215 5375',
  SOS_MULTIPLIER: 4,

  // 2. Firebase Web App konfiguráció
  FIREBASE: {
    apiKey: 'AIzaSyCWBtRZiNMzDgbRoRWa22E-FZv8CDBFEDY',
    authDomain: 'szalon-app-1d656.firebaseapp.com',
    projectId: 'szalon-app-1d656',
    storageBucket: 'szalon-app-1d656.firebasestorage.app',
    messagingSenderId: '49793984267',
    appId: '1:49793984267:web:664ce0fb23bc060888e40e'
  },

  // 3. Firebase Cloud Messaging (FCM) Web Push VAPID kulcs
  VAPID_KEY: 'BL0mlEYnHWaMz1XT0CrHRqNcI5-O-OuQiPKg8QwyaiDCd6JrwGMFTnFvV5QCmyQB4IcgM0acO4IZd-8KIx_nlz4',

  // 4. Google Apps Script Web App URL
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyJTaNMzQ5rB5NAZSHIm0QdEb0t8yNlmc8cdcu-Ey3y4gJ9Ihz1olOeuzEKvK-0Kbft/exec',

  // 5. Közös biztonsági kulcs az Apps Script push hívásokhoz
  BRIDGE_SECRET: 'At3l1er_Sz4l0n_Br1dg3_9f4e2a7c8b1d',

  // Alapértelmezett árlista (az Admin felületen bármikor szabadon szerkeszthető)
  DEFAULT_PRICING: {
    currentEffectiveDate: '2026. 01. 01.',
    upcomingEffectiveDate: '2027. 01. 01.',
    kidsNote: 'A gyerek nyírás iskolás korig ingyenes, onnantól a fenti árak érvényesek.',
    current: [
      {
        category: 'Férfi szolgáltatások',
        items: [
          { id: 'm1', name: 'Férfi hajvágás (mosással, szárítással)', price: 6500 },
          { id: 'm2', name: 'Férfi gépi átmenet (Skin Fade)', price: 7000 },
          { id: 'm3', name: 'Szakáll igazítás & kontúrozás', price: 3500 },
          { id: 'm4', name: 'Férfi hajvágás + szakáll csomag', price: 9200 }
        ]
      },
      {
        category: 'Női hajvágás & szárítás',
        items: [
          { id: 'f1', name: 'Női mosás, hajvágás, szárítás (rövid)', price: 8500 },
          { id: 'f2', name: 'Női mosás, hajvágás, szárítás (félhosszú)', price: 9800 },
          { id: 'f3', name: 'Női mosás, hajvágás, szárítás (hosszú)', price: 11500 },
          { id: 'f4', name: 'Alkalmi beszárítás / hullámosítás', price: 7500 }
        ]
      },
      {
        category: 'Festés & Melír',
        items: [
          { id: 'c1', name: 'Tőfestés + szárítás', price: 14500 },
          { id: 'c2', name: 'Teljes hajfestés (félhosszú)', price: 18500 },
          { id: 'c3', name: 'Balayage / Babylights + árnyalás', price: 34000 },
          { id: 'c4', name: 'Intenzív szerkezetépítő ápolás', price: 6500 }
        ]
      }
    ],
    upcoming: [
      {
        category: 'Férfi szolgáltatások',
        items: [
          { id: 'm1', name: 'Férfi hajvágás (mosással, szárítással)', price: 7300 },
          { id: 'm2', name: 'Férfi gépi átmenet (Skin Fade)', price: 7800 },
          { id: 'm3', name: 'Szakáll igazítás & kontúrozás', price: 4000 },
          { id: 'm4', name: 'Férfi hajvágás + szakáll csomag', price: 10200 }
        ]
      },
      {
        category: 'Női hajvágás & szárítás',
        items: [
          { id: 'f1', name: 'Női mosás, hajvágás, szárítás (rövid)', price: 9500 },
          { id: 'f2', name: 'Női mosás, hajvágás, szárítás (félhosszú)', price: 10800 },
          { id: 'f3', name: 'Női mosás, hajvágás, szárítás (hosszú)', price: 12500 },
          { id: 'f4', name: 'Alkalmi beszárítás / hullámosítás', price: 8500 }
        ]
      },
      {
        category: 'Festés & Melír',
        items: [
          { id: 'c1', name: 'Tőfestés + szárítás', price: 16000 },
          { id: 'c2', name: 'Teljes hajfestés (félhosszú)', price: 20500 },
          { id: 'c3', name: 'Balayage / Babylights + árnyalás', price: 37500 },
          { id: 'c4', name: 'Intenzív szerkezetépítő ápolás', price: 7500 }
        ]
      }
    ]
  }
};
