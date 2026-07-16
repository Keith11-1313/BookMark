// prompts.js — Read-only prompt library with likes

const Prompts = (() => {
  const CATEGORIES = ['Writing', 'Coding', 'Analysis', 'Creative', 'Business', 'Marketing', 'Education', 'Personal', 'Other'];
  const CAT_KEY = { Writing: 'writing', Coding: 'coding', Analysis: 'analysis', Creative: 'creative', Business: 'business', Marketing: 'marketing', Education: 'education', Personal: 'personal', Other: 'other' };
  let allPrompts = [];

  function render(container) {
    allPrompts = Store.get('prompts');
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    refreshList(container);
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="sparkles" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Prompts</div><div class="page-subtitle">Reusable prompts for AI &amp; automation</div></div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="btn-export-prompts"><i data-lucide="download" width="14" height="14"></i><span>Export JSON</span></button>
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
        <select class="input" id="prompts-sort" style="width:auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="liked">Liked first</option>
        </select>
      </div>
      <div id="prompts-grid" class="prompts-grid"></div>`;
  }

  function refreshList(container) {
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
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i data-lucide="sparkles" width="40" height="40"></i><h3>No prompts found</h3><p>${q ? 'Try a different search term' : 'Nothing to show here'}</p></div>`;
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
    const liked = Store.isLiked('prompts', p.id);
    return `
      <div class="prompt-card" data-id="${escAttr(p.id)}">
        <div class="prompt-header">
          <span class="prompt-title">${escHtml(p.title || 'Untitled')}</span>
          <span class="prompt-cat cat-${catKey}">${escHtml(p.category || 'Other')}</span>
          <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">
            <i data-lucide="heart" width="14" height="14" style="${liked ? 'fill:var(--danger);color:var(--danger)' : ''}"></i>
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
    card.querySelector('[data-action="copy"]')?.addEventListener('click', e => copyPrompt(card, e.currentTarget));
    card.querySelector('[data-action="like"]')?.addEventListener('click', () => {
      const nowLiked = Store.toggleLike('prompts', card.dataset.id);
      App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
      refreshList(container);
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

  function bindEvents(container) {
    container.querySelector('#prompts-search')?.addEventListener('input', () => refreshList(container));
    container.querySelector('#prompts-cat-filter')?.addEventListener('change', () => refreshList(container));
    container.querySelector('#prompts-sort')?.addEventListener('change', () => refreshList(container));
    container.querySelector('#btn-export-prompts')?.addEventListener('click', () => { Store.exportJSON('prompts'); App.toast('Exported prompts as JSON', 'success'); });
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {}

  return { render, unmount };
})();
