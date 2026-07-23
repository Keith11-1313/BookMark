// snippets.js — Code snippet viewer with likes, side-panel viewer,
//   and user CRUD (add/edit/delete) backed by localStorage.
//
// User snippets display a "Mine" badge and have Edit/Delete actions.
// Copy always uses the full code (never truncated in DOM).

const Snippets = (() => {
  const LANGUAGES = ['JavaScript','TypeScript','HTML','CSS','Python','JSON','Bash','SQL','Java','C#','Go','Rust','PHP','Ruby','YAML','Plain Text'];
  const LANG_MAP = { JavaScript:'js',TypeScript:'ts',HTML:'html',CSS:'css',Python:'python',JSON:'json',Bash:'bash',SQL:'sql',Java:'java','C#':'cs',Go:'go',Rust:'rust',PHP:'php',Ruby:'ruby',YAML:'yaml','Plain Text':'plaintext' };
  let allSnippets = [], activeId = null;

  function render(container) {
    allSnippets = Store.get('snippets');
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    refreshList(container);
    renderFab(container);
  }

  function buildShell() {
    const langOptions = LANGUAGES.map(l => `<option>${escHtml(l)}</option>`).join('');
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="code-2" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Snippets</div><div class="page-subtitle">Reusable code &amp; text blocks</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary hide-on-mobile" id="btn-new-snippet">
            <i data-lucide="plus" width="15" height="15"></i><span>New Snippet</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export-snippets"><i data-lucide="download" width="14" height="14"></i><span>Export JSON</span></button>
        </div>
      </div>
      <div class="page-toolbar">
        <div class="search-bar">
          <span class="search-icon"><i data-lucide="search" width="15" height="15"></i></span>
          <input class="input" id="snippets-search" type="search" placeholder="Search snippets…">
        </div>
        <select class="input" id="snippets-lang-filter" style="width:auto"><option value="all">All Languages</option>${LANGUAGES.map(l => `<option>${escHtml(l)}</option>`).join('')}</select>
        <select class="input" id="snippets-sort" style="width:auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="liked">Liked first</option>
        </select>
      </div>
      <div class="snippets-layout" id="snippets-layout">
        <div class="snippets-list-panel">
          <div id="snippets-grid" class="snippets-grid"></div>
        </div>
      </div>

      <div class="modal-backdrop" id="sn-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add Snippet">
        <div class="modal">
          <div class="modal-header">
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span class="modal-title" id="sn-modal-title">New Snippet</span>
              <div class="info-tooltip-wrap">
                <span class="info-icon"><i data-lucide="info" width="14" height="14"></i></span>
                <span class="info-tip">Snippets you add are saved in your browser's local storage. Use Export JSON to back them up.</span>
              </div>
            </div>
            <button class="btn-ghost btn-sm btn-icon" id="sn-modal-close" aria-label="Close"><i data-lucide="x" width="16" height="16"></i></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="sn-edit-id">
            <div class="form-field">
              <label class="form-label" for="sn-title">Title <span style="color:var(--danger)">*</span></label>
              <input class="input" id="sn-title" type="text" placeholder="My Snippet">
            </div>
            <div class="form-field">
              <label class="form-label" for="sn-language">Language</label>
              <select class="input" id="sn-language">${langOptions}</select>
            </div>
            <div class="form-field">
              <label class="form-label" for="sn-code">Code <span style="color:var(--danger)">*</span></label>
              <textarea class="input" id="sn-code" rows="8" placeholder="Paste your code here…" style="font-family:var(--font-mono);font-size:13px"></textarea>
            </div>
            <div class="form-field">
              <label class="form-label" for="sn-tags">Tags <span class="form-hint">(comma-separated)</span></label>
              <input class="input" id="sn-tags" type="text" placeholder="react, hook, utility">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="sn-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="sn-modal-save">Save Snippet</button>
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
    fab.setAttribute('aria-label', 'New Snippet');
    fab.innerHTML = '<i data-lucide="plus" width="24" height="24"></i>';
    document.body.appendChild(fab);
    lucide.createIcons({ el: fab });
    fab.addEventListener('click', () => openModal(container));
  }

  // ── Modal ──────────────────────────────────────────────────
  function openModal(container, snippet = null) {
    const backdrop = container.querySelector('#sn-modal-backdrop'); if (!backdrop) return;
    container.querySelector('#sn-modal-title').textContent = snippet ? 'Edit Snippet' : 'New Snippet';
    container.querySelector('#sn-edit-id').value = snippet?.id || '';
    container.querySelector('#sn-title').value = snippet?.title || '';
    container.querySelector('#sn-language').value = snippet?.language || 'JavaScript';
    container.querySelector('#sn-code').value = snippet?.code || '';
    container.querySelector('#sn-tags').value = (snippet?.tags || []).join(', ');
    backdrop.classList.add('open');
    setTimeout(() => container.querySelector('#sn-title')?.focus(), 50);
  }

  function closeModal(container) {
    container.querySelector('#sn-modal-backdrop')?.classList.remove('open');
  }

  function saveSnippet(container) {
    const title = (container.querySelector('#sn-title')?.value || '').trim();
    const code = (container.querySelector('#sn-code')?.value || '').trim();
    if (!title) { App.toast('Title is required', 'error'); return; }
    if (!code) { App.toast('Code is required', 'error'); return; }
    const language = container.querySelector('#sn-language')?.value || 'JavaScript';
    const tags = (container.querySelector('#sn-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
    const editId = container.querySelector('#sn-edit-id')?.value || '';
    const data = { title, language, code, tags };
    if (editId) { Store.updateUser('snippets', editId, data); App.toast('Snippet updated', 'success'); }
    else { Store.addUser('snippets', data); App.toast('Snippet saved', 'success'); }
    allSnippets = Store.get('snippets');
    closeModal(container);
    refreshList(container);
  }

  // ── List ──────────────────────────────────────────────────
  function refreshList(container) {
    allSnippets = Store.get('snippets');
    let data = [...allSnippets];
    const q = (container.querySelector('#snippets-search')?.value || '').toLowerCase();
    const lang = container.querySelector('#snippets-lang-filter')?.value || 'all';
    const sort = container.querySelector('#snippets-sort')?.value || 'newest';
    if (q) data = data.filter(s => (s.title || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q) || (s.language || '').toLowerCase().includes(q) || (s.tags || []).some(t => t.toLowerCase().includes(q)));
    if (lang !== 'all') data = data.filter(s => s.language === lang);

    if (sort === 'liked') data.sort((a, b) => (Store.isLiked('snippets', b.id) ? 1 : 0) - (Store.isLiked('snippets', a.id) ? 1 : 0));
    else if (sort === 'oldest') data.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    else data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const grid = container.querySelector('#snippets-grid'); if (!grid) return;
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i data-lucide="code" width="40" height="40"></i><h3>No snippets found</h3><p>${q ? 'Try a different search term' : 'Click New Snippet to add one'}</p></div>`;
      lucide.createIcons({ el: grid }); return;
    }
    grid.innerHTML = data.map(s => renderCard(s)).join('');
    grid.querySelectorAll('.snippet-card').forEach(card => bindCardEvents(card, container));
    grid.querySelectorAll('pre code').forEach(block => { if (window.hljs) hljs.highlightElement(block); });
    lucide.createIcons({ el: grid });
  }

  function renderCard(s) {
    const langKey = LANG_MAP[s.language] || 'plaintext';
    const tags = (s.tags || []).map(t => `<span class="snippet-tag">${escHtml(t)}</span>`).join('');
    const liked = Store.isLiked('snippets', s.id);
    const isUser = !!s._isUser;
    return `
      <div class="snippet-card${s.id === activeId ? ' active' : ''}" data-id="${escAttr(s.id)}">
        <div class="snippet-header">
          <span class="snippet-title">${escHtml(s.title || 'Untitled')}</span>
          ${isUser ? '<span class="user-badge">Mine</span>' : ''}
          <span class="snippet-lang lang-${langKey}">${escHtml(s.language || 'Text')}</span>
          <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
            ${isUser ? `
              <button class="toolbar-btn" data-action="edit" data-tooltip="Edit" style="width:26px;height:26px"><i data-lucide="pencil" width="13" height="13"></i></button>
              <button class="toolbar-btn" data-action="delete" data-tooltip="Delete" style="width:26px;height:26px;color:var(--danger)"><i data-lucide="trash-2" width="13" height="13"></i></button>` : ''}
            <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">
              <i data-lucide="heart" width="14" height="14" style="${liked ? 'fill:var(--danger);color:var(--danger)' : ''}"></i>
            </button>
          </div>
        </div>
        <div class="snippet-code-wrap">
          <pre class="snippet-code"><code class="language-${langKey}">${escHtml(s.code || '')}</code></pre>
          <button class="copy-btn-overlay" data-action="copy" aria-label="Copy code">
            <i data-lucide="copy" width="12" height="12"></i> Copy
          </button>
        </div>
        <div class="snippet-footer">
          <div class="snippet-tags">${tags}</div>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <span class="snippet-date">${App.formatDate(s.createdAt)}</span>
            <button class="btn btn-ghost btn-sm" data-action="view" style="font-size:11px;padding:2px 6px">View</button>
          </div>
        </div>
      </div>`;
  }

  function bindCardEvents(card, container) {
    const s = allSnippets.find(x => x.id === card.dataset.id);

    card.querySelector('[data-action="copy"]')?.addEventListener('click', e => { e.stopPropagation(); copyCode(card, e.currentTarget); });
    card.querySelector('[data-action="like"]')?.addEventListener('click', e => {
      e.stopPropagation();
      const nowLiked = Store.toggleLike('snippets', card.dataset.id);
      App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
      refreshList(container);
    });
    card.querySelector('[data-action="view"]')?.addEventListener('click', e => { e.stopPropagation(); openViewer(card.dataset.id, container); });
    card.querySelector('[data-action="edit"]')?.addEventListener('click', e => { e.stopPropagation(); if (s) openModal(container, s); });
    card.querySelector('[data-action="delete"]')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('Delete this snippet?')) return;
      Store.removeUser('snippets', card.dataset.id);
      if (activeId === card.dataset.id) closeViewer(container);
      App.toast('Snippet deleted', 'success');
      refreshList(container);
    });
    card.addEventListener('click', e => { if (e.target.closest('[data-action]')) return; openViewer(card.dataset.id, container); });
  }

  function copyCode(card, btn) {
    const code = card.querySelector('code')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      btn.classList.add('copied');
      btn.innerHTML = '<i data-lucide="check" width="12" height="12"></i> Copied!';
      lucide.createIcons({ el: btn });
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i data-lucide="copy" width="12" height="12"></i> Copy'; lucide.createIcons({ el: btn }); }, 2000);
    }).catch(() => App.toast('Copy failed', 'error'));
  }

  // ── Side-panel viewer ──────────────────────────────────────
  function openViewer(id, container) {
    allSnippets = Store.get('snippets');
    const snippet = allSnippets.find(s => s.id === id); if (!snippet) return;
    activeId = id;
    const layout = container.querySelector('#snippets-layout');
    layout.classList.add('has-viewer');
    let panel = container.querySelector('.snippet-viewer-panel');
    if (!panel) { panel = document.createElement('div'); panel.className = 'snippet-viewer-panel'; layout.appendChild(panel); }
    const langKey = LANG_MAP[snippet.language] || 'plaintext';
    const tags = (snippet.tags || []).map(t => `<span class="snippet-tag">${escHtml(t)}</span>`).join('');
    panel.innerHTML = `
      <div class="editor-toolbar">
        <span style="font-weight:600;color:var(--text-primary);font-size:var(--text-sm)">Snippet Viewer${snippet._isUser ? ' <span class="user-badge" style="margin-left:6px">Mine</span>' : ''}</span>
        <button class="copy-btn-overlay" id="btn-copy-viewer" style="position:static;opacity:1;margin-left:auto;margin-right:var(--space-2)">
          <i data-lucide="copy" width="12" height="12"></i> Copy
        </button>
        <button class="btn-ghost btn-sm btn-icon" id="btn-close-viewer" aria-label="Close viewer"><i data-lucide="x" width="16" height="16"></i></button>
      </div>
      <div class="editor-meta" style="flex-direction:column;align-items:flex-start;gap:var(--space-2)">
        <div style="font-weight:700;font-size:var(--text-lg);color:var(--text-primary)">${escHtml(snippet.title || 'Untitled')}</div>
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <span class="snippet-lang lang-${langKey}">${escHtml(snippet.language || 'Text')}</span>
          ${tags ? `<div class="snippet-tags">${tags}</div>` : ''}
          <span class="editor-save-status">${App.formatDateFull(snippet.createdAt)}</span>
        </div>
      </div>
      <div class="viewer-body"><pre class="viewer-code"><code class="language-${langKey}" id="viewer-snippet-code">${escHtml(snippet.code || '')}</code></pre></div>
    `;
    lucide.createIcons({ el: panel });
    const codeEl = panel.querySelector('#viewer-snippet-code');
    if (codeEl && window.hljs) hljs.highlightElement(codeEl);
    panel.querySelector('#btn-close-viewer')?.addEventListener('click', () => closeViewer(container));
    panel.querySelector('#btn-copy-viewer')?.addEventListener('click', e => {
      const btn = e.currentTarget;
      const code = panel.querySelector('#viewer-snippet-code')?.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        btn.classList.add('copied'); btn.innerHTML = '<i data-lucide="check" width="12" height="12"></i> Copied!';
        lucide.createIcons({ el: btn });
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i data-lucide="copy" width="12" height="12"></i> Copy'; lucide.createIcons({ el: btn }); }, 2000);
      }).catch(() => App.toast('Copy failed', 'error'));
    });
    refreshList(container);
  }

  function closeViewer(container) {
    activeId = null;
    container.querySelector('#snippets-layout')?.classList.remove('has-viewer');
    container.querySelector('.snippet-viewer-panel')?.remove();
    refreshList(container);
  }

  function bindEvents(container) {
    container.querySelector('#btn-new-snippet')?.addEventListener('click', () => openModal(container));
    container.querySelector('#snippets-search')?.addEventListener('input', () => refreshList(container));
    container.querySelector('#snippets-lang-filter')?.addEventListener('change', () => refreshList(container));
    container.querySelector('#snippets-sort')?.addEventListener('change', () => refreshList(container));
    container.querySelector('#btn-export-snippets')?.addEventListener('click', () => { Store.exportJSON('snippets'); App.toast('Exported snippets as JSON', 'success'); });
    container.querySelector('#sn-modal-close')?.addEventListener('click', () => closeModal(container));
    container.querySelector('#sn-modal-cancel')?.addEventListener('click', () => closeModal(container));
    container.querySelector('#sn-modal-backdrop')?.addEventListener('click', e => { if (e.target === container.querySelector('#sn-modal-backdrop')) closeModal(container); });
    container.querySelector('#sn-modal-save')?.addEventListener('click', () => saveSnippet(container));
    lucide.createIcons({ el: container.querySelector('#sn-modal-backdrop') });
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {
    activeId = null;
    const fab = document.getElementById('page-fab');
    if (fab) fab.remove();
  }

  return { render, unmount };
})();
