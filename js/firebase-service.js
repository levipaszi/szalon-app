/* ==========================================================================
   Firebase Firestore + Cloud Messaging + Google Apps Script Híd Szolgáltatás
   Élő módban Firebase Firestore-t és FCM-et használ; beállítás előtti
   kipróbáláshoz automatikus helyi Előnézet (Demo) módot biztosít.
   ========================================================================== */

(function (global) {
  'use strict';

  const DEMO_KEY = 'atelier_szalon_demo_db_v1';
  let db = null;
  let messaging = null;
  let demoMode = true;
  let demoListeners = [];

  function isFirebaseConfigured() {
    const cfg = global.APP_CONFIG && global.APP_CONFIG.FIREBASE;
    return !!(
      cfg &&
      cfg.apiKey &&
      !cfg.apiKey.startsWith('IDE_ILLESZD') &&
      cfg.projectId &&
      !cfg.projectId.startsWith('IDE_ILLESZD') &&
      typeof firebase !== 'undefined'
    );
  }

  function isAppsScriptConfigured() {
    const url = global.APP_CONFIG && global.APP_CONFIG.APPS_SCRIPT_URL;
    return !!(url && url.startsWith('https://') && !url.includes('IDE_ILLESZD'));
  }

  function genId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // Relatív dátumok a Demo módhoz (fix évszám nélkül, mindig a mindenkori dátumhoz viszonyítva)
  function addDays(base, days, hours = 10, mins = 0) {
    const d = new Date(base.getTime() + days * 86400000);
    d.setHours(hours, mins, 0, 0);
    return d;
  }

  function buildInitialDemoDB() {
    const now = new Date();
    const past1 = addDays(now, -22, 14, 0);
    const next1 = addDays(now, 0, Math.min(20, now.getHours() + 2), 30); // Ma, hogy látszódjon a 10 perc késés gomb is!
    const next2 = addDays(now, 35, 16, 0);
    const next3 = addDays(now, 95, 11, 30);
    const next4 = addDays(now, 410, 15, 0); // Következő / azutáni évben is legyen példa

    const mkAppt = (id, guestId, title, start, durationMin) => {
      const end = new Date(start.getTime() + durationMin * 60000);
      return {
        id,
        eventId: id,
        guestId,
        title,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        durationMin,
        mood: '',
        drink: '',
        lateNotice: false,
        lateSentAt: null,
        photoDataUrl: '',
        photoNote: ''
      };
    };

    const g1 = {
      id: 'demo_guest_anna',
      name: 'Kovács Anna',
      gender: 'female',
      theme: 'female-light',
      calendarKeyword: 'Kovács Anna',
      paired: true,
      serviceDuration: 90,
      cycleDays: 42,
      flashSubscribed: true,
      flashPreference: 'afternoon',
      urgentEarlier: false,
      savedRoutine: null,
      fcmToken: '',
      createdAt: addDays(now, -60).toISOString()
    };

    const g2 = {
      id: 'demo_guest_bence',
      name: 'Szabó Bence',
      gender: 'male',
      theme: 'male',
      calendarKeyword: 'Szabó Bence',
      paired: true,
      serviceDuration: 45,
      cycleDays: 28,
      flashSubscribed: true,
      flashPreference: 'any',
      urgentEarlier: true,
      savedRoutine: null,
      fcmToken: '',
      createdAt: addDays(now, -45).toISOString()
    };

    const g3 = {
      id: 'demo_guest_uj',
      name: 'Tóth Eszter',
      gender: 'female',
      theme: 'female-dark',
      calendarKeyword: '',
      paired: false,
      serviceDuration: 60,
      cycleDays: 45,
      flashSubscribed: false,
      flashPreference: 'any',
      urgentEarlier: false,
      savedRoutine: null,
      fcmToken: '',
      createdAt: addDays(now, -1).toISOString()
    };

    return {
      guests: { [g1.id]: g1, [g2.id]: g2, [g3.id]: g3 },
      appointments: {
        evt_past_1: mkAppt('evt_past_1', g1.id, 'Kovács Anna – Festés + vágás', past1, 90),
        evt_next_1: mkAppt('evt_next_1', g1.id, 'Kovács Anna – Hajvágás & ápolás', next1, 90),
        evt_next_2: mkAppt('evt_next_2', g1.id, 'Kovács Anna – Tőfestés + szárítás', next2, 90),
        evt_next_3: mkAppt('evt_next_3', g1.id, 'Kovács Anna – Balayage frissítés', next3, 120),
        evt_next_4: mkAppt('evt_next_4', g1.id, 'Kovács Anna – Előjegyzett hajvágás', next4, 90),
        evt_bence_past: mkAppt('evt_bence_past', g2.id, 'Szabó Bence – Skin Fade', addDays(now, -19, 17, 0), 45),
        evt_bence_next: mkAppt('evt_bence_next', g2.id, 'Szabó Bence – Férfi hajvágás + szakáll', addDays(now, 0, Math.min(21, now.getHours() + 3), 0), 45)
      },
      sosRequests: {},
      flashSlots: {
        flash_demo_1: {
          id: 'flash_demo_1',
          dateLabel: addDays(now, 2, 15, 0).toISOString(),
          durationMin: 60,
          note: 'Felszabadult délutáni 60 perces hely!',
          status: 'open',
          winnerGuestId: null,
          applicants: {},
          createdAt: now.toISOString()
        }
      },
      pricing: JSON.parse(JSON.stringify(global.APP_CONFIG.DEFAULT_PRICING)),
      admin: {
        pinHash: '',
        fcmToken: ''
      }
    };
  }

  function loadDemoDB() {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const fresh = buildInitialDemoDB();
    saveDemoDB(fresh);
    return fresh;
  }

  function saveDemoDB(data) {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(data));
    } catch (_) {}
    demoListeners.forEach((fn) => {
      try { fn(data); } catch (_) {}
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === DEMO_KEY) {
      const data = loadDemoDB();
      demoListeners.forEach((fn) => {
        try { fn(data); } catch (_) {}
      });
    }
  });

  function subscribeDemo(cb) {
    demoListeners.push(cb);
    cb(loadDemoDB());
    return () => {
      demoListeners = demoListeners.filter((f) => f !== cb);
    };
  }

  // SHA-256 PIN hashelés (biztonságos Firestore tároláshoz)
  async function hashPin(pin) {
    const str = `atelier_pin_salt_v1:${pin}`;
    if (global.crypto && global.crypto.subtle) {
      const buf = await global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback egyszerű hash nem-HTTPS helyi teszteléshez
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fallback_${(h >>> 0).toString(16)}`;
  }

  async function init() {
    if (isFirebaseConfigured()) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(global.APP_CONFIG.FIREBASE);
        }
        db = firebase.firestore();
        try {
          await db.enablePersistence({ synchronizeTabs: true });
        } catch (_) {}
        try {
          if (firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported()) {
            messaging = firebase.messaging();
          }
        } catch (msgErr) {
          console.warn('FCM nem érhető el ezen a böngészőn:', msgErr);
        }
        demoMode = false;
      } catch (err) {
        console.warn('Firebase inicializálási hiba, Demo mód aktív:', err);
        demoMode = true;
      }
    } else {
      demoMode = true;
    }
    return { demoMode };
  }

  // Google Apps Script Push & Szinkronizáló híd
  async function callAppsScript(payload) {
    if (!isAppsScriptConfigured()) {
      return { ok: false, skipped: true, reason: 'Apps Script URL nincs beállítva' };
    }
    try {
      const body = Object.assign({}, payload, {
        secret: global.APP_CONFIG.BRIDGE_SECRET
      });
      const res = await fetch(global.APP_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
      if (!res.ok) return { ok: false, status: res.status };
      return await res.json().catch(() => ({ ok: true }));
    } catch (err) {
      console.warn('Apps Script hívás hiba:', err);
      return { ok: false, error: String(err) };
    }
  }

  async function triggerCalendarSync() {
    return callAppsScript({ action: 'sync' });
  }

  function absoluteAppUrl(relPath) {
    try {
      return new URL(relPath || './index.html', window.location.href).href;
    } catch (_) {
      return 'https://levipaszi.github.io/szalon-app/index.html';
    }
  }

  async function sendPushNotification({ targetRole, guestId, title, body, url, delaySeconds }) {
    const resolvedUrl = url && url.startsWith('https://')
      ? url
      : absoluteAppUrl(url || (targetRole === 'admin' ? './admin.html' : './index.html'));
    return callAppsScript({
      action: 'sendPush',
      targetRole: targetRole || 'guest',
      guestId: guestId || '',
      title,
      body,
      url: resolvedUrl,
      delaySeconds: Number(delaySeconds) || 0
    });
  }

  async function getUnifiedSwRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  }

  async function saveTokenForRole(role, guestId, token) {
    if (!token) return;
    if (role === 'admin') {
      await saveAdminFcmToken(token);
    } else if (guestId) {
      if (demoMode) {
        await updateGuest(guestId, { fcmToken: token });
      } else {
        await db.collection('guests').doc(guestId).set({
          fcmToken: token,
          fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
          fcmUpdatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }
  }

  async function syncPushTokenIfGranted(role, guestId) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return { ok: false, permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' };
    }
    if (demoMode || !messaging) {
      return { ok: false, reason: 'Messaging nem aktív ezen a böngészőn.' };
    }
    const vapid = global.APP_CONFIG.VAPID_KEY;
    if (!vapid || vapid.startsWith('IDE_ILLESZD')) {
      return { ok: false, reason: 'VAPID kulcs hiányzik.' };
    }
    try {
      const reg = await getUnifiedSwRegistration();
      const token = await messaging.getToken({ vapidKey: vapid, serviceWorkerRegistration: reg });
      if (token) {
        await saveTokenForRole(role, guestId, token);
        return { ok: true, token };
      }
      return { ok: false, reason: 'Üres push token.' };
    } catch (err) {
      console.warn('Automatikus FCM token szinkron hiba:', err);
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }

  async function requestPushPermission(role, guestId) {
    if (typeof Notification === 'undefined') {
      const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
      return {
        ok: false,
        reason: isIosDevice
          ? 'iPhone-on előbb add hozzá az appot a Főképernyőhöz (Megosztás -> Főképernyőhöz adás), és onnan nyisd meg!'
          : 'Ez a böngésző nem támogatja a háttér push értesítéseket.'
      };
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { ok: false, reason: 'Az értesítési engedély tiltva van a telefonod böngészőjében.' };
    }
    if (demoMode || !messaging) {
      return { ok: true, demo: true, token: 'demo_token' };
    }
    return syncPushTokenIfGranted(role, guestId);
  }

  function onForegroundPush(cb) {
    if (messaging) {
      messaging.onMessage((payload) => {
        const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'Forfex VIP';
        const body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || '';
        cb({ title, body, raw: payload });
      });
    }
  }

  // ---------------- VENDÉGEK ----------------
  async function createGuest(guestData) {
    const id = guestData.id || genId('guest');
    const doc = {
      id,
      name: guestData.name.trim(),
      gender: guestData.theme === 'male' ? 'male' : 'female',
      theme: guestData.theme || 'male',
      calendarKeyword: '',
      paired: false,
      serviceDuration: guestData.theme === 'male' ? 45 : 90,
      cycleDays: guestData.theme === 'male' ? 28 : 45,
      flashSubscribed: false,
      flashPreference: 'any',
      urgentEarlier: false,
      savedRoutine: null,
      fcmToken: '',
      createdAt: new Date().toISOString()
    };

    if (demoMode) {
      const state = loadDemoDB();
      // Ha Demo módban az alap Kovács Anna vagy Szabó Bence névvel lép be, kössük össze a demó naptárral
      const lower = doc.name.toLowerCase();
      if (lower.includes('anna')) {
        state.guests['demo_guest_anna'].theme = doc.theme;
        saveDemoDB(state);
        return state.guests['demo_guest_anna'];
      }
      if (lower.includes('bence')) {
        state.guests['demo_guest_bence'].theme = doc.theme;
        saveDemoDB(state);
        return state.guests['demo_guest_bence'];
      }
      // Új demo vendéghez is generáljunk pár jövőbeli demó időpontot, hogy azonnal látványos legyen
      const now = new Date();
      state.guests[id] = doc;
      const past = addDays(now, -14, 15, 0);
      const next = addDays(now, 0, Math.min(20, now.getHours() + 2), 0);
      const fut1 = addDays(now, 38, 14, 30);
      const fut2 = addDays(now, 390, 10, 0);
      const mk = (aid, start, dur, title) => ({
        id: aid,
        eventId: aid,
        guestId: id,
        title,
        startIso: start.toISOString(),
        endIso: new Date(start.getTime() + dur * 60000).toISOString(),
        durationMin: dur,
        mood: '',
        drink: '',
        lateNotice: false,
        photoDataUrl: '',
        photoNote: ''
      });
      state.appointments[genId('evt')] = mk(genId('evt'), past, doc.serviceDuration, `${doc.name} – Előző alkalom`);
      state.appointments[genId('evt')] = mk(genId('evt'), next, doc.serviceDuration, `${doc.name} – Következő alkalom`);
      state.appointments[genId('evt')] = mk(genId('evt'), fut1, doc.serviceDuration, `${doc.name} – Előjegyzett időpont`);
      state.appointments[genId('evt')] = mk(genId('evt'), fut2, doc.serviceDuration, `${doc.name} – Jövő évi időpont`);
      saveDemoDB(state);
      return doc;
    }

    await db.collection('guests').doc(id).set(doc);
    return doc;
  }

  async function getGuest(guestId) {
    if (demoMode) {
      const state = loadDemoDB();
      return state.guests[guestId] || null;
    }
    const snap = await db.collection('guests').doc(guestId).get();
    return snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null;
  }

  async function updateGuest(guestId, patch) {
    if (demoMode) {
      const state = loadDemoDB();
      if (!state.guests[guestId]) return;
      state.guests[guestId] = Object.assign({}, state.guests[guestId], patch);
      saveDemoDB(state);
      return;
    }
    await db.collection('guests').doc(guestId).set(patch, { merge: true });
  }

  function subscribeGuest(guestId, cb) {
    if (demoMode) {
      return subscribeDemo((state) => cb(state.guests[guestId] || null));
    }
    return db.collection('guests').doc(guestId).onSnapshot((snap) => {
      cb(snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null);
    });
  }

  function subscribeAllGuests(cb) {
    if (demoMode) {
      return subscribeDemo((state) => cb(Object.values(state.guests)));
    }
    return db.collection('guests').onSnapshot((qs) => {
      cb(qs.docs.map((d) => Object.assign({ id: d.id }, d.data())));
    });
  }

  // ---------------- IDŐPONTOK ----------------
  function subscribeGuestAppointments(guestId, cb) {
    if (demoMode) {
      return subscribeDemo((state) => {
        const list = Object.values(state.appointments)
          .filter((a) => a.guestId === guestId)
          .sort((a, b) => new Date(a.startIso) - new Date(b.startIso));
        cb(list);
      });
    }
    return db.collection('appointments')
      .where('guestId', '==', guestId)
      .onSnapshot((qs) => {
        const list = qs.docs
          .map((d) => Object.assign({ id: d.id }, d.data()))
          .sort((a, b) => new Date(a.startIso) - new Date(b.startIso));
        cb(list);
      });
  }

  function subscribeAllAppointments(cb) {
    if (demoMode) {
      return subscribeDemo((state) => {
        const list = Object.values(state.appointments)
          .sort((a, b) => new Date(a.startIso) - new Date(b.startIso));
        cb(list);
      });
    }
    return db.collection('appointments').onSnapshot((qs) => {
      const list = qs.docs
        .map((d) => Object.assign({ id: d.id }, d.data()))
        .sort((a, b) => new Date(a.startIso) - new Date(b.startIso));
      cb(list);
    });
  }

  async function updateAppointmentMeta(apptId, patch) {
    if (demoMode) {
      const state = loadDemoDB();
      if (!state.appointments[apptId]) return;
      state.appointments[apptId] = Object.assign({}, state.appointments[apptId], patch);
      saveDemoDB(state);
      return;
    }
    await db.collection('appointments').doc(apptId).set(patch, { merge: true });
  }

  // ---------------- ÁRLISTA ----------------
  function subscribePricing(cb) {
    const def = global.APP_CONFIG.DEFAULT_PRICING;
    const targetVer = (def && def.pricingVersion) || 2;
    if (demoMode) {
      return subscribeDemo((state) => {
        if (!state.pricing || (state.pricing.pricingVersion || 0) < targetVer) {
          state.pricing = JSON.parse(JSON.stringify(def));
          saveDemoDB(state);
        }
        cb(state.pricing);
      });
    }
    return db.collection('settings').doc('pricing').onSnapshot(async (snap) => {
      const data = snap.exists ? snap.data() : null;
      if (data && (data.pricingVersion || 0) >= targetVer) {
        cb(data);
      } else {
        await db.collection('settings').doc('pricing').set(def);
        cb(def);
      }
    });
  }

  async function savePricing(pricingData) {
    const payload = Object.assign({ pricingVersion: (global.APP_CONFIG.DEFAULT_PRICING && global.APP_CONFIG.DEFAULT_PRICING.pricingVersion) || 2 }, pricingData);
    if (demoMode) {
      const state = loadDemoDB();
      state.pricing = payload;
      saveDemoDB(state);
      return;
    }
    await db.collection('settings').doc('pricing').set(payload, { merge: true });
  }

  // ---------------- SOS VÉSZHELYZETI KÉRÉSEK ----------------
  async function createSosRequest(req) {
    const id = genId('sos');
    const doc = Object.assign({
      id,
      status: 'pending',
      createdAt: new Date().toISOString()
    }, req);

    if (demoMode) {
      const state = loadDemoDB();
      state.sosRequests[id] = doc;
      saveDemoDB(state);
    } else {
      await db.collection('sosRequests').doc(id).set(doc);
    }

    // Push értesítés az Adminnak
    sendPushNotification({
      targetRole: 'admin',
      title: '🚨 Új SOS (4x ár) kérés érkezett!',
      body: `${doc.guestName}: ${doc.serviceName} (${doc.sosPrice.toLocaleString('hu-HU')} Ft) – ${doc.intervalSummary}`,
      url: './admin.html'
    });
    return doc;
  }

  function subscribeGuestSos(guestId, cb) {
    if (demoMode) {
      return subscribeDemo((state) => {
        const list = Object.values(state.sosRequests)
          .filter((r) => r.guestId === guestId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        cb(list);
      });
    }
    return db.collection('sosRequests')
      .where('guestId', '==', guestId)
      .onSnapshot((qs) => {
        const list = qs.docs
          .map((d) => Object.assign({ id: d.id }, d.data()))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        cb(list);
      });
  }

  function subscribeAllSos(cb) {
    if (demoMode) {
      return subscribeDemo((state) => {
        const list = Object.values(state.sosRequests)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        cb(list);
      });
    }
    return db.collection('sosRequests').onSnapshot((qs) => {
      const list = qs.docs
        .map((d) => Object.assign({ id: d.id }, d.data()))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      cb(list);
    });
  }

  async function respondSosRequest(sosId, decision, guestId) {
    const patch = {
      status: decision, // 'approved' | 'rejected'
      respondedAt: new Date().toISOString()
    };
    if (demoMode) {
      const state = loadDemoDB();
      if (state.sosRequests[sosId]) {
        state.sosRequests[sosId] = Object.assign({}, state.sosRequests[sosId], patch);
        saveDemoDB(state);
      }
    } else {
      await db.collection('sosRequests').doc(sosId).set(patch, { merge: true });
    }

    const title = decision === 'approved'
      ? '✅ SOS kérésed elfogadva!'
      : 'SOS időpont kérés válasza';
    const body = decision === 'approved'
      ? `SOS kérésed elfogadva! Kérlek, hívj a ${global.APP_CONFIG.SOS_PHONE_DISPLAY} számon a pontosításért!`
      : 'Sajnos a megadott időintervallumban a körülmények most nem engedik, hogy megoldjam ezt az időpontot.';

    await sendPushNotification({
      targetRole: 'guest',
      guestId,
      title,
      body,
      url: './index.html#appointments'
    });
  }

  // ---------------- VIP VILLÁM-IDŐPONTOK ----------------
  async function createFlashSlot(slot) {
    const id = genId('flash');
    const doc = Object.assign({
      id,
      status: 'open',
      winnerGuestId: null,
      applicants: {},
      createdAt: new Date().toISOString()
    }, slot);

    if (demoMode) {
      const state = loadDemoDB();
      state.flashSlots[id] = doc;
      saveDemoDB(state);
    } else {
      await db.collection('flashSlots').doc(id).set(doc);
    }

    await callAppsScript({
      action: 'broadcastFlash',
      durationMin: doc.durationMin,
      dateLabel: doc.dateLabel,
      note: doc.note || ''
    });
    return doc;
  }

  function subscribeFlashSlots(cb) {
    if (demoMode) {
      return subscribeDemo((state) => {
        const list = Object.values(state.flashSlots)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        cb(list);
      });
    }
    return db.collection('flashSlots').onSnapshot((qs) => {
      const list = qs.docs
        .map((d) => Object.assign({ id: d.id }, d.data()))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      cb(list);
    });
  }

  async function applyToFlashSlot(slotId, guest) {
    const applicant = {
      guestId: guest.id,
      guestName: guest.name,
      gender: guest.gender,
      urgentEarlier: !!guest.urgentEarlier,
      appliedAt: new Date().toISOString()
    };

    if (demoMode) {
      const state = loadDemoDB();
      if (state.flashSlots[slotId]) {
        state.flashSlots[slotId].applicants = state.flashSlots[slotId].applicants || {};
        state.flashSlots[slotId].applicants[guest.id] = applicant;
        saveDemoDB(state);
      }
    } else {
      await db.collection('flashSlots').doc(slotId).set({
        applicants: { [guest.id]: applicant }
      }, { merge: true });
    }

    sendPushNotification({
      targetRole: 'admin',
      title: '⚡ Villám-időpont jelentkező!',
      body: `${guest.name} jelentkezett a villám-időpontra.`,
      url: './admin.html'
    });
  }

  async function approveFlashApplicant(slotId, winnerGuestId, allApplicantIds) {
    const patch = {
      status: 'filled',
      winnerGuestId,
      resolvedAt: new Date().toISOString()
    };

    if (demoMode) {
      const state = loadDemoDB();
      if (state.flashSlots[slotId]) {
        state.flashSlots[slotId] = Object.assign({}, state.flashSlots[slotId], patch);
        saveDemoDB(state);
      }
    } else {
      await db.collection('flashSlots').doc(slotId).set(patch, { merge: true });
    }

    // Nyertes értesítése
    await sendPushNotification({
      targetRole: 'guest',
      guestId: winnerGuestId,
      title: '⚡ Tiéd a VIP Villám-időpont!',
      body: 'Visszaigazolva! Nagyon várlak a kiválasztott villám-időpontban.',
      url: './index.html#appointments'
    });

    // Többi jelentkező kedves, asszertív értesítése
    for (const gid of allApplicantIds) {
      if (gid === winnerGuestId) continue;
      await sendPushNotification({
        targetRole: 'guest',
        guestId: gid,
        title: 'Villám-időpont frissítés',
        body: 'Sajnos erről most egy hajszállal lemaradtál, valaki más gyorsabb volt – de a következő villám-lehetőségnél újra elsőként értesítünk!',
        url: './index.html#appointments'
      });
    }
  }

  // ---------------- ADMIN BEÁLLÍTÁSOK & PIN ----------------
  async function getAdminConfig() {
    if (demoMode) {
      return loadDemoDB().admin || { pinHash: '', fcmToken: '' };
    }
    const snap = await db.collection('settings').doc('admin').get();
    return snap.exists ? snap.data() : { pinHash: '', fcmToken: '' };
  }

  async function saveAdminPinHash(pinHash) {
    if (demoMode) {
      const state = loadDemoDB();
      state.admin = Object.assign({}, state.admin, { pinHash });
      saveDemoDB(state);
      return;
    }
    await db.collection('settings').doc('admin').set({ pinHash }, { merge: true });
  }

  async function saveAdminFcmToken(fcmToken) {
    if (demoMode) {
      const state = loadDemoDB();
      state.admin = Object.assign({}, state.admin, { fcmToken });
      saveDemoDB(state);
      return;
    }
    await db.collection('settings').doc('admin').set({
      fcmToken,
      fcmTokens: firebase.firestore.FieldValue.arrayUnion(fcmToken),
      fcmUpdatedAt: new Date().toISOString()
    }, { merge: true });
  }

  global.SalonService = {
    init,
    isDemoMode: () => demoMode,
    isAppsScriptConfigured,
    hashPin,
    requestPushPermission,
    syncPushTokenIfGranted,
    onForegroundPush,
    triggerCalendarSync,
    sendPushNotification,
    createGuest,
    getGuest,
    updateGuest,
    subscribeGuest,
    subscribeAllGuests,
    subscribeGuestAppointments,
    subscribeAllAppointments,
    updateAppointmentMeta,
    subscribePricing,
    savePricing,
    createSosRequest,
    subscribeGuestSos,
    subscribeAllSos,
    respondSosRequest,
    createFlashSlot,
    subscribeFlashSlots,
    applyToFlashSlot,
    approveFlashApplicant,
    getAdminConfig,
    saveAdminPinHash,
    saveAdminFcmToken
  };
})(window);
