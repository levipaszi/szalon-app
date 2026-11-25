/* ==========================================================================
   KÖZPONTI BEÁLLÍTÁSOK – js/config.js
   Üzembe helyezéskor csak az alábbi kijelölt sorokba kell beillesztened
   a saját Firebase és Google Apps Script kulcsaidat!
   ========================================================================== */

window.APP_CONFIG = {
  // 1. Szalon alapadatok (szabadon átírhatod a saját szalonod nevére)
  SALON_NAME: 'Atelier Szalon',
  SOS_PHONE_RAW: '+36702155375',
  SOS_PHONE_DISPLAY: '+36 70 215 5375',
  SOS_MULTIPLIER: 4,

  // 2. Firebase Web App konfiguráció
  // (Firebase Console -> Project Settings -> Your apps -> Web app -> firebaseConfig)
  FIREBASE: {
    apiKey: 'IDE_ILLESZD_A_FIREBASE_API_KEYT',
    authDomain: 'IDE_ILLESZD_AZ_AUTH_DOMAINT',
    projectId: 'IDE_ILLESZD_A_PROJECT_ID_T',
    storageBucket: 'IDE_ILLESZD_A_STORAGE_BUCKETET',
    messagingSenderId: 'IDE_ILLESZD_A_MESSAGING_SENDER_ID_T',
    appId: 'IDE_ILLESZD_AZ_APP_ID_T'
  },

  // 3. Firebase Cloud Messaging (FCM) Web Push VAPID kulcs
  // (Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates -> Key pair)
  VAPID_KEY: 'IDE_ILLESZD_A_VAPID_KULCSOT',

  // 4. Google Apps Script Web App URL (Deploy -> Web app URL)
  APPS_SCRIPT_URL: 'IDE_ILLESZD_AZ_APPS_SCRIPT_WEB_APP_URL_T',

  // 5. Közös biztonsági kulcs az Apps Script push hívásokhoz (ugyanezt írd a Code.gs-be is!)
  BRIDGE_SECRET: 'CSERELD_LE_EGY_SAJAT_TITKOS_JELSZORA_2026',

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
