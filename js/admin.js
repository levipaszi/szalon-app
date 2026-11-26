/* ==========================================================================
   Atelier Szalon – Admin PWA Vezérlőpult Logika (js/admin.js)
   ========================================================================== */

(function () {
  'use strict';

  const SESSION_UNLOCK_KEY = 'atelier_admin_unlocked_v1';

  const state = {
    adminConfig: { pinHash: '' },
    pinMode: 'login', // 'setup1' | 'setup2' | 'login'
    pinBuffer: '',
    pinFirstEntry: '',
    calFilter: 'today',
    guests: [],
    appointments: [],
    sosRequests: [],
    flashSlots: [],
    pricing: JSON.parse(JSON.stringify(window.APP_CONFIG.DEFAULT_PRICING)),
    pricingEditTab: 'current',
    reminderTarget: null
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function formatHuf(amount) {
    return `${Number(amount || 0).toLocaleString('hu-HU')} Ft`;
  }

  function formatHuDateFull(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  }

  function formatTimeRange(startIso, endIso) {
    const f = (dt) => new Date(dt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    return `${f(startIso)} – ${f(endIso)}`;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function guestMap() {
    const m = {};
    state.guests.forEach((g) => { m[g.id] = g; });
    return m;
  }

  // ---------------- PIN KEZELÉS ----------------
  function renderPinDots() {
    const count = Math.max(4, Math.min(6, state.pinBuffer.length || 4));
    const total = state.pinBuffer.length > 4 ? 6 : 4;
    let html = '';
    for (let i = 0; i < Math.max(total, count); i++) {
      html += `<span class="pin-dot ${i < state.pinBuffer.length ? 'filled' : ''}"></span>`;
    }
    $('#pinDots').innerHTML = html;
  }

  function configurePinScreen() {
    state.pinBuffer = '';
    $('#pinError').textContent = '';

    if (!state.adminConfig.pinHash) {
      state.pinMode = 'setup1';
      $('#pinTitle').textContent = 'Admin PIN-kód létrehozása';
      $('#pinSubtitle').textContent = 'Első belépés: adj meg egy 4–6 számjegyű saját PIN-kódot, majd nyomd meg az OK gombot.';
    } else {
      state.pinMode = 'login';
      $('#pinTitle').textContent = 'Admin belépés';
      $('#pinSubtitle').textContent = 'Írd be a 4–6 számjegyű Admin PIN-kódodat, majd nyomd meg az OK gombot.';
    }
    renderPinDots();
    $('#pinOverlay').classList.remove('hidden');
  }

  async function handlePinSubmit() {
    const pin = state.pinBuffer;
    if (pin.length < 4 || pin.length > 6) {
      $('#pinError').textContent = 'A PIN-kód 4–6 számjegy hosszú legyen.';
      return;
    }

    if (state.pinMode === 'setup1') {
      state.pinFirstEntry = pin;
      state.pinBuffer = '';
      state.pinMode = 'setup2';
      $('#pinTitle').textContent = 'PIN-kód megerősítése';
      $('#pinSubtitle').textContent = 'Írd be még egyszer ugyanazt a PIN-kódot a megerősítéshez.';
      $('#pinError').textContent = '';
      renderPinDots();
      return;
    }

    if (state.pinMode === 'setup2') {
      if (pin !== state.pinFirstEntry) {
        $('#pinError').textContent = 'A két PIN-kód nem egyezik! Próbáld újra.';
        state.pinFirstEntry = '';
        state.pinBuffer = '';
        state.pinMode = 'setup1';
        $('#pinTitle').textContent = 'Admin PIN-kód létrehozása';
        $('#pinSubtitle').textContent = 'Add meg újra a 4–6 számjegyű PIN-kódot.';
        renderPinDots();
        return;
      }
      const hash = await window.SalonService.hashPin(pin);
      await window.SalonService.saveAdminPinHash(hash);
      state.adminConfig.pinHash = hash;
      sessionStorage.setItem(SESSION_UNLOCK_KEY, '1');
      $('#pinOverlay').classList.add('hidden');
      showToast('Admin PIN-kód elmentve!');
      startAdminSubscriptions();
      return;
    }

    // Login ellenőrzés
    const hash = await window.SalonService.hashPin(pin);
    if (hash === state.adminConfig.pinHash) {
      sessionStorage.setItem(SESSION_UNLOCK_KEY, '1');
      $('#pinOverlay').classList.add('hidden');
      startAdminSubscriptions();
    } else {
      $('#pinError').textContent = 'Hibás PIN-kód!';
      state.pinBuffer = '';
      renderPinDots();
    }
  }

  function setupPinPad() {
    $$('#pinPad .pin-key').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === 'clear') {
          state.pinBuffer = state.pinBuffer.slice(0, -1);
          renderPinDots();
        } else if (key === 'ok') {
          handlePinSubmit();
        } else if (state.pinBuffer.length < 6) {
          state.pinBuffer += key;
          $('#pinError').textContent = '';
          renderPinDots();
        }
      });
    });
  }

  // ---------------- 1. NAPTÁR & NAPI LISTA ----------------
  function renderCalendar() {
    const container = $('#adminCalendarList');
    const now = new Date();
    const gMap = guestMap();

    const future = state.appointments
      .filter((a) => new Date(a.endIso || a.startIso) >= now)
      .sort((a, b) => new Date(a.startIso) - new Date(b.startIso));

    let filtered = future;
    if (state.calFilter === 'today') {
      filtered = future.filter((a) => isSameDay(new Date(a.startIso), now));
    } else if (state.calFilter === 'upcoming') {
      const in14 = new Date(now.getTime() + 14 * 86400000);
      filtered = future.filter((a) => new Date(a.startIso) <= in14);
    }

    if (!filtered.length) {
      container.innerHTML = `
        <div class="card">
          <p class="muted">Nincs megjeleníthető időpont ebben a nézetben (${state.calFilter === 'today' ? 'Mai nap' : 'Közelgő'}).</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered
      .map((appt) => {
        const g = gMap[appt.guestId] || {};
        const isMale = g.gender === 'male';
        const genderBadge = isMale
          ? `<span class="badge badge-male">● Férfi</span>`
          : `<span class="badge badge-female">● Női</span>`;

        const lateBadge = appt.lateNotice
          ? `<span class="badge badge-danger">⏱️ +10 perc késés!</span>`
          : '';

        const photoBlock = appt.photoDataUrl || appt.photoNote
          ? `
            <div class="disclosure mt-2" id="adminPhoto_${appt.id}">
              <button class="disclosure-trigger" type="button" data-disclosure="adminPhoto_${appt.id}">
                <span>📸 Inspirációs fotó / megjegyzés</span>
                <span class="disclosure-chevron">▾</span>
              </button>
              <div class="disclosure-body">
                ${appt.photoDataUrl ? `<img class="photo-preview" src="${appt.photoDataUrl}" alt="Inspiráció" />` : ''}
                ${appt.photoNote ? `<p class="small mt-1">${esc(appt.photoNote)}</p>` : ''}
              </div>
            </div>`
          : '';

        return `
          <div class="card">
            <div class="row-between">
              <div>
                <div class="row-gap">
                  ${genderBadge}
                  <span class="badge">${appt.durationMin || 60} perc</span>
                  ${lateBadge}
                </div>
                <h3 class="mt-1">${esc(g.name || appt.title || 'Vendég')}</h3>
                <div class="small muted">${esc(formatHuDateFull(appt.startIso))} · <strong>${esc(formatTimeRange(appt.startIso, appt.endIso))}</strong></div>
              </div>
            </div>

            <div class="row-gap mt-2">
              <span class="badge">💬 ${esc(appt.mood || 'Hangulat nincs megadva')}</span>
              <span class="badge">☕ ${esc(appt.drink || 'Frissítő nincs megadva')}</span>
            </div>

            ${photoBlock}

            <button class="btn btn-secondary btn-block mt-2" type="button" data-open-reminder="${appt.id}">
              🔔 Emlékeztető küldése
            </button>
          </div>`;
      })
      .join('');

    $$('[data-open-reminder]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const appt = state.appointments.find((a) => a.id === btn.dataset.openReminder);
        if (!appt) return;
        const g = gMap[appt.guestId] || {};
        state.reminderTarget = { appt, guest: g };
        $('#reminderTargetInfo').textContent = `${g.name || appt.title} – ${formatHuDateFull(appt.startIso)} (${formatTimeRange(appt.startIso, appt.endIso)})`;
        $('#reminderCustomMsg').value = '';
        $('#reminderModal').classList.remove('hidden');
      });
    });
  }

  // ---------------- 2. VILLÁM & SOS ----------------
  function renderFlashAndSos() {
    const sosList = $('#adminSosList');
    const pendingSos = state.sosRequests.filter((r) => r.status === 'pending');
    const historySos = state.sosRequests.filter((r) => r.status !== 'pending').slice(0, 5);
    renderAdminUrgentAlerts();

    let sosHtml = '';
    if (pendingSos.length) {
      sosHtml += pendingSos
        .map(
          (req) => `
          <div class="card" style="border:1.5px solid rgba(220,38,38,0.55);background:linear-gradient(155deg,var(--surface),rgba(220,38,38,0.08));">
            <div class="row-between">
              <span class="badge badge-danger">🚨 ÚJ SOS KÉRÉS (4x ár)</span>
              <span class="badge ${req.gender === 'male' ? 'badge-male' : 'badge-female'}">${req.gender === 'male' ? 'Férfi' : 'Női'}</span>
            </div>
            <h3 class="mt-1">${esc(req.guestName)}</h3>
            <p class="mt-1"><strong>${esc(req.serviceName)}</strong> · <span style="color:#EF4444;font-weight:700;">${formatHuf(req.sosPrice)}</span></p>
            <p class="small muted mt-1"><strong>Időintervallum:</strong> ${esc(req.intervalSummary)}</p>
            ${req.note ? `<p class="small mt-1">„${esc(req.note)}”</p>` : ''}
            <div class="row-gap mt-2">
              <button class="btn btn-success" type="button" style="flex:1;" data-sos-decide="approved" data-sos-id="${req.id}" data-sos-guest="${req.guestId}">
                ✓ Elfogadás (Hívás küldése)
              </button>
              <button class="btn btn-secondary" type="button" style="flex:1;" data-sos-decide="rejected" data-sos-id="${req.id}" data-sos-guest="${req.guestId}">
                ✕ Elutasítás
              </button>
            </div>
          </div>`
        )
        .join('');
    } else {
      sosHtml += `
        <div class="card">
          <div class="card-eyebrow">SOS Vészhelyzeti kérések</div>
          <p class="muted small">Jelenleg nincs függőben lévő 4x-es SOS kérés.</p>
        </div>`;
    }

    if (historySos.length) {
      sosHtml += `
        <div class="disclosure" id="sosHistoryDisc" style="margin-bottom:16px;">
          <button class="disclosure-trigger" type="button" data-disclosure="sosHistoryDisc">
            <span>Korábbi SOS döntések (${historySos.length})</span>
            <span class="disclosure-chevron">▾</span>
          </button>
          <div class="disclosure-body">
            ${historySos
              .map(
                (r) => `
                <div class="appt-list-item">
                  <div>
                    <div style="font-weight:600;font-size:0.9rem;">${esc(r.guestName)} – ${esc(r.serviceName)}</div>
                    <div class="small muted">${esc(r.intervalSummary)} · ${formatHuf(r.sosPrice)}</div>
                  </div>
                  <span class="badge ${r.status === 'approved' ? 'badge-success' : ''}">${r.status === 'approved' ? 'Elfogadva' : 'Elutasítva'}</span>
                </div>`
              )
              .join('')}
          </div>
        </div>`;
    }
    sosList.innerHTML = sosHtml;

    $$('[data-sos-decide]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const decision = btn.dataset.sosDecide;
        await window.SalonService.respondSosRequest(btn.dataset.sosId, decision, btn.dataset.sosGuest);
        showToast(
          decision === 'approved'
            ? 'SOS kérés elfogadva! A vendég megkapta a telefonszámodat push-ban.'
            : 'SOS kérés elutasítva, az asszertív válasz elküldve.'
        );
      });
    });

    // Villám-időpontok és jelentkezők
    const flashList = $('#adminFlashSlotsList');
    if (!state.flashSlots.length) {
      flashList.innerHTML = '';
      return;
    }

    flashList.innerHTML = state.flashSlots
      .slice(0, 8)
      .map((slot) => {
        const applicants = Object.values(slot.applicants || {});
        const dateText = isNaN(Date.parse(slot.dateLabel))
          ? slot.dateLabel
          : `${formatHuDateFull(slot.dateLabel)} · ${new Date(slot.dateLabel).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}`;

        const appRows = !applicants.length
          ? `<p class="small muted mt-1">Még nincs jelentkező erre az időpontra.</p>`
          : applicants
              .map((a) => {
                const isWinner = slot.winnerGuestId === a.guestId;
                return `
                  <div class="appt-list-item mt-1">
                    <div>
                      <div style="font-weight:600;">
                        ${esc(a.guestName)}
                        ${a.urgentEarlier ? '<span class="badge badge-danger" style="margin-left:6px;">Sürgős!</span>' : ''}
                      </div>
                      <div class="small muted">${a.gender === 'male' ? 'Férfi' : 'Női'}</div>
                    </div>
                    ${
                      slot.status === 'open'
                        ? `<button class="btn btn-sm btn-primary" type="button" data-approve-flash="${slot.id}" data-winner="${a.guestId}">Kiválasztás</button>`
                        : isWinner
                          ? `<span class="badge badge-success">✓ Nyertes</span>`
                          : `<span class="badge">Elutasítva</span>`
                    }
                  </div>`;
              })
              .join('');

        return `
          <div class="card">
            <div class="row-between">
              <span class="card-eyebrow">${slot.status === 'open' ? '⚡ Aktív Villám-időpont' : 'Lezárt Villám-időpont'}</span>
              <span class="badge">${slot.durationMin} perc</span>
            </div>
            <h3 class="mt-1">${esc(dateText)}</h3>
            ${slot.note ? `<p class="small muted">${esc(slot.note)}</p>` : ''}
            <div class="mt-2">${appRows}</div>
          </div>`;
      })
      .join('');

    $$('[data-approve-flash]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slot = state.flashSlots.find((s) => s.id === btn.dataset.approveFlash);
        if (!slot) return;
        const allIds = Object.keys(slot.applicants || {});
        await window.SalonService.approveFlashApplicant(slot.id, btn.dataset.winner, allIds);
        showToast('Vendég kiválasztva! A többi jelentkező kedves értesítést kapott.');
      });
    });
  }

  // ---------------- 3. VENDÉGEK & PÁROSÍTÁS ----------------
  function renderGuests() {
    const pending = state.guests.filter((g) => !g.paired);
    const paired = state.guests.filter((g) => g.paired).sort((a, b) => a.name.localeCompare(b.name, 'hu'));
    renderAdminUrgentAlerts();

    const pendingEl = $('#adminPendingGuests');
    if (pending.length) {
      pendingEl.innerHTML = `
        <div class="card card-accent">
          <div class="card-eyebrow">Párosításra vár (${pending.length})</div>
          <h2 class="card-title">Új regisztrált vendégek</h2>
          <p class="small muted mt-1">Írd be a vendég Google Naptárban használt nevét/kulcsszavát (pl. „Kovács Anna”), hogy az időpontjai élőben szinkronizáljanak.</p>
          ${pending
            .map(
              (g) => `
              <div class="protocol-step">
                <div class="row-between">
                  <strong>${esc(g.name)}</strong>
                  <span class="badge ${g.gender === 'male' ? 'badge-male' : 'badge-female'}">${g.gender === 'male' ? 'Férfi' : 'Női'}</span>
                </div>
                <div class="row-gap mt-1">
                  <input class="input" style="flex:1;" type="text" id="pairInput_${g.id}" value="${esc(g.name)}" placeholder="Google Naptár kulcsszó" />
                  <button class="btn btn-primary btn-sm" type="button" data-pair-guest="${g.id}">Párosítás</button>
                </div>
              </div>`
            )
            .join('')}
        </div>`;
    } else {
      pendingEl.innerHTML = '';
    }

    const allEl = $('#adminAllGuests');
    allEl.innerHTML = `
      <div class="card">
        <div class="card-eyebrow">Párosított vendégkör (${paired.length})</div>
        <h2 class="card-title">Vendégbeállítások</h2>
        ${
          !paired.length
            ? '<p class="muted small mt-1">Még nincs párosított vendég.</p>'
            : paired
                .map(
                  (g) => `
                  <div class="disclosure" id="guestEdit_${g.id}">
                    <button class="disclosure-trigger" type="button" data-disclosure="guestEdit_${g.id}">
                      <span class="row-gap">
                        <span class="badge ${g.gender === 'male' ? 'badge-male' : 'badge-female'}">${g.gender === 'male' ? 'Férfi' : 'Női'}</span>
                        <span>${esc(g.name)}</span>
                      </span>
                      <span class="disclosure-chevron">▾</span>
                    </button>
                    <div class="disclosure-body">
                      <div class="form-group">
                        <label class="form-label">Google Naptár kulcsszó</label>
                        <input class="input" type="text" id="gKey_${g.id}" value="${esc(g.calendarKeyword || g.name)}" />
                      </div>
                      <div class="row-gap">
                        <div class="form-group" style="flex:1;">
                          <label class="form-label">Időtartam (perc)</label>
                          <select class="select" id="gDur_${g.id}">
                            ${[30, 45, 60, 90, 120, 150]
                              .map((m) => `<option value="${m}" ${Number(g.serviceDuration) === m ? 'selected' : ''}>${m === 120 ? '120+ perc' : m + ' perc'}</option>`)
                              .join('')}
                          </select>
                        </div>
                        <div class="form-group" style="flex:1;">
                          <label class="form-label">Ciklusidő (nap)</label>
                          <input class="input" type="number" id="gCyc_${g.id}" value="${g.cycleDays || 35}" min="7" max="180" />
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Nem / Megjelenési téma</label>
                        <select class="select" id="gTheme_${g.id}">
                          <option value="male" ${g.theme === 'male' ? 'selected' : ''}>Férfi (Barber &amp; Obsidian)</option>
                          <option value="female-light" ${g.theme === 'female-light' ? 'selected' : ''}>Női (Világos Selyem)</option>
                          <option value="female-dark" ${g.theme === 'female-dark' ? 'selected' : ''}>Női (Sötét Bársony)</option>
                        </select>
                      </div>
                      <button class="btn btn-primary btn-block" type="button" data-save-guest="${g.id}">Mentés</button>
                    </div>
                  </div>`
                )
                .join('')
        }
      </div>`;

    $$('[data-pair-guest]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const gid = btn.dataset.pairGuest;
        const kw = ($(`#pairInput_${gid}`).value || '').trim();
        if (!kw) {
          showToast('Add meg a naptár kulcsszót!');
          return;
        }
        await window.SalonService.updateGuest(gid, { calendarKeyword: kw, paired: true });
        showToast(`Párosítva: ${kw}! Naptár szinkronizálása...`);
        window.SalonService.triggerCalendarSync();
      });
    });

    $$('[data-save-guest]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const gid = btn.dataset.saveGuest;
        const theme = $(`#gTheme_${gid}`).value;
        await window.SalonService.updateGuest(gid, {
          calendarKeyword: $(`#gKey_${gid}`).value.trim(),
          serviceDuration: Number($(`#gDur_${gid}`).value),
          cycleDays: Number($(`#gCyc_${gid}`).value) || 35,
          theme,
          gender: theme === 'male' ? 'male' : 'female'
        });
        showToast('Vendég adatai frissítve!');
      });
    });
  }

  // ---------------- 4. ÁRLISTA & QR GENERÁTOR ----------------
  function renderPricingEditor() {
    const isCurrent = state.pricingEditTab === 'current';
    $('#adminPriceTabCurrent').classList.toggle('active', isCurrent);
    $('#adminPriceTabUpcoming').classList.toggle('active', !isCurrent);

    $('#adminPriceEffectiveDate').value = isCurrent
      ? state.pricing.currentEffectiveDate || ''
      : state.pricing.upcomingEffectiveDate || '';

    const list = isCurrent ? state.pricing.current || [] : state.pricing.upcoming || [];
    const editor = $('#adminPricingEditor');

    editor.innerHTML = list
      .map(
        (cat, ci) => `
        <div class="protocol-step">
          <div class="row-gap" style="margin-bottom:8px;">
            <input class="input" style="flex:1;font-weight:700;" type="text" data-cat-title="${ci}" value="${esc(cat.category)}" />
            <button class="btn btn-sm btn-ghost" type="button" data-del-cat="${ci}" title="Kategória törlése">🗑</button>
          </div>
          ${(cat.items || [])
            .map(
              (item, ii) => `
              <div class="row-gap mt-1">
                <input class="input" style="flex:2;" type="text" data-item-name="${ci}:${ii}" value="${esc(item.name)}" placeholder="Szolgáltatás" />
                <input class="input" style="flex:1;min-width:96px;" type="number" data-item-price="${ci}:${ii}" value="${item.price}" step="100" />
                <button class="btn btn-sm btn-ghost" type="button" data-del-item="${ci}:${ii}">✕</button>
              </div>`
            )
            .join('')}
          <button class="btn btn-sm btn-secondary mt-1" type="button" data-add-item="${ci}">+ Tétel hozzáadása</button>
        </div>`
      )
      .join('');

    // Kötések
    $$('[data-cat-title]').forEach((inp) => {
      inp.addEventListener('input', () => {
        list[Number(inp.dataset.catTitle)].category = inp.value;
      });
    });
    $$('[data-item-name]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const [ci, ii] = inp.dataset.itemName.split(':').map(Number);
        list[ci].items[ii].name = inp.value;
      });
    });
    $$('[data-item-price]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const [ci, ii] = inp.dataset.itemPrice.split(':').map(Number);
        list[ci].items[ii].price = Number(inp.value) || 0;
      });
    });
    $$('[data-add-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ci = Number(btn.dataset.addItem);
        list[ci].items.push({ id: `i_${Date.now()}`, name: 'Új szolgáltatás', price: 5000 });
        renderPricingEditor();
      });
    });
    $$('[data-del-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [ci, ii] = btn.dataset.delItem.split(':').map(Number);
        list[ci].items.splice(ii, 1);
        renderPricingEditor();
      });
    });
    $$('[data-del-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        list.splice(Number(btn.dataset.delCat), 1);
        renderPricingEditor();
      });
    });
  }

  function getDefaultBaseUrl() {
    const loc = window.location;
    const basePath = loc.pathname.replace(/admin\.html$/i, '');
    return `${loc.origin}${basePath.endsWith('/') ? basePath : basePath + '/'}`;
  }

  function renderQrCodes() {
    let base = ($('#qrBaseUrlInput').value || '').trim();
    if (!base) {
      base = getDefaultBaseUrl();
      $('#qrBaseUrlInput').value = base;
    }
    if (!base.endsWith('/')) base += '/';

    const guestUrl = `${base}index.html`;
    const adminUrl = `${base}admin.html`;

    $('#qrGuestUrlText').textContent = guestUrl;
    $('#qrAdminUrlText').textContent = adminUrl;

    try {
      window.QRCodeGen.renderToCanvas($('#qrGuestCanvas'), guestUrl, { size: 220 });
      window.QRCodeGen.renderToCanvas($('#qrAdminCanvas'), adminUrl, { size: 220 });
    } catch (err) {
      showToast(err.message || 'QR-kód generálási hiba.');
    }
  }

  function downloadCanvasPng(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function printQrCard(canvasId, title, subtitle) {
    const canvas = document.getElementById(canvasId);
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=520,height=680');
    if (!win) {
      showToast('Engedélyezd a felugró ablakot a nyomtatáshoz!');
      return;
    }
    win.document.write(`
      <!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8"><title>${esc(title)}</title>
      <style>
        body{font-family:sans-serif;text-align:center;padding:40px;color:#111;}
        .card{border:2px solid #222;border-radius:20px;padding:32px;max-width:380px;margin:0 auto;}
        h1{margin:0 0 8px;font-size:24px;}
        p{color:#555;margin:0 0 24px;font-size:15px;}
        img{width:240px;height:240px;}
      </style></head><body>
      <div class="card">
        <h1>${esc(window.APP_CONFIG.SALON_NAME)}</h1>
        <p><strong>${esc(title)}</strong><br>${esc(subtitle)}</p>
        <img src="${dataUrl}" alt="QR kód" />
      </div>
      <script>window.onload=function(){window.print();};</script></body></html>
    `);
    win.document.close();
  }

  // ---------------- ESEMÉNYKEZELŐK ----------------
  function bindEvents() {
    // Navigáció
    $$('[data-admin-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.adminTab;
        $$('.tab-section').forEach((s) => s.classList.toggle('active', s.id === `admin-tab-${target}`));
        $$('[data-admin-tab]').forEach((b) => b.classList.toggle('active', b.dataset.adminTab === target));
        if (target === 'settings') renderQrCodes();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // Progressive disclosure
    document.addEventListener('click', (e) => {
      const trig = e.target.closest('[data-disclosure]');
      if (!trig) return;
      const box = document.getElementById(trig.dataset.disclosure);
      if (box) box.classList.toggle('open');
    });

    // Naptár szűrők
    $$('#calFilterChips .chip').forEach((ch) => {
      ch.addEventListener('click', () => {
        state.calFilter = ch.dataset.calFilter;
        $$('#calFilterChips .chip').forEach((c) => c.classList.toggle('selected', c.dataset.calFilter === state.calFilter));
        renderCalendar();
      });
    });

    // Szinkron & Zárolás
    $('#adminSyncBtn').addEventListener('click', async () => {
      showToast('Google Naptár szinkronizálása...');
      const res = await window.SalonService.triggerCalendarSync();
      showToast(res.ok ? 'Naptár szinkronizálva!' : 'Demo / offline mód – Apps Script beállítás után élőben szinkronizál.');
    });

    $('#adminLockBtn').addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_UNLOCK_KEY);
      configurePinScreen();
    });

    $('#closeAdminDemo').addEventListener('click', () => $('#adminDemoBanner').classList.add('hidden'));

    $('#adminEnablePushBtn').addEventListener('click', async () => {
      const res = await window.SalonService.requestPushPermission('admin');
      if (res.ok) {
        $('#adminPushBanner').classList.add('hidden');
        showToast('Admin értesítések bekapcsolva!');
      } else {
        showToast(res.reason || 'Nem sikerült az értesítések bekapcsolása.');
      }
    });

    // Extra emlékeztető modál
    $('#closeReminderModal').addEventListener('click', () => $('#reminderModal').classList.add('hidden'));
    $('#reminderModal').addEventListener('click', (e) => {
      if (e.target.id === 'reminderModal') $('#reminderModal').classList.add('hidden');
    });

    $('#sendReminderConfirmBtn').addEventListener('click', async () => {
      if (!state.reminderTarget) return;
      const { appt, guest } = state.reminderTarget;
      const custom = $('#reminderCustomMsg').value.trim();
      const defaultMsg = `Emlékeztető: ${formatHuDateFull(appt.startIso)} (${formatTimeRange(appt.startIso, appt.endIso)}) – szeretettel várlak a szalonban!`;

      await window.SalonService.sendPushNotification({
        targetRole: 'guest',
        guestId: appt.guestId,
        title: `🔔 Emlékeztető – ${window.APP_CONFIG.SALON_NAME}`,
        body: custom || defaultMsg,
        url: './index.html'
      });

      $('#reminderModal').classList.add('hidden');
      showToast(`Extra emlékeztető elküldve: ${guest.name || appt.title}`);
    });

    // Új Villám-időpont kiküldése
    $('#createFlashSlotBtn').addEventListener('click', async () => {
      const dtVal = $('#flashDateTimeInput').value;
      if (!dtVal) {
        showToast('Add meg a villám-időpont dátumát és idejét!');
        return;
      }
      const durationMin = Number($('#flashDurationSelect').value);
      const note = $('#flashNoteInput').value.trim();

      await window.SalonService.createFlashSlot({
        dateLabel: new Date(dtVal).toISOString(),
        durationMin,
        note
      });
      $('#flashNoteInput').value = '';
      showToast('VIP Villám-időpont kiküldve a feliratkozóknak!');
    });

    // Árlista tabok & mentés
    $('#adminPriceTabCurrent').addEventListener('click', () => {
      state.pricingEditTab = 'current';
      renderPricingEditor();
    });
    $('#adminPriceTabUpcoming').addEventListener('click', () => {
      state.pricingEditTab = 'upcoming';
      renderPricingEditor();
    });

    $('#adminPriceEffectiveDate').addEventListener('input', (e) => {
      if (state.pricingEditTab === 'current') state.pricing.currentEffectiveDate = e.target.value;
      else state.pricing.upcomingEffectiveDate = e.target.value;
    });

    $('#addCategoryBtn').addEventListener('click', () => {
      const target = state.pricingEditTab === 'current' ? state.pricing.current : state.pricing.upcoming;
      target.push({ category: 'Új kategória', items: [{ id: `i_${Date.now()}`, name: 'Új szolgáltatás', price: 6000 }] });
      renderPricingEditor();
    });

    $('#copyAndRaiseBtn').addEventListener('click', () => {
      const raise = Number($('#raiseAmountInput').value) || 0;
      state.pricing.upcoming = (state.pricing.current || []).map((cat) => ({
        category: cat.category,
        items: (cat.items || []).map((it) => ({
          id: it.id,
          name: it.name,
          price: Math.max(0, Number(it.price || 0) + raise)
        }))
      }));
      state.pricingEditTab = 'upcoming';
      renderPricingEditor();
      $('#copyRaiseDisclosure').classList.remove('open');
      showToast(`Aktuális árlista átmásolva +${raise.toLocaleString('hu-HU')} Ft emeléssel! Ne felejtsd el elmenteni.`);
    });

    $('#savePricingBtn').addEventListener('click', async () => {
      await window.SalonService.savePricing(state.pricing);
      showToast('Árlista sikeresen elmentve!');
    });

    // QR gombok
    $('#regenerateQrBtn').addEventListener('click', renderQrCodes);
    $('#downloadGuestQrBtn').addEventListener('click', () => downloadCanvasPng('qrGuestCanvas', 'vendeg-szalon-qr.png'));
    $('#downloadAdminQrBtn').addEventListener('click', () => downloadCanvasPng('qrAdminCanvas', 'admin-szalon-qr.png'));
    $('#printGuestQrBtn').addEventListener('click', () =>
      printQrCard('qrGuestCanvas', 'VIP Vendég Alkalmazás', 'Olvasd be a kameráddal és add a kezdőképernyődhöz!')
    );
    $('#printAdminQrBtn').addEventListener('click', () =>
      printQrCard('qrAdminCanvas', 'Admin Vezérlőpult', 'Fodrász alkalmazás telepítéséhez')
    );

    // PIN módosítás
    $('#changePinBtn').addEventListener('click', async () => {
      const p1 = $('#newPinInput').value.trim();
      const p2 = $('#confirmNewPinInput').value.trim();
      if (!/^\d{4,6}$/.test(p1)) {
        showToast('A PIN-kód pontosan 4–6 számjegyből álljon!');
        return;
      }
      if (p1 !== p2) {
        showToast('A két beírt PIN-kód nem egyezik!');
        return;
      }
      const hash = await window.SalonService.hashPin(p1);
      await window.SalonService.saveAdminPinHash(hash);
      state.adminConfig.pinHash = hash;
      $('#newPinInput').value = '';
      $('#confirmNewPinInput').value = '';
      showToast('Admin PIN-kód sikeresen megváltoztatva!');
    });
  }

  function switchAdminTab(target) {
    $$('.tab-section').forEach((s) => s.classList.toggle('active', s.id === `admin-tab-${target}`));
    $$('[data-admin-tab]').forEach((b) => b.classList.toggle('active', b.dataset.adminTab === target));
    if (target === 'settings') renderQrCodes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderAdminUrgentAlerts() {
    if (!window.PwaUX) return;
    const now = new Date();
    const gMap = guestMap();
    const alerts = [];

    // 1. Függőben lévő 4x SOS kérések (LEGKIEMELTEBB PIROS PULZÁLÓ SÁV)
    const pendingSos = state.sosRequests.filter((r) => r.status === 'pending');
    pendingSos.forEach((req) => {
      alerts.push({
        type: 'danger',
        icon: '🚨',
        title: `SOS (4x ÁR) KÉRÉS: ${req.guestName}`,
        subtitle: `${req.serviceName} (${formatHuf(req.sosPrice)}) · ${req.intervalSummary}`,
        cta: 'Elbírálás',
        onClick: () => switchAdminTab('flashsos')
      });
    });

    // 2. Mai 10 perces késések
    const lateToday = state.appointments.filter(
      (a) => a.lateNotice && isSameDay(new Date(a.startIso), now)
    );
    lateToday.forEach((a) => {
      const g = gMap[a.guestId] || {};
      alerts.push({
        type: 'danger',
        icon: '⏱️',
        title: `+10 PERC KÉSÉS: ${g.name || a.title || 'Vendég'}`,
        subtitle: `Mai időpont: ${formatTimeRange(a.startIso, a.endIso)}`,
        cta: 'Naptár',
        onClick: () => switchAdminTab('calendar')
      });
    });

    // 3. Aktív villám-időpont jelentkezők
    let flashApplicantsCount = 0;
    state.flashSlots
      .filter((s) => s.status === 'open')
      .forEach((s) => {
        flashApplicantsCount += Object.keys(s.applicants || {}).length;
      });
    if (flashApplicantsCount > 0) {
      alerts.push({
        type: 'accent',
        icon: '⚡',
        title: `${flashApplicantsCount} VIP VILLÁM-JELENTKEZŐ VÁR JÓVÁHAGYÁSRA!`,
        subtitle: 'Válaszd ki, kié legyen a felszabadult időpont.',
        cta: 'Megnézem',
        onClick: () => switchAdminTab('flashsos')
      });
    }

    // 4. Párosításra váró új vendégek
    const pendingGuests = state.guests.filter((g) => !g.paired);
    if (pendingGuests.length > 0) {
      alerts.push({
        type: 'accent',
        icon: '👤',
        title: `${pendingGuests.length} új vendég párosításra vár`,
        subtitle: 'Add meg a Google Naptár nevét a szinkronhoz.',
        cta: 'Párosítás',
        onClick: () => switchAdminTab('guests')
      });
    }

    window.PwaUX.renderUrgentStack('adminUrgentStack', alerts);
    window.PwaUX.setNavBadge('adminCalNavBadge', lateToday.length, lateToday.length > 0);
    window.PwaUX.setNavBadge('adminSosNavBadge', pendingSos.length + flashApplicantsCount, pendingSos.length > 0 || flashApplicantsCount > 0);
    window.PwaUX.setNavBadge('adminGuestNavBadge', pendingGuests.length, false);
  }

  let subscriptionsStarted = false;
  function startAdminSubscriptions() {
    if (subscriptionsStarted) return;
    subscriptionsStarted = true;

    let guestsLoaded = false;
    let prevPendingGuestIds = new Set();
    window.SalonService.subscribeAllGuests((guests) => {
      const pendingNow = guests.filter((g) => !g.paired);
      if (guestsLoaded && window.PwaUX) {
        const newest = pendingNow.find((g) => !prevPendingGuestIds.has(g.id));
        if (newest) {
          window.PwaUX.playTone('normal');
          window.PwaUX.vibrate('normal');
          showToast(`👤 Új vendég regisztrált: ${newest.name}`);
        }
      }
      prevPendingGuestIds = new Set(pendingNow.map((g) => g.id));
      guestsLoaded = true;
      state.guests = guests;
      renderGuests();
      renderCalendar();
    });

    let apptsLoaded = false;
    let prevLateIds = new Set();
    window.SalonService.subscribeAllAppointments((appts) => {
      const lateNow = appts.filter((a) => a.lateNotice && isSameDay(new Date(a.startIso), new Date()));
      if (apptsLoaded && window.PwaUX) {
        const newLate = lateNow.find((a) => !prevLateIds.has(a.id));
        if (newLate) {
          const g = guestMap()[newLate.guestId] || {};
          window.PwaUX.showAttentionAlert({
            title: '⏱️ +10 perc késés jelzés!',
            body: `${g.name || newLate.title || 'Egy vendéged'} jelezte, hogy 10 percet késik a mai időpontjáról (${formatTimeRange(newLate.startIso, newLate.endIso)}).`,
            level: 'urgent',
            actionLabel: 'Naptár megnyitása',
            onAction: () => switchAdminTab('calendar')
          });
        }
      }
      prevLateIds = new Set(lateNow.map((a) => a.id));
      apptsLoaded = true;
      state.appointments = appts;
      renderCalendar();
      renderAdminUrgentAlerts();
    });

    let sosLoaded = false;
    let prevSosIds = new Set();
    window.SalonService.subscribeAllSos((sos) => {
      const pendingNow = sos.filter((r) => r.status === 'pending');
      if (sosLoaded && window.PwaUX) {
        const newSos = pendingNow.find((r) => !prevSosIds.has(r.id));
        if (newSos) {
          window.PwaUX.showAttentionAlert({
            title: '🚨 ÚJ SOS (4x ÁR) KÉRÉS!',
            body: `${newSos.guestName}: ${newSos.serviceName} (${formatHuf(newSos.sosPrice)}) – ${newSos.intervalSummary}`,
            level: 'urgent',
            actionLabel: 'Elbírálás most',
            onAction: () => switchAdminTab('flashsos')
          });
        }
      }
      prevSosIds = new Set(pendingNow.map((r) => r.id));
      sosLoaded = true;
      state.sosRequests = sos;
      renderFlashAndSos();
    });

    let flashLoaded = false;
    let prevApplicantCount = 0;
    window.SalonService.subscribeFlashSlots((slots) => {
      let count = 0;
      slots.filter((s) => s.status === 'open').forEach((s) => { count += Object.keys(s.applicants || {}).length; });
      if (flashLoaded && count > prevApplicantCount && window.PwaUX) {
        window.PwaUX.showAttentionAlert({
          title: '⚡ Új Villám-időpont jelentkező!',
          body: 'Egy vendéged jelentkezett az aktív VIP villám-időpontra!',
          level: 'urgent',
          actionLabel: 'Jelentkezők megnyitása',
          onAction: () => switchAdminTab('flashsos')
        });
      }
      prevApplicantCount = count;
      flashLoaded = true;
      state.flashSlots = slots;
      renderFlashAndSos();
    });

    window.SalonService.subscribePricing((pricing) => {
      state.pricing = JSON.parse(JSON.stringify(pricing));
      renderPricingEditor();
    });

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      $('#adminPushBanner').classList.remove('hidden');
    }
  }

  async function bootstrap() {
    $('#adminSalonTitle').textContent = `${window.APP_CONFIG.SALON_NAME} Admin`;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    if (window.PwaUX) {
      window.PwaUX.initInstallPrompt({
        role: 'admin',
        containerId: 'adminInstallBanner',
        headerBtnId: 'adminInstallHeaderBtn'
      });
    }

    const { demoMode } = await window.SalonService.init();
    if (demoMode) $('#adminDemoBanner').classList.remove('hidden');

    window.SalonService.onForegroundPush(({ title, body }) => {
      if (window.PwaUX) {
        window.PwaUX.showAttentionAlert({
          title,
          body,
          level: 'urgent',
          actionLabel: /sos|villám/i.test(`${title} ${body}`) ? 'Villám & SOS megnyitása' : 'Naptár megnyitása',
          onAction: () => switchAdminTab(/sos|villám/i.test(`${title} ${body}`) ? 'flashsos' : 'calendar')
        });
      } else {
        showToast(`${title}${body ? ' – ' + body : ''}`);
      }
    });

    // Alapértelmezett villám-időpont mező (holnap 15:00)
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(15, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    $('#flashDateTimeInput').value = localIso;

    setupPinPad();
    bindEvents();

    state.adminConfig = await window.SalonService.getAdminConfig();

    if (state.adminConfig.pinHash && sessionStorage.getItem(SESSION_UNLOCK_KEY) === '1') {
      $('#pinOverlay').classList.add('hidden');
      startAdminSubscriptions();
    } else {
      configurePinScreen();
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
