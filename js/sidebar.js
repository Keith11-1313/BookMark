// sidebar.js — Sidebar (desktop) + bottom nav (mobile)

const Sidebar = (() => {
  const GITHUB_REPO = 'https://github.com/Keith11-1313/BookMark';

  const NAV_ITEMS = [
    { route: 'dashboard', label: 'Home',       icon: 'layout-dashboard', shortcut: '1' },
    { route: 'links',     label: 'Bookmarks',  icon: 'bookmark',         shortcut: '2' },
    { route: 'notes',     label: 'Notes',      icon: 'notebook-pen',     shortcut: '3' },
    { route: 'snippets',  label: 'Snippets',   icon: 'code-2',           shortcut: '4' },
    { route: 'prompts',   label: 'Prompts',    icon: 'sparkles',         shortcut: '5' },
  ];

  // Settings is in the footer, not the main nav, but still a route
  const BOTTOM_NAV_ITEMS = [
    ...NAV_ITEMS,
    { route: 'settings', label: 'Settings', icon: 'settings', shortcut: '6' },
  ];

  function init() {
    renderSidebar();
    renderBottomNav();
    setupCollapseToggle();
    lucide.createIcons();
  }

  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <img src="assets/icons/logo.png" alt="BookMark" width="28" height="28">
        </div>
        <span class="sidebar-brand">BookMark</span>
        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Collapse sidebar" data-tooltip="Collapse">
          <i data-lucide="panel-left-close" width="16" height="16"></i>
        </button>
      </div>

      <button class="sidebar-search-btn" id="sidebar-search-btn" aria-label="Search everything">
        <i data-lucide="search" width="15" height="15"></i>
        <span>Search</span>
        <span class="sidebar-search-shortcut">Ctrl K</span>
      </button>

      <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
        <span class="nav-section-label">Browse</span>
        ${NAV_ITEMS.map(item => `
          <button class="nav-item" data-route="${item.route}" id="nav-${item.route}" aria-label="${item.label}">
            <span class="nav-item-icon"><i data-lucide="${item.icon}" width="18" height="18"></i></span>
            <span class="nav-item-label">${item.label}</span>
            <span class="nav-shortcut">${item.shortcut}</span>
          </button>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <span class="nav-section-label" style="padding-top:var(--space-2)">System</span>
        <button class="sidebar-link" id="nav-settings" data-route="settings" aria-label="Settings">
          <i data-lucide="settings" width="15" height="15"></i>
          <span>Settings</span>
        </button>
        <a class="sidebar-link" href="${GITHUB_REPO}/issues/new?title=Site+Request:+&body=URL:%0ACategory:%0AWhy+this+should+be+added:%0A&labels=site-request" target="_blank" rel="noopener">
          <i data-lucide="plus-circle" width="15" height="15"></i>
          <span>Request a Site</span>
        </a>
        <a class="sidebar-link" href="${GITHUB_REPO}" target="_blank" rel="noopener">
          <i data-lucide="github" width="15" height="15"></i>
          <span>GitHub</span>
        </a>
      </div>
    `;

    sidebar.querySelectorAll('.nav-item[data-route], .sidebar-link[data-route]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.route));
    });

    sidebar.querySelector('#sidebar-search-btn').addEventListener('click', () => CommandPalette.open());
  }

  function renderBottomNav() {
    const nav = document.getElementById('bottom-nav');
    nav.innerHTML = `
      <div class="bottom-nav-items">
        ${BOTTOM_NAV_ITEMS.map(item => `
          <button class="bottom-nav-item" data-route="${item.route}" aria-label="${item.label}">
            <i data-lucide="${item.icon}" width="22" height="22"></i>
            <span class="bottom-nav-label">${item.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    nav.querySelectorAll('.bottom-nav-item[data-route]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.route));
    });
  }

  function setupCollapseToggle() {
    const btn     = document.getElementById('sidebar-collapse-btn');
    const sidebar = document.getElementById('sidebar');
    if (!btn) return;

    const saved = localStorage.getItem('bookmark_sidebar_collapsed') === 'true';
    if (saved) sidebar.classList.add('collapsed');

    btn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('bookmark_sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });

    const logo = document.querySelector('.sidebar-logo');
    if (logo) {
      logo.addEventListener('click', () => {
        if (sidebar.classList.contains('collapsed')) {
          sidebar.classList.remove('collapsed');
          localStorage.setItem('bookmark_sidebar_collapsed', 'false');
        }
      });
      logo.style.cursor = 'pointer';
    }
  }

  function setActive(route) {
    document.querySelectorAll('.nav-item[data-route], .bottom-nav-item[data-route], .sidebar-link[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
      el.setAttribute('aria-current', el.dataset.route === route ? 'page' : 'false');
    });
  }

  return { init, setActive };
})();
