# Telepítési és Üzembe Helyezési Útmutató – Atelier Szalon PWA

Kövesd az alábbi 4 lépést sorrendben, és ~15–20 perc alatt teljesen ingyenesen, stabilan fog működni a szalon alkalmazásod!

---

## 1. Lépés: Fájlok feltöltése GitHub Pages-re (Ingyenes, HTTPS tárhely)

1. Hozz létre egy ingyenes fiókot a [GitHub.com](https://github.com/) oldalon (ha még nincs).
2. Kattints a jobb felső sarokban a **+ -> New repository** gombra:
   - **Repository name:** pl. `szalon-app`
   - Legyen **Public** (a GitHub Pages ingyenes csomagjához ez kell).
   - Kattints a **Create repository** gombra.
3. Kattints a **"uploading an existing file"** linkre, és húzd be a `szalon-pwa` mappa **összes** fájlját és almappáját (`index.html`, `admin.html`, `manifest.json`, `admin-manifest.json`, `sw.js`, `firebase-messaging-sw.js`, `css/`, `js/`, `icons/`).
   *(A `gas/Code.gs` fájlt nem kötelező GitHubra feltölteni, azt a 3. lépésben a Google Apps Scriptbe fogod bemásolni.)*
4. Kattints a **Commit changes** gombra.
5. Menj a repository **Settings -> Pages** menüpontjába:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main`, mappa: `/ (root)` -> **Save**.
6. 1–2 perc múlva megjelenik a kész, biztonságos HTTPS webcímed:
   - **Vendég app:** `https://FELHASZNALONEVED.github.io/szalon-app/index.html`
   - **Admin app:** `https://FELHASZNALONEVED.github.io/szalon-app/admin.html`

---

## 2. Lépés: Ingyenes Firebase projekt (Firestore + Push értesítések)

1. Nyisd meg a [Firebase Console](https://console.firebase.google.com/) oldalt Google-fiókoddal -> **Create a project** (pl. `atelier-szalon`, Google Analytics kikapcsolható).
2. **Firestore adatbázis aktiválása:**
   - Bal menü: **Build -> Firestore Database -> Create database**.
   - Válaszd az európai szervert (pl. `eur3` vagy `europe-west3`) -> **Start in production mode** -> **Create**.
   - Kattints a **Rules** fülre, és másold be a `firestore.rules` fájl tartalmát, majd kattints a **Publish** gombra.
3. **Web App kulcsok lekérése:**
   - Bal felső fogaskerék -> **Project settings -> General** -> görgess a **Your apps** részhez -> kattints a **Web (`</>`)** ikonra -> adj nevet (pl. `Szalon PWA`) -> **Register app**.
   - A megjelenő `firebaseConfig` objektumból másold ki a 6 értéket (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`), és illeszd be:
     - **`js/config.js` fájl 17–22. sorába** (`FIREBASE: { ... }`)
     - **`firebase-messaging-sw.js` fájl 11–16. sorába** (`FIREBASE_SW_CONFIG = { ... }`)
4. **Push értesítés VAPID kulcs lekérése:**
   - **Project settings -> Cloud Messaging** fül -> görgess a **Web configuration -> Web Push certificates** részhez -> kattints a **Generate key pair** gombra.
   - Másold ki a kulcsot, és illeszd be a **`js/config.js` 27. sorába** (`VAPID_KEY: '...'`).
5. **Service Account kulcs a Google Apps Script hídhoz:**
   - **Project settings -> Service accounts** fül -> kattints a **Generate new private key** gombra (letöltődik egy `.json` fájl – ezt SOHA ne töltsd fel GitHubra!).
   - Nyisd meg a JSON fájlt Jegyzettömbbel: innen kell majd a `client_email` és a `private_key` a 3. lépéshez.

---

## 3. Lépés: Google Apps Script híd (`gas/Code.gs`) és óránkénti időzítő

1. Nyisd meg a [script.google.com](https://script.google.com/) oldalt azzal a Google-fiókkal, amelyik a szalonod Google Naptárát használja!
2. Kattints az **Új projekt (New project)** gombra, nevezd el pl. `Szalon Naptar Hid`-nak.
3. Töröld ki az alapértelmezett `myFunction` szöveget, és másold be a teljes `gas/Code.gs` fájl tartalmát.
4. Töltsd ki a fájl tetején a `CONFIG` blokkot (**23–34. sor**):
   - `CALENDAR_ID`: hagyd `'primary'`-n, ha a fő Google Naptáradat használod (vagy írd be a külön szalon naptár ID-ját).
   - `FIREBASE_PROJECT_ID`: a Firebase `projectId` értéked.
   - `SERVICE_ACCOUNT_EMAIL`: a letöltött JSON fájl `client_email` mezője.
   - `SERVICE_ACCOUNT_PRIVATE_KEY`: a letöltött JSON fájl teljes `private_key` szövege (`-----BEGIN PRIVATE KEY-----...` végétől végéig).
   - `BRIDGE_SECRET`: írj be egy saját erős jelszót, és **pontosan ugyanezt** írd be a `js/config.js` **33. sorába** is!
5. Mentsd el (`Ctrl+S`), majd a felső sávban válaszd ki a `manualSyncTest` függvényt, és kattints a **Futtatás (Run)** gombra:
   - Felugrik a Google engedélykérő ablaka -> **Engedélyek áttekintése** -> válaszd a fiókodat -> **Speciális (Advanced) -> Tovább a projekthez (nem biztonságos)** -> **Engedélyezés**. (Ez engedélyezi a naptárad olvasását.)
6. **Web App telepítése:**
   - Jobb felső sarok: **Üzembe helyezés (Deploy) -> Új üzembe helyezés (New deployment)**.
   - Típus (fogaskerék): **Webalkalmazás (Web app)**.
   - Végrehajtás: **Én (Me)**.
   - Ki férhet hozzá: **Bárki (Anyone)**.
   - Kattints az **Üzembe helyezés** gombra, másold ki a kapott `https://script.google.com/macros/s/.../exec` URL-t, és illeszd be a **`js/config.js` 30. sorába** (`APPS_SCRIPT_URL`)!
7. **Óránkénti automata emlékeztető időzítő (Trigger) beállítása:**
   - Bal oldali menü: **Indítópontok (Triggers – ébresztőóra ikon)** -> jobb alul **+ Indítópont hozzáadása (Add Trigger)**.
   - Futtatandó függvény: **`hourlyCalendarAndReminderJob`**
   - Eseményforrás: **Időalapú (Time-driven)**
   - Időalapú indítópont típusa: **Óra alapú (Hour timer)**
   - Óraintervallum: **Minden órában (Every hour)** -> **Mentés**.
8. Töltsd fel a frissített `js/config.js` és `firebase-messaging-sw.js` fájlokat GitHubra (Commit changes).

---

## 4. Lépés: QR-kódok generálása és telepítés telefonra (Vendég + Admin)

1. Nyisd meg a saját telefonodon az Admin felületet:
   `https://FELHASZNALONEVED.github.io/szalon-app/admin.html`
2. **Első belépés:** Az app megkér, hogy adj meg és erősíts meg egy saját **4–6 számjegyű Admin PIN-kódot**.
3. **Telepítés külön Admin ikonként a telefonodra:**
   - **iPhone (Safari):** Alul a Megosztás ikon (`⬆️`) -> **Főképernyőhöz adás (Add to Home Screen)** -> **Hozzáadás**.
   - **Android (Chrome):** Jobb felső három pont (`⋮`) -> **Alkalmazás telepítése / Kezdőképernyőhöz adás**.
   - Nyisd meg az új **Atelier Admin** ikont a kezdőképernyőről, és koppints a fenti **Bekapcsolás** gombra a push értesítésekhez!
4. **Vendég & Admin QR-kódok letöltése/nyomtatása:**
   - Az Admin appban koppints a jobb alsó **Beállítások** fülre -> görgess a **Szalon QR-kód Generátor** kártyához.
   - Automatikusan legenerálja mind a **Vendég App QR-kódját** (amit kinyomtathatsz és kitehetsz a szalonba a tükör mellé/pultba), mind a **Saját Admin QR-kódodat**!
   - Koppints a **⬇ Letöltés (PNG)** vagy a **🖨 Nyomtatás** gombra.
