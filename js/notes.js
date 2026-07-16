// notes.js — Read-only notes viewer with likes

const Notes = (() => {
  let allNotes = [], activeId = null;

  function render(container) {
    allNotes = Store.get('notes');
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    renderNotesList(container);
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="notebook-pen" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Notes</div><div class="page-subtitle">Curated notes & knowledge</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="btn-export-notes"><i data-lucide="download" width="14" height="14"></i><span>Export JSON</span></button>
        </div>
      </div>
      <div class="page-toolbar">
        <div class="search-bar">
          <span class="search-icon"><i data-lucide="search" width="15" height="15"></i></span>
          <input class="input" id="notes-search" type="search" placeholder="Search notes…">
        </div>
        <select class="input" id="notes-sort" style="width:auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="liked">Liked first</option>
        </select>
      </div>
      <div class="notes-layout" id="notes-layout">
        <div class="notes-list-panel">
          <div class="notes-grid" id="notes-grid"></div>
        </div>
      </div>`;
  }

  function renderNotesList(container) {
    const grid = container.querySelector('#notes-grid'); if (!grid) return;
    const q = (container.querySelector('#notes-search')?.value || '').toLowerCase();
    const sort = container.querySelector('#notes-sort')?.value || 'newest';
    let data = [...allNotes];
    if (q) data = data.filter(n => (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q));

    if (sort === 'liked') data.sort((a, b) => (Store.isLiked('notes', b.id) ? 1 : 0) - (Store.isLiked('notes', a.id) ? 1 : 0));
    else if (sort === 'oldest') data.sort((a, b) => new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0));
    else data.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    if (!data.length) {
      grid.innerHTML = `<div class="empty-state"><i data-lucide="notebook" width="40" height="40"></i><h3>No notes found</h3><p>${q ? 'Try a different search term' : 'Nothing to show here'}</p></div>`;
      lucide.createIcons({ el: grid }); return;
    }

    grid.innerHTML = data.map(n => {
      const liked = Store.isLiked('notes', n.id);
      return `
      <div class="note-card${n.id === activeId ? ' active' : ''}" data-id="${escAttr(n.id)}" tabindex="0" role="button" aria-label="Open note: ${escAttr(n.title || 'Untitled')}">
        ${n.color ? `<div class="note-card-accent" style="background:${n.color}"></div>` : ''}
        <div class="note-card-header">
          <div class="note-card-title">${escHtml(n.title || 'Untitled')}</div>
          <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">
            <i data-lucide="heart" width="14" height="14" style="${liked ? 'fill:var(--danger);color:var(--danger)' : ''}"></i>
          </button>
        </div>
        <div class="note-card-preview">${escHtml((n.body || '').replace(/<[^>]+>/g, '').slice(0, 120))}</div>
        <div class="note-card-footer">
          <span class="note-date">${App.formatDate(n.updatedAt || n.createdAt)}</span>
          ${(n.linkedBookmarks || []).length ? `<span class="linked-bookmarks-count"><i data-lucide="link" width="10" height="10"></i>${n.linkedBookmarks.length}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.note-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', e => {
        if (e.target.closest('[data-action="like"]')) return;
        openViewer(id, container);
      });
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openViewer(id, container); });
      card.querySelector('[data-action="like"]')?.addEventListener('click', e => {
        e.stopPropagation();
        const nowLiked = Store.toggleLike('notes', id);
        App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
        renderNotesList(container);
      });
    });
    lucide.createIcons({ el: grid });
  }

  function openViewer(id, container) {
    const note = allNotes.find(n => n.id === id); if (!note) return;
    activeId = id;
    const layout = container.querySelector('#notes-layout');
    layout.classList.add('has-editor');

    let viewerPanel = container.querySelector('.note-editor-panel');
    if (!viewerPanel) {
      viewerPanel = document.createElement('div');
      viewerPanel.className = 'note-editor-panel';
      layout.appendChild(viewerPanel);
    }

    const links = Store.get('bookmarks');
    const linkedChips = (note.linkedBookmarks || []).map(lid => {
      const b = links.find(l => l.id === lid);
      if (!b) return '';
      const url = App.safeUrl(b.url);
      const favicon = App.safeImageUrl(b.favicon, App.faviconFor(url));
      return `<a class="linked-chip" href="${escAttr(url)}" target="_blank" rel="noopener">${favicon ? `<img src="${escAttr(favicon)}" alt="" onerror="this.style.display='none'">` : ''}<span>${escHtml(b.title || b.url)}</span></a>`;
    }).join('');

    viewerPanel.innerHTML = `
      <div class="editor-toolbar">
        <span style="font-weight:600;color:var(--text-primary);font-size:var(--text-sm)">Note Viewer</span>
        <button class="btn-ghost btn-sm btn-icon" id="btn-close-editor" style="margin-left:auto" aria-label="Close viewer"><i data-lucide="x" width="16" height="16"></i></button>
      </div>
      <div class="editor-meta">
        <div style="font-weight:600;font-size:var(--text-lg);color:var(--text-primary);padding:var(--space-2) 0">${escHtml(note.title || 'Untitled')}</div>
        <span class="editor-save-status">${App.formatDateFull(note.updatedAt || note.createdAt)}</span>
      </div>
      <div class="note-body" style="padding:var(--space-4);line-height:1.7;color:var(--text-secondary)">${note.body || '<p style="color:var(--text-muted)">No content</p>'}</div>
      ${linkedChips ? `<div class="editor-linked"><div class="linked-header"><span><i data-lucide="link" width="12" height="12"></i> Linked Bookmarks</span></div><div class="linked-chips">${linkedChips}</div></div>` : ''}
    `;

    lucide.createIcons({ el: viewerPanel });
    viewerPanel.querySelector('#btn-close-editor')?.addEventListener('click', () => closeViewer(container));
    renderNotesList(container);
  }

  function closeViewer(container) {
    activeId = null;
    container.querySelector('#notes-layout')?.classList.remove('has-editor');
    container.querySelector('.note-editor-panel')?.remove();
    renderNotesList(container);
  }

  function bindEvents(container) {
    container.querySelector('#notes-search')?.addEventListener('input', () => renderNotesList(container));
    container.querySelector('#notes-sort')?.addEventListener('change', () => renderNotesList(container));
    container.querySelector('#btn-export-notes')?.addEventListener('click', () => { Store.exportJSON('notes'); App.toast('Exported notes as JSON', 'success'); });
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() { activeId = null; }

  return { render, unmount };
})();
