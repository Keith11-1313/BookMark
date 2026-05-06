// sidebar.js — Sidebar (desktop) + bottom nav (mobile)

const Sidebar = (() => {
  const NAV_ITEMS = [
    { route: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', shortcut: '1' },
    { route: 'links',     label: 'Bookmarks', icon: 'bookmark',         shortcut: '2' },
    { route: 'notes',     label: 'Notes',     icon: 'notebook-pen',     shortcut: '3' },
    { route: 'directory', label: 'Directory', icon: 'folder-tree',      shortcut: '4' },
    { route: 'snippets',  label: 'Snippets',  icon: 'code-2',           shortcut: '5' },
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
          <i data-lucide="bookmark" width="20" height="20"></i>
        </div>
        <span class="sidebar-brand">BookMark</span>
        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Collapse sidebar" data-tooltip="Collapse">
          <i data-lucide="panel-left-close" width="16" height="16"></i>
        </button>
      </div>

      <button class="sidebar-search-btn" id="sidebar-search-btn" aria-label="Search everything">
        <i data-lucide="search" width="15" height="15"></i>
        <span>Search everything…</span>
        <span class="sidebar-search-shortcut">Ctrl K</span>
      </button>

      <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
        <span class="nav-section-label">Navigation</span>
        ${NAV_ITEMS.map(item => `
          <button class="nav-item" data-route="${item.route}" id="nav-${item.route}" aria-label="${item.label}">
            <span class="nav-item-icon"><i data-lucide="${item.icon}" width="18" height="18"></i></span>
            <span class="nav-item-label">${item.label}</span>
            <span class="nav-shortcut">${item.shortcut}</span>
          </button>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user">
          <div class="user-avatar-placeholder" id="user-avatar-placeholder">?</div>
          <img class="user-avatar" id="user-avatar" src="" alt="Avatar" style="display:none">
          <div class="user-info">
            <div class="user-name" id="user-name">Loading…</div>
            <div class="user-email" id="user-email"></div>
          </div>
        </div>
        <button class="btn-signout" id="btn-signout" aria-label="Sign out">
          <i data-lucide="log-out" width="15" height="15"></i>
          <span>Sign out</span>
        </button>
        <button class="btn-ghost btn-sm w-full" id="btn-install-pwa" style="display:none; gap:8px; margin-top:4px;" aria-label="Install app">
          <i data-lucide="download" width="14" height="14"></i>
          <span>Install App</span>
        </button>
      </div>
    `;

    // Nav click
    sidebar.querySelectorAll('.nav-item[data-route]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.route));
    });

    // Search
    sidebar.querySelector('#sidebar-search-btn').addEventListener('click', () => CommandPalette.open());

    // Sign out
    sidebar.querySelector('#btn-signout').addEventListener('click', () => Auth.signOut());
  }

  function renderBottomNav() {
    const nav = document.getElementById('bottom-nav');
    nav.innerHTML = `
      <div class="bottom-nav-items">
        ${NAV_ITEMS.map(item => `
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

    // Click logo to expand when collapsed
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
    document.querySelectorAll('.nav-item[data-route], .bottom-nav-item[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
      el.setAttribute('aria-current', el.dataset.route === route ? 'page' : 'false');
    });
  }

  function setUser(user) {
    const nameEl    = document.getElementById('user-name');
    const emailEl   = document.getElementById('user-email');
    const avatarEl  = document.getElementById('user-avatar');
    const initEl    = document.getElementById('user-avatar-placeholder');

    if (nameEl)  nameEl.textContent  = user.displayName || 'User';
    if (emailEl) emailEl.textContent = user.email || '';

    if (user.photoURL && avatarEl) {
      // Request 96px version from Google (default is tiny ~32px)
      const photoUrl = user.photoURL.replace(/=s\d+-c$/, '').replace(/=s\d+$/, '') + '=s96-c';
      avatarEl.src = App.safeImageUrl(photoUrl, '');
      avatarEl.style.display = 'block';
      if (initEl) initEl.style.display = 'none';
    } else if (initEl) {
      initEl.textContent = (user.displayName || 'U')[0].toUpperCase();
    }
  }

  return { init, setActive, setUser };
})();
