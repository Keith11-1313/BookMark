// directory.js — Virtual file tree browser

const Directory = (() => {
  const COL = 'directories';
  const ICONS = { folder:'folder', js:'file-code', ts:'file-code', html:'file-type', css:'file-code', py:'file-code', json:'file-json', md:'file-text', txt:'file-text', png:'file-image', jpg:'file-image', jpeg:'file-image', svg:'file-image', gif:'file-image', mp4:'file-video', mp3:'file-audio', pdf:'file-text', zip:'file-archive', sh:'terminal', yml:'file-code', yaml:'file-code', env:'file-lock', default:'file' };
  const ICON_COLORS = { folder:'var(--warning)', js:'#f7df1e', ts:'#3178c6', html:'#e34c26', css:'#264de4', py:'#3572a5', json:'var(--success)', md:'var(--text-secondary)', default:'var(--text-muted)' };
  let tree = { name:'root', type:'folder', children:[] };
  let selectedPath = null, expandedPaths = new Set(), contextMenu = null;

  function render(container) {
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    loadTree(container);
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="folder-tree" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Directory</div><div class="page-subtitle">Virtual file tree browser</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-file"><i data-lucide="file-plus" width="14" height="14"></i> New File</button>
          <button class="btn btn-secondary btn-sm" id="btn-new-folder"><i data-lucide="folder-plus" width="14" height="14"></i> New Folder</button>
        </div>
      </div>
      <div class="dir-layout">
        <div class="dir-panel">
          <div class="dir-panel-header">
            <span class="dir-panel-title"><i data-lucide="folder-open" width="14" height="14"></i> File Tree</span>
            <div style="display:flex;gap:4px">
              <button class="btn-ghost btn-icon btn-sm" id="btn-collapse-all" data-tooltip="Collapse all"><i data-lucide="chevrons-up-down" width="14" height="14"></i></button>
            </div>
          </div>
          <div class="breadcrumb" id="dir-breadcrumb"></div>
          <div class="dir-tree" id="dir-tree"></div>
        </div>
        <div class="dir-detail" id="dir-detail">
          <div class="dir-empty"><i data-lucide="mouse-pointer-click" width="32" height="32"></i><p>Select a file or folder to see details</p></div>
        </div>
      </div>
      <!-- Context menu -->
      <div class="context-menu" id="dir-context-menu" style="display:none"></div>
      <!-- Name dialog -->
      <div class="modal-backdrop" id="dir-name-modal">
        <div class="modal" style="max-width:380px">
          <div class="modal-header"><span class="modal-title" id="dir-modal-title">New Folder</span><button class="btn-ghost btn-icon btn-sm" onclick="App.closeModal('dir-name-modal')"><i data-lucide="x" width="16" height="16"></i></button></div>
          <div class="modal-body">
            <div class="form-field"><label class="form-label" for="dir-name-input">Name</label><input class="input" id="dir-name-input" type="text" placeholder="Enter name…" autocomplete="off"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="App.closeModal('dir-name-modal')">Cancel</button>
            <button class="btn btn-primary" id="dir-name-confirm">Create</button>
          </div>
        </div>
      </div>`;
  }

  async function loadTree(container) {
    try {
      const uid  = Auth.getUid();
      if (!uid) { renderTree(container); lucide.createIcons({el:container}); bindEvents(container); return; }
      const doc  = await db.collection('users').doc(uid).collection('directories').doc('tree').get();
      if (doc.exists && doc.data().tree) tree = doc.data().tree;
    } catch {}
    renderTree(container);
    lucide.createIcons({el:container});
    bindEvents(container);
  }

  async function saveTree() {
    const uid = Auth.getUid();
    if (!uid) return;
    await db.collection('users').doc(uid).collection('directories').doc('tree').set({ tree });
  }

  function renderTree(container) {
    const treeEl = container.querySelector('#dir-tree'); if (!treeEl) return;
    treeEl.innerHTML = renderNode(tree.children || [], '');
    treeEl.querySelectorAll('.tree-row').forEach(row => bindRowEvents(row, container));
    lucide.createIcons({el:treeEl});
    updateBreadcrumb(container);
  }

  function renderNode(nodes, parentPath) {
    return (nodes||[]).map(node => {
      const path = parentPath ? `${parentPath}/${node.name}` : node.name;
      const isFolder = node.type === 'folder';
      const ext = isFolder ? 'folder' : (node.name.split('.').pop()||'').toLowerCase();
      const icon = ICONS[ext] || ICONS.default;
      const color = ICON_COLORS[ext] || ICON_COLORS.default;
      const isExpanded = expandedPaths.has(path);
      const isSelected = selectedPath === path;
      const hasChildren = isFolder && (node.children||[]).length > 0;
      return `
        <div class="tree-node">
          <div class="tree-row${isSelected?' selected':''}" data-path="${escAttr(path)}" data-type="${escAttr(node.type)}" data-name="${escAttr(node.name)}" role="treeitem" aria-expanded="${isExpanded}" tabindex="0">
            <span class="tree-toggle${isFolder?(isExpanded?' open':''):' leaf'}">${isFolder?'<i data-lucide="chevron-right" width="12" height="12"></i>':''}</span>
            <span class="tree-icon"><i data-lucide="${icon}" width="16" height="16" style="color:${color}"></i></span>
            <span class="tree-label">${escHtml(node.name)}</span>
            ${node.size?`<span class="tree-meta">${escHtml(node.size)}</span>`:''}
          </div>
          ${isFolder ? `<div class="tree-children" style="${isExpanded?'':'display:none'}"><div class="tree-children-inner">${renderNode(node.children||[], path)}</div></div>` : ''}
        </div>`;
    }).join('');
  }

  function bindRowEvents(row, container) {
    const path = row.dataset.path;
    const type = row.dataset.type;
    const name = row.dataset.name;

    row.addEventListener('click', () => {
      selectedPath = path;
      const node = findNode(path);
      if (type === 'folder') {
        if (expandedPaths.has(path)) expandedPaths.delete(path);
        else expandedPaths.add(path);
      }
      renderTree(container);
      if (node) showDetail(node, path, container);
    });

    row.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') row.click(); });

    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, path, type, name, container);
    });
  }

  function showContextMenu(x, y, path, type, name, container) {
    closeContextMenu();
    const menu = container.querySelector('#dir-context-menu'); if (!menu) return;
    menu.style.display = 'block';
    menu.innerHTML = `
      ${type==='folder'?`<button class="context-item" data-action="new-folder" data-path="${escAttr(path)}"><i data-lucide="folder-plus" width="14" height="14"></i> New Folder</button><button class="context-item" data-action="new-file" data-path="${escAttr(path)}"><i data-lucide="file-plus" width="14" height="14"></i> New File</button><div class="context-sep"></div>`:''}
      <button class="context-item" data-action="rename" data-path="${escAttr(path)}" data-name="${escAttr(name)}" data-type="${escAttr(type)}"><i data-lucide="pencil" width="14" height="14"></i> Rename</button>
      <div class="context-sep"></div>
      <button class="context-item danger" data-action="delete" data-path="${escAttr(path)}"><i data-lucide="trash-2" width="14" height="14"></i> Delete</button>`;
    lucide.createIcons({el:menu});
    const rect = menu.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.min(y, window.innerHeight - rect.height - 8);
    menu.style.left = Math.max(8, left) + 'px';
    menu.style.top = Math.max(8, top) + 'px';
    menu.querySelectorAll('.context-item').forEach(btn => {
      btn.addEventListener('click', () => { handleContextAction(btn.dataset.action, btn.dataset.path, btn.dataset.name, btn.dataset.type, container); closeContextMenu(); });
    });
    contextMenu = menu;
    setTimeout(() => document.addEventListener('click', closeContextMenu, {once:true}), 50);
  }

  function closeContextMenu() { const menu = document.querySelector('#dir-context-menu'); if(menu) menu.style.display='none'; }

  function handleContextAction(action, path, name, type, container) {
    if (action==='new-folder') openNameDialog('folder', path, null, container);
    else if (action==='new-file') openNameDialog('file', path, null, container);
    else if (action==='rename') openNameDialog(type, getParentPath(path), name, container, path);
    else if (action==='delete') { App.confirm(`Delete "${name}"?`).then(ok => { if(ok) { deleteNode(path); renderTree(container); saveTree(); } }); }
  }

  function openNameDialog(type, parentPath, existingName, container, renamePath=null) {
    const modal = container.querySelector('#dir-name-modal'); if (!modal) return;
    container.querySelector('#dir-modal-title').textContent = renamePath ? `Rename ${type}` : `New ${type}`;
    const input = container.querySelector('#dir-name-input');
    input.value = existingName || '';
    input.placeholder = type==='folder' ? 'folder-name' : 'file.js';
    App.openModal('dir-name-modal');
    setTimeout(()=>input.focus(),150);
    const confirmBtn = container.querySelector('#dir-name-confirm');
    confirmBtn.onclick = () => {
      const n = input.value.trim(); if (!n) return;
      if (renamePath) renameNode(renamePath, n);
      else addNode(parentPath, { name:n, type, children: type==='folder'?[]:undefined });
      renderTree(container); saveTree();
      App.closeModal('dir-name-modal');
    };
    input.onkeydown = e => { if(e.key==='Enter') confirmBtn.click(); };
  }

  function showDetail(node, path, container) {
    const detail = container.querySelector('#dir-detail'); if (!detail) return;
    const ext = node.type==='folder'?'folder':(node.name.split('.').pop()||'').toLowerCase();
    const icon = ICONS[ext]||ICONS.default;
    const color = ICON_COLORS[ext]||ICON_COLORS.default;
    detail.innerHTML = `
      <div class="dir-detail-icon"><i data-lucide="${icon}" width="32" height="32" style="color:${color}"></i></div>
      <div>
        <div class="dir-detail-name">${escHtml(node.name)}</div>
        <div class="dir-detail-path">${escHtml(path)}</div>
      </div>
      <div class="dir-meta-grid">
        <div class="dir-meta-item"><label>Type</label><span>${node.type==='folder'?'Folder':'File'}</span></div>
        ${node.size?`<div class="dir-meta-item"><label>Size</label><span>${escHtml(node.size)}</span></div>`:''}
        ${node.type==='folder'?`<div class="dir-meta-item"><label>Items</label><span>${(node.children||[]).length}</span></div>`:''}
        ${node.notes?`<div class="dir-meta-item" style="grid-column:1/-1"><label>Notes</label><span>${escHtml(node.notes)}</span></div>`:''}
      </div>`;
    lucide.createIcons({el:detail});
  }

  function updateBreadcrumb(container) {
    const bc = container.querySelector('#dir-breadcrumb'); if (!bc) return;
    if (!selectedPath) { bc.innerHTML = `<span class="breadcrumb-item current">root</span>`; return; }
    const parts = selectedPath.split('/');
    bc.innerHTML = `<span class="breadcrumb-item" data-path="">root</span>` +
      parts.map((p,i) => {
        const path = parts.slice(0,i+1).join('/');
        return `<span class="breadcrumb-sep">/</span><span class="breadcrumb-item${i===parts.length-1?' current':''}" data-path="${escAttr(path)}">${escHtml(p)}</span>`;
      }).join('');
    bc.querySelectorAll('.breadcrumb-item:not(.current)').forEach(el => {
      el.addEventListener('click', () => { selectedPath = el.dataset.path||null; renderTree(container); });
    });
  }

  function bindEvents(container) {
    // If selectedPath points to a file, use its parent folder as target
    function resolveParent() {
      if (!selectedPath) return '';
      const node = findNode(selectedPath);
      return (node && node.type === 'folder') ? selectedPath : getParentPath(selectedPath);
    }
    container.querySelector('#btn-new-folder')?.addEventListener('click', () => openNameDialog('folder', resolveParent(), null, container));
    container.querySelector('#btn-new-file')?.addEventListener('click',   () => openNameDialog('file',   resolveParent(), null, container));
    container.querySelector('#btn-collapse-all')?.addEventListener('click', () => { expandedPaths.clear(); renderTree(container); });
  }

  // Tree manipulation
  function findNode(path) {
    const parts = path.split('/');
    let nodes = tree.children;
    let node = null;
    for (const part of parts) {
      node = (nodes||[]).find(n=>n.name===part);
      if (!node) return null;
      nodes = node.children;
    }
    return node;
  }

  function getParentNode(path) {
    const parts = path.split('/');
    if (parts.length===1) return tree;
    return findNode(parts.slice(0,-1).join('/'));
  }

  function getParentPath(path) { const p = path.split('/'); p.pop(); return p.join('/'); }

  function addNode(parentPath, node) {
    const parent = parentPath ? findNode(parentPath) : tree;
    if (!parent) return;
    if (!parent.children) parent.children = [];
    parent.children.push(node);
  }

  function renameNode(path, newName) {
    const node = findNode(path);
    if (node) node.name = newName;
  }

  function deleteNode(path) {
    const parent = getParentNode(path);
    const name   = path.split('/').pop();
    if (parent?.children) parent.children = parent.children.filter(n=>n.name!==name);
    if (selectedPath===path) selectedPath = null;
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }

  function unmount() {
    // Reset all module-scoped state so stale selections don't persist across navigation
    tree          = { name:'root', type:'folder', children:[] };
    selectedPath  = null;
    expandedPaths = new Set();
    contextMenu   = null;
  }

  return { render, unmount };
})();
