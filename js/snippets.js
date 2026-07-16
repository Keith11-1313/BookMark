// snippets.js — Read-only code snippet viewer with likes

const Snippets = (() => {
  const LANGUAGES = ['JavaScript','TypeScript','HTML','CSS','Python','JSON','Bash','SQL','Java','C#','Go','Rust','PHP','Ruby','YAML','Plain Text'];
  const LANG_MAP = { JavaScript:'js',TypeScript:'ts',HTML:'html',CSS:'css',Python:'python',JSON:'json',Bash:'bash',SQL:'sql',Java:'java','C#':'cs',Go:'go',Rust:'rust',PHP:'php',Ruby:'ruby',YAML:'yaml','Plain Text':'plaintext' };
  let allSnippets = [];

  function render(container) {
    allSnippets = Store.get('snippets');
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    refreshList(container);
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="code-2" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Snippets</div><div class="page-subtitle">Reusable code & text blocks</div></div>
        </div>
        <div class="page-actions">
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
      <div id="snippets-grid" class="snippets-grid"></div>`;
  }

  function refreshList(container) {
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
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i data-lucide="code" width="40" height="40"></i><h3>No snippets found</h3><p>${q ? 'Try a different search term' : 'Nothing to show here'}</p></div>`;
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
    const preview = escHtml((s.code || '').slice(0, 500));
    const liked = Store.isLiked('snippets', s.id);
    return `
      <div class="snippet-card" data-id="${escAttr(s.id)}">
        <div class="snippet-header">
          <span class="snippet-title">${escHtml(s.title || 'Untitled')}</span>
          <span class="snippet-lang lang-${langKey}">${escHtml(s.language || 'Text')}</span>
          <button class="like-btn${liked ? ' liked' : ''}" data-action="like" aria-label="${liked ? 'Unlike' : 'Like'}">
            <i data-lucide="heart" width="14" height="14" style="${liked ? 'fill:var(--danger);color:var(--danger)' : ''}"></i>
          </button>
        </div>
        <div class="snippet-code-wrap">
          <pre class="snippet-code"><code class="language-${langKey}">${preview}</code></pre>
          <button class="copy-btn-overlay" data-action="copy" aria-label="Copy code">
            <i data-lucide="copy" width="12" height="12"></i> Copy
          </button>
        </div>
        <div class="snippet-footer">
          <div class="snippet-tags">${tags}</div>
          <span class="snippet-date">${App.formatDate(s.createdAt)}</span>
        </div>
      </div>`;
  }

  function bindCardEvents(card, container) {
    card.querySelector('[data-action="copy"]')?.addEventListener('click', e => copyCode(card, e.currentTarget));
    card.querySelector('[data-action="like"]')?.addEventListener('click', () => {
      const nowLiked = Store.toggleLike('snippets', card.dataset.id);
      App.toast(nowLiked ? 'Liked!' : 'Unliked', 'success');
      refreshList(container);
    });
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

  function bindEvents(container) {
    container.querySelector('#snippets-search')?.addEventListener('input', () => refreshList(container));
    container.querySelector('#snippets-lang-filter')?.addEventListener('change', () => refreshList(container));
    container.querySelector('#snippets-sort')?.addEventListener('change', () => refreshList(container));
    container.querySelector('#btn-export-snippets')?.addEventListener('click', () => { Store.exportJSON('snippets'); App.toast('Exported snippets as JSON', 'success'); });
  }

  function escHtml(s) { return App.escapeHtml(s); }
  function escAttr(s) { return App.escapeAttr(s); }
  function unmount() {}

  return { render, unmount };
})();
