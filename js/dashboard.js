// dashboard.js — Public home page

const Dashboard = (() => {
  function render(container) {
    const bookmarks = Store.get('bookmarks');
    const notes     = Store.get('notes');
    const snippets  = Store.get('snippets');
    const prompts   = Store.get('prompts');

    const stats = [
      { label: 'Bookmarks', value: bookmarks.length, icon: 'bookmark',     route: 'links',     colorClass: 'stat-bookmarks' },
      { label: 'Notes',     value: notes.length,     icon: 'notebook-pen', route: 'notes',     colorClass: 'stat-notes' },
      { label: 'Snippets',  value: snippets.length,  icon: 'code-2',       route: 'snippets', colorClass: 'stat-snippets' },
      { label: 'Prompts',   value: prompts.length,    icon: 'sparkles',     route: 'prompts',  colorClass: 'stat-prompts' },
    ];

    const categories = {};
    bookmarks.forEach(b => { const c = b.category || 'Other'; categories[c] = (categories[c] || 0) + 1; });
    const topCats = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const liked = Store.getLiked('bookmarks');

    const featuredSnippets = snippets.slice(0, 3);
    const LANG_MAP = { JavaScript:'js',TypeScript:'ts',HTML:'html',CSS:'css',Python:'python',JSON:'json',Bash:'bash',SQL:'sql',Java:'java','C#':'cs',Go:'go',Rust:'rust',PHP:'php',Ruby:'ruby',YAML:'yaml','Plain Text':'plaintext' };

    const recentItems = [
      ...bookmarks.map(i => ({ ...i, _type: 'link' })),
      ...notes.map(i => ({ ...i, _type: 'note' })),
      ...snippets.map(i => ({ ...i, _type: 'snippet' })),
      ...prompts.map(i => ({ ...i, _type: 'prompt' }))
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

    const icons = { link: 'bookmark', note: 'notebook-pen', snippet: 'code-2', prompt: 'sparkles' };
    const routes = { link: 'links', note: 'notes', snippet: 'snippets', prompt: 'prompts' };

    container.innerHTML = `
      <div class="home-search animate-slide-up">
        <div class="home-search-bar">
          <i data-lucide="search" width="20" height="20"></i>
          <input class="home-search-input" id="home-search" type="text" placeholder="Search bookmarks, notes, snippets, prompts…" autocomplete="off">
          <kbd class="home-search-kbd">Ctrl K</kbd>
        </div>
      </div>

      <div class="stats-grid" id="stats-grid">
        ${stats.map(s => `
          <button class="stat-card" data-route="${s.route}">
            <div class="stat-card-icon ${s.colorClass}"><i data-lucide="${s.icon}" width="20" height="20"></i></div>
            <div class="stat-card-body">
              <div class="stat-value">${s.value}</div>
              <div class="stat-label">${s.label}</div>
            </div>
          </button>
        `).join('')}
      </div>

      <div class="dashboard-section animate-slide-up">
        <div class="section-header">
          <h2 class="section-title"><i data-lucide="heart" width="18" height="18"></i> Your Liked Sites</h2>
        </div>
        <div class="liked-grid" id="liked-grid">
          ${liked.length ? liked.map(b => {
            const url = App.safeUrl(b.url);
            const favicon = App.safeImageUrl(b.favicon, App.faviconFor(url));
            return `
              <a class="liked-card" href="${escAttr(url)}" target="_blank" rel="noopener">
                <div class="liked-card-icon">${favicon ? `<img src="${escAttr(favicon)}" alt="" width="20" height="20" onerror="this.style.display='none'">` : '<i data-lucide="bookmark" width="16" height="16"></i>'}</div>
                <div class="liked-card-body">
                  <div class="liked-card-title">${escHtml(b.title || 'Untitled')}</div>
                  <div class="liked-card-cat">${escHtml(b.category || '')}</div>
                </div>
                <i data-lucide="external-link" width="14" height="14" style="color:var(--text-muted);flex-shrink:0"></i>
              </a>`;
          }).join('') : `<div class="empty-state" style="padding:var(--space-6)"><i data-lucide="heart" width="28" height="28"></i><p>Like bookmarks to see them here</p><button class="btn btn-secondary btn-sm" id="go-bookmarks">Browse Bookmarks</button></div>`}
        </div>
      </div>

      ${topCats.length ? `
      <div class="dashboard-section animate-slide-up">
        <div class="section-header">
          <h2 class="section-title"><i data-lucide="layers" width="18" height="18"></i> Top Categories</h2>
        </div>
        <div class="categories-grid">
          ${topCats.map(([cat, count]) => `
            <button class="category-card" data-cat="${escAttr(cat)}">
              <span class="category-name">${escHtml(cat)}</span>
              <span class="category-count">${count}</span>
            </button>
          `).join('')}
        </div>
      </div>` : ''}

      ${featuredSnippets.length ? `
      <div class="dashboard-section animate-slide-up">
        <div class="section-header">
          <h2 class="section-title"><i data-lucide="code-2" width="18" height="18"></i> Featured Snippets</h2>
          <button class="btn btn-ghost btn-sm" id="go-snippets">View all</button>
        </div>
        <div class="featured-snippets-grid">
          ${featuredSnippets.map(s => {
            const langKey = LANG_MAP[s.language] || 'plaintext';
            return `
              <div class="featured-snippet" data-id="${escAttr(s.id)}">
                <div class="featured-snippet-header">
                  <span class="snippet-title">${escHtml(s.title)}</span>
                  <span class="snippet-lang lang-${langKey}">${escHtml(s.language || 'Text')}</span>
                </div>
                <pre class="snippet-code"><code class="language-${langKey}">${escHtml((s.code || '').slice(0, 200))}</code></pre>
                <button class="copy-btn-overlay" data-action="copy-snippet" data-code="${escAttr(s.code || '')}">
                  <i data-lucide="copy" width="12" height="12"></i> Copy
                </button>
              </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="dashboard-section animate-slide-up">
        <div class="section-header">
          <h2 class="section-title"><i data-lucide="clock" width="18" height="18"></i> Recently Added</h2>
        </div>
        <div class="recent-activity" id="recent-activity">
          ${recentItems.length ? recentItems.map(item => {
            const isLink = item._type === 'link';
            const url = isLink ? App.safeUrl(item.url, '') : '';
            const iconHtml = isLink && item.favicon
              ? `<img src="${escAttr(App.safeImageUrl(item.favicon, App.faviconFor(item.url)))}" alt="" width="16" height="16" style="border-radius:2px" onerror="this.outerHTML='<i data-lucide=\\'bookmark\\' width=\\'16\\' height=\\'16\\'></i>'">`
              : `<i data-lucide="${icons[item._type]}" width="16" height="16"></i>`;
            return `
              <button class="recent-item" data-route="${routes[item._type]}" data-url="${escAttr(url)}">
                <div class="recent-item-icon">${iconHtml}</div>
                <div class="recent-item-body">
                  <div class="recent-item-title">${escHtml(item.title || 'Untitled')}</div>
                  <div class="recent-item-meta">${App.formatDate(item.createdAt)}</div>
                </div>
                <span class="recent-item-type">${item._type}</span>
              </button>`;
          }).join('') : `<div class="empty-state" style="padding:32px"><i data-lucide="inbox" width="28" height="28"></i><p>No items yet.</p></div>`}
        </div>
      </div>

      <div class="dashboard-section animate-slide-up">
        <div class="section-header">
          <h2 class="section-title"><i data-lucide="download" width="18" height="18"></i> Export Data</h2>
        </div>
        <div class="export-section">
          <div class="export-group">
            <div class="export-group-label">Bookmarks</div>
            <div class="export-group-btns">
              <button class="export-btn" data-key="bookmarks" data-fmt="json"><i data-lucide="file-json" width="15" height="15"></i> JSON</button>
              <button class="export-btn" data-key="bookmarks" data-fmt="csv"><i data-lucide="file-spreadsheet" width="15" height="15"></i> CSV</button>
            </div>
          </div>
          <div class="export-group">
            <div class="export-group-label">Notes</div>
            <div class="export-group-btns">
              <button class="export-btn" data-key="notes" data-fmt="json"><i data-lucide="file-json" width="15" height="15"></i> JSON</button>
            </div>
          </div>
          <div class="export-group">
            <div class="export-group-label">Snippets</div>
            <div class="export-group-btns">
              <button class="export-btn" data-key="snippets" data-fmt="json"><i data-lucide="file-json" width="15" height="15"></i> JSON</button>
            </div>
          </div>
          <div class="export-group">
            <div class="export-group-label">Prompts</div>
            <div class="export-group-btns">
              <button class="export-btn" data-key="prompts" data-fmt="json"><i data-lucide="file-json" width="15" height="15"></i> JSON</button>
            </div>
          </div>
          <div class="export-group">
            <div class="export-group-label">Print</div>
            <div class="export-group-btns">
              <button class="export-btn" id="btn-print"><i data-lucide="printer" width="15" height="15"></i> PDF</button>
            </div>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons({ el: container });

    // Syntax highlight featured snippets
    container.querySelectorAll('pre code').forEach(block => { if (window.hljs) hljs.highlightElement(block); });

    // Event bindings
    container.querySelector('#home-search')?.addEventListener('focus', () => {
      CommandPalette.open();
      container.querySelector('#home-search')?.blur();
    });

    container.querySelector('#go-bookmarks')?.addEventListener('click', () => App.navigate('links'));
    container.querySelector('#go-snippets')?.addEventListener('click', () => App.navigate('snippets'));

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

    container.querySelectorAll('[data-action="copy-snippet"]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.code || '').then(() => {
          btn.innerHTML = '<i data-lucide="check" width="12" height="12"></i> Copied!';
          lucide.createIcons({ el: btn });
          setTimeout(() => { btn.innerHTML = '<i data-lucide="copy" width="12" height="12"></i> Copy'; lucide.createIcons({ el: btn }); }, 2000);
        }).catch(() => App.toast('Copy failed', 'error'));
      });
    });

    container.querySelectorAll('.export-btn[data-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { key, fmt } = btn.dataset;
        if (fmt === 'csv') Store.exportCSV(key);
        else Store.exportJSON(key);
        App.toast(`Exported ${key} as ${fmt.toUpperCase()}`, 'success');
      });
    });

    container.querySelector('#btn-print')?.addEventListener('click', () => window.print());
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {}

  return { render, unmount };
})();
