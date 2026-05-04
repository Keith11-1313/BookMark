// dashboard.js — Home page with stats, recent activity, quick-add

const Dashboard = (() => {
  let unsubLinks, unsubNotes, unsubSnippets;
  let links = [], notes = [], snippets = [];
  let loaded = { links: false, notes: false, snippets: false };
  let refreshTimer = null;

  function scheduleRefresh(container) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refresh(container), 60);
  }

  function render(container) {
    // Pre-load from localStorage cache so there's no skeleton flash on navigation
    links    = Store.lsGet(Store.COLLECTIONS.links)    || [];
    notes    = Store.lsGet(Store.COLLECTIONS.notes)    || [];
    snippets = Store.lsGet(Store.COLLECTIONS.snippets) || [];

    // Only show skeleton if truly no cached data at all
    const hasCached = links.length || notes.length || snippets.length;
    loaded = { links: hasCached, notes: hasCached, snippets: hasCached };

    container.innerHTML = buildHTML();
    lucide.createIcons({ el: container });
    if (hasCached) refresh(container); // render immediately from cache
    setupQuickAdd(container);

    unsubLinks    = Store.subscribe(Store.COLLECTIONS.links,    data => { links    = data; loaded.links    = true; scheduleRefresh(container); });
    unsubNotes    = Store.subscribe(Store.COLLECTIONS.notes,    data => { notes    = data; loaded.notes    = true; scheduleRefresh(container); });
    unsubSnippets = Store.subscribe(Store.COLLECTIONS.snippets, data => { snippets = data; loaded.snippets = true; scheduleRefresh(container); });
  }

  function buildHTML() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const user = App.getUser();
    const name = user?.displayName?.split(' ')[0] || 'there';
    const now  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return `
      <div class="dashboard-greeting animate-slide-up">
        <div class="greeting-time">${now}</div>
        <h1 class="greeting-title">${greeting}, ${name}</h1>
        <p class="greeting-sub">Here's your personal command center.</p>
      </div>

      <div class="stats-grid" id="stats-grid">
        <a class="stat-card" href="#links" onclick="App.navigate('links')">
          <div class="stat-icon stat-icon-blue"><i data-lucide="bookmark" width="22" height="22"></i></div>
          <div class="stat-body"><div class="stat-value" id="stat-links">—</div><div class="stat-label">Bookmarks</div></div>
        </a>
        <a class="stat-card" href="#notes" onclick="App.navigate('notes')">
          <div class="stat-icon stat-icon-green"><i data-lucide="notebook-pen" width="22" height="22"></i></div>
          <div class="stat-body"><div class="stat-value" id="stat-notes">—</div><div class="stat-label">Notes</div></div>
        </a>
        <a class="stat-card" href="#snippets" onclick="App.navigate('snippets')">
          <div class="stat-icon stat-icon-yellow"><i data-lucide="code-2" width="22" height="22"></i></div>
          <div class="stat-body"><div class="stat-value" id="stat-snippets">—</div><div class="stat-label">Snippets</div></div>
        </a>
        <a class="stat-card" href="#directory" onclick="App.navigate('directory')">
          <div class="stat-icon stat-icon-cyan"><i data-lucide="folder-tree" width="22" height="22"></i></div>
          <div class="stat-body"><div class="stat-value" id="stat-dirs">—</div><div class="stat-label">Directories</div></div>
        </a>
      </div>

      <div class="dashboard-grid">
        <div class="recent-card">
          <div class="recent-card-header">
            <span class="recent-card-title"><i data-lucide="clock" width="15" height="15"></i> Recent Activity</span>
          </div>
          <div class="recent-list" id="recent-list">
            ${skeletonRows(5)}
          </div>
        </div>

        <div class="quick-add-card">
          <div class="quick-add-card-header"><i data-lucide="plus-circle" width="15" height="15"></i> Quick Add</div>
          <div class="quick-add-tabs">
            <button class="quick-add-tab active" data-tab="link">Bookmark</button>
            <button class="quick-add-tab" data-tab="note">Note</button>
          </div>
          <div class="quick-add-body">
            <div class="quick-add-panel active" id="qa-link">
              <div class="form-field">
                <label class="form-label" for="qa-url">URL</label>
                <input class="input" id="qa-url" type="url" placeholder="https://…" autocomplete="off">
              </div>
              <div class="form-field">
                <label class="form-label" for="qa-title">Title (optional)</label>
                <input class="input" id="qa-title" type="text" placeholder="Auto-fetched from URL">
              </div>
              <button class="btn btn-primary w-full" id="qa-link-submit">
                <i data-lucide="plus" width="15" height="15"></i> Add Bookmark
              </button>
            </div>
            <div class="quick-add-panel" id="qa-note">
              <div class="form-field">
                <label class="form-label" for="qa-note-title">Title</label>
                <input class="input" id="qa-note-title" type="text" placeholder="Note title…">
              </div>
              <div class="form-field">
                <label class="form-label" for="qa-note-body">Content</label>
                <textarea class="input" id="qa-note-body" rows="4" placeholder="Write something…"></textarea>
              </div>
              <button class="btn btn-primary w-full" id="qa-note-submit">
                <i data-lucide="plus" width="15" height="15"></i> Add Note
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function refresh(container) {
    // Stats
    const s = container.querySelector('#stat-links');    if (s) s.textContent = links.length;
    const n = container.querySelector('#stat-notes');    if (n) n.textContent = notes.length;
    const sn= container.querySelector('#stat-snippets'); if (sn) sn.textContent = snippets.length;

    // Directory count — fetched from its own Firestore doc
    const sd = container.querySelector('#stat-dirs');
    if (sd && sd.textContent === '—') {
      try {
        const uid = Auth.getUid();
        db.collection('users').doc(uid).collection('directories').doc('tree').get()
          .then(doc => {
            if (doc.exists && doc.data().tree) {
              sd.textContent = countNodes(doc.data().tree.children || []);
            } else {
              sd.textContent = '0';
            }
          }).catch(() => { sd.textContent = '—'; });
      } catch { sd.textContent = '—'; }
    }

    // Recent
    const recentEl = container.querySelector('#recent-list');
    if (!recentEl) return;

    // Still waiting on first Firestore response — keep skeleton
    const allLoaded = loaded.links && loaded.notes && loaded.snippets;
    if (!allLoaded) return;

    const allItems = [
      ...links.map(i => ({ ...i, _type: 'link' })),
      ...notes.map(i => ({ ...i, _type: 'note' })),
      ...snippets.map(i => ({ ...i, _type: 'snippet' }))
    ].sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    }).slice(0, 8);

    if (!allItems.length) {
      recentEl.innerHTML = `<div class="empty-state" style="padding:40px"><i data-lucide="inbox" width="32" height="32"></i><p>No items yet. Add your first bookmark!</p></div>`;
      lucide.createIcons({ el: recentEl });
      return;
    }

    const icons = { link: 'bookmark', note: 'notebook-pen', snippet: 'code-2' };
    const routes= { link: 'links',    note: 'notes',        snippet: 'snippets' };

    recentEl.innerHTML = allItems.map(item => {
      const isLink    = item._type === 'link';
      const iconHtml  = isLink && item.favicon
        ? `<img src="${item.favicon}" alt="" width="16" height="16" style="border-radius:2px" onerror="this.outerHTML='<i data-lucide=\\'bookmark\\' width=\\'16\\' height=\\'16\\'></i>'">`
        : `<i data-lucide="${icons[item._type]}" width="16" height="16"></i>`;
      return `
        <button class="recent-item" data-route="${routes[item._type]}" data-url="${isLink ? item.url : ''}">
          <div class="recent-item-icon">${iconHtml}</div>
          <div class="recent-item-body">
            <div class="recent-item-title">${escHtml(item.title || 'Untitled')}</div>
            <div class="recent-item-meta">${App.formatDate(item.createdAt)}</div>
          </div>
          <span class="recent-item-type">${item._type}</span>
        </button>`;
    }).join('');

    recentEl.querySelectorAll('.recent-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.url) window.open(btn.dataset.url, '_blank', 'noopener');
        else App.navigate(btn.dataset.route);
      });
    });

    lucide.createIcons({ el: recentEl });
  }

  function setupQuickAdd(container) {
    // Tabs
    container.querySelectorAll('.quick-add-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.quick-add-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.quick-add-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        container.querySelector('#qa-' + tab.dataset.tab)?.classList.add('active');
      });
    });

    // Bookmark submit
    container.querySelector('#qa-link-submit')?.addEventListener('click', async () => {
      const url   = container.querySelector('#qa-url').value.trim();
      const title = container.querySelector('#qa-title').value.trim();
      if (!url) { App.toast('Please enter a URL', 'error'); return; }
      try {
        new URL(url);
      } catch { App.toast('Invalid URL', 'error'); return; }

      const dup = Store.checkDuplicate(url);
      if (dup) { App.toast(`Already saved: "${dup.title}"`, 'info'); return; }

      const domain = new URL(url).hostname;
      await Store.add(Store.COLLECTIONS.links, {
        url, title: title || domain, category: Links.autoCategory(url),
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        tags: [], notes: '', pinned: false
      });
      container.querySelector('#qa-url').value = '';
      container.querySelector('#qa-title').value = '';
      App.toast('Bookmark added!', 'success');
    });

    // Note submit
    container.querySelector('#qa-note-submit')?.addEventListener('click', async () => {
      const title = container.querySelector('#qa-note-title').value.trim();
      const body  = container.querySelector('#qa-note-body').value.trim();
      if (!title) { App.toast('Please enter a title', 'error'); return; }
      await Store.add(Store.COLLECTIONS.notes, { title, body, pinned: false, color: null, linkedBookmarks: [] });
      container.querySelector('#qa-note-title').value = '';
      container.querySelector('#qa-note-body').value  = '';
      App.toast('Note added!', 'success');
    });
  }

  function skeletonRows(n) {
    return Array(n).fill(`
      <div class="recent-item" style="pointer-events:none">
        <div class="recent-item-icon skeleton" style="width:32px;height:32px;border-radius:8px;flex-shrink:0"></div>
        <div class="recent-item-body">
          <div class="skeleton" style="height:13px;width:60%;border-radius:4px;margin-bottom:6px"></div>
          <div class="skeleton" style="height:11px;width:35%;border-radius:4px"></div>
        </div>
      </div>`).join('');
  }

  function countNodes(nodes) {
    let count = 0;
    for (const node of (nodes || [])) {
      count++;
      if (node.children) count += countNodes(node.children);
    }
    return count;
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function unmount() {
    clearTimeout(refreshTimer);
    unsubLinks?.();
    unsubNotes?.();
    unsubSnippets?.();
  }

  return { render, unmount };
})();
