// notes.js — Notes viewer + rich text editor for user-created notes
//
// updatedAt is intentionally kept on note objects:
//   - Sort uses it (notes sorted by "last modified" not "created")
//   - Display shows it in the card footer and viewer header as the timestamp
//   - Fall-through: updatedAt || createdAt so older notes without it still work
//
// User notes live in localStorage key "user_notes" via Store.addUser/updateUser/removeUser.
// They are visually flagged with a "My Note" badge.
// Auto-save fires 600ms after the last edit (debounced).

const Notes = (() => {
  let allNotes = [], activeId = null;
  let _saveTimer = null;

  const COLORS = ['#5865f2','#23a559','#f0b232','#da373c','#eb459e','#00a8fc','#ff7849','#00add8'];

  function render(container) {
    allNotes = Store.get('notes');
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    renderNotesList(container);
    renderFab(container);
  }

  // ── Shell ─────────────────────────────────────────────────
  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="notebook-pen" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Notes</div><div class="page-subtitle">Curated notes &amp; knowledge</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary hide-on-mobile" id="btn-new-note">
            <i data-lucide="plus" width="15" height="15"></i><span>New Note</span>
          </button>
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

  // ── FAB ───────────────────────────────────────────────────
  function renderFab(container) {
    let fab = document.getElementById('page-fab');
    if (fab) fab.remove();
    fab = document.createElement('button');
    fab.id = 'page-fab';
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'New Note');
    fab.innerHTML = '<i data-lucide="plus" width="24" height="24"></i>';
    document.body.appendChild(fab);
    lucide.createIcons({ el: fab });
    fab.addEventListener('click', () => createNewNote(container));
  }

  // ── List ──────────────────────────────────────────────────
  function renderNotesList(container) {
    allNotes = Store.get('notes');
    const grid = container.querySelector('#notes-grid'); if (!grid) return;
    const q = (container.querySelector('#notes-search')?.value || '').toLowerCase();
    const sort = container.querySelector('#notes-sort')?.value || 'newest';
    let data = [...allNotes];
    if (q) data = data.filter(n => (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q));

    if (sort === 'liked') data.sort((a, b) => (Store.isLiked('notes', b.id) ? 1 : 0) - (Store.isLiked('notes', a.id) ? 1 : 0));
    else if (sort === 'oldest') data.sort((a, b) => new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0));
    else data.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    if (!data.length) {
      grid.innerHTML = `<div class="empty-state"><i data-lucide="notebook" width="40" height="40"></i><h3>No notes found</h3><p>${q ? 'Try a different search term' : 'Click New Note to get started'}</p></div>`;
      lucide.createIcons({ el: grid }); return;
    }

    grid.innerHTML = data.map(n => {
      const liked = Store.isLiked('notes', n.id);
      return `
      <div class="note-card${n.id === activeId ? ' active' : ''}" data-id="${escAttr(n.id)}" tabindex="0" role="button" aria-label="Open note: ${escAttr(n.title || 'Untitled')}">
        ${n.color ? `<div class="note-card-accent" style="background:${n.color}"></div>` : ''}
        <div class="note-card-header">
          <div class="note-card-title">${escHtml(n.title || 'Untitled')}</div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
            ${n._isUser ? '<span class="user-badge">Local</span>' : ''}
            <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">
              <i data-lucide="heart" width="14" height="14" style="${liked ? 'fill:var(--danger);color:var(--danger)' : ''}"></i>
            </button>
          </div>
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

  // ── Create new note ────────────────────────────────────────
  function createNewNote(container) {
    const note = Store.addUser('notes', {
      title: '',
      body: '',
      color: COLORS[0],
      linkedBookmarks: []
    });
    allNotes = Store.get('notes');
    renderNotesList(container);
    openViewer(note.id, container);
  }

  // ── Viewer / Editor ────────────────────────────────────────
  function openViewer(id, container) {
    allNotes = Store.get('notes');
    const note = allNotes.find(n => n.id === id); if (!note) return;
    activeId = id;
    const isUser = !!note._isUser;

    const layout = container.querySelector('#notes-layout');
    layout.classList.add('has-editor');

    let panel = container.querySelector('.note-editor-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'note-editor-panel';
      layout.appendChild(panel);
    }

    const links = Store.get('bookmarks');
    const linkedChips = (note.linkedBookmarks || []).map(lid => {
      const b = links.find(l => l.id === lid);
      if (!b) return '';
      const url = App.safeUrl(b.url);
      const favicon = App.safeImageUrl(b.favicon, App.faviconFor(url));
      return `<a class="linked-chip" href="${escAttr(url)}" target="_blank" rel="noopener">${favicon ? `<img src="${escAttr(favicon)}" alt="" onerror="this.style.display='none'">` : ''}<span>${escHtml(b.title || b.url)}</span></a>`;
    }).join('');

    panel.innerHTML = `
      <div class="editor-toolbar">
        <span style="font-weight:600;color:var(--text-primary);font-size:var(--text-sm)">
          ${isUser ? 'Edit Note' : 'Note Viewer'}
          ${isUser ? '<span class="user-badge" style="margin-left:6px">Local</span>' : ''}
        </span>
        <div style="display:flex;align-items:center;gap:var(--space-1);margin-left:auto">
          ${isUser ? `
            <span class="editor-save-status" id="save-status" style="font-size:11px"></span>
            <button class="toolbar-btn" id="btn-delete-note" data-tooltip="Delete note" aria-label="Delete note" style="color:var(--danger)">
              <i data-lucide="trash-2" width="15" height="15"></i>
            </button>` : ''}
          <button class="btn-ghost btn-sm btn-icon" id="btn-close-editor" aria-label="Close">
            <i data-lucide="x" width="16" height="16"></i>
          </button>
        </div>
      </div>
      ${isUser ? buildEditorToolbar() : ''}
      <div class="editor-meta">
        ${isUser
          ? `<input class="editor-title-input" id="note-title" type="text" placeholder="Note title…" value="${escAttr(note.title || '')}">`
          : `<div style="font-weight:700;font-size:var(--text-lg);color:var(--text-primary)">${escHtml(note.title || 'Untitled')}</div>`
        }
        <span class="editor-save-status">${App.formatDateFull(note.updatedAt || note.createdAt)}</span>
      </div>
      ${isUser ? buildColorPicker(note.color) : ''}
      <div class="note-body${isUser ? '' : ' preview-mode'}"
           id="note-body"
           ${isUser ? 'contenteditable="true" data-placeholder="Start writing your note…"' : ''}
           style="padding:var(--space-4);line-height:1.7;color:var(--text-secondary)"
      >${isUser ? (note.body || '') : (note.body || '<p style="color:var(--text-muted)">No content</p>')}</div>
      ${linkedChips ? `<div class="editor-linked"><div class="linked-header"><span><i data-lucide="link" width="12" height="12"></i> Linked Bookmarks</span></div><div class="linked-chips">${linkedChips}</div></div>` : ''}
      ${isUser ? `
        <div class="editor-linked" style="border-top:1px solid var(--border);padding:var(--space-3) var(--space-4);background:var(--bg-tertiary)">
          <div class="info-tooltip-wrap" style="display:inline-flex;gap:var(--space-2);align-items:center;font-size:var(--text-xs);color:var(--text-muted)">
            <i data-lucide="info" width="13" height="13"></i>
            <span>Saved in browser localStorage</span>
            <span class="info-tip">Items you add are saved in your browser's local storage. Clearing browser data will remove them. Use Export JSON to back up your notes.</span>
          </div>
        </div>` : ''}
    `;

    lucide.createIcons({ el: panel });

    panel.querySelector('#btn-close-editor')?.addEventListener('click', () => closeViewer(container));

    if (isUser) {
      // Title auto-save
      const titleInput = panel.querySelector('#note-title');
      titleInput?.addEventListener('input', () => scheduleSave(id, panel));

      // Rich body auto-save
      const body = panel.querySelector('#note-body');
      body?.addEventListener('input', () => scheduleSave(id, panel));

      // Formatting toolbar
      panel.querySelectorAll('[data-cmd]').forEach(btn => {
        btn.addEventListener('mousedown', e => {
          e.preventDefault(); // don't blur body
          const cmd = btn.dataset.cmd;
          const val = btn.dataset.val || null;
          if (cmd === 'formatBlock') document.execCommand(cmd, false, val);
          else if (cmd === 'insertHTML') document.execCommand(cmd, false, val);
          else document.execCommand(cmd, false, val);
          scheduleSave(id, panel);
        });
      });

      // Color picker
      panel.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          const color = swatch.dataset.color;
          Store.updateUser('notes', id, { color });
          renderNotesList(container);
        });
      });

      // Delete
      panel.querySelector('#btn-delete-note')?.addEventListener('click', () => {
        App.confirm('Delete this note? This cannot be undone.', () => {
          clearTimeout(_saveTimer);
          Store.removeUser('notes', id);
          closeViewer(container);
          App.toast('Note deleted', 'success');
        });
      });
    }

    renderNotesList(container);
  }

  // ── Formatting toolbar HTML ────────────────────────────────
  function buildEditorToolbar() {
    const btn = (cmd, val, icon, tip) =>
      `<button class="toolbar-btn" data-cmd="${cmd}" ${val ? `data-val="${escAttr(val)}"` : ''} data-tooltip="${tip}" aria-label="${tip}"><i data-lucide="${icon}" width="14" height="14"></i></button>`;
    const sep = '<span class="toolbar-sep"></span>';
    return `
      <div class="editor-toolbar" style="flex-wrap:wrap;gap:2px;row-gap:4px">
        ${btn('bold','','bold','Bold')}
        ${btn('italic','','italic','Italic')}
        ${btn('underline','','underline','Underline')}
        ${btn('strikeThrough','','strikethrough','Strikethrough')}
        ${sep}
        ${btn('formatBlock','h1','heading-1','Heading 1')}
        ${btn('formatBlock','h2','heading-2','Heading 2')}
        ${btn('formatBlock','h3','heading-3','Heading 3')}
        ${sep}
        ${btn('insertUnorderedList','','list','Bullet list')}
        ${btn('insertOrderedList','','list-ordered','Numbered list')}
        ${btn('formatBlock','blockquote','quote','Blockquote')}
        ${sep}
        ${btn('formatBlock','pre','code-2','Code block')}
      </div>`;
  }

  // ── Color picker HTML ──────────────────────────────────────
  function buildColorPicker(currentColor) {
    const swatches = COLORS.map(c =>
      `<button class="color-swatch${c === currentColor ? ' active' : ''}" data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`
    ).join('');
    return `<div style="padding:var(--space-2) var(--space-4);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:var(--space-2)"><div class="color-picker">${swatches}</div></div>`;
  }

  // ── Auto-save ─────────────────────────────────────────────
  function scheduleSave(id, panel) {
    const statusEl = panel.querySelector('#save-status');
    if (statusEl) { statusEl.textContent = 'Saving…'; statusEl.className = 'editor-save-status saving'; }
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      const title = panel.querySelector('#note-title')?.value || '';
      const body = panel.querySelector('#note-body')?.innerHTML || '';
      Store.updateUser('notes', id, { title, body });
      if (statusEl) { statusEl.textContent = 'Saved'; statusEl.className = 'editor-save-status saved'; }
      // refresh list without reopening viewer
      renderNotesList(panel.closest('[id="page-content"]') || document.getElementById('page-content'));
    }, 600);
  }

  function closeViewer(container) {
    clearTimeout(_saveTimer);
    activeId = null;
    container.querySelector('#notes-layout')?.classList.remove('has-editor');
    container.querySelector('.note-editor-panel')?.remove();
    renderNotesList(container);
  }

  function bindEvents(container) {
    container.querySelector('#btn-new-note')?.addEventListener('click', () => createNewNote(container));
    container.querySelector('#notes-search')?.addEventListener('input', () => renderNotesList(container));
    container.querySelector('#notes-sort')?.addEventListener('change', () => renderNotesList(container));
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {
    clearTimeout(_saveTimer);
    activeId = null;
    const fab = document.getElementById('page-fab');
    if (fab) fab.remove();
  }

  return { render, unmount };
})();
