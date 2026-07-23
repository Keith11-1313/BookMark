// app.js — Router, toasts, global utilities

const App = (() => {
  const ROUTES = {
    dashboard: { label: 'Home',       module: () => Dashboard },
    links:     { label: 'Bookmarks',  module: () => Links     },
    notes:     { label: 'Notes',      module: () => Notes     },
    snippets:  { label: 'Snippets',   module: () => Snippets  },
    prompts:   { label: 'Prompts',    module: () => Prompts   },
    settings:  { label: 'Settings',   module: () => Settings  }
  };

  let currentRoute = null;

  // ── Init ────────────────────────────────────────────────
  async function init() {
    await Store.loadAll();
    document.getElementById('app').style.display = 'flex';
    Sidebar.init();
    CommandPalette.init();
    setupKeyboardShortcuts();
    navigate(location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'dashboard'));
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
        const routeKeys = { '1': 'dashboard', '2': 'links', '3': 'notes', '4': 'snippets', '5': 'prompts' };
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
    const icons = { info: 'info', success: 'check-circle', error: 'x-circle' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'status');
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

  return {
    init, navigate, toast,
    formatDate, formatDateFull, getRoute,
    escapeHtml, escapeAttr, safeUrl, safeImageUrl, faviconFor
  };
})();

// ── Init on load ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
