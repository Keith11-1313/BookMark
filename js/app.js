// app.js — Router, global state, toasts, modals, keyboard shortcuts

const App = (() => {
  const ROUTES = {
    dashboard: { label: 'Dashboard', module: () => Dashboard },
    links:     { label: 'Bookmarks', module: () => Links     },
    notes:     { label: 'Notes',     module: () => Notes     },
    directory: { label: 'Directory', module: () => Directory },
    snippets:  { label: 'Snippets',  module: () => Snippets  }
  };

  let currentRoute = null;
  let currentUser  = null;
  let deferredInstallPrompt = null;
  let _initialized = false;

  // ── Init ────────────────────────────────────────────────
  function init(user) {
    if (_initialized) return;
    _initialized = true;
    currentUser = user;
    Sidebar.init();
    CommandPalette.init();
    PinnedBar.init();
    setupKeyboardShortcuts();
    setupPWAInstall();
    navigate(location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'dashboard'));
  }

  // ── Router ───────────────────────────────────────────────
  function navigate(route) {
    if (!ROUTES[route]) route = 'dashboard';
    if (currentRoute === route) return;

    const prevRoute = currentRoute;
    currentRoute = route;

    // Unmount previous
    if (prevRoute && ROUTES[prevRoute]?.module()?.unmount) {
      ROUTES[prevRoute].module().unmount();
    }

    // Update hash
    history.replaceState(null, '', '#' + route);

    // Render content
    const main = document.getElementById('page-content');
    main.innerHTML = '';
    main.scrollTop = 0;

    ROUTES[route].module().render(main);
    Sidebar.setActive(route);
  }

  // ── Keyboard Shortcuts ───────────────────────────────────
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      const editing = ['INPUT','TEXTAREA','SELECT'].includes(tag) || document.activeElement.contentEditable === 'true';

      // Ctrl+K → command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        CommandPalette.open();
        return;
      }

      // Number shortcuts (not while editing)
      if (!editing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const routeKeys = { '1': 'dashboard', '2': 'links', '3': 'notes', '4': 'directory', '5': 'snippets' };
        if (routeKeys[e.key]) {
          e.preventDefault();
          navigate(routeKeys[e.key]);
        }
      }

      // Escape → close palette (only when open)
      if (e.key === 'Escape' && CommandPalette.isOpen()) CommandPalette.close();
    });
  }

  // ── PWA Install ──────────────────────────────────────────
  function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn = document.getElementById('btn-install-pwa');
      if (btn) btn.style.display = 'flex';
    });

    document.getElementById('btn-install-pwa')?.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById('btn-install-pwa').style.display = 'none';
        deferredInstallPrompt = null;
      }
    });
  }

  // ── Toast ─────────────────────────────────────────────────
  function toast(message, type = 'info', duration = 3500) {
    const icons = { info: 'info', success: 'check-circle', error: 'x-circle' };
    const container = document.getElementById('toast-container');

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" width="16" height="16"></i>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(el);
    lucide.createIcons({ el });

    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  }

  // ── Modal ────────────────────────────────────────────────
  function openModal(id) {
    const backdrop = document.getElementById(id);
    if (!backdrop) return;
    backdrop.classList.add('open');
    // Remove any prior handler before adding a new one (prevents stacking)
    if (backdrop._closeHandler) backdrop.removeEventListener('click', backdrop._closeHandler);
    backdrop._closeHandler = e => { if (e.target === backdrop) closeModal(id); };
    backdrop.addEventListener('click', backdrop._closeHandler);
    // Focus first input
    setTimeout(() => backdrop.querySelector('input, textarea, select')?.focus(), 100);
  }

  function closeModal(id) {
    const backdrop = document.getElementById(id);
    if (!backdrop) return;
    backdrop.classList.remove('open');
    if (backdrop._closeHandler) {
      backdrop.removeEventListener('click', backdrop._closeHandler);
      backdrop._closeHandler = null;
    }
  }

  // ── Confirm Dialog (replaces native confirm()) ──────────
  function confirmDialog(message, { title = 'Confirm', confirmText = 'Delete', cancelText = 'Cancel', danger = true } = {}) {
    return new Promise(resolve => {
      // Remove any existing confirm modal
      document.getElementById('app-confirm-modal')?.remove();

      const backdrop = document.createElement('div');
      backdrop.id = 'app-confirm-modal';
      backdrop.className = 'modal-backdrop open';
      backdrop.innerHTML = `
        <div class="modal confirm-modal">
          <div class="modal-header">
            <span class="modal-title"><i data-lucide="alert-triangle" width="18" height="18" style="color:var(--warning)"></i> ${escapeHtml(title)}</span>
            <button class="btn-ghost btn-icon btn-sm" id="confirm-close-btn" aria-label="Close"><i data-lucide="x" width="16" height="16"></i></button>
          </div>
          <div class="modal-body">
            <p class="confirm-message">${escapeHtml(message)}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="confirm-cancel-btn">${escapeHtml(cancelText)}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok-btn"><i data-lucide="${danger ? 'trash-2' : 'check'}" width="14" height="14"></i> ${escapeHtml(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      lucide.createIcons({ el: backdrop });

      function cleanup(result) {
        backdrop.classList.remove('open');
        setTimeout(() => backdrop.remove(), 200);
        resolve(result);
      }

      backdrop.querySelector('#confirm-ok-btn').addEventListener('click', () => cleanup(true));
      backdrop.querySelector('#confirm-cancel-btn').addEventListener('click', () => cleanup(false));
      backdrop.querySelector('#confirm-close-btn').addEventListener('click', () => cleanup(false));
      backdrop.addEventListener('click', e => { if (e.target === backdrop) cleanup(false); });

      // Focus the cancel button by default for safety
      setTimeout(() => backdrop.querySelector('#confirm-cancel-btn')?.focus(), 100);
    });
  }

  // ── Format date ──────────────────────────────────────────
  function formatDate(ts) {
    if (!ts) return '';
    let d;
    if (ts.toDate)       d = ts.toDate();           // live Firestore Timestamp
    else if (ts.seconds) d = new Date(ts.seconds * 1000); // plain object from localStorage
    else                 d = new Date(ts);           // string or number
    if (isNaN(d)) return '';
    const now  = new Date();
    const diff = now - d;
    if (diff < 60000)    return 'Just now';
    if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000)return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDateFull(ts) {
    if (!ts) return '';
    let d;
    if (ts.toDate)       d = ts.toDate();
    else if (ts.seconds) d = new Date(ts.seconds * 1000);
    else                 d = new Date(ts);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function unmountCurrent() {
    if (currentRoute && ROUTES[currentRoute]?.module()?.unmount) {
      ROUTES[currentRoute].module().unmount();
    }
    currentRoute = null;
    const main = document.getElementById('page-content');
    if (main) main.innerHTML = '';
  }

  // ── Reset (called on sign-out so re-login re-initializes cleanly) ──
  function reset() {
    unmountCurrent();
    _initialized  = false;
    currentUser   = null;
  }

  function getRoute() { return currentRoute; }
  function getUser()  { return currentUser; }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(value) {
    return escapeHtml(value)
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(value, fallback = '#') {
    try {
      const url = new URL(String(value || '').trim(), window.location.origin);
      if (['http:', 'https:', 'mailto:'].includes(url.protocol)) return url.href;
    } catch {}
    return fallback;
  }

  function safeImageUrl(value, fallback = '') {
    try {
      const url = new URL(String(value || '').trim(), window.location.origin);
      if (['http:', 'https:', 'data:'].includes(url.protocol)) return url.href;
    } catch {}
    return fallback;
  }

  function faviconFor(value) {
    const url = safeUrl(value, '');
    if (!url) return '';
    try {
      const domain = encodeURIComponent(new URL(url).hostname);
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { return ''; }
  }

  return {
    init, reset, navigate, toast, openModal, closeModal, confirm: confirmDialog,
    formatDate, formatDateFull, getRoute, getUser, unmountCurrent,
    escapeHtml, escapeAttr, safeUrl, safeImageUrl, faviconFor
  };
})();

// ── Pinned Bar ────────────────────────────────────────────
const PinnedBar = (() => {
  function init() {
    Store.subscribe(Store.COLLECTIONS.links, render);
  }

  function render(links) {
    const bar   = document.getElementById('pinned-bar');
    const items = document.getElementById('pinned-bar-items');
    if (!bar || !items) return;

    const pinned = (links || []).filter(l => l.pinned);
    bar.style.display = pinned.length ? 'flex' : 'none';
    if (!pinned.length) return;

    items.innerHTML = pinned.map(b => {
      const url = App.safeUrl(b.url);
      const favicon = App.safeImageUrl(b.favicon, App.faviconFor(url));
      const label = b.title || b.url || 'Pinned bookmark';
      return `
        <a href="${App.escapeAttr(url)}" target="_blank" rel="noopener" class="pinned-item" title="${App.escapeAttr(label)}">
          ${favicon ? `<img src="${App.escapeAttr(favicon)}" onerror="this.style.display='none'" alt="">` : ''}
          <span>${App.escapeHtml(truncate(label, 24))}</span>
        </a>
      `;
    }).join('');
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

  return { init };
})();
