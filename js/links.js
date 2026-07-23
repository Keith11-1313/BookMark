// links.js — Bookmark browser with likes, duplicate URL warnings,
//   per-bookmark localStorage notes, and user CRUD (add/edit/delete).
//
// localStorage keys:
//   likes_bookmarks      — liked bookmark IDs (managed by Store)
//   user_bookmarks       — user-added bookmarks (managed by Store)
//   bm_note_<id>         — inline note overrides per bookmark
//
// User bookmarks display a "Local" badge and have Edit/Delete actions.
// Duplicate URL warning scans all bookmarks on render.

const Links = (() => {
  let allLinks = [], currentFilter = 'all', currentView = 'card', searchQuery = '';

  const DEFAULT_CATS = ['Design','Development','Tools','AI','Learning','Reference','Productivity','Other'];

  // ── Custom category helpers ────────────────────────────────
  // Shared localStorage key with prompts so categories typed anywhere appear everywhere.
  function readCustomCats() {
    try { return JSON.parse(localStorage.getItem('user_custom_cats')) || []; }
    catch { return []; }
  }
  function saveCustomCat(name) {
    const cats = readCustomCats();
    if (!cats.includes(name)) { cats.push(name); localStorage.setItem('user_custom_cats', JSON.stringify(cats)); }
  }
  // Merged list: JSON data categories + DEFAULT_CATS + custom cats — deduped, 'Other' always last
  function buildCatOptions(selected) {
    const fromData = Store.get('bookmarks').map(b => b.category).filter(Boolean);
    const custom = readCustomCats();
    const all = [...new Set([...DEFAULT_CATS.filter(c => c !== 'Other'), ...fromData, ...custom, 'Other'])];
    return all.map(c => `<option value="${escAttr(c)}"${c === selected ? ' selected' : ''}>${escHtml(c)}</option>`).join('');
  }
  // Returns the final category string from the select + optional custom input
  function resolveCategory(container) {
    const sel = container.querySelector('#bm-category')?.value || 'Other';
    if (sel === 'Other') {
      const custom = (container.querySelector('#bm-custom-cat')?.value || '').trim();
      if (custom) { saveCustomCat(custom); return custom; }
    }
    return sel;
  }
  // Show/hide the custom category input based on select value
  function syncCustomCatInput(container) {
    const sel = container.querySelector('#bm-category');
    const input = container.querySelector('#bm-custom-cat');
    if (!sel || !input) return;
    if (sel.value === 'Other') {
      input.style.display = 'block';
      input.focus();
    } else {
      input.style.display = 'none';
      input.value = '';
    }
  }

  // ── localStorage note helpers ─────────────────────────────
  function getNote(b) {
    const stored = localStorage.getItem('bm_note_' + b.id);
    return stored !== null ? stored : (b.notes || '');
  }
  function saveNote(id, text) {
    if (text === '') localStorage.removeItem('bm_note_' + id);
    else localStorage.setItem('bm_note_' + id, text);
  }

  // ── Duplicate detection ───────────────────────────────────
  function findDuplicates(links) {
    const map = new Map();
    links.forEach(b => {
      const key = (b.url || '').trim().replace(/\/+$/, '').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    });
    const dupes = new Map();
    map.forEach((items, url) => { if (items.length > 1) dupes.set(url, items); });
    return dupes;
  }

  function render(container) {
    allLinks = Store.get('bookmarks');
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    renderDuplicateWarning(container);
    refreshList(container);
    renderFab(container);
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
          <div><div class="page-title">Bookmarks</div><div class="page-subtitle">Curated links &amp; resources</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary hide-on-mobile" id="btn-add-bookmark">
            <i data-lucide="plus" width="15" height="15"></i><span>Add Bookmark</span>
          </button>
        </div>
      </div>

      <div id="dup-warning-area"></div>

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
          ${getCategories().map(([c, n]) => `<button class="filter-pill" data-cat="${escAttr(c)}">${escHtml(c)} <span class="filter-pill-count">${n}</span></button>`).join('')}
        </div>
      </div>

      <div id="links-grid" class="links-grid"></div>

      ${buildModal()}
    `;
  }

  // ── Add/Edit Modal ─────────────────────────────────────────
  function buildModal() {
    return `
      <div class="modal-backdrop" id="bm-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add Bookmark">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title" id="bm-modal-title">Add Bookmark</span>
            <button class="btn-ghost btn-sm btn-icon" id="bm-modal-close" aria-label="Close"><i data-lucide="x" width="16" height="16"></i></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="bm-edit-id">
            <div class="form-field">
              <label class="form-label" for="bm-url">URL <span style="color:var(--danger)">*</span></label>
              <input class="input" id="bm-url" type="url" placeholder="https://example.com" autocomplete="off">
            </div>
            <div class="form-field">
              <label class="form-label" for="bm-title">Title</label>
              <input class="input" id="bm-title" type="text" placeholder="My Bookmark">
            </div>
            <div class="form-field">
              <label class="form-label" for="bm-category">Category</label>
              <select class="input" id="bm-category">${buildCatOptions(DEFAULT_CATS[0])}</select>
              <input class="input" id="bm-custom-cat" type="text"
                     placeholder="Type a new category name…"
                     maxlength="40"
                     style="display:none;margin-top:var(--space-2)">
            </div>
            <div class="form-field">
              <label class="form-label" for="bm-tags">Tags <span class="form-hint">(comma-separated)</span></label>
              <input class="input" id="bm-tags" type="text" placeholder="tag1, tag2">
            </div>
            <div class="form-field">
              <label class="form-label" for="bm-notes">Notes</label>
              <textarea class="input" id="bm-notes" rows="3" placeholder="Optional notes…"></textarea>
            </div>
            <div id="bm-dup-warning" style="display:none" class="dup-warning">
              <i data-lucide="alert-triangle" width="14" height="14"></i>
              <span id="bm-dup-msg"></span>
            </div>
            <div class="inline-notice">
              <i data-lucide="info" width="13" height="13"></i>
              <span>Saved in browser localStorage only. Clearing browser data removes it.</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="bm-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="bm-modal-save">Save Bookmark</button>
          </div>
        </div>
      </div>`;
  }

  // ── Duplicate warning banner ──────────────────────────────
  function renderDuplicateWarning(container) {
    const area = container.querySelector('#dup-warning-area');
    if (!area) return;
    const dupes = findDuplicates(allLinks);
    if (!dupes.size) { area.innerHTML = ''; return; }
    const list = [...dupes.entries()].map(([url, items]) =>
      `<li><strong>${escHtml(items.map(b => b.title || b.url).join(', '))}</strong> — <span style="font-family:var(--font-mono);font-size:11px">${escHtml(url)}</span></li>`
    ).join('');
    area.innerHTML = `
      <div class="dup-warning" id="dup-warning" style="margin-bottom:var(--space-4);flex-direction:column;align-items:flex-start;gap:var(--space-2)">
        <div style="display:flex;align-items:center;gap:var(--space-2);width:100%">
          <i data-lucide="alert-triangle" width="16" height="16" style="flex-shrink:0"></i>
          <strong>Duplicate URLs detected (${dupes.size})</strong>
          <button style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--warning);display:flex;align-items:center" id="btn-dismiss-dupes" aria-label="Dismiss">
            <i data-lucide="x" width="14" height="14"></i>
          </button>
        </div>
        <ul style="margin:0;padding-left:var(--space-5);font-size:var(--text-xs);line-height:1.8">${list}</ul>
      </div>`;
    lucide.createIcons({ el: area });
    area.querySelector('#btn-dismiss-dupes')?.addEventListener('click', () => { area.innerHTML = ''; });
  }

  // ── FAB ───────────────────────────────────────────────────
  function renderFab(container) {
    let fab = document.getElementById('page-fab');
    if (fab) fab.remove();
    fab = document.createElement('button');
    fab.id = 'page-fab';
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'Add Bookmark');
    fab.innerHTML = '<i data-lucide="plus" width="24" height="24"></i>';
    document.body.appendChild(fab);
    lucide.createIcons({ el: fab });
    fab.addEventListener('click', () => openModal(container));
  }

  // ── Modal open/close ──────────────────────────────────────
  function openModal(container, bookmark = null) {
    const backdrop = container.querySelector('#bm-modal-backdrop');
    if (!backdrop) return;
    container.querySelector('#bm-modal-title').textContent = bookmark ? 'Edit Bookmark' : 'Add Bookmark';
    container.querySelector('#bm-edit-id').value = bookmark?.id || '';
    container.querySelector('#bm-url').value = bookmark?.url || '';
    container.querySelector('#bm-title').value = bookmark?.title || '';

    // Rebuild options so newly-added custom cats appear
    const sel = container.querySelector('#bm-category');
    const customInput = container.querySelector('#bm-custom-cat');
    const savedCat = bookmark?.category || DEFAULT_CATS[0];
    const allCats = [...new Set([...DEFAULT_CATS.filter(c => c !== 'Other'), ...Store.get('bookmarks').map(b => b.category).filter(Boolean), ...readCustomCats(), 'Other'])];
    const isKnown = allCats.includes(savedCat);
    sel.innerHTML = buildCatOptions(isKnown ? savedCat : 'Other');
    // If the saved category is a custom one not in the list yet, show it in the input
    if (!isKnown) {
      customInput.style.display = 'block';
      customInput.value = savedCat;
    } else if (savedCat === 'Other') {
      customInput.style.display = 'block';
      customInput.value = '';
    } else {
      customInput.style.display = 'none';
      customInput.value = '';
    }

    container.querySelector('#bm-tags').value = (bookmark?.tags || []).join(', ');
    container.querySelector('#bm-notes').value = bookmark?.notes || '';
    hideDupWarningModal(container);
    backdrop.classList.add('open');
    setTimeout(() => container.querySelector('#bm-url')?.focus(), 50);
  }

  function closeModal(container) {
    container.querySelector('#bm-modal-backdrop')?.classList.remove('open');
  }

  function hideDupWarningModal(container) {
    const w = container.querySelector('#bm-dup-warning');
    if (w) w.style.display = 'none';
  }

  // ── Save bookmark (add or edit) ───────────────────────────
  function saveBookmark(container) {
    const url = (container.querySelector('#bm-url')?.value || '').trim();
    if (!url) { App.toast('URL is required', 'error'); return; }
    const safeU = App.safeUrl(url, '');
    if (!safeU) { App.toast('Enter a valid http/https URL', 'error'); return; }

    const title = (container.querySelector('#bm-title')?.value || '').trim() || url;
    const category = resolveCategory(container);
    const tagsRaw = (container.querySelector('#bm-tags')?.value || '');
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const notes = (container.querySelector('#bm-notes')?.value || '').trim();
    const editId = container.querySelector('#bm-edit-id')?.value || '';

    // Duplicate URL check
    const existing = allLinks.find(b => {
      const norm = (b.url || '').trim().replace(/\/+$/, '').toLowerCase();
      const norm2 = url.replace(/\/+$/, '').toLowerCase();
      return norm === norm2 && b.id !== editId;
    });
    if (existing) {
      const w = container.querySelector('#bm-dup-warning');
      const m = container.querySelector('#bm-dup-msg');
      if (w && m) { m.textContent = `"${existing.title || existing.url}" already uses this URL.`; w.style.display = 'flex'; }
      lucide.createIcons({ el: container.querySelector('#bm-dup-warning') });
      // allow save anyway — just warn
    }

    const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(safeU).hostname)}&sz=32`;
    const data = { url: safeU, title, category, tags, notes, favicon };

    if (editId) {
      Store.updateUser('bookmarks', editId, data);
      App.toast('Bookmark updated', 'success');
    } else {
      Store.addUser('bookmarks', data);
      App.toast('Bookmark saved', 'success');
    }
    allLinks = Store.get('bookmarks');
    closeModal(container);
    renderDuplicateWarning(container);
    refreshList(container);
  }

  // ── List ──────────────────────────────────────────────────
  function refreshList(container) {
    allLinks = Store.get('bookmarks');
    let data = [...allLinks];
    if (currentFilter !== 'all') data = data.filter(b => b.category === currentFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(b =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.url || '').toLowerCase().includes(q) ||
        getNote(b).toLowerCase().includes(q) ||
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
    const noteText = getNote(b);
    const hasLocalNote = localStorage.getItem('bm_note_' + b.id) !== null;
    const isUser = !!b._isUser;
    const ghMeta = b.githubMeta ? `<div class="github-meta"><span class="github-stat"><i data-lucide="star" width="11" height="11"></i> ${Number(b.githubMeta.stars)||0}</span><span class="github-stat"><i data-lucide="git-fork" width="11" height="11"></i> ${Number(b.githubMeta.forks)||0}</span>${b.githubMeta.language?`<span class="github-lang"><span class="lang-dot" style="background:#${langColor(b.githubMeta.language)}"></span>${escHtml(b.githubMeta.language)}</span>`:''}</div>` : '';
    return `
      <div class="bookmark-card" data-id="${escAttr(b.id)}">
        <div class="bookmark-card-header">
          <div class="bookmark-favicon">${favicon ? `<img src="${escAttr(favicon)}" alt="" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22%3E%3C/svg%3E'">` : ''}</div>
          <div class="bookmark-card-meta">
            <div class="bookmark-title" style="display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap">
              <span>${escHtml(b.title || domain)}</span>
              ${isUser ? '<span class="user-badge">Local</span>' : ''}
            </div>
            <div class="bookmark-category">${escHtml(b.category || 'Other')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
            ${isUser ? `
              <button class="toolbar-btn" data-action="edit" data-tooltip="Edit" aria-label="Edit bookmark" style="width:28px;height:28px">
                <i data-lucide="pencil" width="13" height="13"></i>
              </button>
              <button class="toolbar-btn" data-action="delete" data-tooltip="Delete" aria-label="Delete bookmark" style="width:28px;height:28px;color:var(--danger)">
                <i data-lucide="trash-2" width="13" height="13"></i>
              </button>` : ''}
            <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">
              <i data-lucide="heart" width="16" height="16" style="${liked ? 'fill:var(--danger);color:var(--danger)' : ''}"></i>
            </button>
          </div>
        </div>
        <a class="bookmark-url" href="${escAttr(url)}" target="_blank" rel="noopener">${escHtml(b.url || url)}</a>
        ${ghMeta}
        <div class="bookmark-note-wrap" data-id="${escAttr(b.id)}">
          <div class="bookmark-desc bookmark-note-display${noteText ? '' : ' bookmark-note-empty'}" data-action="edit-note">
            ${noteText ? escHtml(noteText) : '<span style="color:var(--text-muted);font-style:italic">Add a note… (saved locally)</span>'}
          </div>
          <textarea class="bookmark-note-input input" style="display:none;font-size:var(--text-xs);min-height:60px;resize:vertical;width:100%;box-sizing:border-box" placeholder="Write a note… (Ctrl+Enter to save)" maxlength="1000">${escHtml(noteText)}</textarea>
          <div class="bookmark-note-actions" style="display:none;gap:var(--space-2);margin-top:var(--space-1)">
            <button class="btn btn-secondary btn-sm" data-action="save-note" style="font-size:11px">Save</button>
            <button class="btn btn-ghost btn-sm" data-action="cancel-note" style="font-size:11px">Cancel</button>
            ${hasLocalNote ? `<button class="btn btn-ghost btn-sm" data-action="clear-note" style="font-size:11px;color:var(--danger)">Clear local</button>` : ''}
          </div>
        </div>
        ${tags ? `<div class="bookmark-tags">${tags}</div>` : ''}
        <div class="bookmark-footer">
          <span class="bookmark-date">${App.formatDate(b.createdAt)}</span>
          <a class="bookmark-open-btn" href="${escAttr(url)}" target="_blank" rel="noopener"><i data-lucide="external-link" width="12" height="12"></i> Open</a>
        </div>
      </div>`;
  }

  function bindCardEvents(card, container) {
    const b = allLinks.find(x => x.id === card.dataset.id);

    card.querySelector('[data-action="like"]')?.addEventListener('click', e => {
      e.stopPropagation();
      const nowLiked = Store.toggleLike('bookmarks', card.dataset.id);
      App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
      refreshList(container);
    });

    card.querySelector('[data-action="edit"]')?.addEventListener('click', e => {
      e.stopPropagation();
      if (b) openModal(container, b);
    });

    card.querySelector('[data-action="delete"]')?.addEventListener('click', e => {
      e.stopPropagation();
      App.confirm('Delete this bookmark?', () => {
        Store.removeUser('bookmarks', card.dataset.id);
        App.toast('Bookmark deleted', 'success');
        allLinks = Store.get('bookmarks');
        renderDuplicateWarning(container);
        refreshList(container);
      });
    });

    // Inline note editing
    const noteWrap = card.querySelector('.bookmark-note-wrap');
    const display = noteWrap?.querySelector('[data-action="edit-note"]');
    const textarea = noteWrap?.querySelector('.bookmark-note-input');
    const actions = noteWrap?.querySelector('.bookmark-note-actions');

    function openEdit() {
      if (!display || !textarea || !actions) return;
      display.style.display = 'none';
      textarea.style.display = 'block';
      actions.style.display = 'flex';
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
    function closeEdit(save) {
      if (!display || !textarea || !actions) return;
      if (save) { saveNote(card.dataset.id, textarea.value.trim()); App.toast('Note saved locally', 'success'); }
      display.style.display = '';
      textarea.style.display = 'none';
      actions.style.display = 'none';
      refreshList(container);
    }
    display?.addEventListener('click', openEdit);
    noteWrap?.querySelector('[data-action="save-note"]')?.addEventListener('click', () => closeEdit(true));
    noteWrap?.querySelector('[data-action="cancel-note"]')?.addEventListener('click', () => closeEdit(false));
    noteWrap?.querySelector('[data-action="clear-note"]')?.addEventListener('click', () => {
      localStorage.removeItem('bm_note_' + card.dataset.id);
      App.toast('Local note cleared', 'success');
      refreshList(container);
    });
    textarea?.addEventListener('click', e => e.stopPropagation());
    textarea?.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) closeEdit(true); });
  }

  function bindEvents(container) {
    container.querySelector('#btn-add-bookmark')?.addEventListener('click', () => openModal(container));
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

    // Modal
    container.querySelector('#bm-modal-close')?.addEventListener('click', () => closeModal(container));
    container.querySelector('#bm-modal-cancel')?.addEventListener('click', () => closeModal(container));
    container.querySelector('#bm-modal-backdrop')?.addEventListener('click', e => { if (e.target === container.querySelector('#bm-modal-backdrop')) closeModal(container); });
    container.querySelector('#bm-modal-save')?.addEventListener('click', () => saveBookmark(container));
    container.querySelector('#bm-url')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveBookmark(container); });
    // Show/hide custom category input when "Other" is selected
    container.querySelector('#bm-category')?.addEventListener('change', () => syncCustomCatInput(container));
    lucide.createIcons({ el: container.querySelector('#bm-modal-backdrop') });

    initFilterBarScroll(container);
  }

  function initFilterBarScroll(container) {
    const bar = container.querySelector('.filter-bar');
    if (!bar) return;
    bar.addEventListener('wheel', e => {
      if (e.deltaY !== 0) { e.preventDefault(); bar.scrollLeft += e.deltaY * 1.5; }
    }, { passive: false });
    let isDown = false, startX = 0, scrollStart = 0, didDrag = false;
    bar.addEventListener('mousedown', e => { isDown = true; didDrag = false; startX = e.pageX - bar.offsetLeft; scrollStart = bar.scrollLeft; bar.style.cursor = 'grabbing'; bar.style.userSelect = 'none'; });
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
    container.querySelectorAll('.filter-pill').forEach(p => { p.classList.toggle('active', p.dataset.cat === cat); });
    refreshList(container);
  }

  function getDomain(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; } }
  function langColor(lang) { const map = { JavaScript:'f1e05a',TypeScript:'3178c6',Python:'3572a5',HTML:'e34c26',CSS:'563d7c',Go:'00add8',Rust:'dea584',Java:'b07219',Ruby:'701516' }; return map[lang] || '5865f2'; }
  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {
    const fab = document.getElementById('page-fab');
    if (fab) fab.remove();
  }

  return { render, unmount, filterByCategory };
})();
