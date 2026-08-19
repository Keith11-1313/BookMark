// prompts.js — Prompt library with likes, side-panel viewer,
//   and user CRUD (add/edit/delete) backed by localStorage.
//
// User prompts display a "Local" badge and have Edit/Delete actions.
// Copy always uses the full body (never truncated in DOM).

const Prompts = (() => {
  const CATEGORIES = ['Writing', 'Coding', 'Analysis', 'Creative', 'Business', 'Marketing', 'Education', 'Personal', 'Other'];
  const CAT_KEY = { Writing:'writing', Coding:'coding', Analysis:'analysis', Creative:'creative', Business:'business', Marketing:'marketing', Education:'education', Personal:'personal', Other:'other' };
  let allPrompts = [], activeId = null;

  // ── Custom category helpers ────────────────────────────────
  // Same localStorage key as links.js — categories are shared across all modules.
  function readCustomCats() {
    try { return JSON.parse(localStorage.getItem('user_custom_cats')) || []; }
    catch { return []; }
  }
  function saveCustomCat(name) {
    const cats = readCustomCats();
    if (!cats.includes(name)) { cats.push(name); localStorage.setItem('user_custom_cats', JSON.stringify(cats)); }
  }
  // Merged: CATEGORIES + JSON data categories + custom + 'Other' last, deduped
  function buildCatOptions(selected) {
    const fromData = Store.get('prompts').map(p => p.category).filter(Boolean);
    const custom = readCustomCats();
    const all = [...new Set([...CATEGORIES.filter(c => c !== 'Other'), ...fromData, ...custom, 'Other'])];
    return all.map(c => `<option value="${escAttr(c)}"${c === selected ? ' selected' : ''}>${escHtml(c)}</option>`).join('');
  }
  // Filter dropdown also includes JSON data categories
  function buildFilterOptions() {
    const fromData = Store.get('prompts').map(p => p.category).filter(Boolean);
    const custom = readCustomCats();
    const all = [...new Set([...CATEGORIES.filter(c => c !== 'Other'), ...fromData, ...custom, 'Other'])];
    return all.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  }
  function resolveCategory(container) {
    const sel = container.querySelector('#pr-category')?.value || 'Other';
    if (sel === 'Other') {
      const custom = (container.querySelector('#pr-custom-cat')?.value || '').trim();
      if (custom) { saveCustomCat(custom); return custom; }
    }
    return sel;
  }
  function syncCustomCatInput(container) {
    const sel = container.querySelector('#pr-category');
    const input = container.querySelector('#pr-custom-cat');
    if (!sel || !input) return;
    if (sel.value === 'Other') {
      input.style.display = 'block';
      input.focus();
    } else {
      input.style.display = 'none';
      input.value = '';
    }
  }

  function render(container) {
    allPrompts = Store.get('prompts');
    container.innerHTML = buildShell();
    bindEvents(container);
    refreshList(container);
    renderFab(container);
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          ${Icons.svg('sparkles', 24, 'ui-icon icon-accent')}
          <div><div class="page-title">Prompts</div><div class="page-subtitle">Reusable prompts for AI &amp; automation</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary hide-on-mobile" id="btn-new-prompt">
            ${Icons.svg('plus', 15)}<span>New Prompt</span>
          </button>
        </div>
      </div>
      <div class="page-toolbar">
        <div class="search-bar">
          <span class="search-icon">${Icons.svg('search', 15)}</span>
          <input class="input" id="prompts-search" type="search" placeholder="Search prompts…">
        </div>
        <select class="input" id="prompts-cat-filter" style="width:auto">
          <option value="all">All Categories</option>
          ${buildFilterOptions()}
        </select>
        <select class="input" id="prompts-sort" style="width:auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="liked">Liked first</option>
        </select>
      </div>
      <div id="smart-add-hint" class="smart-add-hint"></div>
      <div class="prompts-layout" id="prompts-layout">
        <div class="prompts-list-panel">
          <div id="prompts-grid" class="prompts-grid"></div>
        </div>
      </div>

      <div class="modal-backdrop" id="pr-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add Prompt">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title" id="pr-modal-title">New Prompt</span>
            <button class="btn-ghost btn-sm btn-icon" id="pr-modal-close" aria-label="Close">${Icons.svg('x', 16)}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="pr-edit-id">
            <div class="form-field">
              <label class="form-label" for="pr-title">Title <span style="color:var(--danger)">*</span></label>
              <input class="input" id="pr-title" type="text" placeholder="My Prompt">
            </div>
            <div class="form-field">
              <label class="form-label" for="pr-category">Category</label>
              <select class="input" id="pr-category">${buildCatOptions('Other')}</select>
              <input class="input" id="pr-custom-cat" type="text"
                     placeholder="Type a new category name…"
                     maxlength="40"
                     style="display:none;margin-top:var(--space-2)">
            </div>
            <div class="form-field">
              <label class="form-label" for="pr-body">Prompt Body <span style="color:var(--danger)">*</span></label>
              <textarea class="input" id="pr-body" rows="8" placeholder="You are a helpful assistant that…" style="font-family:var(--font-mono);font-size:13px"></textarea>
              <div id="pr-type-hint" class="type-hint" style="display:none"></div>
            </div>
            <div class="form-field">
              <label class="form-label" for="pr-tags">Tags <span class="form-hint">(comma-separated)</span></label>
              <input class="input" id="pr-tags" type="text" placeholder="system-prompt, coding">
            </div>
            <div class="inline-notice">
              ${Icons.svg('info', 13)}
              <span>Saved in browser localStorage only. Clearing browser data removes it.</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="pr-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="pr-modal-save">Save Prompt</button>
          </div>
        </div>
      </div>`;
  }

  // ── FAB ───────────────────────────────────────────────────
  function renderFab(container) {
    let fab = document.getElementById('page-fab');
    if (fab) fab.remove();
    fab = document.createElement('button');
    fab.id = 'page-fab';
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'New Prompt');
    fab.innerHTML = Icons.svg('plus', 24);
    document.body.appendChild(fab);
    fab.addEventListener('click', () => openModal(container));
  }

  // ── Modal ──────────────────────────────────────────────────
  function openModal(container, prompt = null) {
    const backdrop = container.querySelector('#pr-modal-backdrop'); if (!backdrop) return;
    container.querySelector('#pr-modal-title').textContent = prompt ? 'Edit Prompt' : 'New Prompt';
    container.querySelector('#pr-edit-id').value = prompt?.id || '';
    container.querySelector('#pr-title').value = prompt?.title || '';

    // Rebuild options so newly-added custom cats appear
    const sel = container.querySelector('#pr-category');
    const customInput = container.querySelector('#pr-custom-cat');
    const savedCat = prompt?.category || 'Other';
    const allCats = [...new Set([...CATEGORIES.filter(c => c !== 'Other'), ...Store.get('prompts').map(p => p.category).filter(Boolean), ...readCustomCats(), 'Other'])];
    const isKnown = allCats.includes(savedCat);
    sel.innerHTML = buildCatOptions(isKnown ? savedCat : 'Other');
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

    container.querySelector('#pr-body').value = prompt?.body || '';
    container.querySelector('#pr-tags').value = (prompt?.tags || []).join(', ');
    backdrop.classList.add('open');
    setTimeout(() => container.querySelector('#pr-title')?.focus(), 50);
  }

  function closeModal(container) {
    container.querySelector('#pr-modal-backdrop')?.classList.remove('open');
  }

  function savePrompt(container) {
    const title = (container.querySelector('#pr-title')?.value || '').trim();
    const body = (container.querySelector('#pr-body')?.value || '').trim();
    if (!title) { App.toast('Title is required', 'error'); return; }
    if (!body) { App.toast('Prompt body is required', 'error'); return; }
    const category = resolveCategory(container);
    const tags = (container.querySelector('#pr-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
    const editId = container.querySelector('#pr-edit-id')?.value || '';
    const data = { title, category, body, tags };
    if (editId) { Store.updateUser('prompts', editId, data); App.toast('Prompt updated', 'success'); }
    else { Store.addUser('prompts', data); App.toast('Prompt saved', 'success'); }
    allPrompts = Store.get('prompts');
    closeModal(container);
    refreshList(container);
  }

  // ── List ──────────────────────────────────────────────────
  function refreshList(container) {
    allPrompts = Store.get('prompts');
    let data = [...allPrompts];
    const q = (container.querySelector('#prompts-search')?.value || '').toLowerCase();
    const cat = container.querySelector('#prompts-cat-filter')?.value || 'all';
    const sort = container.querySelector('#prompts-sort')?.value || 'newest';
    if (q) data = data.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.body || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
    if (cat !== 'all') data = data.filter(p => p.category === cat);

    if (sort === 'liked') data.sort((a, b) => (Store.isLiked('prompts', b.id) ? 1 : 0) - (Store.isLiked('prompts', a.id) ? 1 : 0));
    else if (sort === 'oldest') data.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    else data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const grid = container.querySelector('#prompts-grid'); if (!grid) return;
    if (!data.length) {
      let extra = '';
      if (q && cat === 'all') {
        const sugg = Store.suggestSpelling(q, { scope: ['prompts'] });
        if (sugg.length) extra += `<div class="did-mean">Did you mean ${sugg.map(s => `<button type="button" class="did-mean-btn" data-suggest="${escAttr(s)}">${escHtml(s)}</button>`).join('')}?</div>`;
        let relatedHtml = '', exploreHtml = '';
        const related = Store.suggestRelated(q, { scope: ['prompts'] });
        if (related.length) relatedHtml = `<div class="did-mean">You might like ${related.map(s => `<button type="button" class="did-mean-btn did-mean-related" data-suggest="${escAttr(s)}">${escHtml(s)}</button>`).join('')}</div>`;
        const explore = Store.suggestExplore(q, { scope: ['prompts'] });
        if (explore.length) exploreHtml = `<div class="did-mean">Would you like ${explore.map(s => `<button type="button" class="did-mean-btn did-mean-explore" data-suggest="${escAttr(s)}">${escHtml(s)}</button>`).join('')}</div>`;
        if (relatedHtml && exploreHtml) extra += relatedHtml + '<div class="did-mean-sep">or</div>' + exploreHtml;
        else extra += relatedHtml + exploreHtml;
      }
      if (q) extra += `<button type="button" class="btn btn-secondary btn-sm empty-clear">${Icons.svg('x', 13)} Clear search</button>`;
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${q ? '' : Icons.svg('sparkles', 40)}<h3>${q ? '' : 'No prompts yet'}</h3><p>${q ? '' : 'Click New Prompt to add one'}</p>${extra}</div>`;
      grid.querySelectorAll('.did-mean-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = container.querySelector('#prompts-search');
          if (input) input.value = btn.dataset.suggest;
          refreshList(container);
        });
      });
      grid.querySelector('.empty-clear')?.addEventListener('click', () => {
        const input = container.querySelector('#prompts-search');
        if (input) input.value = '';
        refreshList(container);
        renderSmartAddHint(container);
      });
      return;
    }
    grid.innerHTML = data.map(p => renderCard(p)).join('');
    grid.querySelectorAll('.prompt-card').forEach(card => bindCardEvents(card, container));
  }

  function renderCard(p) {
    const catKey = CAT_KEY[p.category] || 'other';
    const tags = (p.tags || []).map(t => `<span class="prompt-tag">${escHtml(t)}</span>`).join('');
    const liked = Store.isLiked('prompts', p.id);
    const isUser = !!p._isUser;
    return `
      <div class="prompt-card${p.id === activeId ? ' active' : ''}" data-id="${escAttr(p.id)}">
        <div class="prompt-header">
          <span class="prompt-title">${escHtml(p.title || 'Untitled')}</span>
          ${isUser ? '<span class="user-badge">Local</span>' : ''}
          <span class="prompt-cat cat-${catKey}">${escHtml(p.category || 'Other')}</span>
          <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
            ${isUser ? `
              <button class="toolbar-btn" data-action="edit" data-tooltip="Edit" style="width:26px;height:26px">${Icons.svg('pencil', 13)}</button>
              <button class="toolbar-btn" data-action="delete" data-tooltip="Delete" style="width:26px;height:26px;color:var(--danger)">${Icons.svg('trash', 13)}</button>` : ''}
            <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">
              ${Icons.svg('heart', 14, liked ? 'ui-icon liked-heart' : 'ui-icon')}
            </button>
          </div>
        </div>
        <div class="prompt-body-wrap">
          <div class="prompt-body">${escHtml(p.body || '')}</div>
          <button class="copy-btn-overlay" data-action="copy" aria-label="Copy prompt">
            ${Icons.svg('copy', 12)} Copy
          </button>
        </div>
        <div class="prompt-footer">
          <div class="prompt-tags">${tags}</div>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <span class="prompt-date">${App.formatDate(p.createdAt)}</span>
            <button class="btn btn-ghost btn-sm" data-action="view" style="font-size:11px;padding:2px 6px">View</button>
          </div>
        </div>
      </div>`;
  }

  function bindCardEvents(card, container) {
    const p = allPrompts.find(x => x.id === card.dataset.id);

    card.querySelector('[data-action="copy"]')?.addEventListener('click', e => { e.stopPropagation(); copyPrompt(card, e.currentTarget); });
    card.querySelector('[data-action="like"]')?.addEventListener('click', e => {
      e.stopPropagation();
      const nowLiked = Store.toggleLike('prompts', card.dataset.id);
      App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
      refreshList(container);
    });
    card.querySelector('[data-action="view"]')?.addEventListener('click', e => { e.stopPropagation(); openViewer(card.dataset.id, container); });
    card.querySelector('[data-action="edit"]')?.addEventListener('click', e => { e.stopPropagation(); if (p) openModal(container, p); });
    card.querySelector('[data-action="delete"]')?.addEventListener('click', e => {
      e.stopPropagation();
      App.confirm('Delete this prompt?', () => {
        Store.removeUser('prompts', card.dataset.id);
        if (activeId === card.dataset.id) closeViewer(container);
        App.toast('Prompt deleted', 'success');
        refreshList(container);
      });
    });
    card.addEventListener('click', e => { if (e.target.closest('[data-action]')) return; openViewer(card.dataset.id, container); });
  }

  function copyPrompt(card, btn) {
    const text = card.querySelector('.prompt-body')?.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      btn.innerHTML = `${Icons.svg('check', 12)} Copied!`;
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = `${Icons.svg('copy', 12)} Copy`; }, 2000);
    }).catch(() => App.toast('Copy failed', 'error'));
  }

  // ── Side-panel viewer ──────────────────────────────────────
  function openViewer(id, container) {
    allPrompts = Store.get('prompts');
    const prompt = allPrompts.find(p => p.id === id); if (!prompt) return;
    activeId = id;
    const layout = container.querySelector('#prompts-layout');
    layout.classList.add('has-viewer');
    let panel = container.querySelector('.prompt-viewer-panel');
    if (!panel) { panel = document.createElement('div'); panel.className = 'prompt-viewer-panel'; layout.appendChild(panel); }
    const catKey = CAT_KEY[prompt.category] || 'other';
    const tags = (prompt.tags || []).map(t => `<span class="prompt-tag">${escHtml(t)}</span>`).join('');
    panel.innerHTML = `
      <div class="editor-toolbar">
        <span style="font-weight:600;color:var(--text-primary);font-size:var(--text-sm)">Prompt Viewer${prompt._isUser ? ' <span class="user-badge" style="margin-left:6px">Local</span>' : ''}</span>
        <button class="copy-btn-overlay" id="btn-copy-viewer" style="position:static;opacity:1;pointer-events:auto;margin-left:auto;margin-right:var(--space-2)">
          ${Icons.svg('copy', 12)} Copy
        </button>
        <button class="btn-ghost btn-sm btn-icon" id="btn-close-viewer" aria-label="Close viewer">${Icons.svg('x', 16)}</button>
      </div>
      <div class="editor-meta" style="flex-direction:column;align-items:flex-start;gap:var(--space-2)">
        <div style="font-weight:700;font-size:var(--text-lg);color:var(--text-primary)">${escHtml(prompt.title || 'Untitled')}</div>
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <span class="prompt-cat cat-${catKey}">${escHtml(prompt.category || 'Other')}</span>
          ${tags ? `<div class="prompt-tags">${tags}</div>` : ''}
          <span class="editor-save-status">${App.formatDateFull(prompt.createdAt)}</span>
        </div>
      </div>
      <div class="viewer-body prompt-body-full" id="viewer-prompt-body">${escHtml(prompt.body || '')}</div>
    `;
    panel.querySelector('#btn-close-viewer')?.addEventListener('click', () => closeViewer(container));
    panel.querySelector('#btn-copy-viewer')?.addEventListener('click', e => {
      const btn = e.currentTarget;
      const text = panel.querySelector('#viewer-prompt-body')?.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied'); btn.innerHTML = `${Icons.svg('check', 12)} Copied!`;
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = `${Icons.svg('copy', 12)} Copy`; }, 2000);
      }).catch(() => App.toast('Copy failed', 'error'));
    });
    refreshList(container);
  }

  function closeViewer(container) {
    activeId = null;
    container.querySelector('#prompts-layout')?.classList.remove('has-viewer');
    container.querySelector('.prompt-viewer-panel')?.remove();
    refreshList(container);
  }

  function bindEvents(container) {
    container.querySelector('#btn-new-prompt')?.addEventListener('click', () => openModal(container));
    container.querySelector('#prompts-search')?.addEventListener('input', () => { refreshList(container); renderSmartAddHint(container); });
    container.querySelector('#prompts-cat-filter')?.addEventListener('change', () => refreshList(container));
    container.querySelector('#prompts-sort')?.addEventListener('change', () => refreshList(container));
    container.querySelector('#pr-modal-close')?.addEventListener('click', () => closeModal(container));
    container.querySelector('#pr-modal-cancel')?.addEventListener('click', () => closeModal(container));
    container.querySelector('#pr-modal-backdrop')?.addEventListener('click', e => { if (e.target === container.querySelector('#pr-modal-backdrop')) closeModal(container); });
    container.querySelector('#pr-modal-save')?.addEventListener('click', () => savePrompt(container));
    // Show/hide custom category input when "Other" is selected
    container.querySelector('#pr-category')?.addEventListener('change', () => syncCustomCatInput(container));
    container.querySelector('#pr-body')?.addEventListener('input', () => updatePrTypeHint(container));
  }

  function renderSmartAddHint(container) {
    const el = container.querySelector('#smart-add-hint');
    if (!el) return;
    const q = (container.querySelector('#prompts-search')?.value || '').trim();
    if (!q) { el.style.display = 'none'; el.innerHTML = ''; return; }
    const type = SmartAdd.classify(q);
    if (!type || type === 'prompt') { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.innerHTML = SmartAdd.hintHtml(q, type);
    el.style.display = 'flex';
    el.querySelector('[data-smart-add]')?.addEventListener('click', () => SmartAdd.routeTo(type, q));
  }

  function updatePrTypeHint(container) {
    const hint = container.querySelector('#pr-type-hint');
    if (!hint) return;
    const v = (container.querySelector('#pr-body')?.value || '').trim();
    const type = v ? SmartAdd.classify(v) : null;
    if (!type || type === 'prompt') { hint.style.display = 'none'; hint.innerHTML = ''; return; }
    hint.style.display = 'flex';
    hint.innerHTML = `<span>${SmartAdd.isUrl(v) ? 'This looks like a URL —' : 'This looks like a note —'}</span><button type="button" class="btn btn-secondary btn-sm" data-smart-add="${type}">${SmartAdd.label(type)}</button>`;
    hint.querySelector('[data-smart-add]')?.addEventListener('click', () => {
      closeModal(container);
      SmartAdd.routeTo(type, v);
    });
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {
    activeId = null;
    const fab = document.getElementById('page-fab');
    if (fab) fab.remove();
  }

  return { render, unmount, openModal };
})();
