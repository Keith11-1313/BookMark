// notes.js — Notes module with rich editor + bookmark linking

const Notes = (() => {
  const COL = Store.COLLECTIONS.notes;
  const COLORS = ['#5865f2','#23a559','#f0b232','#da373c','#00a8fc','#eb459e','#949ba4'];
  let allNotes = [], unsub = null, activeId = null, saveTimer = null;

  function render(container) {
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    unsub = Store.subscribe(COL, data => { allNotes = data; renderNotesList(container); });
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="notebook-pen" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Notes</div><div class="page-subtitle">Your personal notepad</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-note"><i data-lucide="plus" width="16" height="16"></i> New Note</button>
        </div>
      </div>
      <div class="page-toolbar">
        <div class="search-bar">
          <span class="search-icon"><i data-lucide="search" width="15" height="15"></i></span>
          <input class="input" id="notes-search" type="search" placeholder="Search notes…">
        </div>
      </div>
      <div class="notes-layout" id="notes-layout">
        <div class="notes-list-panel">
          <div class="notes-grid" id="notes-grid"></div>
        </div>
      </div>`;
  }

  function renderNotesList(container) {
    const grid = container.querySelector('#notes-grid'); if (!grid) return;
    const q = (container.querySelector('#notes-search')?.value||'').toLowerCase();
    let data = [...allNotes];
    if (q) data = data.filter(n => (n.title||'').toLowerCase().includes(q)||(n.body||'').toLowerCase().includes(q));
    data.sort((a,b)=>{
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0);
    });
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state"><i data-lucide="notebook" width="40" height="40"></i><h3>No notes yet</h3><p>Create your first note</p><button class="btn btn-primary" id="empty-new-note"><i data-lucide="plus" width="15" height="15"></i> New Note</button></div>`;
      grid.querySelector('#empty-new-note')?.addEventListener('click', () => createNote(container));
      lucide.createIcons({el:grid}); return;
    }
    grid.innerHTML = data.map(n => `
      <div class="note-card${n.pinned?' pinned':''}${n.id===activeId?' active':''}" data-id="${n.id}" tabindex="0" role="button" aria-label="Open note: ${escHtml(n.title||'Untitled')}">
        ${n.color?`<div class="note-card-accent" style="background:${n.color}"></div>`:''}
        <div class="note-card-header">
          <div class="note-card-title">${escHtml(n.title||'Untitled')}</div>
          <div class="note-card-actions">
            <button class="btn-ghost btn-icon btn-sm" data-action="pin" aria-label="${n.pinned?'Unpin':'Pin'}"><i data-lucide="${n.pinned?'pin-off':'pin'}" width="13" height="13"></i></button>
            <button class="btn-ghost btn-icon btn-sm" data-action="delete" aria-label="Delete note"><i data-lucide="trash-2" width="13" height="13"></i></button>
          </div>
        </div>
        <div class="note-card-preview">${(n.body||'').replace(/<[^>]+>/g,'').slice(0,120)}</div>
        <div class="note-card-footer">
          <span class="note-date">${App.formatDate(n.updatedAt||n.createdAt)}</span>
          ${n.pinned?'<span class="note-pin-icon"><i data-lucide="pin" width="11" height="11"></i></span>':''}
          ${(n.linkedBookmarks||[]).length?`<span class="linked-bookmarks-count"><i data-lucide="link" width="10" height="10"></i>${n.linkedBookmarks.length}</span>`:''}
        </div>
      </div>`).join('');

    grid.querySelectorAll('.note-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', () => openEditor(id, container));
      card.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') openEditor(id, container); });
      card.querySelector('[data-action="pin"]')?.addEventListener('click', async e => { e.stopPropagation(); const n=allNotes.find(x=>x.id===id); await Store.update(COL,id,{pinned:!n?.pinned}); App.toast(n?.pinned?'Unpinned':'Pinned!','success'); });
      card.querySelector('[data-action="delete"]')?.addEventListener('click', async e => { e.stopPropagation(); if(!confirm('Delete this note?')) return; if(activeId===id) closeEditor(container); await Store.remove(COL,id); App.toast('Note deleted','info'); });
    });
    lucide.createIcons({el:grid});
  }

  function openEditor(id, container) {
    const note = allNotes.find(n=>n.id===id); if (!note) return;

    // Cancel any pending auto-save from the previously open note
    clearTimeout(saveTimer);
    saveTimer = null;

    activeId = id;
    const layout = container.querySelector('#notes-layout');
    layout.classList.add('has-editor');

    let editorPanel = container.querySelector('.note-editor-panel');
    if (!editorPanel) {
      editorPanel = document.createElement('div');
      editorPanel.className = 'note-editor-panel';
      layout.appendChild(editorPanel);
    }

    const links = Store.lsGet(Store.COLLECTIONS.links);
    const linkedChips = (note.linkedBookmarks||[]).map(lid => {
      const b = links.find(l=>l.id===lid);
      return b ? `<a class="linked-chip" href="${b.url}" target="_blank" rel="noopener"><img src="${b.favicon||''}" alt="" onerror="this.style.display='none'"><span>${escHtml(b.title||b.url)}</span><span class="linked-chip-remove" data-lid="${lid}"><i data-lucide="x" width="10" height="10"></i></span></a>` : '';
    }).join('');

    editorPanel.innerHTML = `
      <div class="editor-toolbar">
        <button class="toolbar-btn" data-cmd="bold" title="Bold"><b>B</b></button>
        <button class="toolbar-btn" data-cmd="italic" title="Italic"><i>I</i></button>
        <button class="toolbar-btn" data-cmd="underline" title="Underline"><u>U</u></button>
        <span class="toolbar-sep"></span>
        <button class="toolbar-btn" data-cmd="insertUnorderedList" title="Bullet List"><i data-lucide="list" width="14" height="14"></i></button>
        <button class="toolbar-btn" data-cmd="insertOrderedList" title="Numbered List"><i data-lucide="list-ordered" width="14" height="14"></i></button>
        <span class="toolbar-sep"></span>
        <div class="color-picker">${COLORS.map(c=>`<div class="color-swatch${note.color===c?' active':''}" style="background:${c}" data-color="${c}" title="${c}"></div>`).join('')}<div class="color-swatch${!note.color?' active':''}" style="background:var(--bg-hover);border:1px solid var(--border)" data-color="" title="No color"></div></div>
        <span class="toolbar-sep"></span>
        <button class="toolbar-btn" id="btn-link-bookmark" title="Link a bookmark"><i data-lucide="link" width="14" height="14"></i></button>
        <button class="btn-ghost btn-sm btn-icon" id="btn-close-editor" style="margin-left:auto" aria-label="Close editor"><i data-lucide="x" width="16" height="16"></i></button>
      </div>
      <div class="editor-meta">
        <input class="editor-title-input" id="editor-title" type="text" value="${escHtml(note.title||'')}" placeholder="Untitled" aria-label="Note title">
        <span class="editor-save-status" id="save-status">Saved</span>
      </div>
      <div class="note-body" id="note-body" contenteditable="true" data-placeholder="Start writing…">${note.body||''}</div>
      <div class="editor-linked">
        <div class="linked-header"><span><i data-lucide="link" width="12" height="12"></i> Linked Bookmarks</span></div>
        <div class="linked-chips" id="linked-chips">${linkedChips}</div>
      </div>`;

    lucide.createIcons({el:editorPanel});
    editorPanel.querySelector('#btn-close-editor')?.addEventListener('click', () => closeEditor(container));

    const titleEl = editorPanel.querySelector('#editor-title');
    const bodyEl  = editorPanel.querySelector('#note-body');

    function scheduleSave() {
      clearTimeout(saveTimer);
      const statusEl = editorPanel.querySelector('#save-status');
      if (statusEl) { statusEl.textContent='Saving…'; statusEl.className='editor-save-status saving'; }
      saveTimer = setTimeout(async () => {
        await Store.update(COL, activeId, { title: titleEl.value, body: bodyEl.innerHTML });
        if (statusEl) { statusEl.textContent='Saved'; statusEl.className='editor-save-status saved'; }
      }, 600);
    }

    titleEl.addEventListener('input', scheduleSave);
    bodyEl.addEventListener('input', scheduleSave);

    editorPanel.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', e => { e.preventDefault(); document.execCommand(btn.dataset.cmd, false, null); bodyEl.focus(); });
    });

    editorPanel.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', async () => {
        editorPanel.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('active'));
        sw.classList.add('active');
        await Store.update(COL, activeId, { color: sw.dataset.color||null });
      });
    });

    editorPanel.querySelectorAll('.linked-chip-remove').forEach(btn => {
      btn.addEventListener('click', async e => { e.preventDefault(); const lid=btn.dataset.lid; const n=allNotes.find(x=>x.id===activeId); const linked=(n?.linkedBookmarks||[]).filter(x=>x!==lid); await Store.update(COL,activeId,{linkedBookmarks:linked}); openEditor(activeId,container); });
    });

    editorPanel.querySelector('#btn-link-bookmark')?.addEventListener('click', () => showLinkBookmarkPicker(editorPanel, container));
    bodyEl.focus();
    renderNotesList(container);
  }

  function showLinkBookmarkPicker(editorPanel, container) {
    const links = Store.lsGet(Store.COLLECTIONS.links);
    if (!links.length) { App.toast('No bookmarks yet — add some first!','info'); return; }
    const existing = document.querySelector('#link-picker-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'link-picker-modal';
    modal.className = 'modal-backdrop open';
    modal.innerHTML = `<div class="modal" style="max-width:400px"><div class="modal-header"><span class="modal-title">Link a Bookmark</span><button class="btn-ghost btn-icon btn-sm" id="close-picker"><i data-lucide="x" width="16" height="16"></i></button></div><div class="modal-body" style="gap:8px;max-height:300px;overflow-y:auto">${links.map(b=>`<button class="palette-item" data-bid="${b.id}" style="border-radius:8px;border:1px solid var(--border)"><div class="palette-item-icon"><img src="${b.favicon||''}" width="16" height="16" onerror="this.style.display='none'"></div><div class="palette-item-body"><div class="palette-item-title">${escHtml(b.title||b.url)}</div><div class="palette-item-sub">${escHtml(b.category||'')}</div></div></button>`).join('')}</div></div>`;
    document.body.appendChild(modal);
    lucide.createIcons({el:modal});
    modal.querySelector('#close-picker')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    modal.querySelectorAll('[data-bid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const n = allNotes.find(x=>x.id===activeId);
        const linked = [...new Set([...(n?.linkedBookmarks||[]), btn.dataset.bid])];
        await Store.update(COL, activeId, { linkedBookmarks: linked });
        modal.remove();
        openEditor(activeId, container);
      });
    });
  }

  function closeEditor(container) {
    activeId = null;
    const layout = container.querySelector('#notes-layout');
    layout.classList.remove('has-editor');
    container.querySelector('.note-editor-panel')?.remove();
  }

  async function createNote(container) {
    const id = await Store.add(COL, { title: '', body: '', pinned: false, color: null, linkedBookmarks: [] });
    openEditor(id, container);
  }

  function bindEvents(container) {
    container.querySelector('#btn-new-note')?.addEventListener('click', () => createNote(container));
    container.querySelector('#notes-search')?.addEventListener('input', () => renderNotesList(container));
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function unmount() { unsub?.(); clearTimeout(saveTimer); }

  return { render, unmount };
})();
