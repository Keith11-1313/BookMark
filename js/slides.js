// slides.js — Image slide sets grouped by folder under assets/slides/.
// Landing view is a notes-style grid of slide-set cards (thumbnail = first slide);
// clicking a card opens the full-bleed TikTok-style slideshow for that set.
// Curated sets come from data/slides.json (id = folder name); user sets are
// built from a file picker and stored in localStorage.

const Slides = (() => {
  const CATEGORIES = ['Design', 'Inspiration', 'UI', 'Typography', 'Other'];
  const CAT_KEY = { Design: 'design', Inspiration: 'inspiration', UI: 'ui', Typography: 'typography', Other: 'other' };
  let allDecks = [], filtered = [], activeId = null, activeIndex = 0;
  let view = 'grid';
  let pendingImages = [];
  let keyHandler = null;
  let suppressClick = false;

  // ── Custom category helpers (shared with links.js) ─────────
  function readCustomCats() {
    try { return JSON.parse(localStorage.getItem('user_custom_cats')) || []; }
    catch { return []; }
  }
  function saveCustomCat(name) {
    const cats = readCustomCats();
    if (!cats.includes(name)) { cats.push(name); localStorage.setItem('user_custom_cats', JSON.stringify(cats)); }
  }
  function buildCatOptions(selected) {
    const fromData = Store.get('slides').map(d => d.category).filter(Boolean);
    const custom = readCustomCats();
    const all = [...new Set([...CATEGORIES.filter(c => c !== 'Other'), ...fromData, ...custom, 'Other'])];
    return all.map(c => `<option value="${escAttr(c)}"${c === selected ? ' selected' : ''}>${escHtml(c)}</option>`).join('');
  }
  function buildFilterOptions() {
    const fromData = Store.get('slides').map(d => d.category).filter(Boolean);
    const custom = readCustomCats();
    const all = [...new Set([...CATEGORIES.filter(c => c !== 'Other'), ...fromData, ...custom, 'Other'])];
    return all.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  }
  function resolveCategory(container) {
    const sel = container.querySelector('#gl-category')?.value || 'Other';
    if (sel === 'Other') {
      const custom = (container.querySelector('#gl-custom-cat')?.value || '').trim();
      if (custom) { saveCustomCat(custom); return custom; }
    }
    return sel;
  }
  function syncCustomCatInput(container) {
    const sel = container.querySelector('#gl-category');
    const input = container.querySelector('#gl-custom-cat');
    if (!sel || !input) return;
    if (sel.value === 'Other') {
      input.style.display = 'block';
      if (document.activeElement !== input) input.focus();
    } else {
      input.style.display = 'none';
      input.value = '';
    }
  }

  function render(container) {
    allDecks = Store.get('slides');
    if (!allDecks.some(d => d.id === activeId)) activeId = allDecks[0]?.id || null;
    activeIndex = 0;
    view = 'grid';
    container.innerHTML = buildShell();
    bindEvents(container);
    refresh(container);
    renderFab(container);
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          ${Icons.svg('asset', 24, 'ui-icon icon-accent')}
          <div><div class="page-title">Slides</div><div class="page-subtitle">Image decks, one slide at a time</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary hide-on-mobile" id="btn-new-deck">
            ${Icons.svg('plus', 15)}<span>New Deck</span>
          </button>
        </div>
      </div>
      <div class="page-toolbar">
        <div class="search-bar">
          <span class="search-icon">${Icons.svg('search', 15)}</span>
          <input class="input" id="gallery-search" type="search" placeholder="Search decks…">
        </div>
        <select class="input" id="gallery-cat-filter" style="width:auto">
          <option value="all">All Categories</option>
          ${buildFilterOptions()}
        </select>
      </div>
      <div class="gallery-stage" id="gallery-stage">
        <div id="gallery-body"></div>
      </div>

      <div class="modal-backdrop" id="gl-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add Deck">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title" id="gl-modal-title">New Deck</span>
            <button class="btn-ghost btn-sm btn-icon" id="gl-modal-close" aria-label="Close">${Icons.svg('x', 16)}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="gl-edit-id">
            <div class="form-field">
              <label class="form-label" for="gl-title">Title <span style="color:var(--danger)">*</span></label>
              <input class="input" id="gl-title" type="text" placeholder="My Deck">
            </div>
            <div class="form-field">
              <label class="form-label" for="gl-category">Category</label>
              <select class="input" id="gl-category">${buildCatOptions('Other')}</select>
              <input class="input" id="gl-custom-cat" type="text"
                     placeholder="Type a new category name…"
                     maxlength="40"
                     style="display:none;margin-top:var(--space-2)">
            </div>
            <div class="form-field">
              <label class="form-label" for="gl-desc">Description</label>
              <textarea class="input" id="gl-desc" rows="3" placeholder="What does this deck show?"></textarea>
            </div>
            <div class="form-field">
              <label class="form-label" for="gl-tags">Tags <span class="form-hint">(comma-separated)</span></label>
              <input class="input" id="gl-tags" type="text" placeholder="fonts, pairing">
            </div>
            <div class="form-field">
              <label class="form-label">Images <span style="color:var(--danger)">*</span></label>
              <input type="file" id="gl-images" multiple accept="image/*" hidden>
              <button class="btn btn-secondary" id="gl-pick-images">${Icons.svg('imagePlus', 15)} Add Images</button>
              <div class="gl-thumbs" id="gl-thumbs"></div>
            </div>
            <div class="inline-notice">
              ${Icons.svg('info', 13)}
              <span>Images are downscaled and saved in browser localStorage. Clearing browser data removes them.</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="gl-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="gl-modal-save">Save Deck</button>
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
    fab.setAttribute('aria-label', 'New Deck');
    fab.innerHTML = Icons.svg('plus', 24);
    document.body.appendChild(fab);
    fab.addEventListener('click', () => openModal(container));
  }

  // ── Deck filtering ─────────────────────────────────────────
  function refresh(container) {
    const q = (container.querySelector('#gallery-search')?.value || '').toLowerCase();
    const cat = container.querySelector('#gallery-cat-filter')?.value || 'all';
    filtered = allDecks.filter(d =>
      (!q ||
        (d.title || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        (d.tags || []).some(t => t.toLowerCase().includes(q))) &&
      (cat === 'all' || d.category === cat)
    );
    if (view === 'slide' && !filtered.some(d => d.id === activeId)) view = 'grid';
    renderBody(container);
  }

  // ── View switching ─────────────────────────────────────────
  function renderBody(container) {
    const body = container.querySelector('#gallery-body'); if (!body) return;
    if (view === 'slide') renderSlide(container);
    else renderGrid(container);
  }

  function openSlide(container, id) {
    if (!allDecks.some(d => d.id === id)) return;
    view = 'slide';
    activeId = id;
    activeIndex = 0;
    renderBody(container);
  }

  function backToGrid(container) {
    view = 'grid';
    renderBody(container);
  }

  // ── Grid view ──────────────────────────────────────────────
  function renderGrid(container) {
    const body = container.querySelector('#gallery-body'); if (!body) return;
    if (!filtered.length) {
      body.innerHTML = `<div class="empty-state" style="padding:var(--space-10)">${Icons.svg('asset', 40)}<h3>No decks found</h3><p>Drop a folder under assets/slides/ or click New Deck to add one</p></div>`;
      return;
    }
    body.innerHTML = `<div class="gallery-grid">${filtered.map(deck => renderDeckCard(deck)).join('')}</div>`;
    const grid = body.querySelector('.gallery-grid');
    grid.querySelectorAll('.deck-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', e => {
        if (e.target.closest('[data-action]')) return;
        openSlide(container, id);
      });
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSlide(container, id); } });
      card.querySelector('[data-action="like"]')?.addEventListener('click', e => {
        e.stopPropagation();
        const nowLiked = Store.toggleLike('slides', id);
        App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
        renderGrid(container);
      });
      card.querySelector('[data-action="edit"]')?.addEventListener('click', e => {
        e.stopPropagation();
        const deck = allDecks.find(d => d.id === id);
        if (deck) openModal(container, deck);
      });
      card.querySelector('[data-action="delete"]')?.addEventListener('click', e => {
        e.stopPropagation();
        App.confirm('Delete this deck?', () => {
          Store.removeUser('slides', id);
          App.toast('Deck deleted', 'success');
          refresh(container);
        });
      });
    });
  }

  function renderDeckCard(deck) {
    const images = deck.images || [];
    const first = images[0] || '';
    const liked = Store.isLiked('slides', deck.id);
    const isUser = !!deck._isUser;
    return `
      <div class="deck-card" data-id="${escAttr(deck.id)}" tabindex="0" role="button" aria-label="Open deck: ${escAttr(deck.title || 'Untitled')}">
        <div class="deck-card-thumb">
          ${first
            ? `<img src="${escAttr(first)}" alt="${escAttr(deck.title || '')}" loading="lazy">`
            : `<div class="deck-card-thumb-empty">${Icons.svg('asset', 26)}</div>`}
          <span class="deck-card-count">${images.length} ${images.length === 1 ? 'slide' : 'slides'}</span>
        </div>
        <div class="deck-card-body">
          <div class="deck-card-header">
            <div class="deck-card-title">${escHtml(deck.title || 'Untitled')}${isUser ? ' <span class="user-badge">Local</span>' : ''}</div>
            <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">${Icons.svg('heart', 14, liked ? 'ui-icon liked-heart' : 'ui-icon')}</button>
          </div>
          ${deck.description ? `<p class="deck-card-desc">${escHtml(deck.description)}</p>` : ''}
          <div class="deck-card-footer">
            <span class="deck-card-meta">${Icons.svg('clock', 11)} ${App.formatDate(deck.createdAt)}</span>
            <div class="deck-card-actions">
              ${isUser ? `
                <button class="toolbar-btn" data-action="edit" data-tooltip="Edit" aria-label="Edit deck">${Icons.svg('pencil', 13)}</button>
                <button class="toolbar-btn" data-action="delete" data-tooltip="Delete" aria-label="Delete deck" style="color:var(--danger)">${Icons.svg('trash', 13)}</button>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── Slide view ─────────────────────────────────────────────
  function renderSlide(container) {
    const body = container.querySelector('#gallery-body'); if (!body) return;
    if (!activeId || !allDecks.some(d => d.id === activeId)) { view = 'grid'; renderGrid(container); return; }
    const deck = allDecks.find(d => d.id === activeId);
    const images = deck.images || [];
    activeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
    const img = images[activeIndex];
    body.innerHTML = `
      <div class="gallery-backbar">
        <button class="btn btn-ghost btn-sm" id="gallery-back">
          ${Icons.svg('chevronLeft', 14)} All decks
        </button>
      </div>
      <div class="gallery-frame">
        <div class="gallery-slide" id="gallery-slide">
          ${images.length > 1 ? `<span class="gallery-progress">${activeIndex + 1} / ${images.length}</span>` : ''}
          ${images.length > 1 ? `<button class="gallery-zone" id="gallery-zone-prev" aria-label="Previous slide"></button>` : ''}
          ${img
            ? `<img class="gallery-img" id="gallery-img" src="${escAttr(img)}" alt="${escAttr(deck.title || '')}" loading="lazy">`
            : `<div class="gallery-img-empty">${Icons.svg('asset', 32)}<p>No images yet</p></div>`}
          ${images.length > 1 ? `<button class="gallery-zone" id="gallery-zone-next" aria-label="Next slide"></button>` : ''}
          ${images.length > 1 ? `<button class="gallery-nav-btn gallery-nav-left" id="gallery-btn-prev" aria-label="Previous slide">${Icons.svg('chevronLeft', 22)}</button>` : ''}
          ${images.length > 1 ? `<button class="gallery-nav-btn gallery-nav-right" id="gallery-btn-next" aria-label="Next slide">${Icons.svg('chevronRight', 22)}</button>` : ''}
          ${images.length > 1 ? `<div class="gallery-dots" id="gallery-dots">
            ${images.map((_, i) => `<button class="gallery-dot${i === activeIndex ? ' active' : ''}" data-i="${i}" aria-label="Go to slide ${i + 1}"></button>`).join('')}
          </div>` : ''}
        </div>
        <div class="gallery-caption" id="gallery-caption">${renderCaption(deck)}</div>
      </div>
    `;

    body.querySelector('#gallery-back')?.addEventListener('click', () => backToGrid(container));

    const slide = body.querySelector('#gallery-slide');
    const tapNav = dir => { if (!suppressClick) slideBy(container, dir); };
    slide.querySelector('#gallery-btn-prev')?.addEventListener('click', () => tapNav(-1));
    slide.querySelector('#gallery-btn-next')?.addEventListener('click', () => tapNav(1));
    slide.querySelector('#gallery-zone-prev')?.addEventListener('click', () => tapNav(-1));
    slide.querySelector('#gallery-zone-next')?.addEventListener('click', () => tapNav(1));
    slide.querySelectorAll('#gallery-dots .gallery-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        if (suppressClick) return;
        activeIndex = Number(dot.dataset.i);
        renderBody(container);
      });
    });

    let touchStartX = 0, touchStartY = 0;
    slide.addEventListener('touchstart', e => {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }, { passive: true });
    slide.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        suppressClick = true;
        slideBy(container, dx < 0 ? 1 : -1);
        setTimeout(() => { suppressClick = false; }, 350);
      }
    }, { passive: true });
    slide.querySelector('#gallery-img')?.addEventListener('error', () => {
      const imgEl = slide.querySelector('#gallery-img');
      if (!imgEl) return;
      const empty = document.createElement('div');
      empty.className = 'gallery-img-empty';
      empty.innerHTML = `${Icons.svg('asset', 32)}<p>Couldn't load this image</p>`;
      imgEl.replaceWith(empty);
    });
    bindCaption(container, body.querySelector('#gallery-caption'), deck);
  }

  function renderCaption(deck) {
    const isUser = !!deck._isUser;
    const catKey = CAT_KEY[deck.category] || 'other';
    const tags = (deck.tags || []).map(t => `<span class="gallery-tag">${escHtml(t)}</span>`).join('');
    const liked = Store.isLiked('slides', deck.id);
    return `
      <div class="gallery-caption-top">
        <div class="gallery-deck-title">${escHtml(deck.title || 'Untitled')}${isUser ? ' <span class="user-badge">Local</span>' : ''}</div>
        <div class="gallery-caption-actions">
          ${isUser ? `
            <button class="toolbar-btn" data-action="edit" data-tooltip="Edit">${Icons.svg('pencil', 14)}</button>
            <button class="toolbar-btn" data-action="delete" data-tooltip="Delete" style="color:var(--danger)">${Icons.svg('trash', 14)}</button>` : ''}
          <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">${Icons.svg('heart', 16, liked ? 'ui-icon liked-heart' : 'ui-icon')}</button>
        </div>
      </div>
      <div class="gallery-caption-meta">
        <span class="gallery-cat cat-${catKey}">${escHtml(deck.category || 'Other')}</span>
        <span class="gallery-date">${App.formatDate(deck.createdAt)}</span>
      </div>
      ${deck.description ? `<p class="gallery-desc">${escHtml(deck.description)}</p>` : ''}
      ${tags ? `<div class="gallery-tags">${tags}</div>` : ''}
    `;
  }

  function bindCaption(container, el, deck) {
    if (!el) return;
    el.querySelector('[data-action="like"]')?.addEventListener('click', () => {
      const nowLiked = Store.toggleLike('slides', deck.id);
      App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
      renderBody(container);
    });
    el.querySelector('[data-action="edit"]')?.addEventListener('click', () => openModal(container, deck));
    el.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      App.confirm('Delete this deck?', () => {
        Store.removeUser('slides', deck.id);
        activeId = null;
        App.toast('Deck deleted', 'success');
        refresh(container);
      });
    });
  }

  // ── Slide navigation ───────────────────────────────────────
  function slideBy(container, dir) {
    if (view !== 'slide') return;
    const deck = allDecks.find(d => d.id === activeId); if (!deck) return;
    const n = (deck.images || []).length;
    if (!n) return;
    activeIndex = (activeIndex + dir + n) % n;
    renderBody(container);
  }

  // ── Image picking ──────────────────────────────────────────
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('decode'));
        image.onload = () => {
          const MAX = 1600;
          let { width, height } = image;
          const scale = Math.min(1, MAX / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function onImagesPicked(container, files) {
    const valid = [...files].filter(f => f.type.startsWith('image/'));
    if (!valid.length) { App.toast('Choose image files', 'error'); return; }
    Promise.all(valid.map(fileToDataUrl)).then(urls => {
      pendingImages = pendingImages.concat(urls);
      renderThumbs(container);
      const total = pendingImages.reduce((n, s) => n + s.length, 0);
      if (total > 4 * 1024 * 1024) App.toast('Heads up: localStorage holds ~5MB — keep decks small', 'info', 6000);
    }).catch(() => App.toast('Could not read those images', 'error'));
  }

  // ── Modal ──────────────────────────────────────────────────
  function openModal(container, deck = null) {
    const backdrop = container.querySelector('#gl-modal-backdrop'); if (!backdrop) return;
    container.querySelector('#gl-modal-title').textContent = deck ? 'Edit Deck' : 'New Deck';
    container.querySelector('#gl-edit-id').value = deck?.id || '';
    container.querySelector('#gl-title').value = deck?.title || '';

    const sel = container.querySelector('#gl-category');
    const customInput = container.querySelector('#gl-custom-cat');
    const savedCat = deck?.category || 'Other';
    const allCats = [...new Set([...CATEGORIES.filter(c => c !== 'Other'), ...Store.get('slides').map(d => d.category).filter(Boolean), ...readCustomCats(), 'Other'])];
    const isKnown = allCats.includes(savedCat);
    sel.innerHTML = buildCatOptions(isKnown ? savedCat : 'Other');
    Dropdown.enhance(sel);
    if (!isKnown) { customInput.style.display = 'block'; customInput.value = savedCat; }
    else if (savedCat === 'Other') { customInput.style.display = 'block'; customInput.value = ''; }
    else { customInput.style.display = 'none'; customInput.value = ''; }

    container.querySelector('#gl-desc').value = deck?.description || '';
    container.querySelector('#gl-tags').value = (deck?.tags || []).join(', ');
    pendingImages = (deck?.images || []).slice();
    renderThumbs(container);
    backdrop.classList.add('open');
    setTimeout(() => container.querySelector('#gl-title')?.focus(), 50);
  }

  function closeModal(container) {
    container.querySelector('#gl-modal-backdrop')?.classList.remove('open');
  }

  function renderThumbs(container) {
    const wrap = container.querySelector('#gl-thumbs'); if (!wrap) return;
    if (!pendingImages.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = pendingImages.map((src, i) => `
      <div class="gl-thumb">
        <img src="${escAttr(src)}" alt="Slide ${i + 1}">
        <button class="gl-thumb-remove" data-i="${i}" aria-label="Remove slide">${Icons.svg('close', 12)}</button>
      </div>`).join('');
    wrap.querySelectorAll('.gl-thumb-remove').forEach(btn => btn.addEventListener('click', () => {
      pendingImages.splice(Number(btn.dataset.i), 1);
      renderThumbs(container);
    }));
  }

  function saveDeck(container) {
    const title = (container.querySelector('#gl-title')?.value || '').trim();
    if (!title) { App.toast('Title is required', 'error'); return; }
    if (!pendingImages.length) { App.toast('Add at least one image', 'error'); return; }
    const category = resolveCategory(container);
    const description = (container.querySelector('#gl-desc')?.value || '').trim();
    const tags = (container.querySelector('#gl-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
    const editId = container.querySelector('#gl-edit-id')?.value || '';
    const data = { title, category, description, tags, images: pendingImages };
    let savedId = null;
    if (editId) { Store.updateUser('slides', editId, data); savedId = editId; App.toast('Deck updated', 'success'); }
    else { savedId = Store.addUser('slides', data).id; App.toast('Deck saved', 'success'); }
    allDecks = Store.get('slides');
    closeModal(container);
    activeId = savedId;
    activeIndex = 0;
    view = 'grid';
    refresh(container);
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents(container) {
    container.querySelector('#btn-new-deck')?.addEventListener('click', () => openModal(container));
    container.querySelector('#gallery-search')?.addEventListener('input', () => refresh(container));
    container.querySelector('#gallery-cat-filter')?.addEventListener('change', () => refresh(container));
    Dropdown.enhance(container.querySelector('#gallery-cat-filter'));
    container.querySelector('#gl-modal-close')?.addEventListener('click', () => closeModal(container));
    container.querySelector('#gl-modal-cancel')?.addEventListener('click', () => closeModal(container));
    container.querySelector('#gl-modal-backdrop')?.addEventListener('click', e => { if (e.target === container.querySelector('#gl-modal-backdrop')) closeModal(container); });
    container.querySelector('#gl-modal-save')?.addEventListener('click', () => saveDeck(container));
    container.querySelector('#gl-pick-images')?.addEventListener('click', () => container.querySelector('#gl-images')?.click());
    container.querySelector('#gl-images')?.addEventListener('change', e => { onImagesPicked(container, e.target.files); e.target.value = ''; });
    container.querySelector('#gl-category')?.addEventListener('change', () => syncCustomCatInput(container));
    Dropdown.enhance(container.querySelector('#gl-category'));

    keyHandler = e => {
      if (e.target.closest('.modal-backdrop')) return;
      const tag = document.activeElement.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (view !== 'slide') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); slideBy(container, -1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); slideBy(container, 1); }
      else if (e.key === 'Escape') { e.preventDefault(); backToGrid(container); }
    };
    document.addEventListener('keydown', keyHandler);
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    const fab = document.getElementById('page-fab');
    if (fab) fab.remove();
  }

  return { render, unmount };
})();