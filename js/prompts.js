// prompts.js — Reusable AI/text prompt library

const Prompts = (() => {
  const COL = Store.COLLECTIONS.prompts;
  const CATEGORIES = ['Writing', 'Coding', 'Analysis', 'Creative', 'Business', 'Marketing', 'Education', 'Personal', 'Other'];
  // Tailwind-free CSS hook per category (used as a class on the badge)
  const CAT_KEY = { Writing: 'writing', Coding: 'coding', Analysis: 'analysis', Creative: 'creative', Business: 'business', Marketing: 'marketing', Education: 'education', Personal: 'personal', Other: 'other' };
  let allPrompts=[], unsub=null, editingId=null, searchQuery='', filterCat='all';

  function render(container) {
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    unsub = Store.subscribe(COL, data => { allPrompts = data; refreshList(container); });
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="sparkles" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Prompts</div><div class="page-subtitle">Reusable prompts for AI &amp; automation</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-prompt"><i data-lucide="plus" width="16" height="16"></i> New Prompt</button>
        </div>
      </div>
      <div class="page-toolbar">
        <div class="search-bar">
          <span class="search-icon"><i data-lucide="search" width="15" height="15"></i></span>
          <input class="input" id="prompts-search" type="search" placeholder="Search prompts…">
        </div>
        <select class="input" id="prompts-cat-filter" style="width:auto">
          <option value="all">All Categories</option>
          ${CATEGORIES.map(c => `<option>${escHtml(c)}</option>`).join('')}
        </select>
      </div>
      <div id="prompts-grid" class="prompts-grid"></div>

      <!-- Add/Edit Modal -->
      <div class="modal-backdrop" id="prompt-modal">
        <div class="modal" style="max-width:680px">
          <div class="modal-header">
            <span class="modal-title" id="prompt-modal-title">New Prompt</span>
            <button class="btn-ghost btn-icon btn-sm" onclick="App.closeModal('prompt-modal')"><i data-lucide="x" width="16" height="16"></i></button>
          </div>
          <div class="modal-body">
            <div class="prompt-modal-grid">
              <div class="form-field">
                <label class="form-label" for="prompt-title">Title *</label>
                <input class="input" id="prompt-title" type="text" placeholder="e.g. Code review assistant">
              </div>
              <div class="form-field">
                <label class="form-label" for="prompt-cat">Category</label>
                <select class="input" id="prompt-cat">${CATEGORIES.map(c => `<option>${escHtml(c)}</option>`).join('')}</select>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label" for="prompt-body">Prompt *</label>
              <textarea class="input font-mono" id="prompt-body" rows="12" placeholder="Write your prompt here…" style="line-height:1.5;font-size:13px;resize:vertical;white-space:pre-wrap"></textarea>
            </div>
            <div class="form-field">
              <label class="form-label" for="prompt-tags">Tags</label>
              <input class="input" id="prompt-tags" type="text" placeholder="ai, summarization, gpt (comma separated)">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="App.closeModal('prompt-modal')">Cancel</button>
            <button class="btn btn-primary" id="prompt-modal-save"><i data-lucide="save" width="14" height="14"></i> Save</button>
          </div>
        </div>
      </div>`;
  }

  function refreshList(container) {
    let data = [...allPrompts];
    const q   = (container.querySelector('#prompts-search')?.value || '').toLowerCase();
    const cat = container.querySelector('#prompts-cat-filter')?.value || 'all';
    if (q)   data = data.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.body  || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
    if (cat !== 'all') data = data.filter(p => p.category === cat);

    data.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite)  return 1;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    const grid = container.querySelector('#prompts-grid'); if (!grid) return;
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i data-lucide="sparkles" width="40" height="40"></i><h3>No prompts yet</h3><p>Save your first reusable prompt</p><button class="btn btn-primary" id="empty-new-prompt"><i data-lucide="plus" width="15" height="15"></i> New Prompt</button></div>`;
      grid.querySelector('#empty-new-prompt')?.addEventListener('click', () => openAddModal(container));
      lucide.createIcons({ el: grid }); return;
    }
    grid.innerHTML = data.map(p => renderCard(p)).join('');
    grid.querySelectorAll('.prompt-card').forEach(card => bindCardEvents(card, container));
    lucide.createIcons({ el: grid });
  }

  function renderCard(p) {
    const catKey = CAT_KEY[p.category] || 'other';
    const tags = (p.tags || []).map(t => `<span class="prompt-tag">${escHtml(t)}</span>`).join('');
    const preview = escHtml((p.body || '').slice(0, 600));
    return `
      <div class="prompt-card${p.favorite ? ' favorite' : ''}" data-id="${escAttr(p.id)}">
        <div class="prompt-header">
          <span class="prompt-title">${escHtml(p.title || 'Untitled')}</span>
          <span class="prompt-cat cat-${catKey}">${escHtml(p.category || 'Other')}</span>
          <div class="prompt-actions">
            <button class="btn-ghost btn-icon btn-sm" data-action="edit" aria-label="Edit prompt" data-tooltip="Edit"><i data-lucide="pencil" width="13" height="13"></i></button>
            <button class="btn-ghost btn-icon btn-sm" data-action="delete" aria-label="Delete prompt" data-tooltip="Delete"><i data-lucide="trash-2" width="13" height="13"></i></button>
          </div>
          <button class="prompt-star${p.favorite ? ' active' : ''}" data-action="favorite" aria-label="${p.favorite ? 'Unfavorite' : 'Favorite'}" data-tooltip="${p.favorite ? 'Unfavorite' : 'Favorite'}">
            <i data-lucide="star" width="15" height="15" style="${p.favorite ? 'fill:var(--warning);color:var(--warning)' : 'fill:none'}"></i>
          </button>
        </div>
        <div class="prompt-body-wrap">
          <div class="prompt-body">${preview}</div>
          <button class="copy-btn-overlay" data-action="copy" aria-label="Copy prompt">
            <i data-lucide="copy" width="12" height="12"></i> Copy
          </button>
        </div>
        <div class="prompt-footer">
          <div class="prompt-tags">${tags}</div>
          <span class="prompt-date">${App.formatDate(p.createdAt)}</span>
        </div>
      </div>`;
  }

  function bindCardEvents(card, container) {
    const id = card.dataset.id;
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => deletePrompt(id));
    card.querySelector('[data-action="edit"]')?.addEventListener('click', () => openEditModal(id, container));
    card.querySelector('[data-action="copy"]')?.addEventListener('click', e => copyPrompt(card, e.currentTarget));
    card.querySelector('[data-action="favorite"]')?.addEventListener('click', async () => {
      const p = allPrompts.find(x => x.id === id);
      await Store.update(COL, id, { favorite: !p?.favorite });
      App.toast(p?.favorite ? 'Unfavorited' : 'Favorited!', 'success');
    });
  }

  function copyPrompt(card, btn) {
    const text = card.querySelector('.prompt-body')?.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      btn.innerHTML = '<i data-lucide="check" width="12" height="12"></i> Copied!';
      lucide.createIcons({ el: btn });
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i data-lucide="copy" width="12" height="12"></i> Copy'; lucide.createIcons({ el: btn }); }, 2000);
    }).catch(() => App.toast('Copy failed', 'error'));
  }

  function openAddModal(container) {
    editingId = null;
    container.querySelector('#prompt-modal-title').textContent = 'New Prompt';
    container.querySelector('#prompt-title').value = '';
    container.querySelector('#prompt-cat').value   = 'Writing';
    container.querySelector('#prompt-body').value  = '';
    container.querySelector('#prompt-tags').value  = '';
    App.openModal('prompt-modal');
  }

  function openEditModal(id, container) {
    const p = allPrompts.find(x => x.id === id); if (!p) return;
    editingId = id;
    container.querySelector('#prompt-modal-title').textContent = 'Edit Prompt';
    container.querySelector('#prompt-title').value = p.title || '';
    container.querySelector('#prompt-cat').value   = p.category || 'Other';
    container.querySelector('#prompt-body').value  = p.body || '';
    container.querySelector('#prompt-tags').value  = (p.tags || []).join(', ');
    App.openModal('prompt-modal');
  }

  async function savePrompt(container) {
    const title = container.querySelector('#prompt-title').value.trim();
    const cat   = container.querySelector('#prompt-cat').value;
    const body  = container.querySelector('#prompt-body').value;
    const tags  = container.querySelector('#prompt-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    if (!title) { App.toast('Title is required', 'error'); return; }
    if (!body.trim()) { App.toast('Prompt body cannot be empty', 'error'); return; }
    const payload = { title, category: cat, body, tags };
    if (editingId) { await Store.update(COL, editingId, payload); App.toast('Prompt updated!', 'success'); }
    else { await Store.add(COL, { ...payload, favorite: false }); App.toast('Prompt saved!', 'success'); }
    App.closeModal('prompt-modal');
  }

  async function deletePrompt(id) {
    if (!await App.confirm('Delete this prompt?')) return;
    await Store.remove(COL, id);
    App.toast('Deleted', 'info');
  }

  function bindEvents(container) {
    container.querySelector('#btn-new-prompt')?.addEventListener('click', () => openAddModal(container));
    container.querySelector('#prompt-modal-save')?.addEventListener('click', () => savePrompt(container));
    container.querySelector('#prompts-search')?.addEventListener('input', () => refreshList(container));
    container.querySelector('#prompts-cat-filter')?.addEventListener('change', () => refreshList(container));
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() { unsub?.(); }

  return { render, unmount };
})();
