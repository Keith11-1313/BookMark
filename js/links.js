// links.js — Read-only bookmark browser with likes

const Links = (() => {
  let allLinks = [], currentFilter = 'all', currentView = 'card', searchQuery = '';

  function render(container) {
    allLinks = Store.get('bookmarks');
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    refreshList(container);
  }

  function getCategories() {
    const cats = {};
    allLinks.forEach(b => { const c = b.category || 'Other'; cats[c] = (cats[c] || 0) + 1; });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }

  function buildShell() {
    const cats = getCategories();
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="bookmark" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Bookmarks</div><div class="page-subtitle">Curated links & resources</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="btn-export-json"><i data-lucide="download" width="14" height="14"></i><span>JSON</span></button>
          <button class="btn btn-secondary btn-sm" id="btn-export-csv"><i data-lucide="file-spreadsheet" width="14" height="14"></i><span>CSV</span></button>
        </div>
      </div>

      <div class="links-toolbar">
        <div class="search-bar flex-1" style="min-width:200px">
          <span class="search-icon"><i data-lucide="search" width="15" height="15"></i></span>
          <input class="input" id="links-search" type="search" placeholder="Search bookmarks…">
        </div>
        <div class="view-toggle">
          <button class="view-toggle-btn active" id="view-card" data-tooltip="Card view"><i data-lucide="layout-grid" width="15" height="15"></i></button>
          <button class="view-toggle-btn" id="view-list" data-tooltip="List view"><i data-lucide="list" width="15" height="15"></i></button>
        </div>
        <select class="input" id="links-sort" style="width:auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="alpha">A–Z</option>
          <option value="liked">Liked first</option>
        </select>
      </div>

      <div class="filter-bar-wrap">
        <div class="filter-bar" id="filter-bar">
          <button class="filter-pill active" data-cat="all">All <span class="filter-pill-count">${allLinks.length}</span></button>
          ${cats.map(([c, n]) => `<button class="filter-pill" data-cat="${escAttr(c)}">${escHtml(c)} <span class="filter-pill-count">${n}</span></button>`).join('')}
        </div>
      </div>

      <div id="links-grid" class="links-grid"></div>
    `;
  }

  function refreshList(container) {
    let data = [...allLinks];
    if (currentFilter !== 'all') data = data.filter(b => b.category === currentFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(b =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.url || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q) ||
        (b.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    const sort = container.querySelector('#links-sort')?.value || 'newest';
    if (sort === 'alpha') data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (sort === 'oldest') data.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    else if (sort === 'liked') data.sort((a, b) => (Store.isLiked('bookmarks', b.id) ? 1 : 0) - (Store.isLiked('bookmarks', a.id) ? 1 : 0));
    else data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const grid = container.querySelector('#links-grid');
    if (!grid) return;
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i data-lucide="bookmark-x" width="40" height="40"></i><h3>No bookmarks found</h3><p>${searchQuery ? 'Try a different search term' : 'No bookmarks in this category'}</p></div>`;
      lucide.createIcons({ el: grid }); return;
    }
    grid.innerHTML = data.map(b => renderCard(b)).join('');
    grid.querySelectorAll('.bookmark-card').forEach(card => bindCardEvents(card, container));
    lucide.createIcons({ el: grid });
  }

  function renderCard(b) {
    const url = App.safeUrl(b.url);
    const domain = getDomain(url);
    const favicon = App.safeImageUrl(b.favicon, App.faviconFor(url));
    const tags = (b.tags || []).map(t => `<span class="bookmark-tag">${escHtml(t)}</span>`).join('');
    const liked = Store.isLiked('bookmarks', b.id);
    const ghMeta = b.githubMeta ? `<div class="github-meta"><span class="github-stat"><i data-lucide="star" width="11" height="11"></i> ${Number(b.githubMeta.stars) || 0}</span><span class="github-stat"><i data-lucide="git-fork" width="11" height="11"></i> ${Number(b.githubMeta.forks) || 0}</span>${b.githubMeta.language ? `<span class="github-lang"><span class="lang-dot" style="background:#${langColor(b.githubMeta.language)}"></span>${escHtml(b.githubMeta.language)}</span>` : ''}</div>` : '';
    return `
      <div class="bookmark-card" data-id="${escAttr(b.id)}">
        <div class="bookmark-card-header">
          <div class="bookmark-favicon">${favicon ? `<img src="${escAttr(favicon)}" alt="" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22%3E%3C/svg%3E'">` : ''}</div>
          <div class="bookmark-card-meta">
            <div class="bookmark-title">${escHtml(b.title || domain)}</div>
            <div class="bookmark-category">${escHtml(b.category || 'Other')}</div>
          </div>
          <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}" data-tooltip="${liked ? 'Unlike' : 'Like'}">
            <i data-lucide="heart" width="16" height="16" style="${liked ? 'fill:var(--danger);color:var(--danger)' : ''}"></i>
          </button>
        </div>
        <a class="bookmark-url" href="${escAttr(url)}" target="_blank" rel="noopener">${escHtml(b.url || url)}</a>
        ${ghMeta}
        ${b.notes ? `<div class="bookmark-desc">${escHtml(b.notes)}</div>` : ''}
        ${tags ? `<div class="bookmark-tags">${tags}</div>` : ''}
        <div class="bookmark-footer">
          <span class="bookmark-date">${App.formatDate(b.createdAt)}</span>
          <a class="bookmark-open-btn" href="${escAttr(url)}" target="_blank" rel="noopener"><i data-lucide="external-link" width="12" height="12"></i> Open</a>
        </div>
      </div>`;
  }

  function bindCardEvents(card, container) {
    card.querySelector('[data-action="like"]')?.addEventListener('click', e => {
      e.stopPropagation();
      const id = card.dataset.id;
      const nowLiked = Store.toggleLike('bookmarks', id);
      App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
      refreshList(container);
    });
  }

  function bindEvents(container) {
    container.querySelector('#links-search')?.addEventListener('input', e => { searchQuery = e.target.value; refreshList(container); });
    container.querySelector('#links-sort')?.addEventListener('change', () => refreshList(container));

    container.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.cat;
        refreshList(container);
      });
    });

    container.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.id === 'view-list' ? 'list' : 'card';
        const grid = container.querySelector('#links-grid');
        if (grid) grid.classList.toggle('list-view', currentView === 'list');
      });
    });

    container.querySelector('#btn-export-json')?.addEventListener('click', () => { Store.exportJSON('bookmarks'); App.toast('Exported as JSON', 'success'); });
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => { Store.exportCSV('bookmarks'); App.toast('Exported as CSV', 'success'); });

    initFilterBarScroll(container);
  }

  function initFilterBarScroll(container) {
    const bar = container.querySelector('.filter-bar');
    if (!bar) return;
    bar.addEventListener('wheel', e => {
      if (e.deltaY !== 0) { e.preventDefault(); bar.scrollLeft += e.deltaY * 1.5; }
    }, { passive: false });

    let isDown = false, startX = 0, scrollStart = 0, didDrag = false;
    bar.addEventListener('mousedown', e => {
      isDown = true; didDrag = false; startX = e.pageX - bar.offsetLeft; scrollStart = bar.scrollLeft;
      bar.style.cursor = 'grabbing'; bar.style.userSelect = 'none';
    });
    const stopDrag = () => { isDown = false; bar.style.cursor = ''; bar.style.userSelect = ''; };
    bar.addEventListener('mouseleave', stopDrag);
    bar.addEventListener('mouseup', stopDrag);
    bar.addEventListener('mousemove', e => {
      if (!isDown) return; e.preventDefault();
      const walk = (e.pageX - bar.offsetLeft - startX) * 1.2;
      if (Math.abs(walk) > 4) didDrag = true;
      bar.scrollLeft = scrollStart - walk;
    });
    bar.addEventListener('click', e => { if (didDrag) { e.stopPropagation(); e.preventDefault(); didDrag = false; } }, true);
  }

  function filterByCategory(cat) {
    currentFilter = cat;
    const container = document.getElementById('page-content');
    container.querySelectorAll('.filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.cat === cat);
    });
    refreshList(container);
  }

  function getDomain(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; } }
  function langColor(lang) { const map = { JavaScript: 'f1e05a', TypeScript: '3178c6', Python: '3572a5', HTML: 'e34c26', CSS: '563d7c', Go: '00add8', Rust: 'dea584', Java: 'b07219', Ruby: '701516' }; return map[lang] || '5865f2'; }
  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {}

  return { render, unmount, filterByCategory };
})();
