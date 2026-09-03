// app.js — Router, toasts, global utilities

const App = (() => {
  const ROUTES = {
    dashboard: { label: 'Home',       module: () => Dashboard },
    links:     { label: 'Bookmarks',  module: () => Links     },
    notes:     { label: 'Notes',      module: () => Notes     },
    slides:   { label: 'Slides',    module: () => Slides   },
    prompts:   { label: 'Prompts',    module: () => Prompts   },
    settings:  { label: 'Settings',   module: () => Settings  }
  };

  let currentRoute = null;

  // ── Init ────────────────────────────────────────────────
  async function init() {
    applyTheme(getTheme());
    const app = document.getElementById('app');
    const main = document.getElementById('page-content');
    app.style.display = 'flex';
    main.innerHTML = loadingShell();
    await Store.loadAll();
    Sidebar.init();
    CommandPalette.init();
    setupKeyboardShortcuts();
    navigate(location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'dashboard'));
  }

  function loadingShell() {
    return `
      <div class="home-search">
        <div class="home-search-bar"><span class="skeleton" style="width:20px;height:20px;border-radius:50%"></span><span class="skeleton" style="height:18px;flex:1"></span><span class="skeleton" style="width:54px;height:22px"></span></div>
      </div>
      <div class="stats-grid">
        ${Array.from({ length: 4 }, () => '<div class="stat-card"><span class="skeleton" style="width:44px;height:44px;border-radius:12px"></span><div class="stat-card-body"><div class="skeleton" style="width:58px;height:24px;margin-bottom:8px"></div><div class="skeleton" style="width:92px;height:12px"></div></div></div>').join('')}
      </div>`;
  }

  // ── Router ───────────────────────────────────────────────
  function navigate(route) {
    if (!ROUTES[route]) route = 'dashboard';
    if (currentRoute === route) return;

    const prevRoute = currentRoute;
    currentRoute = route;

    if (prevRoute && ROUTES[prevRoute]?.module()?.unmount) {
      ROUTES[prevRoute].module().unmount();
    }

    if (window.Dropdown) Dropdown.reset();
    history.replaceState(null, '', '#' + route);

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
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        CommandPalette.open();
        return;
      }

      if (!editing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const routeKeys = { '1': 'dashboard', '2': 'links', '3': 'notes', '4': 'slides', '5': 'prompts' };
        if (routeKeys[e.key]) {
          e.preventDefault();
          navigate(routeKeys[e.key]);
        }
      }

      if (e.key === 'Escape' && CommandPalette.isOpen()) CommandPalette.close();
    });
  }

  // ── Toast ─────────────────────────────────────────────────
  function toast(message, type = 'info', duration = 3500) {
    const icons = { info: 'info', success: 'check', error: 'warning' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      ${Icons.svg(icons[type] || 'info', 16)}
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  }

  // ── Format date ──────────────────────────────────────────
  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    const now = new Date();
    const diff = now - d;
    if (diff < 60000)     return 'Just now';
    if (diff < 3600000)   return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000)  return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDateFull(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ── Utilities ────────────────────────────────────────────
  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

  function getRoute() { return currentRoute; }

  // ── Confirm modal (replaces window.confirm everywhere) ────
  // Usage: App.confirm('Are you sure?', () => doTheThing());
  // Injects a modal into document.body, removes itself on close.
  function confirm(message, onConfirm) {
    // Remove any stale instance
    document.getElementById('app-confirm-backdrop')?.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'app-confirm-backdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML = `
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <span class="modal-title" style="display:flex;align-items:center;gap:var(--space-2)">
            ${Icons.svg('warning', 18)}
            Confirm
          </span>
        </div>
        <div class="modal-body" style="gap:var(--space-3)">
          <p style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.6">${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="app-confirm-cancel">Cancel</button>
          <button class="btn btn-danger" id="app-confirm-ok">Delete</button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);
    // Trigger open animation next frame
    requestAnimationFrame(() => backdrop.classList.add('open'));

    function close() {
      backdrop.classList.remove('open');
      backdrop.addEventListener('transitionend', () => backdrop.remove(), { once: true });
    }

    backdrop.querySelector('#app-confirm-ok').addEventListener('click', () => {
      close();
      onConfirm();
    });
    backdrop.querySelector('#app-confirm-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

    // Escape key
    function onEsc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    }
    document.addEventListener('keydown', onEsc);

    // Focus the cancel button by default (safer)
    setTimeout(() => backdrop.querySelector('#app-confirm-cancel')?.focus(), 50);
  }

  // ── Theme ──────────────────────────────────────────────────
  const THEME_KEY = 'bookmark_theme';
  function getTheme() { return localStorage.getItem(THEME_KEY) || 'default'; }
  function setTheme(name) { localStorage.setItem(THEME_KEY, name); applyTheme(name); }
  function applyTheme(name) {
    if (name && name !== 'default') {
      document.documentElement.setAttribute('data-theme', name);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  return {
    init, navigate, toast, confirm,
    formatDate, formatDateFull, getRoute,
    escapeHtml, escapeAttr, safeUrl, safeImageUrl, faviconFor,
    getTheme, setTheme
  };
})();

// ── Init on load ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
