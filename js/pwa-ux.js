/* ==========================================================================
   PWA Telepítés Felajánló (Android & iOS) + Határozott Értesítő Rendszer
   (Hangjelzés, rezgés, pulzáló sürgős sáv, nagy felugró értesítés, számlálók)
   ========================================================================== */

(function (global) {
  'use strict';

  let deferredInstallPrompt = null;
  let audioCtx = null;
  let soundUnlocked = false;
  const DISMISS_KEY_PREFIX = 'atelier_install_dismissed_v1_';

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function isMobile() {
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  }

  // ---------------- HANG ÉS REZGÉS MOTOR (OFFLINE WEB AUDIO) ----------------
  function unlockAudio() {
    if (soundUnlocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      soundUnlocked = true;
    } catch (_) {}
  }

  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, unlockAudio, { passive: true, once: true });
  });

  function playTone(level) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const notes =
        level === 'urgent'
          ? [
              { freq: 880, start: 0, dur: 0.14 },
              { freq: 1174.66, start: 0.17, dur: 0.14 },
              { freq: 880, start: 0.36, dur: 0.14 },
              { freq: 1318.51, start: 0.53, dur: 0.26 }
            ]
          : [
              { freq: 659.25, start: 0, dur: 0.14 },
              { freq: 880, start: 0.16, dur: 0.22 }
            ];

      notes.forEach((n) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = level === 'urgent' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        gain.gain.setValueAtTime(0.0001, now + n.start);
        gain.gain.exponentialRampToValueAtTime(level === 'urgent' ? 0.28 : 0.18, now + n.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.02);
      });
    } catch (_) {}
  }

  function vibrate(level) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(level === 'urgent' ? [280, 100, 280, 100, 420] : [160, 80, 160]);
      }
    } catch (_) {}
  }

  // Határozott, eltéveszthetetlen felugró értesítés + hang + rezgés
  function showAttentionAlert({ title, body, level = 'urgent', actionLabel, onAction, href }) {
    playTone(level);
    vibrate(level);

    // Töröljük az előző azonos popupot, ha nyitva maradt
    const existing = document.getElementById('pwaAttentionOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pwaAttentionOverlay';
    overlay.className = 'attention-backdrop';
    overlay.innerHTML = `
      <div class="attention-card attention-${level}" role="alertdialog" aria-modal="true">
        <div class="attention-icon">${level === 'urgent' ? '🚨' : level === 'success' ? '✅' : '🔔'}</div>
        <h2 class="attention-title"></h2>
        <p class="attention-body"></p>
        <div class="attention-actions">
          ${
            href
              ? `<a class="btn btn-success btn-block" id="attPrimaryBtn" href="${href}"></a>`
              : actionLabel
                ? `<button class="btn ${level === 'urgent' ? 'btn-danger' : 'btn-primary'} btn-block" id="attPrimaryBtn" type="button"></button>`
                : ''
          }
          <button class="btn btn-secondary btn-block" id="attCloseBtn" type="button">Rendben, láttam</button>
        </div>
      </div>
    `;
    overlay.querySelector('.attention-title').textContent = title;
    overlay.querySelector('.attention-body').textContent = body;

    const primaryBtn = overlay.querySelector('#attPrimaryBtn');
    if (primaryBtn && actionLabel) {
      primaryBtn.textContent = actionLabel;
      if (!href && typeof onAction === 'function') {
        primaryBtn.addEventListener('click', () => {
          overlay.remove();
          onAction();
        });
      } else if (href) {
        primaryBtn.addEventListener('click', () => {
          setTimeout(() => overlay.remove(), 300);
        });
      }
    }

    overlay.querySelector('#attCloseBtn').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  // ---------------- PULZÁLÓ SÜRGŐS SÁVOK RENDERELÉSE ----------------
  function renderUrgentStack(containerId, alerts) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!alerts || !alerts.length) {
      el.innerHTML = '';
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    el.innerHTML = alerts
      .map(
        (a, idx) => `
        <div class="urgent-banner urgent-${a.type || 'danger'}">
          <div class="urgent-banner-main">
            <span class="urgent-banner-icon">${a.icon || '🚨'}</span>
            <div class="urgent-banner-text">
              <div class="urgent-banner-title">${escapeHtml(a.title)}</div>
              ${a.subtitle ? `<div class="urgent-banner-sub">${escapeHtml(a.subtitle)}</div>` : ''}
            </div>
          </div>
          ${
            a.href
              ? `<a class="btn btn-sm ${a.type === 'success' ? 'btn-success' : a.type === 'danger' ? 'btn-danger' : 'btn-primary'}" href="${a.href}">${escapeHtml(a.cta || 'Megnyitás')}</a>`
              : a.cta
                ? `<button class="btn btn-sm ${a.type === 'success' ? 'btn-success' : a.type === 'danger' ? 'btn-danger' : 'btn-primary'}" type="button" data-urgent-idx="${idx}">${escapeHtml(a.cta)}</button>`
                : ''
          }
        </div>`
      )
      .join('');

    el.querySelectorAll('[data-urgent-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = alerts[Number(btn.dataset.urgentIdx)];
        if (item && typeof item.onClick === 'function') item.onClick();
      });
    });
  }

  // Számlálós, pulzáló badge frissítése az alsó navigáció fülén
  function setNavBadge(badgeId, count, urgent) {
    const el = document.getElementById(badgeId);
    if (!el) return;
    if (!count || count <= 0) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = count > 9 ? '9+' : String(count);
    el.classList.remove('hidden');
    el.classList.toggle('nav-badge-urgent', !!urgent);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------------- PWA KEZDŐKÉPERNYŐRE TELEPÍTÉS FELAJÁNLÓ ----------------
  function initInstallPrompt({ role, containerId, headerBtnId }) {
    const container = document.getElementById(containerId);
    const headerBtn = headerBtnId ? document.getElementById(headerBtnId) : null;
    const dismissKey = DISMISS_KEY_PREFIX + role;

    if (isStandalone()) {
      if (container) container.classList.add('hidden');
      if (headerBtn) headerBtn.classList.add('hidden');
      return;
    }

    const appLabel = role === 'admin' ? 'Admin Alkalmazás' : 'Szalon VIP Alkalmazás';
    const subCopy =
      role === 'admin'
        ? 'Tedd ki a telefonod asztalára külön Admin ikonként, hogy a beérkező SOS kérésekről és késésekről azonnal hangos értesítést kapj!'
        : 'Tedd ki a telefonod asztalára alkalmazásként, hogy egy érintéssel lásd az időpontjaidat és megkapd az emlékeztetőket!';

    function renderPromptCard(forceShow) {
      if (!container || isStandalone()) return;
      const dismissed = sessionStorage.getItem(dismissKey) === '1';
      if (headerBtn) headerBtn.classList.remove('hidden');
      if (dismissed && !forceShow) {
        container.classList.add('hidden');
        return;
      }

      container.classList.remove('hidden');

      if (deferredInstallPrompt) {
        // Android / Chrome / Edge natív 1 kattintásos telepítés!
        container.innerHTML = `
          <div class="install-card">
            <div class="row-between" style="align-items:flex-start;">
              <div>
                <div class="card-eyebrow">📲 Alkalmazás telepítése</div>
                <strong style="font-size:1.02rem;">${escapeHtml(appLabel)} a kezdőképernyődre</strong>
                <p class="small muted mt-1">${escapeHtml(subCopy)}</p>
              </div>
              <button class="icon-btn" id="dismissInstallCard" type="button" style="min-width:34px;min-height:34px;padding:0;" aria-label="Bezárás">✕</button>
            </div>
            <button class="btn btn-primary btn-block mt-2" id="triggerNativeInstallBtn" type="button">
              📲 Telepítés a telefon asztalára most
            </button>
          </div>
        `;
        container.querySelector('#triggerNativeInstallBtn').addEventListener('click', async () => {
          if (!deferredInstallPrompt) return;
          deferredInstallPrompt.prompt();
          const choice = await deferredInstallPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            container.classList.add('hidden');
            if (headerBtn) headerBtn.classList.add('hidden');
          }
          deferredInstallPrompt = null;
        });
      } else if (isIOS()) {
        // iPhone / iPad Safari vizuális 2 lépéses útmutató
        container.innerHTML = `
          <div class="install-card">
            <div class="row-between" style="align-items:flex-start;">
              <div>
                <div class="card-eyebrow">📲 Tedd ki az iPhone főképernyőjére!</div>
                <strong style="font-size:1.02rem;">${escapeHtml(appLabel)} telepítése</strong>
                <p class="small muted mt-1">${escapeHtml(subCopy)}</p>
              </div>
              <button class="icon-btn" id="dismissInstallCard" type="button" style="min-width:34px;min-height:34px;padding:0;" aria-label="Bezárás">✕</button>
            </div>
            <div class="ios-install-steps mt-2">
              <div class="ios-step"><strong>1.</strong> Koppints alul a Safari <strong>Megosztás (⬆️)</strong> ikonra.</div>
              <div class="ios-step"><strong>2.</strong> Görgess le és válaszd a <strong>„Főképernyőhöz adás” (＋)</strong> gombot, majd <strong>Hozzáadás</strong>!</div>
            </div>
          </div>
        `;
      } else {
        // Egyéb böngészők (QR olvasó beépített böngészője / Firefox / asztali)
        container.innerHTML = `
          <div class="install-card">
            <div class="row-between" style="align-items:flex-start;">
              <div>
                <div class="card-eyebrow">📲 Használd alkalmazásként!</div>
                <strong style="font-size:1.02rem;">${escapeHtml(appLabel)} a telefon asztalára</strong>
                <p class="small muted mt-1">${escapeHtml(subCopy)}</p>
              </div>
              <button class="icon-btn" id="dismissInstallCard" type="button" style="min-width:34px;min-height:34px;padding:0;" aria-label="Bezárás">✕</button>
            </div>
            <div class="ios-install-steps mt-2">
              <div class="ios-step">Nyisd meg a böngésző menüjét (<strong>⋮</strong> vagy <strong>Megosztás</strong>) → <strong>Alkalmazás telepítése / Kezdőképernyőhöz adás</strong>.</div>
            </div>
          </div>
        `;
      }

      const closeBtn = container.querySelector('#dismissInstallCard');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          sessionStorage.setItem(dismissKey, '1');
          container.classList.add('hidden');
        });
      }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      renderPromptCard(true);
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      if (container) container.classList.add('hidden');
      if (headerBtn) headerBtn.classList.add('hidden');
    });

    if (headerBtn) {
      headerBtn.addEventListener('click', async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const choice = await deferredInstallPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            if (container) container.classList.add('hidden');
            headerBtn.classList.add('hidden');
          }
          deferredInstallPrompt = null;
        } else {
          sessionStorage.removeItem(dismissKey);
          renderPromptCard(true);
          if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // Mobilon vagy ha még nem fut standalone-ban, azonnal felajánljuk
    if (isMobile() || isIOS()) {
      renderPromptCard(false);
    } else if (headerBtn) {
      headerBtn.classList.remove('hidden');
    }
  }

  global.PwaUX = {
    isStandalone,
    playTone,
    vibrate,
    showAttentionAlert,
    renderUrgentStack,
    setNavBadge,
    initInstallPrompt
  };
})(window);
