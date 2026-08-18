// dashboard.js — Public home page

const Dashboard = (() => {
  function render(container) {
    const bookmarks = Store.get('bookmarks');
    const notes     = Store.get('notes');
    const slides    = Store.get('slides');
    const prompts   = Store.get('prompts');

    const stats = [
      { label: 'Bookmarks', value: bookmarks.length, icon: 'bookmark',     route: 'links',     colorClass: 'stat-bookmarks' },
      { label: 'Notes',     value: notes.length,     icon: 'notebook-pen', route: 'notes',     colorClass: 'stat-notes' },
      { label: 'Slides',   value: slides.length,   icon: 'asset',        route: 'slides',    colorClass: 'stat-slides' },
      { label: 'Prompts',   value: prompts.length,   icon: 'sparkles',     route: 'prompts',   colorClass: 'stat-prompts' },
    ];

    const categories = {};
    bookmarks.forEach(b => { const c = b.category || 'Other'; categories[c] = (categories[c] || 0) + 1; });
    const topCats = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const usefulSites = bookmarks
      .filter(b => ['Libraries/Frameworks', 'Design Tools', 'Design Inspiration', 'Assets', 'Design'].includes(b.category))
      .slice(-8)
      .reverse();

    const liked = Store.getLiked('bookmarks');

    const recentItems = [
      ...bookmarks.map(i => ({ ...i, _type: 'link' })),
      ...notes.map(i => ({ ...i, _type: 'note' })),
      ...slides.map(i => ({ ...i, _type: 'slides' })),
      ...prompts.map(i => ({ ...i, _type: 'prompt' }))
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

    const routes = { link: 'links', note: 'notes', slides: 'slides', prompt: 'prompts' };

    container.innerHTML = `
      <div class="home-search">
        <div class="home-search-bar">
          ${Icons.svg('search', 20)}
          <input class="home-search-input" id="home-search" type="text" placeholder="Search bookmarks, notes, prompts, slides…" autocomplete="off">
          <kbd class="home-search-kbd">Ctrl K</kbd>
        </div>
      </div>

      <div class="stats-grid" id="stats-grid">
        ${stats.map(s => `
          <button class="stat-card" data-route="${s.route}">
            <div class="stat-card-icon ${s.colorClass}">${Icons.route(s.route, 20)}</div>
            <div class="stat-card-body">
              <div class="stat-value">${s.value}</div>
              <div class="stat-label">${s.label}</div>
            </div>
          </button>
        `).join('')}
      </div>

      <div class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">${Icons.svg('heart', 18)} Your Liked Sites</h2>
        </div>
        <div class="liked-grid" id="liked-grid">
          ${liked.length ? liked.map(b => {
            const url = App.safeUrl(b.url);
            const favicon = App.safeImageUrl(b.favicon, App.faviconFor(url));
            return `
              <a class="liked-card" href="${escAttr(url)}" target="_blank" rel="noopener">
                <div class="liked-card-icon">${favicon ? `<img src="${escAttr(favicon)}" alt="" width="20" height="20" onerror="this.style.display='none'">` : Icons.svg('bookmark', 16)}</div>
                <div class="liked-card-body">
                  <div class="liked-card-title">${escHtml(b.title || 'Untitled')}</div>
                  <div class="liked-card-cat">${escHtml(b.category || '')}</div>
                </div>
                ${Icons.svg('external', 14, 'ui-icon text-muted')}
              </a>`;
          }).join('') : `<div class="empty-state" style="padding:var(--space-6)">${Icons.svg('heart', 28)}<p>Like bookmarks to see them here</p><button class="btn btn-secondary btn-sm" id="go-bookmarks">Browse Bookmarks</button></div>`}
        </div>
      </div>

      ${topCats.length ? `
      <div class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">${Icons.svg('layers', 18)} Top Categories</h2>
        </div>
        <div class="categories-grid">
          ${topCats.map(([cat, count]) => `
            <button class="category-card" data-cat="${escAttr(cat)}">
              <span class="category-name">${Icons.category(cat, 14)} ${escHtml(cat)}</span>
              <span class="category-count">${count}</span>
            </button>
          `).join('')}
        </div>
      </div>` : ''}

      ${usefulSites.length ? `
      <div class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">${Icons.svg('design', 18)} Design resources</h2>
          <button class="btn btn-ghost btn-sm" id="go-design-tools">Design tools</button>
        </div>
        <div class="useful-grid">
          ${usefulSites.map(b => {
            const url = App.safeUrl(b.url);
            const favicon = App.safeImageUrl(b.favicon, App.faviconFor(url));
            return `
              <a class="useful-card" href="${escAttr(url)}" target="_blank" rel="noopener">
                <span class="useful-icon">${favicon ? `<img src="${escAttr(favicon)}" alt="" width="20" height="20" onerror="this.style.display='none'">` : Icons.category(b.category, 16)}</span>
                <span class="useful-body"><strong>${escHtml(b.title || 'Untitled')}</strong><small>${escHtml((b.tags || []).slice(0, 2).join(' / ') || b.category || '')}</small></span>
              </a>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">${Icons.svg('clock', 18)} Recently Added</h2>
        </div>
        <div class="recent-activity" id="recent-activity">
          ${recentItems.length ? recentItems.map(item => {
            const isLink = item._type === 'link';
            const url = isLink ? App.safeUrl(item.url, '') : '';
            const iconHtml = isLink && item.favicon
              ? `<img src="${escAttr(App.safeImageUrl(item.favicon, App.faviconFor(item.url)))}" alt="" width="16" height="16" style="border-radius:2px" onerror="this.style.display='none'">`
              : Icons.type(item._type, 16);
            return `
              <button class="recent-item" data-route="${routes[item._type]}" data-url="${escAttr(url)}">
                <div class="recent-item-icon">${iconHtml}</div>
                <div class="recent-item-body">
                  <div class="recent-item-title">${escHtml(item.title || 'Untitled')}</div>
                  <div class="recent-item-meta">${App.formatDate(item.createdAt)}</div>
                </div>
                <span class="recent-item-type">${item._type}</span>
              </button>`;
          }).join('') : `<div class="empty-state" style="padding:32px">${Icons.svg('inbox', 28)}<p>No items yet.</p></div>`}
        </div>
      </div>
    `;

    // Event bindings
    container.querySelector('#home-search')?.addEventListener('focus', () => {
      CommandPalette.open();
      container.querySelector('#home-search')?.blur();
    });

    container.querySelector('#go-bookmarks')?.addEventListener('click', () => App.navigate('links'));
    container.querySelector('#go-design-tools')?.addEventListener('click', () => {
      App.navigate('links');
      setTimeout(() => Links.filterByCategory?.('Design Tools'), 100);
    });

    container.querySelectorAll('.stat-card[data-route]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.route));
    });

    container.querySelectorAll('.category-card[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        App.navigate('links');
        setTimeout(() => Links.filterByCategory?.(btn.dataset.cat), 100);
      });
    });

    container.querySelectorAll('.recent-item[data-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.url) window.open(btn.dataset.url, '_blank');
        else App.navigate(btn.dataset.route);
      });
    });
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {}

  return { render, unmount };
})();
