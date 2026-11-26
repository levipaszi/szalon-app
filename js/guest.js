/* ==========================================================================
   Atelier Szalon – Vendég PWA Alkalmazás Logika (js/guest.js)
   ========================================================================== */

(function () {
  'use strict';

  const GUEST_ID_KEY = 'atelier_guest_id_v1';
  const GUEST_THEME_KEY = 'atelier_guest_theme_v1';

  const state = {
    guestId: localStorage.getItem(GUEST_ID_KEY) || '',
    guest: null,
    appointments: [],
    pricing: window.APP_CONFIG.DEFAULT_PRICING,
    pricingTab: 'current',
    contact: {
      phoneRaw: window.APP_CONFIG.SOS_PHONE_RAW,
      phoneDisplay: window.APP_CONFIG.SOS_PHONE_DISPLAY,
      messengerHandle: ''
    },
    chatOpen: false,
    flashSlots: [],
    sosRequests: [],
    sosQuick: '',
    sosDays: new Set(),
    pendingPhotoDataUrl: '',
    wizard: {
      active: false,
      step: 0,
      answers: {
        texture: '',
        thickness: '',
        porosity: '',
        maleExtra: 'none',
        treatment: '',
        scalp: '',
        concerns: []
      },
      generated: null
    }
  };

  // ---------------- SEGÉDFÜGGVÉNYEK ----------------
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

  function formatHuDateFull(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  function formatHuTimeRange(startIso, endIso) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const f = (dt) => dt.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    return `${f(s)} – ${f(e)}`;
  }

  function isSameCalendarDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function formatHuf(amount) {
    return `${Number(amount || 0).toLocaleString('hu-HU')} Ft`;
  }

  // ---------------- TÉMA KEZELÉS ----------------
  function applyTheme(theme) {
    const valid = ['male', 'female-light', 'female-dark'].includes(theme) ? theme : 'male';
    document.documentElement.setAttribute('data-theme', valid);
    localStorage.setItem(GUEST_THEME_KEY, valid);

    const metaColor = $('#metaThemeColor');
    if (metaColor) {
      metaColor.setAttribute(
        'content',
        valid === 'female-light' ? '#FAF6F2' : valid === 'female-dark' ? '#1C1619' : '#0F1012'
      );
    }

    $$('#modalThemeChoices .theme-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.themeSwitch === valid);
    });
  }

  // ---------------- NAVIGÁCIÓ ----------------
  function switchTab(tabName) {
    $$('.tab-section').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `tab-${tabName}`);
    });
    $$('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupDisclosures() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-disclosure]');
      if (!trigger) return;
      const box = document.getElementById(trigger.dataset.disclosure);
      if (box) box.classList.toggle('open');
    });
  }

  // ---------------- FŐOLDAL RENDERELÉS ----------------
  function getNextAndPastAppointments() {
    const now = new Date();
    const sorted = state.appointments
      .slice()
      .sort((a, b) => new Date(a.startIso) - new Date(b.startIso));
    const past = sorted.filter((a) => new Date(a.endIso || a.startIso) < now);
    const future = sorted.filter((a) => new Date(a.endIso || a.startIso) >= now);
    return {
      lastPast: past.length ? past[past.length - 1] : null,
      nextAppt: future.length ? future[0] : null,
      allFuture: future
    };
  }

  function renderHairHealth(lastPast) {
    const cycle = (state.guest && state.guest.cycleDays) || 35;
    const circle = $('#healthRingCircle');
    const pctText = $('#healthPercentText');
    const headline = $('#healthHeadline');
    const meta = $('#healthMeta');
    const circumference = 2 * Math.PI * 46; // ~289.03

    let pct = 100;
    let headlineStr = 'Friss frizura';
    let metaStr = 'Még nincs korábbi látogatás rögzítve a naptárban.';

    if (lastPast) {
      const daysSince = Math.max(0, Math.floor((Date.now() - new Date(lastPast.startIso).getTime()) / 86400000));
      pct = Math.max(0, Math.min(100, Math.round(100 - (daysSince / cycle) * 100)));

      if (pct >= 70) headlineStr = 'Csúcsformában a frizurád';
      else if (pct >= 40) headlineStr = 'Szépen tartja a formáját';
      else if (pct >= 15) headlineStr = 'Hamarosan időszerű a frissítés';
      else headlineStr = 'Itt az ideje a következő alkalomnak!';

      const remaining = Math.max(0, cycle - daysSince);
      metaStr = `${daysSince} nap telt el az utolsó alkalom óta (${cycle} napos ciklus, kb. ${remaining} nap múlva ideális a következő).`;
    }

    pctText.textContent = `${pct}%`;
    headline.textContent = headlineStr;
    meta.textContent = metaStr;

    const offset = circumference - (pct / 100) * circumference;
    requestAnimationFrame(() => {
      circle.style.strokeDasharray = `${circumference}`;
      circle.style.strokeDashoffset = `${offset}`;
    });
  }

  function renderHome() {
    if (!state.guest) return;
    $('#guestGreeting').textContent = `Szia, ${state.guest.name}!`;

    const { lastPast, nextAppt, allFuture } = getNextAndPastAppointments();
    renderHairHealth(lastPast);

    const nextContent = $('#nextApptContent');
    const lateWrap = $('#lateNoticeWrap');
    const lateBtn = $('#late10Btn');
    const lateStatus = $('#lateNoticeStatus');
    const checkinCard = $('#checkinCard');

    if (!nextAppt) {
      const pairingHint = !state.guest.paired
        ? 'A profilod párosításra vár – amint a fodrászod összeköti a neveddel a Google Naptárt, minden időpontod élőben megjelenik itt.'
        : 'Jelenleg nincs lefoglalt időpontod a naptárban.';
      const msgUrl = buildMessengerUrl(state.contact && state.contact.messengerHandle);
      const phoneRaw = (state.contact && state.contact.phoneRaw) || window.APP_CONFIG.SOS_PHONE_RAW;
      const phoneDisp = (state.contact && state.contact.phoneDisplay) || window.APP_CONFIG.SOS_PHONE_DISPLAY;
      nextContent.innerHTML = `
        <p class="muted mt-1">${esc(pairingHint)}</p>
        <div class="no-appt-cta">
          <strong style="font-size:0.95rem;">Szeretnél új időpontot foglalni?</strong>
          <button class="btn btn-primary btn-block" id="homeRequestApptBtn" type="button">
            💬 Üzenet az appban (Időpontkérés)
          </button>
          ${msgUrl ? `<a class="btn btn-messenger btn-block" href="${esc(msgUrl)}" target="_blank" rel="noopener">💬 Írás Facebook Messengeren</a>` : ''}
          <a class="btn btn-secondary btn-block" href="tel:${esc(phoneRaw)}">📞 Hívás: ${esc(phoneDisp)}</a>
        </div>
      `;
      const reqBtn = $('#homeRequestApptBtn');
      if (reqBtn) {
        reqBtn.addEventListener('click', () => {
          switchTab('appointments');
          openGuestChat(true);
        });
      }
      lateWrap.classList.add('hidden');
      checkinCard.classList.add('hidden');
    } else {
      const d = new Date(nextAppt.startIso);
      const isToday = isSameCalendarDay(d, new Date());
      nextContent.innerHTML = `
        <div class="next-appt-date">${esc(formatHuDateFull(nextAppt.startIso))}</div>
        <div class="row-gap">
          <span class="next-appt-time">🕒 ${esc(formatHuTimeRange(nextAppt.startIso, nextAppt.endIso))}</span>
          <span class="badge">${nextAppt.durationMin || 60} perc</span>
          ${isToday ? '<span class="badge badge-success">Ma!</span>' : ''}
        </div>
        ${nextAppt.title ? `<p class="muted small mt-1">${esc(nextAppt.title)}</p>` : ''}
      `;

      // Időpont napján aktív 10 perc késés gomb (más napokon inaktív tájékoztatóként látható, hogy a vendég mindig tudja, hol találja)
      lateWrap.classList.remove('hidden');
      if (isToday) {
        if (nextAppt.lateNotice) {
          lateBtn.disabled = true;
          lateBtn.className = 'btn btn-secondary btn-block';
          lateBtn.textContent = '✓ 10 perces késés elküldve a fodrászodnak';
          lateStatus.textContent = 'Köszönjük, hogy szóltál!';
        } else {
          lateBtn.disabled = false;
          lateBtn.className = 'btn btn-danger btn-block';
          lateBtn.textContent = '⏱️ Késni fogok 10 percet';
          lateStatus.textContent = 'Azonnali értesítést küld a fodrászodnak.';
        }
      } else {
        lateBtn.disabled = true;
        lateBtn.className = 'btn btn-secondary btn-block';
        lateBtn.textContent = '⏱️ Késni fogok 10 percet';
        lateStatus.textContent = 'Az időpontod napján (reggeltől) automatikusan aktív lesz ez a gomb.';
      }

      // Check-in kártya frissítése
      checkinCard.classList.remove('hidden');
      $$('#moodChoices .choice-btn').forEach((b) => {
        b.classList.toggle('selected', b.dataset.mood === nextAppt.mood);
      });
      $$('#drinkChoices .choice-btn').forEach((b) => {
        b.classList.toggle('selected', b.dataset.drink === nextAppt.drink);
      });

      const preview = $('#inspoPhotoPreview');
      if (nextAppt.photoDataUrl) {
        preview.src = nextAppt.photoDataUrl;
        preview.classList.remove('hidden');
      } else if (!state.pendingPhotoDataUrl) {
        preview.classList.add('hidden');
      }
      if ($('#inspoPhotoNote').value === '' && nextAppt.photoNote) {
        $('#inspoPhotoNote').value = nextAppt.photoNote;
      }
    }

    // Összes lefoglalt időpont dinamikus évszámok szerinti csoportosítása
    $('#allApptsTitle').textContent = `Összes lefoglalt időpontom (${allFuture.length})`;
    const body = $('#allApptsBody');
    if (!allFuture.length) {
      body.innerHTML = '<p class="muted small">Még nincs rögzített jövőbeli időpontod.</p>';
    } else {
      const grouped = {};
      allFuture.forEach((appt) => {
        const y = new Date(appt.startIso).getFullYear();
        if (!grouped[y]) grouped[y] = [];
        grouped[y].push(appt);
      });
      const years = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
      body.innerHTML = years
        .map(
          (year) => `
          <div class="year-group">
            <div class="year-heading">${year}</div>
            ${grouped[year]
              .map(
                (a) => `
                <div class="appt-list-item">
                  <div>
                    <div style="font-weight:600;font-size:0.93rem;">${esc(formatHuDateFull(a.startIso))}</div>
                    <div class="small muted">${esc(formatHuTimeRange(a.startIso, a.endIso))} · ${a.durationMin || 60} perc</div>
                  </div>
                  <span class="badge badge-accent">${new Date(a.startIso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>`
              )
              .join('')}
          </div>`
        )
        .join('');
    }
  }

  // ---------------- HAJÁPOLÁS VARÁZSLÓ ----------------
  function getWizardSteps() {
    const isMale = state.guest && state.guest.theme === 'male';
    const steps = [
      { key: 'texture', title: '1. Milyen a hajad természetes szerkezete?', single: true, options: window.HaircareEngine.OPTIONS.textures },
      { key: 'thickness', title: '2. Milyen vastag egy-egy hajszálad?', single: true, options: window.HaircareEngine.OPTIONS.thicknesses },
      { key: 'porosity', title: '3. Milyen a hajad porozitása?', single: true, options: window.HaircareEngine.OPTIONS.porosities, showPorosityGuide: true }
    ];
    if (isMale) {
      steps.push({
        key: 'maleExtra',
        title: '4. Szakállápolás & Rövid haj formázás',
        single: true,
        options: window.HaircareEngine.OPTIONS.maleExtras
      });
    }
    steps.push(
      { key: 'treatment', title: `${isMale ? '5' : '4'}. Milyen kémiai vagy hőkezelés éri a hajadat?`, single: true, options: window.HaircareEngine.OPTIONS.treatments },
      { key: 'scalp', title: `${isMale ? '6' : '5'}. Milyen a fejbőröd állapota?`, single: true, options: window.HaircareEngine.OPTIONS.scalps },
      { key: 'concerns', title: `${isMale ? '7' : '6'}. Mi a fő problémád? (Több is választható)`, single: false, options: window.HaircareEngine.OPTIONS.concerns }
    );
    return steps;
  }

  function renderAdviceResult(advice, isSavedView) {
    const redFlagHtml = advice.redFlag
      ? `
        <div class="red-flag-card">
          <div class="card-eyebrow" style="color:#EF4444;">Kiemelt szakmai jelzés</div>
          <h3>🩺 ${esc(advice.redFlag.title)}</h3>
          <p class="small" style="margin-bottom:10px;">${esc(advice.redFlag.lead)}</p>
          <ul class="protocol-list">
            ${advice.redFlag.points.map((p) => `<li>${esc(p)}</li>`).join('')}
          </ul>
        </div>`
      : '';

    const protocolHtml = `
      <div class="card">
        <div class="card-eyebrow">Hogyan csináld lépésről lépésre</div>
        <h2 class="card-title">Részletes Hajmosási &amp; Ápolási Protokoll</h2>
        ${advice.washingProtocol
          .map(
            (blk) => `
            <div class="protocol-step">
              <div class="protocol-step-title">${esc(blk.title)}</div>
              <ul class="protocol-list">
                ${blk.items.map((it) => `<li>${esc(it)}</li>`).join('')}
              </ul>
            </div>`
          )
          .join('')}
      </div>`;

    const cgmHtml = advice.cgmTemplate
      ? `
        <div class="card card-accent">
          <div class="card-eyebrow">Hullámos &amp; Göndör Sablon</div>
          <h2 class="card-title">${esc(advice.cgmTemplate.title)}</h2>
          ${advice.cgmTemplate.steps
            .map(
              (st) => `
              <div class="protocol-step">
                <div class="protocol-step-title">${esc(st.name)}</div>
                <p class="small" style="line-height:1.58;">${esc(st.detail)}</p>
              </div>`
            )
            .join('')}
        </div>`
      : '';

    const maleHtml = advice.maleExtras
      ? `
        <div class="card">
          <div class="card-eyebrow">Férfi kiegészítő rutin</div>
          <h2 class="card-title">Rövid haj &amp; Szakállápolás</h2>
          ${advice.maleExtras
            .map(
              (blk) => `
              <div class="protocol-step">
                <div class="protocol-step-title">${esc(blk.title)}</div>
                <ul class="protocol-list">
                  ${blk.items.map((it) => `<li>${esc(it)}</li>`).join('')}
                </ul>
              </div>`
            )
            .join('')}
        </div>`
      : '';

    const keywordsHtml = `
      <div class="card">
        <div class="card-eyebrow">Hatóanyag-kalauz (Márkanevek nélkül)</div>
        <h2 class="card-title">Másolható keresőszavak drogériába / webshopba</h2>
        <p class="muted small mt-1">Koppints a másolásra, és írd be bármelyik drogéria vagy webshop keresőjébe:</p>
        <div class="mt-2">
          ${advice.keywords
            .map(
              (kw, idx) => `
              <div class="copy-keyword-row">
                <div>
                  <div class="copy-keyword-text">„${esc(kw.term)}”</div>
                  <div class="small muted">${esc(kw.why)}</div>
                </div>
                <button class="btn btn-sm btn-secondary" type="button" data-copy-kw="${idx}">Másolás</button>
              </div>`
            )
            .join('')}
        </div>
      </div>`;

    return `
      <div class="card">
        <div class="row-between">
          <span class="card-eyebrow">${isSavedView ? 'Elmentett rutinod' : 'Személyre szabott eredmény'}</span>
          <button class="btn btn-sm btn-ghost" id="restartWizardBtn" type="button">Új kitöltés</button>
        </div>
        <div class="chip-row mt-1">
          ${advice.summaryTags.map((t) => `<span class="badge badge-accent">${esc(t)}</span>`).join('')}
        </div>
        ${
          !isSavedView
            ? `<button class="btn btn-primary btn-block mt-2" id="saveRoutineBtn" type="button">💾 Rutin mentése a profilomba</button>`
            : ''
        }
      </div>
      ${redFlagHtml}
      ${protocolHtml}
      ${cgmHtml}
      ${maleHtml}
      ${keywordsHtml}
      <div class="disclaimer-box">
        ${esc(advice.disclaimer)}
      </div>
    `;
  }

  function renderHaircare() {
    const root = $('#haircareRoot');
    if (!root) return;

    // Ha van mentett rutin és nincs aktív varázsló, mutassuk a mentett rutint
    if (!state.wizard.active && !state.wizard.generated && state.guest && state.guest.savedRoutine) {
      root.innerHTML = renderAdviceResult(state.guest.savedRoutine, true);
      bindHaircareResultEvents(state.guest.savedRoutine);
      return;
    }

    // Ha frissen generált eredmény van
    if (state.wizard.generated) {
      root.innerHTML = renderAdviceResult(state.wizard.generated, false);
      bindHaircareResultEvents(state.wizard.generated);
      return;
    }

    // Ha még nem indult el a varázsló és nincs mentett rutin
    if (!state.wizard.active) {
      root.innerHTML = `
        <div class="card card-accent">
          <div class="card-eyebrow">1 képernyő = 1 döntés</div>
          <h2 class="card-title">Készítsük el a személyes hajápolási protokollodat!</h2>
          <p class="muted mt-1">Pár egyszerű kérdés után kapsz egy részletes, bőrgyógyászati és trichológiai alapokon nyugvó, lépésről lépésre követhető hajmosási és ápolási útmutatót – tévhitek és reklámok nélkül.</p>
          <button class="btn btn-primary btn-block mt-3" id="startWizardBtn" type="button">
            Tanácsadó indítása →
          </button>
        </div>`;
      $('#startWizardBtn').addEventListener('click', () => {
        state.wizard.active = true;
        state.wizard.step = 0;
        renderHaircare();
      });
      return;
    }

    // Aktív varázsló lépés
    const steps = getWizardSteps();
    const cur = steps[state.wizard.step];
    const progressDots = steps
      .map((_, i) => `<span class="wizard-dot ${i < state.wizard.step ? 'done' : i === state.wizard.step ? 'active' : ''}"></span>`)
      .join('');

    let optionsHtml = '';
    if (cur.single) {
      const selectedVal = state.wizard.answers[cur.key];
      optionsHtml = cur.options
        .map(
          (opt) => `
          <button class="option-card ${selectedVal === opt.id ? 'selected' : ''}" type="button" data-wiz-opt="${opt.id}">
            <div>
              <div class="option-card-title">${esc(opt.label)}</div>
              ${opt.desc ? `<div class="option-card-desc">${esc(opt.desc)}</div>` : ''}
            </div>
            <span>${selectedVal === opt.id ? '✓' : '›'}</span>
          </button>`
        )
        .join('');
    } else {
      const selectedArr = state.wizard.answers.concerns || [];
      optionsHtml = `
        <div class="chip-row">
          ${cur.options
            .map(
              (opt) => `
              <button class="chip ${selectedArr.includes(opt.id) ? 'selected' : ''}" type="button" data-wiz-multi="${opt.id}">
                ${esc(opt.label)}
              </button>`
            )
            .join('')}
        </div>
        <p class="small muted mt-2">Ha nincs különösebb problémád, egyszerűen kattints az „Eredmény készítése” gombra.</p>
      `;
    }

    const guide = window.HaircareEngine.POROSITY_GUIDE;
    const porosityGuideHtml = cur.showPorosityGuide
      ? `
        <div class="disclosure mt-2" id="porosityGuideDisc">
          <button class="disclosure-trigger" type="button" data-disclosure="porosityGuideDisc">
            <span>💧 Nem tudod? Vízpróbás &amp; tapintásos segédlet</span>
            <span class="disclosure-chevron">▾</span>
          </button>
          <div class="disclosure-body">
            <p class="small muted">${esc(guide.intro)}</p>
            ${guide.methods
              .map(
                (m) => `
                <div class="mt-2">
                  <strong class="small">${esc(m.name)}</strong>
                  <p class="small muted mt-1">${esc(m.steps)}</p>
                </div>`
              )
              .join('')}
          </div>
        </div>`
      : '';

    const isLast = state.wizard.step === steps.length - 1;
    const canContinue = cur.single ? !!state.wizard.answers[cur.key] : true;

    root.innerHTML = `
      <div class="card">
        <div class="wizard-progress">${progressDots}</div>
        <h2 class="card-title" style="margin-bottom:14px;">${esc(cur.title)}</h2>
        ${optionsHtml}
        ${porosityGuideHtml}
        <div class="row-between mt-3">
          <button class="btn btn-ghost" id="wizBackBtn" type="button">← Vissza</button>
          <button class="btn btn-primary" id="wizNextBtn" type="button" ${canContinue ? '' : 'disabled'}>
            ${isLast ? 'Protokoll elkészítése ✓' : 'Tovább →'}
          </button>
        </div>
      </div>
    `;

    $$('[data-wiz-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.wizard.answers[cur.key] = btn.dataset.wizOpt;
        if (!isLast) {
          state.wizard.step++;
        }
        renderHaircare();
      });
    });

    $$('[data-wiz-multi]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.wizMulti;
        const arr = state.wizard.answers.concerns;
        const idx = arr.indexOf(val);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(val);
        renderHaircare();
      });
    });

    $('#wizBackBtn').addEventListener('click', () => {
      if (state.wizard.step > 0) state.wizard.step--;
      else state.wizard.active = false;
      renderHaircare();
    });

    $('#wizNextBtn').addEventListener('click', () => {
      if (!isLast) {
        state.wizard.step++;
        renderHaircare();
      } else {
        const answersCopy = JSON.parse(JSON.stringify(state.wizard.answers));
        if (!(state.guest && state.guest.theme === 'male')) {
          answersCopy.maleExtra = 'none';
        }
        state.wizard.generated = window.HaircareEngine.generateAdvice(answersCopy);
        state.wizard.active = false;
        renderHaircare();
      }
    });
  }

  function bindHaircareResultEvents(advice) {
    const restartBtn = $('#restartWizardBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        state.wizard.generated = null;
        state.wizard.active = true;
        state.wizard.step = 0;
        renderHaircare();
      });
    }

    const saveBtn = $('#saveRoutineBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        await window.SalonService.updateGuest(state.guestId, { savedRoutine: advice });
        state.wizard.generated = null;
        showToast('Hajápolási rutinod elmentve a profilodba!');
      });
    }

    $$('[data-copy-kw]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const kw = advice.keywords[Number(btn.dataset.copyKw)];
        if (!kw) return;
        try {
          await navigator.clipboard.writeText(kw.term);
          showToast(`Vágólapra másolva: ${kw.term}`);
        } catch (_) {
          showToast(`Keresőszó: ${kw.term}`);
        }
      });
    });
  }

  // ---------------- IDŐPONTOK (VILLÁM + SOS) ----------------
  function renderAppointmentsTab() {
    if (!state.guest) return;

    const subToggle = $('#flashSubToggle');
    const prefWrap = $('#flashPrefWrap');
    const urgentToggle = $('#urgentEarlierToggle');

    subToggle.checked = !!state.guest.flashSubscribed;
    prefWrap.classList.toggle('hidden', !state.guest.flashSubscribed);
    urgentToggle.checked = !!state.guest.urgentEarlier;

    $$('#flashPrefChips .chip').forEach((ch) => {
      ch.classList.toggle('selected', ch.dataset.pref === (state.guest.flashPreference || 'any'));
    });

    // Aktív és frissen lezárt Villám-ajánlatok
    const container = $('#flashOffersContainer');
    const relevantSlots = state.flashSlots.filter((slot) => {
      const iApplied = slot.applicants && slot.applicants[state.guestId];
      return slot.status === 'open' || iApplied;
    });

    let hasBadgeAlert = false;
    if (!relevantSlots.length) {
      container.innerHTML = `
        <div class="card">
          <div class="card-eyebrow">Aktuális ajánlatok</div>
          <p class="muted small">Jelenleg nincs szabad villám-időpont. Kapcsold be a fenti riasztást, hogy azonnal értesülj a következőről!</p>
        </div>`;
    } else {
      container.innerHTML = relevantSlots
        .map((slot) => {
          const iApplied = slot.applicants && slot.applicants[state.guestId];
          let actionHtml = '';

          if (slot.status === 'open') {
            hasBadgeAlert = true;
            actionHtml = iApplied
              ? `<div class="badge badge-accent mt-2">✓ Jelentkeztél – A fodrászod hamarosan visszaigazolja</div>`
              : `<button class="btn btn-primary btn-block mt-2" type="button" data-apply-flash="${slot.id}">⚡ Jelentkezem erre az időpontra!</button>`;
          } else if (slot.winnerGuestId === state.guestId) {
            actionHtml = `<div class="sos-status-card sos-status-approved mt-2"><strong>🎉 Visszaigazolva!</strong> Tiéd lett ez a VIP villám-időpont – szeretettel várlak!</div>`;
          } else if (iApplied) {
            actionHtml = `<div class="sos-status-card sos-status-rejected mt-2 small">Sajnos erről most egy hajszállal lemaradtál, valaki más gyorsabb volt – de a következő villám-lehetőségnél újra elsőként értesítünk!</div>`;
          }

          const dateText = isNaN(Date.parse(slot.dateLabel))
            ? slot.dateLabel
            : `${formatHuDateFull(slot.dateLabel)} · ${new Date(slot.dateLabel).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}`;

          return `
            <div class="card card-accent">
              <div class="row-between">
                <span class="card-eyebrow">⚡ VIP Villám-időpont</span>
                <span class="badge">${slot.durationMin} perc</span>
              </div>
              <h3 class="mt-1">${esc(dateText)}</h3>
              ${slot.note ? `<p class="muted small mt-1">${esc(slot.note)}</p>` : ''}
              ${actionHtml}
            </div>`;
        })
        .join('');

      $$('[data-apply-flash]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await window.SalonService.applyToFlashSlot(btn.dataset.applyFlash, state.guest);
          showToast('Jelentkezésed elküldve a fodrászodnak!');
        });
      });
    }

    // SOS státusz kártya megjelenítése
    const sosContainer = $('#sosStatusContainer');
    const latestSos = state.sosRequests[0];
    if (!latestSos) {
      sosContainer.innerHTML = '';
    } else if (latestSos.status === 'pending') {
      sosContainer.innerHTML = `
        <div class="sos-status-card sos-status-pending">
          <strong>⏳ SOS kérés elküldve – Ellenőrzöm, hogy a körülmények engedik-e...</strong>
          <div class="small muted mt-1">${esc(latestSos.serviceName)} (${formatHuf(latestSos.sosPrice)}) · ${esc(latestSos.intervalSummary)}</div>
        </div>`;
    } else if (latestSos.status === 'approved') {
      hasBadgeAlert = true;
      sosContainer.innerHTML = `
        <div class="sos-status-card sos-status-approved">
          <strong>SOS kérésed elfogadva! Kérlek, hívj a ${esc(window.APP_CONFIG.SOS_PHONE_DISPLAY)} számon a pontosításért!</strong>
          <div class="small muted mt-1">${esc(latestSos.serviceName)} · 4x SOS díj: ${formatHuf(latestSos.sosPrice)}</div>
          <a class="btn btn-success btn-block mt-2" href="tel:${esc(window.APP_CONFIG.SOS_PHONE_RAW)}">
            📞 Hívás most: ${esc(window.APP_CONFIG.SOS_PHONE_DISPLAY)}
          </a>
        </div>`;
    } else if (latestSos.status === 'rejected') {
      sosContainer.innerHTML = `
        <div class="sos-status-card sos-status-rejected">
          <strong>Sajnos a megadott időintervallumban a körülmények most nem engedik, hogy megoldjam ezt az időpontot.</strong>
          <div class="small muted mt-1">${esc(latestSos.serviceName)} · ${esc(latestSos.intervalSummary)}</div>
        </div>`;
    }

    const openFlashCount = state.flashSlots.filter((s) => s.status === 'open').length;
    const sosApprovedCount = latestSos && latestSos.status === 'approved' ? 1 : 0;
    const unreadChat = Number(state.guest && state.guest.unreadForGuest) || 0;
    const totalUrgent = openFlashCount + sosApprovedCount + unreadChat;
    if (window.PwaUX) {
      window.PwaUX.setNavBadge('apptNavBadge', totalUrgent, totalUrgent > 0);
    }
    renderGuestContactAndChat();
    renderGuestUrgentAlerts();
    populateSosServices();
  }

  function buildMessengerUrl(raw) {
    const val = String(raw || '').trim();
    if (!val) return '';
    if (/^https?:\/\/(m\.me|messenger\.com)\//i.test(val)) return val;
    if (/^(www\.)?(m\.me|messenger\.com)\//i.test(val)) return `https://${val.replace(/^www\./i, '')}`;
    const idMatch = val.match(/profile\.php\?[^#]*id=(\d+)/i);
    if (idMatch && idMatch[1]) return `https://m.me/${idMatch[1]}`;
    const fbMatch = val.match(/facebook\.com\/([^/?#]+)/i);
    if (fbMatch && fbMatch[1] && fbMatch[1] !== 'profile.php') {
      return `https://m.me/${fbMatch[1]}`;
    }
    if (/^https?:\/\//i.test(val)) return val;
    return `https://m.me/${val.replace(/^@/, '')}`;
  }

  function openGuestChat(forceOpen) {
    state.chatOpen = forceOpen ? true : !state.chatOpen;
    const panel = $('#guestChatPanel');
    if (panel) panel.classList.toggle('hidden', !state.chatOpen);
    renderGuestContactAndChat();
    if (state.chatOpen && state.guest && Number(state.guest.unreadForGuest) > 0) {
      window.SalonService.markChatRead(state.guestId, 'guest');
    }
    if (state.chatOpen) {
      const thread = $('#guestChatThread');
      if (thread) thread.scrollTop = thread.scrollHeight;
    }
  }

  function renderGuestContactAndChat() {
    const c = state.contact || {};
    const phoneRaw = c.phoneRaw || window.APP_CONFIG.SOS_PHONE_RAW;
    const phoneDisp = c.phoneDisplay || window.APP_CONFIG.SOS_PHONE_DISPLAY;
    const phoneLink = $('#guestPhoneLink');
    if (phoneLink) {
      phoneLink.href = `tel:${phoneRaw}`;
      phoneLink.textContent = `📞 Hívás: ${phoneDisp}`;
    }

    const msgUrl = buildMessengerUrl(c.messengerHandle);
    const msgLink = $('#guestMessengerLink');
    if (msgLink) {
      if (msgUrl) {
        msgLink.href = msgUrl;
        msgLink.classList.remove('hidden');
      } else {
        msgLink.classList.add('hidden');
      }
    }

    const unread = Number(state.guest && state.guest.unreadForGuest) || 0;
    const badge = $('#guestChatUnreadBadge');
    if (badge) {
      badge.classList.toggle('hidden', unread <= 0);
      badge.textContent = unread === 1 ? '1 új válasz!' : `${unread} új válasz!`;
    }

    const toggleBtn = $('#toggleGuestChatBtn');
    if (toggleBtn) {
      toggleBtn.textContent = state.chatOpen
        ? '💬 Üzenetablak bezárása'
        : unread > 0
          ? `💬 Üzenetek megnyitása (${unread} új)`
          : '💬 Üzenet küldése az appban';
    }

    const panel = $('#guestChatPanel');
    if (panel) panel.classList.toggle('hidden', !state.chatOpen);

    const thread = $('#guestChatThread');
    if (!thread || !state.guest) return;
    const msgs = Array.isArray(state.guest.chatMessages) ? state.guest.chatMessages : [];
    if (!msgs.length) {
      thread.innerHTML = '<div class="chat-empty">Írj nyugodtan egy üzenetet (pl. milyen nap és napszak jó neked) – a fodrászod azonnal értesítést kap róla!</div>';
    } else {
      thread.innerHTML = msgs
        .map((m) => {
          const mine = m.sender === 'guest';
          const t = m.createdAt
            ? new Date(m.createdAt).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '';
          return `
            <div class="chat-bubble ${mine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}">
              <div>${esc(m.text)}</div>
              <div class="chat-time">${esc(t)}</div>
            </div>`;
        })
        .join('');
      thread.scrollTop = thread.scrollHeight;
    }
  }

  function renderGuestUrgentAlerts() {
    if (!window.PwaUX || !state.guest) return;
    const alerts = [];
    const latestSos = state.sosRequests[0];

    if (Number(state.guest.unreadForGuest) > 0) {
      alerts.push({
        type: 'accent',
        icon: '💬',
        title: `ÚJ VÁLASZ A FODRÁSZODTÓL! (${state.guest.unreadForGuest})`,
        subtitle: state.guest.lastMessagePreview || 'Koppints a megnyitáshoz!',
        cta: 'Megnyitás',
        onClick: () => {
          switchTab('appointments');
          openGuestChat(true);
        }
      });
    }

    if (latestSos && latestSos.status === 'approved') {
      alerts.push({
        type: 'success',
        icon: '✅',
        title: 'SOS KÉRÉSED ELFOGADVA!',
        subtitle: `Hívj a ${window.APP_CONFIG.SOS_PHONE_DISPLAY} számon a pontosításért!`,
        cta: '📞 Hívás',
        href: `tel:${window.APP_CONFIG.SOS_PHONE_RAW}`
      });
    }

    const openUnapplied = state.flashSlots.filter(
      (s) => s.status === 'open' && !(s.applicants && s.applicants[state.guestId])
    );
    if (openUnapplied.length) {
      alerts.push({
        type: 'accent',
        icon: '⚡',
        title: `ÚJ VIP VILLÁM-IDŐPONT SZABADULT FEL! (${openUnapplied.length})`,
        subtitle: 'Koppints, és jelentkezz egy érintéssel!',
        cta: 'Megnézem',
        onClick: () => switchTab('appointments')
      });
    }

    const { nextAppt } = getNextAndPastAppointments();
    if (nextAppt && isSameCalendarDay(new Date(nextAppt.startIso), new Date())) {
      alerts.push({
        type: 'accent',
        icon: '📅',
        title: `Ma várunk a szalonban! (${new Date(nextAppt.startIso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })})`,
        subtitle: 'Állítsd be a kávéd, hangulatod, vagy jelezz ha 10 percet késel.',
        cta: 'Főoldal',
        onClick: () => switchTab('home')
      });
    }

    window.PwaUX.renderUrgentStack('guestUrgentStack', alerts);
  }

  function populateSosServices() {
    const sel = $('#sosServiceSelect');
    if (!sel) return;
    const prev = sel.value;
    const categories = (state.pricing && state.pricing.current) || [];
    const items = [];
    categories.forEach((cat) => {
      (cat.items || []).forEach((it) => items.push({ category: cat.category, name: it.name, price: Number(it.price) }));
    });
    sel.innerHTML = items
      .map(
        (it, idx) =>
          `<option value="${idx}" data-price="${it.price}" data-name="${esc(it.name)}">${esc(it.name)} (alap: ${formatHuf(it.price)})</option>`
      )
      .join('');
    if (prev && sel.options[prev]) sel.value = prev;
    updateSosCalculatedPrice();
  }

  function updateSosCalculatedPrice() {
    const sel = $('#sosServiceSelect');
    const opt = sel && sel.options[sel.selectedIndex];
    if (!opt) return;
    const base = Number(opt.dataset.price || 0);
    const mult = window.APP_CONFIG.SOS_MULTIPLIER || 4;
    $('#sosBasePriceHint').textContent = `Alapár: ${formatHuf(base)} × ${mult}`;
    $('#sosCalculatedPrice').textContent = formatHuf(base * mult);
  }

  // ---------------- ÁRLISTA ----------------
  function renderPricing() {
    const p = state.pricing || window.APP_CONFIG.DEFAULT_PRICING;
    const isCurrent = state.pricingTab === 'current';
    const list = isCurrent ? p.current || [] : p.upcoming || [];
    const effDate = isCurrent ? p.currentEffectiveDate : p.upcomingEffectiveDate;

    $('#priceTabCurrent').classList.toggle('active', isCurrent);
    $('#priceTabUpcoming').classList.toggle('active', !isCurrent);
    $('#priceTabUpcoming').textContent = p.upcomingEffectiveDate
      ? `Várható (${p.upcomingEffectiveDate}-től)`
      : 'Várható árlista';

    const container = $('#pricingListContainer');
    container.innerHTML = `
      <div class="card">
        <div class="row-between" style="margin-bottom:14px;">
          <span class="card-eyebrow">${isCurrent ? 'Aktuálisan érvényes' : 'Tervezett új árlista'}</span>
          <span class="badge badge-accent">Hatályos: ${esc(effDate || '—')}</span>
        </div>
        ${list
          .map(
            (cat) => `
            <div class="price-category">
              <div class="price-category-title">${esc(cat.category)}</div>
              ${(cat.items || [])
                .map(
                  (item) => `
                  <div class="price-row">
                    <span class="price-name">${esc(item.name)}</span>
                    <span class="price-val">${formatHuf(item.price)}</span>
                  </div>`
                )
                .join('')}
            </div>`
          )
          .join('')}
      </div>
    `;

    $('#kidsPricingNote').textContent =
      p.kidsNote || 'A gyerek nyírás iskolás korig ingyenes, onnantól a fenti árak érvényesek.';
    const vatEl = $('#vatPricingNote');
    if (vatEl) {
      vatEl.textContent = p.vatNote || 'Az árak forintban értendők és az ÁFA-t tartalmazzák (alanyi adómentes).';
    }
  }

  // ---------------- ESEMÉNYKEZELŐK ----------------
  function bindEvents() {
    // Alsó navigáció
    $$('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Fejléc téma modál
    $('#openThemeBtn').addEventListener('click', () => $('#themeModal').classList.remove('hidden'));
    $('#closeThemeModal').addEventListener('click', () => $('#themeModal').classList.add('hidden'));
    $('#themeModal').addEventListener('click', (e) => {
      if (e.target.id === 'themeModal') $('#themeModal').classList.add('hidden');
    });

    $$('#modalThemeChoices [data-theme-switch]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const chosen = btn.dataset.themeSwitch;
        applyTheme(chosen);
        if (state.guestId) {
          await window.SalonService.updateGuest(state.guestId, {
            theme: chosen,
            gender: chosen === 'male' ? 'male' : 'female'
          });
        }
        renderHaircare();
        showToast('Megjelenési stílus frissítve!');
        $('#themeModal').classList.add('hidden');
      });
    });

    // Push gombok
    const handleEnablePush = async () => {
      const res = await window.SalonService.requestPushPermission('guest', state.guestId);
      if (res.ok) {
        $('#pushBanner').classList.add('hidden');
        showToast('Értesítések bekapcsolva!');
      } else {
        showToast(res.reason || 'Nem sikerült bekapcsolni az értesítéseket.');
      }
    };
    $('#enablePushBtn').addEventListener('click', handleEnablePush);
    $('#modalPushBtn').addEventListener('click', handleEnablePush);

    $('#modalRefreshCalendarBtn').addEventListener('click', async () => {
      showToast('Google Naptár szinkronizálása...');
      const res = await window.SalonService.triggerCalendarSync();
      showToast(res.ok ? 'Naptár frissítve!' : 'Élő szinkron aktív (beállítás után azonnal frissít).');
      $('#themeModal').classList.add('hidden');
    });

    $('#closeDemoBanner').addEventListener('click', () => $('#demoBanner').classList.add('hidden'));

    // Check-in Hangulat & Frissítő
    $$('#moodChoices .choice-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { nextAppt } = getNextAndPastAppointments();
        if (!nextAppt) return;
        await window.SalonService.updateAppointmentMeta(nextAppt.id, { mood: btn.dataset.mood });
        showToast(`Hangulat mentve: ${btn.dataset.mood}`);
      });
    });

    $$('#drinkChoices .choice-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const { nextAppt } = getNextAndPastAppointments();
        if (!nextAppt) return;
        await window.SalonService.updateAppointmentMeta(nextAppt.id, { drink: btn.dataset.drink });
        showToast(`Frissítő mentve: ${btn.dataset.drink}`);
      });
    });

    // 10 perc késés gomb
    $('#late10Btn').addEventListener('click', async () => {
      const { nextAppt } = getNextAndPastAppointments();
      if (!nextAppt) return;
      await window.SalonService.updateAppointmentMeta(nextAppt.id, {
        lateNotice: true,
        lateSentAt: new Date().toISOString()
      });
      await window.SalonService.sendPushNotification({
        targetRole: 'admin',
        title: '⏱️ 10 perces késés jelzés!',
        body: `${state.guest.name} jelezte, hogy kb. 10 percet késni fog a mai időpontjáról.`,
        url: './admin.html'
      });
      showToast('Késés elküldve a fodrászodnak!');
    });

    // Inspirációs fotó tömörítés + mentés
    $('#inspoPhotoInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 720;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          state.pendingPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.72);
          const prev = $('#inspoPhotoPreview');
          prev.src = state.pendingPhotoDataUrl;
          prev.classList.remove('hidden');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    $('#saveInspoBtn').addEventListener('click', async () => {
      const { nextAppt } = getNextAndPastAppointments();
      if (!nextAppt) return;
      const note = $('#inspoPhotoNote').value.trim();
      const patch = { photoNote: note };
      if (state.pendingPhotoDataUrl) patch.photoDataUrl = state.pendingPhotoDataUrl;
      await window.SalonService.updateAppointmentMeta(nextAppt.id, patch);
      showToast('Inspirációs fotó és megjegyzés elmentve!');
      $('#photoDisclosure').classList.remove('open');
    });

    // Alkalmazáson belüli chat események
    const toggleChatBtn = $('#toggleGuestChatBtn');
    if (toggleChatBtn) {
      toggleChatBtn.addEventListener('click', () => openGuestChat(false));
    }

    const sendGuestMsg = async () => {
      const inp = $('#guestChatInput');
      const text = (inp.value || '').trim();
      if (!text || !state.guest) return;
      inp.value = '';
      await window.SalonService.sendChatMessage(state.guestId, 'guest', text, state.guest.name);
      showToast('Üzenet elküldve a fodrászodnak!');
    };
    const sendBtn = $('#guestChatSendBtn');
    if (sendBtn) sendBtn.addEventListener('click', sendGuestMsg);
    const chatInp = $('#guestChatInput');
    if (chatInp) {
      chatInp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendGuestMsg();
        }
      });
    }
    $$('#guestChatQuickChips [data-quick-msg]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const inp = $('#guestChatInput');
        if (inp) {
          inp.value = chip.dataset.quickMsg;
          inp.focus();
        }
      });
    });

    // VIP Villám beállítások
    $('#flashSubToggle').addEventListener('change', async (e) => {
      await window.SalonService.updateGuest(state.guestId, { flashSubscribed: e.target.checked });
      showToast(e.target.checked ? 'Feliratkoztál a VIP Villám-időpontokra!' : 'Villám-riasztások kikapcsolva.');
    });

    $$('#flashPrefChips .chip').forEach((chip) => {
      chip.addEventListener('click', async () => {
        await window.SalonService.updateGuest(state.guestId, { flashPreference: chip.dataset.pref });
        showToast('Napszak preferencia elmentve.');
      });
    });

    $('#urgentEarlierToggle').addEventListener('change', async (e) => {
      await window.SalonService.updateGuest(state.guestId, { urgentEarlier: e.target.checked });
      showToast('Sürgősségi jelzés frissítve.');
    });

    // SOS panel nyitás / zárás
    $('#sosToggleBtn').addEventListener('click', () => {
      $('#sosPanel').classList.toggle('hidden');
      if (!$('#sosPanel').classList.contains('hidden')) {
        $('#sosPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    $('#sosServiceSelect').addEventListener('change', updateSosCalculatedPrice);

    $$('#sosQuickInterval .chip').forEach((ch) => {
      ch.addEventListener('click', () => {
        state.sosQuick = state.sosQuick === ch.dataset.quick ? '' : ch.dataset.quick;
        $$('#sosQuickInterval .chip').forEach((b) => b.classList.toggle('selected', b.dataset.quick === state.sosQuick));
      });
    });

    $$('#sosDayChips .chip').forEach((ch) => {
      ch.addEventListener('click', () => {
        const day = ch.dataset.day;
        if (state.sosDays.has(day)) state.sosDays.delete(day);
        else state.sosDays.add(day);
        ch.classList.toggle('selected', state.sosDays.has(day));
      });
    });

    $('#sosSubmitBtn').addEventListener('click', async () => {
      const sel = $('#sosServiceSelect');
      const opt = sel.options[sel.selectedIndex];
      if (!opt) return;

      const parts = [];
      if (state.sosQuick) parts.push(state.sosQuick);
      if (state.sosDays.size) parts.push(Array.from(state.sosDays).join(', '));
      if (!parts.length) {
        showToast('Kérlek, válassz legalább egy időintervallumot vagy napot!');
        return;
      }
      if (!$('#sosAcceptCheckbox').checked) {
        showToast('A beküldéshez el kell fogadnod a 4-szeres árszorzó feltételeit.');
        return;
      }

      const basePrice = Number(opt.dataset.price || 0);
      const sosPrice = basePrice * (window.APP_CONFIG.SOS_MULTIPLIER || 4);

      await window.SalonService.createSosRequest({
        guestId: state.guestId,
        guestName: state.guest.name,
        gender: state.guest.gender,
        serviceName: opt.dataset.name,
        basePrice,
        sosPrice,
        intervalSummary: parts.join(' | '),
        note: $('#sosNoteInput').value.trim()
      });

      $('#sosPanel').classList.add('hidden');
      $('#sosAcceptCheckbox').checked = false;
      $('#sosNoteInput').value = '';
      state.sosQuick = '';
      state.sosDays.clear();
      $$('#sosQuickInterval .chip, #sosDayChips .chip').forEach((c) => c.classList.remove('selected'));
      showToast('SOS kérés elküldve!');
    });

    // Árlista tab váltó
    $('#priceTabCurrent').addEventListener('click', () => {
      state.pricingTab = 'current';
      renderPricing();
    });
    $('#priceTabUpcoming').addEventListener('click', () => {
      state.pricingTab = 'upcoming';
      renderPricing();
    });
  }

  // ---------------- ONBOARDING ----------------
  function setupOnboarding() {
    let selectedTheme = 'male';
    const overlay = $('#onboardingOverlay');
    overlay.classList.remove('hidden');

    $$('#onboardingThemes .theme-card').forEach((card) => {
      card.addEventListener('click', () => {
        selectedTheme = card.dataset.themeChoice;
        applyTheme(selectedTheme);
        $$('#onboardingThemes .theme-card').forEach((c) =>
          c.classList.toggle('selected', c.dataset.themeChoice === selectedTheme)
        );
      });
    });

    $('#onboardingSubmitBtn').addEventListener('click', async () => {
      const name = $('#onboardingName').value.trim();
      if (name.length < 2) {
        showToast('Kérlek, add meg a nevedet!');
        return;
      }
      const created = await window.SalonService.createGuest({ name, theme: selectedTheme });
      state.guestId = created.id;
      localStorage.setItem(GUEST_ID_KEY, created.id);
      overlay.classList.add('hidden');
      startSubscriptions();
      showToast(`Üdvözlünk, ${created.name}!`);
    });
  }

  function startSubscriptions() {
    let guestLoaded = false;
    let prevUnreadForGuest = 0;
    window.SalonService.subscribeGuest(state.guestId, (guest) => {
      if (!guest) {
        localStorage.removeItem(GUEST_ID_KEY);
        setupOnboarding();
        return;
      }
      const newUnread = Number(guest.unreadForGuest) || 0;
      if (guestLoaded && newUnread > prevUnreadForGuest && !state.chatOpen && window.PwaUX) {
        window.PwaUX.showAttentionAlert({
          title: '💬 Új válasz érkezett!',
          body: guest.lastMessagePreview || 'A fodrászod válaszolt az üzenetedre.',
          level: 'normal',
          actionLabel: 'Üzenet megnyitása',
          onAction: () => {
            switchTab('appointments');
            openGuestChat(true);
          }
        });
      }
      prevUnreadForGuest = newUnread;
      guestLoaded = true;
      state.guest = guest;
      applyTheme(guest.theme || localStorage.getItem(GUEST_THEME_KEY) || 'male');
      renderHome();
      renderHaircare();
      renderAppointmentsTab();
      if (state.chatOpen && newUnread > 0) {
        window.SalonService.markChatRead(state.guestId, 'guest');
      }
    });

    window.SalonService.subscribeContactSettings((contact) => {
      state.contact = contact;
      renderGuestContactAndChat();
      renderHome();
    });

    window.SalonService.subscribeGuestAppointments(state.guestId, (appts) => {
      state.appointments = appts;
      renderHome();
      renderGuestUrgentAlerts();
    });

    window.SalonService.subscribePricing((pricing) => {
      state.pricing = pricing;
      renderPricing();
      populateSosServices();
    });

    let flashLoaded = false;
    let prevOpenFlashIds = new Set();
    window.SalonService.subscribeFlashSlots((slots) => {
      const openNow = slots.filter((s) => s.status === 'open');
      if (flashLoaded && window.PwaUX) {
        const brandNew = openNow.find((s) => !prevOpenFlashIds.has(s.id));
        if (brandNew) {
          window.PwaUX.showAttentionAlert({
            title: '⚡ Új VIP Villám-időpont!',
            body: brandNew.note || 'Most szabadult fel egy villám-időpont! Jelentkezz, amíg szabad!',
            level: 'urgent',
            actionLabel: 'Megnézem és jelentkezem',
            onAction: () => switchTab('appointments')
          });
        }
      }
      prevOpenFlashIds = new Set(openNow.map((s) => s.id));
      flashLoaded = true;
      state.flashSlots = slots;
      renderAppointmentsTab();
    });

    let sosLoaded = false;
    let prevSosStatus = {};
    window.SalonService.subscribeGuestSos(state.guestId, (reqs) => {
      if (sosLoaded && window.PwaUX) {
        reqs.forEach((r) => {
          const old = prevSosStatus[r.id];
          if (old && old !== r.status) {
            if (r.status === 'approved') {
              window.PwaUX.showAttentionAlert({
                title: '✅ SOS Kérésed Elfogadva!',
                body: `Kérlek, hívj a ${window.APP_CONFIG.SOS_PHONE_DISPLAY} számon a pontosításért!`,
                level: 'success',
                actionLabel: `📞 Hívás: ${window.APP_CONFIG.SOS_PHONE_DISPLAY}`,
                href: `tel:${window.APP_CONFIG.SOS_PHONE_RAW}`
              });
            } else if (r.status === 'rejected') {
              window.PwaUX.showAttentionAlert({
                title: 'SOS kérés válasza',
                body: 'Sajnos a megadott időintervallumban a körülmények most nem engedik, hogy megoldjam ezt az időpontot.',
                level: 'normal'
              });
            }
          }
        });
      }
      prevSosStatus = {};
      reqs.forEach((r) => { prevSosStatus[r.id] = r.status; });
      sosLoaded = true;
      state.sosRequests = reqs;
      renderAppointmentsTab();
    });

    // Push értesítés automatikus token-szinkron (ha már engedélyezve van) vagy felajánló
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        $('#pushBanner').classList.add('hidden');
        window.SalonService.syncPushTokenIfGranted('guest', state.guestId);
      } else if (Notification.permission === 'default') {
        $('#pushBanner').classList.remove('hidden');
      }
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      const pb = $('#pushBanner');
      pb.innerHTML = '<span><strong>📲 iPhone tipp:</strong> A háttér értesítésekhez előbb add hozzá az appot a Főképernyőhöz (Megosztás ⬆️ → Főképernyőhöz adás ＋), és onnan nyisd meg!</span>';
      pb.classList.remove('hidden');
    }

    // Háttérben frissítsük a naptárat, ha az Apps Script be van állítva
    if (window.SalonService.isAppsScriptConfigured()) {
      window.SalonService.triggerCalendarSync();
    }
  }

  // ---------------- INDÍTÁS ----------------
  async function bootstrap() {
    $('#salonBrandTitle').textContent = window.APP_CONFIG.SALON_NAME;
    $('#onboardingTitle').textContent = window.APP_CONFIG.SALON_NAME;

    const savedTheme = localStorage.getItem(GUEST_THEME_KEY);
    if (savedTheme) applyTheme(savedTheme);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    const { demoMode } = await window.SalonService.init();
    if (demoMode) $('#demoBanner').classList.remove('hidden');

    if (window.PwaUX) {
      window.PwaUX.initInstallPrompt({
        role: 'guest',
        containerId: 'guestInstallBanner',
        headerBtnId: 'guestInstallHeaderBtn'
      });
    }

    window.SalonService.onForegroundPush(({ title, body }) => {
      if (window.PwaUX) {
        const isUrgent = /sos|villám|változott|1 óra/i.test(`${title} ${body}`);
        window.PwaUX.showAttentionAlert({
          title,
          body,
          level: isUrgent ? 'urgent' : 'normal',
          actionLabel: /sos|villám/i.test(`${title} ${body}`) ? 'Időpontok megnyitása' : '',
          onAction: () => switchTab('appointments')
        });
      } else {
        showToast(`${title}${body ? ' – ' + body : ''}`);
      }
    });

    setupDisclosures();
    bindEvents();

    if (window.location.hash === '#appointments') {
      switchTab('appointments');
    }

    if (!state.guestId) {
      setupOnboarding();
    } else {
      const existing = await window.SalonService.getGuest(state.guestId);
      if (!existing) {
        localStorage.removeItem(GUEST_ID_KEY);
        setupOnboarding();
      } else {
        startSubscriptions();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
