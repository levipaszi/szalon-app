/* ==========================================================================
   KÖZPONTI BEÁLLÍTÁSOK – js/config.js
   Üzembe helyezéskor csak az alábbi kijelölt sorokba kell beillesztened
   a saját Firebase és Google Apps Script kulcsaidat!
   ========================================================================== */

window.APP_CONFIG = {
  // 1. Szalon alapadatok (szabadon átírhatod a saját szalonod nevére)
  SALON_NAME: 'Forfex VIP',
  SOS_PHONE_RAW: '+36702155375',
  SOS_PHONE_DISPLAY: '+36 70 215 5375',
  SOS_MULTIPLIER: 4,

  // 2. Firebase Web App konfiguráció
  // (Firebase Console -> Project Settings -> Your apps -> Web app -> firebaseConfig)
  FIREBASE: {
    apiKey: 'AIzaSyCWBtRZiNMzDgbRoRWa22E-FZv8CDBFEDY',
    authDomain: 'szalon-app-1d656.firebaseapp.com',
    projectId: 'szalon-app-1d656',
    storageBucket: 'szalon-app-1d656.firebasestorage.app',
    messagingSenderId: '49793984267',
    appId: '1:49793984267:web:664ce0fb23bc060888e40e'
  },

  // 3. Firebase Cloud Messaging (FCM) Web Push VAPID kulcs
  // (Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates -> Key pair)
  VAPID_KEY: 'BL0mlEYnHWaMz1XT0CrHRqNcI5-O-OuQiPKg8QwyaiDCd6JrwGMFTnFvV5QCmyQB4IcgM0acO4IZd-8KIx_nlz4',

  // 4. Google Apps Script Web App URL (Deploy -> Web app URL)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyJTaNMzQ5rB5NAZSHIm0QdEb0t8yNlmc8cdcu-Ey3y4gJ9Ihz1olOeuzEKvK-0Kbft/exec',

  // 5. Közös biztonsági kulcs az Apps Script push hívásokhoz (ugyanezt írd a Code.gs-be is!)
  BRIDGE_SECRET: 'At3l1er_Sz4l0n_Br1dg3_9f4e2a7c8b1d',

  // Alapértelmezett árlista (az Admin felületen bármikor szabadon szerkeszthető)
  DEFAULT_PRICING: {
    pricingVersion: 2,
    currentEffectiveDate: '2026. 03. 01.',
    upcomingEffectiveDate: '2027. 01. 01.',
    kidsNote: 'A gyerek nyírás iskolás korig ingyenes, onnantól a fenti árak érvényesek.',
    vatNote: 'Az árak forintban értendők és az ÁFA-t tartalmazzák (alanyi adómentes).',
    current: [
      {
        category: 'Hajnyírás',
        items: [
          { id: 'h1', name: 'Férfi hajnyírás', price: 4000 },
          { id: 'h2', name: 'Női hajnyírás', price: 6800 },
          { id: 'h3', name: 'Női hajnyírás (mosás nélkül)', price: 6300 }
        ]
      },
      {
        category: 'Hajfestés (a felhasznált festék mennyisége alapján)',
        items: [
          { id: 'f1', name: 'Negyed doboz esetén', price: 6000 },
          { id: 'f2', name: 'Fél doboz esetén', price: 6900 },
          { id: 'f3', name: 'Háromnegyed doboz esetén', price: 7700 },
          { id: 'f4', name: 'Egész doboz esetén', price: 8500 }
        ]
      }
    ],
    upcoming: [
      {
        category: 'Hajnyírás',
        items: [
          { id: 'h1', name: 'Férfi hajnyírás', price: 4800 },
          { id: 'h2', name: 'Női hajnyírás', price: 7600 },
          { id: 'h3', name: 'Női hajnyírás (mosás nélkül)', price: 7100 }
        ]
      },
      {
        category: 'Hajfestés (a felhasznált festék mennyisége alapján)',
        items: [
          { id: 'f1', name: 'Negyed doboz esetén', price: 6800 },
          { id: 'f2', name: 'Fél doboz esetén', price: 7700 },
          { id: 'f3', name: 'Háromnegyed doboz esetén', price: 8500 },
          { id: 'f4', name: 'Egész doboz esetén', price: 9300 }
        ]
      }
    ]
  }
};
