// links.js — Bookmark manager

const Links = (() => {
  const COL = Store.COLLECTIONS.links;
  const AUTO_CATEGORIES = {
    'github.com': 'GitHub Repos', 'gitlab.com': 'GitHub Repos',
    'stackoverflow.com': 'Web Dev', 'mdn.': 'Docs', 'developer.mozilla': 'Docs',
    'youtube.com': 'Tutorials', 'youtu.be': 'Tutorials',
    'udemy.com': 'Tutorials', 'coursera.org': 'Tutorials', 'egghead.io': 'Tutorials',
    'vercel.com': 'Deployment', 'netlify.com': 'Deployment', 'railway.app': 'Deployment',
    'render.com': 'Deployment', 'fly.io': 'Deployment', 'heroku.com': 'Deployment',
    'npmjs.com': 'Libraries/Frameworks', 'pypi.org': 'Libraries/Frameworks',
    'medium.com': 'Learning', 'dev.to': 'Learning', 'hashnode': 'Learning',
    'figma.com': 'Design', 'dribbble.com': 'Design', 'behance.net': 'Design',
    'huggingface.co': 'AI Skills', 'openai.com': 'AI Skills', 'anthropic.com': 'AI Skills',
    'docs.': 'Docs', 'documentation': 'Docs',
  };
  const DEFAULT_CATEGORIES = [
    'Web Dev','Frontend','Backend','Full Stack',
    'Mobile Dev','Desktop Dev',
    'DevOps','Deployment','Cloud','Hosting',
    'Database','APIs',
    'Libraries/Frameworks','Open Source','NPM Packages',
    'AI Skills','Machine Learning','Prompt Engineering',
    'Design','UI/UX','Figma','Icons & Assets',
    'Tutorials','Courses','Learning','Documentation','Docs',
    'Tools','Productivity','QoL Apps',
    'GitHub Repos','Portfolio','Projects',
    'Social','Community','News & Blogs',
    'Security','Testing','Performance',
    'Notes','Research','Reference',
    'Other'
  ];

  let allLinks = [], unsub = null, selectedIds = new Set(), currentFilter = 'all', currentView = 'card', searchQuery = '';
  let _docListeners = [];   // tracked so we can clean up on unmount
  let _teleportedEls = [];  // dropdown portals moved to document.body


  function autoCategory(url) {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      for (const [key, cat] of Object.entries(AUTO_CATEGORIES)) {
        if (hostname.includes(key)) return cat;
      }
    } catch {}
    return 'Other';
  }

  function render(container) {
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    unsub = Store.subscribe(COL, data => { allLinks = data; refreshList(container); });
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="bookmark" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Bookmarks</div><div class="page-subtitle">All your saved links</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-add-link"><i data-lucide="plus" width="16" height="16"></i> Add Bookmark</button>
          <button class="btn btn-secondary btn-sm" id="btn-health-check" data-tooltip="Check dead links"><i data-lucide="activity" width="14" height="14"></i><span>Health Check</span></button>
          <button class="btn btn-secondary btn-sm" id="btn-import-links"><i data-lucide="upload" width="14" height="14"></i><span>Import</span></button>
          <button class="btn btn-secondary btn-sm" id="btn-export-links"><i data-lucide="download" width="14" height="14"></i><span>Export</span></button>
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
        </select>
      </div>

      <div id="bulk-bar" class="bulk-bar">
        <span class="bulk-count" id="bulk-count">0 selected</span>
        <div class="bulk-actions">
          <select class="input input" id="bulk-move-cat" style="width:auto"><option value="">Move to…</option>${DEFAULT_CATEGORIES.map(c=>`<option>${escHtml(c)}</option>`).join('')}</select>
          <button class="btn btn-secondary btn-sm" id="bulk-tag-btn"><i data-lucide="tag" width="13" height="13"></i> Add Tag</button>
          <button class="btn btn-danger btn-sm" id="bulk-delete-btn"><i data-lucide="trash-2" width="13" height="13"></i> Delete</button>
          <button class="btn btn-ghost btn-sm" id="bulk-cancel-btn">Cancel</button>
        </div>
      </div>

      <div class="filter-bar-wrap">
        <div class="filter-bar" id="filter-bar">
          <button class="filter-pill active" data-cat="all">All <span class="filter-pill-count" id="count-all">0</span></button>
          ${DEFAULT_CATEGORIES.map(c=>`<button class="filter-pill" data-cat="${escAttr(c)}">${escHtml(c)} <span class="filter-pill-count" id="count-${c.replace(/[^a-z0-9]/gi,'_')}">0</span></button>`).join('')}
        </div>
      </div>

      <div id="links-grid" class="links-grid"></div>

      <!-- Add/Edit Modal -->
      <div class="modal-backdrop" id="link-modal">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title" id="link-modal-title">Add Bookmark</span>
            <button class="btn-ghost btn-icon btn-sm" onclick="App.closeModal('link-modal')"><i data-lucide="x" width="16" height="16"></i></button>
          </div>
          <div class="modal-body">
            <div id="dup-warning" class="dup-warning" style="display:none">
              <i data-lucide="alert-triangle" width="16" height="16"></i>
              <span id="dup-warning-msg"></span>
            </div>
            <div class="form-field">
              <label class="form-label" for="link-url">URL *</label>
              <input class="input" id="link-url" type="url" placeholder="https://…">
            </div>
            <div class="form-field">
              <label class="form-label" for="link-title">Title</label>
              <input class="input" id="link-title" type="text" placeholder="Auto-fetched…">
            </div>
            <div class="form-field">
              <label class="form-label" for="link-category-input">Category</label>
              <div class="combobox-wrap" id="category-combobox">
                <input class="combobox-input" id="link-category-input" type="text" placeholder="Type or select…" autocomplete="off">
                <span class="combobox-arrow"><i data-lucide="chevron-down" width="14" height="14"></i></span>
                <div class="combobox-dropdown" id="category-dropdown"></div>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">Tags</label>
              <div class="tag-chips-row" id="tag-chips-row"></div>
              <div class="tag-input-wrap">
                <input class="input" id="link-tags-input" type="text" placeholder="Type a tag and press Enter or comma…" autocomplete="off">
                <div class="tag-suggestions" id="tag-suggestions"></div>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label" for="link-notes">Notes</label>
              <textarea class="input" id="link-notes" rows="2" placeholder="Why did you save this?"></textarea>
            </div>
            <div id="github-preview" style="display:none" class="github-meta"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="App.closeModal('link-modal')">Cancel</button>
            <button class="btn btn-primary" id="link-modal-save"><i data-lucide="save" width="14" height="14"></i> Save</button>
          </div>
        </div>
      </div>

      <!-- Import Modal -->
      <div class="modal-backdrop" id="import-modal">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Import Bookmarks</span>
            <button class="btn-ghost btn-icon btn-sm" onclick="App.closeModal('import-modal')"><i data-lucide="x" width="16" height="16"></i></button>
          </div>
          <div class="modal-body">
            <div class="import-dropzone" id="import-dropzone">
              <i data-lucide="file-up" width="40" height="40" style="opacity:.4"></i>
              <h3>Drop your bookmarks file here</h3>
              <p>Supports Chrome/Firefox HTML export or BookMark JSON export</p>
              <input type="file" id="import-file" accept=".html,.htm,.json" style="display:none">
              <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">Choose File</button>
            </div>
            <div id="import-preview" style="display:none"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="App.closeModal('import-modal')">Cancel</button>
            <button class="btn btn-primary" id="import-confirm" style="display:none"><i data-lucide="upload" width="14" height="14"></i> Import</button>
          </div>
        </div>
      </div>
    `;
  }

  function refreshList(container) {
    let data = [...allLinks];
    if (currentFilter !== 'all') data = data.filter(b => b.category === currentFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(b =>
        (b.title||'').toLowerCase().includes(q) ||
        (b.url||'').toLowerCase().includes(q) ||
        (b.notes||'').toLowerCase().includes(q) ||
        (b.tags||[]).some(t => t.toLowerCase().includes(q))
      );
    }
    const sort = container.querySelector('#links-sort')?.value || 'newest';
    if (sort === 'alpha') data.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    else if (sort === 'oldest') data.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));

    // Update counts
    const allBtn = container.querySelector('[data-cat="all"] .filter-pill-count');
    if (allBtn) allBtn.textContent = allLinks.length;
    DEFAULT_CATEGORIES.forEach(c => {
      const el = container.querySelector(`#count-${c.replace(/[^a-z0-9]/gi,'_')}`);
      if (el) el.textContent = allLinks.filter(b=>b.category===c).length;
    });

    const grid = container.querySelector('#links-grid');
    if (!grid) return;
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i data-lucide="bookmark-x" width="40" height="40"></i><h3>No bookmarks found</h3><p>${searchQuery ? 'Try a different search term' : 'Add your first bookmark to get started'}</p><button class="btn btn-primary" onclick="Links.openAddModal()"><i data-lucide="plus" width="15" height="15"></i> Add Bookmark</button></div>`;
      lucide.createIcons({ el: grid }); return;
    }
    grid.innerHTML = data.map(b => renderCard(b)).join('');
    grid.querySelectorAll('.bookmark-card').forEach(card => bindCardEvents(card, container));
    lucide.createIcons({ el: grid });
  }

  function renderCard(b) {
    const url = safeUrl(b.url);
    const domain = getDomain(url);
    const favicon = safeImageUrl(b.favicon, App.faviconFor(url));
    const tags = (b.tags||[]).map(t=>`<span class="bookmark-tag">${escHtml(t)}</span>`).join('');
    const ghMeta = b.githubMeta ? `<div class="github-meta"><span class="github-stat"><i data-lucide="star" width="11" height="11"></i> ${Number(b.githubMeta.stars)||0}</span><span class="github-stat"><i data-lucide="git-fork" width="11" height="11"></i> ${Number(b.githubMeta.forks)||0}</span>${b.githubMeta.language?`<span class="github-lang"><span class="lang-dot" style="background:#${langColor(b.githubMeta.language)}"></span>${escHtml(b.githubMeta.language)}</span>`:''}</div>` : '';
    return `
      <div class="bookmark-card${b.pinned?' pinned':''}" data-id="${escAttr(b.id)}">
        <input type="checkbox" class="checkbox bookmark-select" aria-label="Select bookmark">
        ${b.pinned?'<span class="pin-icon"><i data-lucide="pin" width="12" height="12"></i></span>':''}
        ${b.deadLink?'<span class="dead-link-badge" style="position:absolute;top:8px;right:8px"><i data-lucide="wifi-off" width="10" height="10"></i>Dead</span>':''}
        <div class="bookmark-card-header">
          <div class="bookmark-favicon">${favicon ? `<img src="${escAttr(favicon)}" alt="" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22%3E%3C/svg%3E'">` : ''}</div>
          <div class="bookmark-card-meta">
            <div class="bookmark-title">${escHtml(b.title||domain)}</div>
            <div class="bookmark-category">${escHtml(b.category||'Other')}</div>
          </div>
          <div class="bookmark-card-actions">
            <button class="btn-ghost btn-icon btn-sm" data-action="pin" aria-label="${b.pinned?'Unpin':'Pin'}" data-tooltip="${b.pinned?'Unpin':'Pin'}"><i data-lucide="${b.pinned?'pin-off':'pin'}" width="13" height="13"></i></button>
            <button class="btn-ghost btn-icon btn-sm" data-action="edit" aria-label="Edit" data-tooltip="Edit"><i data-lucide="pencil" width="13" height="13"></i></button>
            <button class="btn-ghost btn-icon btn-sm" data-action="delete" aria-label="Delete" data-tooltip="Delete"><i data-lucide="trash-2" width="13" height="13"></i></button>
          </div>
        </div>
        <a class="bookmark-url" href="${escAttr(url)}" target="_blank" rel="noopener">${escHtml(b.url || url)}</a>
        ${ghMeta}
        ${b.notes?`<div class="bookmark-desc">${escHtml(b.notes)}</div>`:''}
        ${tags?`<div class="bookmark-tags">${tags}</div>`:''}
        <div class="bookmark-footer">
          <span class="bookmark-date">${App.formatDate(b.createdAt)}</span>
          <a class="bookmark-open-btn" href="${escAttr(url)}" target="_blank" rel="noopener"><i data-lucide="external-link" width="12" height="12"></i> Open</a>
        </div>
      </div>`;
  }

  function bindCardEvents(card, container) {
    const id = card.dataset.id;
    card.querySelector('[data-action="delete"]')?.addEventListener('click', e => { e.stopPropagation(); deleteLink(id); });
    card.querySelector('[data-action="edit"]')?.addEventListener('click', e => { e.stopPropagation(); openEditModal(id, container); });
    card.querySelector('[data-action="pin"]')?.addEventListener('click', async e => { e.stopPropagation(); const b = allLinks.find(l=>l.id===id); await Store.update(COL, id, { pinned: !b?.pinned }); App.toast(b?.pinned?'Unpinned':'Pinned!','success'); });
    card.querySelector('.bookmark-select')?.addEventListener('change', e => { if (e.target.checked) selectedIds.add(id); else selectedIds.delete(id); updateBulkBar(container); });
    card.querySelector('.bookmark-tag')?.addEventListener('click', e => { e.stopPropagation(); searchQuery = e.target.textContent; container.querySelector('#links-search').value = searchQuery; refreshList(container); });
  }

  function bindEvents(container) {
    container.querySelector('#btn-add-link')?.addEventListener('click', () => openAddModal(container));
    container.querySelector('#btn-import-links')?.addEventListener('click', () => App.openModal('import-modal'));
    container.querySelector('#btn-export-links')?.addEventListener('click', () => Store.exportAll());
    container.querySelector('#btn-health-check')?.addEventListener('click', () => runHealthCheck(container));

    container.querySelector('#links-search')?.addEventListener('input', e => { searchQuery = e.target.value; refreshList(container); });
    container.querySelector('#links-sort')?.addEventListener('change', () => refreshList(container));

    container.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.cat;
        refreshList(container);
      });
    });

    container.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.view-toggle-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.id === 'view-list' ? 'list' : 'card';
        const grid = container.querySelector('#links-grid');
        if (grid) grid.classList.toggle('list-view', currentView === 'list');
      });
    });

    container.querySelector('#link-modal-save')?.addEventListener('click', () => saveLink(container));
    container.querySelector('#link-url')?.addEventListener('blur', e => onUrlBlur(e.target.value, container));

    container.querySelector('#bulk-cancel-btn')?.addEventListener('click', () => { selectedIds.clear(); container.querySelectorAll('.bookmark-select').forEach(c=>c.checked=false); updateBulkBar(container); });
    container.querySelector('#bulk-delete-btn')?.addEventListener('click', () => bulkDelete(container));
    container.querySelector('#bulk-move-cat')?.addEventListener('change', e => { if (e.target.value) bulkMove(e.target.value, container); });

    setupImport(container);
    initCombobox(container);
    initTagAutocomplete(container);
    initFilterBarScroll(container);
  }

  function initFilterBarScroll(container) {
    const bar = container.querySelector('.filter-bar');
    if (!bar) return;

    // Mouse wheel vertical → redirect as horizontal scroll
    bar.addEventListener('wheel', e => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        bar.scrollLeft += e.deltaY * 1.5;
      }
    }, { passive: false });

    // Click & drag to scroll
    let isDown = false, startX = 0, scrollStart = 0, didDrag = false;
    bar.addEventListener('mousedown', e => {
      isDown = true;
      didDrag = false;
      startX = e.pageX - bar.offsetLeft;
      scrollStart = bar.scrollLeft;
      bar.style.cursor = 'grabbing';
      bar.style.userSelect = 'none';
    });
    const stopDrag = () => {
      isDown = false;
      bar.style.cursor = '';
      bar.style.userSelect = '';
    };
    bar.addEventListener('mouseleave', stopDrag);
    bar.addEventListener('mouseup', stopDrag);
    bar.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - bar.offsetLeft;
      const walk = (x - startX) * 1.2;
      if (Math.abs(walk) > 4) didDrag = true;
      bar.scrollLeft = scrollStart - walk;
    });
    // Block pill click if user was just dragging
    bar.addEventListener('click', e => {
      if (didDrag) { e.stopPropagation(); e.preventDefault(); didDrag = false; }
    }, true);
  }

  function initCombobox(container) {
    const wrap  = container.querySelector('#category-combobox');
    const input = container.querySelector('#link-category-input');
    const drop  = container.querySelector('#category-dropdown');
    if (!wrap || !input || !drop) return;
    let focusedIndex = -1;

    // ── Portal: move dropdown to body so it escapes the modal's
    //    transform containing block (which traps position:fixed children)
    document.body.appendChild(drop);
    _teleportedEls.push(drop);

    function getOptions() {
      const q = input.value.trim().toLowerCase();
      const custom = allLinks.map(l=>l.category).filter(Boolean);
      const all = [...new Set([...DEFAULT_CATEGORIES, ...custom])].sort();
      return q ? all.filter(c => c.toLowerCase().includes(q)) : all;
    }

    function highlight(text, q) {
      if (!q) return escHtml(text);
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      if (idx < 0) return escHtml(text);
      return escHtml(text.slice(0,idx)) + '<mark>' + escHtml(text.slice(idx,idx+q.length)) + '</mark>' + escHtml(text.slice(idx+q.length));
    }

    function renderDrop() {
      const q    = input.value.trim();
      const opts = getOptions();
      focusedIndex = -1;
      if (!opts.length && !q) { drop.innerHTML = ''; return; }
      let html = opts.map((c,i) =>
        `<button class="combobox-option${c===input.value?' selected':''}" data-i="${i}" tabindex="-1">${highlight(c, q)}</button>`
      ).join('');
      if (q && !DEFAULT_CATEGORIES.map(x=>x.toLowerCase()).includes(q.toLowerCase()) && !allLinks.some(l=>(l.category||'').toLowerCase()===q.toLowerCase())) {
        html += `<button class="combobox-option combobox-create" data-i="${opts.length}" data-create="${escAttr(q)}" tabindex="-1"><i data-lucide="plus" width="12" height="12"></i> Create "${escHtml(q)}"</button>`;
      }
      drop.innerHTML = html;
      lucide.createIcons({el:drop});
      drop.querySelectorAll('.combobox-option').forEach(btn => {
        btn.addEventListener('mousedown', e => {
          e.preventDefault();
          const i = Number(btn.dataset.i);
          if (!btn.dataset.create && opts[i]) input.value = opts[i];
          else if (btn.dataset.create) input.value = btn.dataset.create;
          closeDropdown();
        });
      });
    }

    function positionDrop() {
      positionPortalElement(input, drop, 220);
    }

    // Since drop is now in body, CSS .combobox-wrap.open selector no longer
    // matches it — control display directly via JS
    function openDropdown() {
      positionDrop();
      drop.style.display = 'block';
      wrap.classList.add('open'); // only for arrow rotation
      renderDrop();
    }
    function closeDropdown() {
      drop.style.display = 'none';
      wrap.classList.remove('open');
    }

    input.addEventListener('focus',  openDropdown);
    input.addEventListener('input',  () => { positionDrop(); drop.style.display = 'block'; wrap.classList.add('open'); renderDrop(); });
    input.addEventListener('keydown', e => {
      const btns = [...drop.querySelectorAll('.combobox-option')];
      if (e.key === 'ArrowDown') { e.preventDefault(); focusedIndex = Math.min(focusedIndex+1, btns.length-1); btns.forEach((b,i)=>b.classList.toggle('focused',i===focusedIndex)); btns[focusedIndex]?.scrollIntoView({block:'nearest'}); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusedIndex = Math.max(focusedIndex-1, 0); btns.forEach((b,i)=>b.classList.toggle('focused',i===focusedIndex)); btns[focusedIndex]?.scrollIntoView({block:'nearest'}); }
      else if (e.key === 'Enter') { e.preventDefault(); if(focusedIndex>=0) btns[focusedIndex]?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); else closeDropdown(); }
      else if (e.key === 'Escape') closeDropdown();
    });
    const _comboClickHandler = e => { if(!wrap.contains(e.target) && !drop.contains(e.target)) closeDropdown(); };
    document.addEventListener('click', _comboClickHandler);
    _docListeners.push(() => document.removeEventListener('click', _comboClickHandler));
    const _comboRepositionHandler = () => { if (drop.style.display === 'block') positionDrop(); };
    addViewportListener(_comboRepositionHandler);
  }

  function initTagAutocomplete(container) {
    const input = container.querySelector('#link-tags-input');
    const sugg  = container.querySelector('#tag-suggestions');
    if (!input || !sugg) return;
    let focusedIndex = -1;

    // ── Portal: same reason as combobox dropdown
    document.body.appendChild(sugg);
    _teleportedEls.push(sugg);

    function getAllTags() {
      const counts = {};
      allLinks.forEach(l => (l.tags||[]).forEach(t => { counts[t] = (counts[t]||0)+1; }));
      return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    }

    function positionSugg() {
      positionPortalElement(input, sugg, 160);
    }

    function showSugg() { positionSugg(); sugg.style.display = 'block'; }
    function hideSugg() { sugg.style.display = 'none'; }

    function renderSugg() {
      const q = input.value.trim().toLowerCase();
      if (!q) { hideSugg(); return; }
      const matches = getAllTags().filter(([t]) => t.toLowerCase().includes(q) && !_currentTags.includes(t));
      if (!matches.length) { hideSugg(); return; }
      showSugg();
      sugg.innerHTML = matches.slice(0,10).map(([t,n],i) =>
        `<button class="tag-suggestion-item" data-tag="${escAttr(t)}" data-i="${i}" tabindex="-1">${escHtml(t)}<span class="tag-suggestion-count">${n}</span></button>`
      ).join('');
      sugg.querySelectorAll('.tag-suggestion-item').forEach(btn => {
        btn.addEventListener('mousedown', e => { e.preventDefault(); addTag(btn.dataset.tag, container); });
      });
      focusedIndex = -1;
    }

    function addTag(tag, container) {
      const t = tag.trim(); if (!t || _currentTags.includes(t)) return;
      _currentTags.push(t); renderTagChips(container);
      input.value = ''; hideSugg();
    }

    input.addEventListener('input', renderSugg);
    input.addEventListener('keydown', e => {
      const btns = [...sugg.querySelectorAll('.tag-suggestion-item')];
      if (e.key === 'ArrowDown') { e.preventDefault(); focusedIndex = Math.min(focusedIndex+1, btns.length-1); btns.forEach((b,i)=>b.classList.toggle('focused',i===focusedIndex)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusedIndex = Math.max(focusedIndex-1, 0); btns.forEach((b,i)=>b.classList.toggle('focused',i===focusedIndex)); }
      else if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (focusedIndex >= 0 && btns[focusedIndex]) addTag(btns[focusedIndex].dataset.tag, container);
        else if (input.value.trim()) addTag(input.value, container);
      } else if (e.key === 'Escape') { hideSugg(); }
    });
    const _tagsClickHandler = e => { if(!sugg.contains(e.target)&&e.target!==input) hideSugg(); };
    document.addEventListener('click', _tagsClickHandler);
    _docListeners.push(() => document.removeEventListener('click', _tagsClickHandler));
    const _tagsRepositionHandler = () => { if (sugg.style.display === 'block') positionSugg(); };
    addViewportListener(_tagsRepositionHandler);
  }

  function positionPortalElement(anchor, portal, maxHeight) {
    const rect = anchor.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportWidth = vv?.width || window.innerWidth;
    const viewportHeight = vv?.height || window.innerHeight;
    const viewportTop = vv?.offsetTop || 0;
    const viewportLeft = vv?.offsetLeft || 0;
    const gutter = 8;
    const width = Math.min(rect.width, viewportWidth - gutter * 2);
    const left = Math.min(Math.max(rect.left, viewportLeft + gutter), viewportLeft + viewportWidth - width - gutter);
    const spaceBelow = viewportTop + viewportHeight - rect.bottom - gutter;
    const spaceAbove = rect.top - viewportTop - gutter;
    const openAbove = spaceBelow < 120 && spaceAbove > spaceBelow;
    const height = Math.max(96, Math.min(maxHeight, openAbove ? spaceAbove : spaceBelow));

    portal.style.left = left + 'px';
    portal.style.width = width + 'px';
    portal.style.maxHeight = height + 'px';
    portal.style.top = (openAbove ? rect.top - height - 4 : rect.bottom + 4) + 'px';
  }

  function addViewportListener(handler) {
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    window.visualViewport?.addEventListener('resize', handler);
    window.visualViewport?.addEventListener('scroll', handler);
    _docListeners.push(() => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      window.visualViewport?.removeEventListener('resize', handler);
      window.visualViewport?.removeEventListener('scroll', handler);
    });
  }

  async function onUrlBlur(url, container) {
    if (!url) return;
    try { new URL(url); } catch { return; }
    const dup = Store.checkDuplicate(url);
    const dupEl = container.querySelector('#dup-warning');
    if (dup && dupEl) {
      dupEl.style.display = 'flex';
      container.querySelector('#dup-warning-msg').textContent = `Already saved as "${dup.title || dup.url}" in ${dup.category || 'Other'}`;
    } else if (dupEl) { dupEl.style.display = 'none'; }

    const cat = autoCategory(url);
    setCombobox(container, cat);

    // GitHub API
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const res = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}`);
        if (res.ok) {
          const data = await res.json();
          if (!container.querySelector('#link-title').value)
            container.querySelector('#link-title').value = data.full_name;
          if (!container.querySelector('#link-notes').value)
            container.querySelector('#link-notes').value = data.description || '';
          const ghEl = container.querySelector('#github-preview');
          if (ghEl) { ghEl.style.display = 'flex'; ghEl.innerHTML = `<span class="github-stat"><i data-lucide="star" width="11" height="11"></i> ${Number(data.stargazers_count)||0}</span><span class="github-stat"><i data-lucide="git-fork" width="11" height="11"></i> ${Number(data.forks_count)||0}</span>${data.language?`<span>${escHtml(data.language)}</span>`:''}`; lucide.createIcons({el:ghEl}); container.dataset.githubMeta = JSON.stringify({stars:data.stargazers_count,forks:data.forks_count,language:data.language}); }
        }
      }
    } catch {}

    // Auto-title from favicon API
    const titleEl = container.querySelector('#link-title');
    if (titleEl && !titleEl.value) {
      try { titleEl.value = new URL(url).hostname.replace('www.',''); } catch {}
    }
  }

  let editingId = null;
  // Active tag chips state
  let _currentTags = [];

  function setCombobox(container, value) {
    const input = container.querySelector('#link-category-input');
    if (input) input.value = value || 'Other';
  }

  function getCategoryValue(container) {
    return (container.querySelector('#link-category-input')?.value || 'Other').trim();
  }

  function setTags(container, tags) {
    _currentTags = [...(tags||[])];
    renderTagChips(container);
  }

  function getTagsValue() { return _currentTags; }

  function renderTagChips(container) {
    const row = container.querySelector('#tag-chips-row'); if (!row) return;
    row.innerHTML = _currentTags.map((t,i) =>
      `<span class="tag-chip">${escHtml(t)}<button class="tag-chip-remove" data-i="${i}" aria-label="Remove tag">&#x2715;</button></span>`
    ).join('');
    row.querySelectorAll('.tag-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => { _currentTags.splice(Number(btn.dataset.i),1); renderTagChips(container); });
    });
  }

  function openAddModal(container) {
    container = container || document.getElementById('page-content');
    editingId = null;
    container.querySelector('#link-modal-title').textContent = 'Add Bookmark';
    container.querySelector('#link-url').value = '';
    container.querySelector('#link-title').value = '';
    container.querySelector('#link-notes').value = '';
    container.querySelector('#dup-warning').style.display = 'none';
    container.querySelector('#github-preview').style.display = 'none';
    delete container.dataset.githubMeta;
    setCombobox(container, 'Other');
    setTags(container, []);
    App.openModal('link-modal');
    setTimeout(() => container.querySelector('#link-url')?.focus(), 150);
  }

  function openEditModal(id, container) {
    const b = allLinks.find(l=>l.id===id); if (!b) return;
    editingId = id;
    container.querySelector('#link-modal-title').textContent = 'Edit Bookmark';
    container.querySelector('#link-url').value = b.url || '';
    container.querySelector('#link-title').value = b.title || '';
    container.querySelector('#link-notes').value = b.notes || '';
    container.querySelector('#dup-warning').style.display = 'none';
    setCombobox(container, b.category || 'Other');
    setTags(container, b.tags || []);
    App.openModal('link-modal');
  }

  async function saveLink(container) {
    const url   = container.querySelector('#link-url').value.trim();
    const title = container.querySelector('#link-title').value.trim();
    const cat   = getCategoryValue(container);
    const tags  = getTagsValue();
    const notes = container.querySelector('#link-notes').value.trim();
    if (!url) { App.toast('URL is required','error'); return; }
    try { new URL(url); } catch { App.toast('Invalid URL','error'); return; }
    const domain = new URL(url).hostname;
    const ghMeta = container.dataset.githubMeta ? JSON.parse(container.dataset.githubMeta) : null;
    const payload = { url, title: title||domain, category: cat, tags, notes, favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`, ...(ghMeta?{githubMeta:ghMeta}:{}) };
    if (editingId) { await Store.update(COL, editingId, payload); App.toast('Bookmark updated!','success'); }
    else { await Store.add(COL, { ...payload, pinned: false }); App.toast('Bookmark added!','success'); }
    App.closeModal('link-modal');
  }

  async function deleteLink(id) {
    if (!await App.confirm('Delete this bookmark?')) return;
    await Store.remove(COL, id);
    App.toast('Deleted','info');
  }

  function updateBulkBar(container) {
    const bar   = container.querySelector('#bulk-bar');
    const count = container.querySelector('#bulk-count');
    if (bar)  bar.classList.toggle('visible', selectedIds.size > 0);
    if (count) count.textContent = `${selectedIds.size} selected`;
  }

  async function bulkDelete(container) {
    if (!selectedIds.size) return;
    if (!await App.confirm(`Delete ${selectedIds.size} bookmark(s)?`)) return;
    await Promise.all([...selectedIds].map(id => Store.remove(COL, id)));
    selectedIds.clear();
    updateBulkBar(container);
    App.toast('Deleted','info');
  }

  async function bulkMove(category, container) {
    await Promise.all([...selectedIds].map(id => Store.update(COL, id, { category })));
    selectedIds.clear();
    container.querySelector('#bulk-move-cat').value = '';
    updateBulkBar(container);
    App.toast(`Moved to ${category}`, 'success');
  }

  async function runHealthCheck(container) {
    App.toast('Running health check…', 'info', 2000);
    const bar = document.createElement('div');
    bar.className = 'health-bar';
    bar.innerHTML = `<i data-lucide="activity" width="16" height="16"></i><span id="hc-status">Checking 0/${allLinks.length}…</span><div class="health-progress"><div class="health-progress-bar" id="hc-bar" style="width:0%"></div></div>`;
    container.querySelector('.links-toolbar')?.after(bar);
    lucide.createIcons({el:bar});
    let done=0, dead=0;
    for (const b of allLinks) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(()=>ctrl.abort(), 5000);
        const res = await fetch(b.url, { method:'HEAD', mode:'no-cors', signal:ctrl.signal });
        clearTimeout(timer);
        await Store.update(COL, b.id, { deadLink: false });
      } catch {
        await Store.update(COL, b.id, { deadLink: true });
        dead++;
      }
      done++;
      bar.querySelector('#hc-status').textContent = `Checking ${done}/${allLinks.length}… (${dead} dead)`;
      bar.querySelector('#hc-bar').style.width = (done/allLinks.length*100)+'%';
    }
    App.toast(`Done: ${dead} dead links found`, dead?'error':'success');
    setTimeout(()=>bar.remove(), 5000);
  }

  function setupImport(container) {
    let importData = null;
    const dropzone = container.querySelector('#import-dropzone');
    const fileInput = container.querySelector('#import-file');

    ['dragover','dragleave','drop'].forEach(ev => {
      dropzone?.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.toggle('drag-over', ev==='dragover'); if (ev==='drop') handleImportFile(e.dataTransfer.files[0], container, d=>{ importData=d; }); });
    });
    fileInput?.addEventListener('change', e => handleImportFile(e.target.files[0], container, d=>{ importData=d; }));

    container.querySelector('#import-confirm')?.addEventListener('click', async () => {
      if (!importData) return;
      const stats = await Store.importJSON({ links: importData });
      App.closeModal('import-modal');
      App.toast(`Imported ${stats.links} bookmarks!`, 'success');
      importData = null;
    });
  }

  async function handleImportFile(file, container, onReady) {
    if (!file) return;
    const text = await file.text();
    let items = [];
    if (file.name.endsWith('.json')) {
      const json = JSON.parse(text);
      items = json.links || json;
    } else {
      items = Store.parseBrowserBookmarks(text);
    }
    const preview = container.querySelector('#import-preview');
    const confirm = container.querySelector('#import-confirm');
    if (preview) { preview.style.display='block'; preview.innerHTML=`<p style="color:var(--text-secondary);font-size:var(--text-sm);margin:var(--space-4) 0"><strong>${items.length}</strong> bookmarks found and ready to import.</p>`; }
    if (confirm) confirm.style.display = 'flex';
    onReady(items);
  }

  function safeUrl(url) { return App.safeUrl(url); }
  function safeImageUrl(url, fallback) { return App.safeImageUrl(url, fallback); }
  function getDomain(url) { try { return new URL(url).hostname.replace('www.',''); } catch { return ''; } }
  function langColor(lang) { const map={JavaScript:'f1e05a',TypeScript:'3178c6',Python:'3572a5',HTML:'e34c26',CSS:'563d7c',Go:'00add8',Rust:'dea584',Java:'b07219',Ruby:'701516'}; return map[lang]||'5865f2'; }
  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }

  function unmount() {
    unsub?.();
    selectedIds.clear();
    _docListeners.forEach(cleanup => cleanup());
    _docListeners = [];
    _teleportedEls.forEach(el => { try { document.body.removeChild(el); } catch {} });
    _teleportedEls = [];
  }

  return { render, unmount, autoCategory, openAddModal };
})();
