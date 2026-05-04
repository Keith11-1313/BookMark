// snippets.js — Code snippet vault

const Snippets = (() => {
  const COL = Store.COLLECTIONS.snippets;
  const LANGUAGES = ['JavaScript','TypeScript','HTML','CSS','Python','JSON','Bash','SQL','Java','C#','Go','Rust','PHP','Ruby','YAML','Plain Text'];
  const LANG_MAP  = { JavaScript:'js',TypeScript:'ts',HTML:'html',CSS:'css',Python:'python',JSON:'json',Bash:'bash',SQL:'sql',Java:'java','C#':'cs',Go:'go',Rust:'rust',PHP:'php',Ruby:'ruby',YAML:'yaml','Plain Text':'plaintext' };
  let allSnippets=[], unsub=null, editingId=null, searchQuery='', filterTag='all';

  function render(container) {
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
    unsub = Store.subscribe(COL, data => { allSnippets = data; refreshList(container); });
  }

  function buildShell() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="code-2" width="24" height="24" style="color:var(--accent)"></i>
          <div><div class="page-title">Snippets</div><div class="page-subtitle">Reusable code & text blocks</div></div>
        </div>
        <div class="page-actions">
          <div class="search-bar" style="width:220px">
            <span class="search-icon"><i data-lucide="search" width="15" height="15"></i></span>
            <input class="input" id="snippets-search" type="search" placeholder="Search snippets…">
          </div>
          <select class="input" id="snippets-lang-filter" style="width:auto"><option value="all">All Languages</option>${LANGUAGES.map(l=>`<option>${l}</option>`).join('')}</select>
          <button class="btn btn-primary" id="btn-new-snippet"><i data-lucide="plus" width="16" height="16"></i> New Snippet</button>
        </div>
      </div>
      <div id="snippets-grid" class="snippets-grid"></div>

      <!-- Add/Edit Modal -->
      <div class="modal-backdrop" id="snippet-modal">
        <div class="modal" style="max-width:680px">
          <div class="modal-header">
            <span class="modal-title" id="snippet-modal-title">New Snippet</span>
            <button class="btn-ghost btn-icon btn-sm" onclick="App.closeModal('snippet-modal')"><i data-lucide="x" width="16" height="16"></i></button>
          </div>
          <div class="modal-body">
            <div style="display:grid;grid-template-columns:1fr auto;gap:var(--space-4)">
              <div class="form-field">
                <label class="form-label" for="snippet-title">Title *</label>
                <input class="input" id="snippet-title" type="text" placeholder="e.g. useDebounce hook">
              </div>
              <div class="form-field">
                <label class="form-label" for="snippet-lang">Language</label>
                <select class="input" id="snippet-lang">${LANGUAGES.map(l=>`<option>${l}</option>`).join('')}</select>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label" for="snippet-code">Code *</label>
              <textarea class="input font-mono" id="snippet-code" rows="12" placeholder="Paste your code here…" style="line-height:1.5;font-size:13px;resize:vertical"></textarea>
            </div>
            <div class="form-field">
              <label class="form-label" for="snippet-tags">Tags</label>
              <input class="input" id="snippet-tags" type="text" placeholder="react, hook, performance (comma separated)">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="App.closeModal('snippet-modal')">Cancel</button>
            <button class="btn btn-primary" id="snippet-modal-save"><i data-lucide="save" width="14" height="14"></i> Save</button>
          </div>
        </div>
      </div>`;
  }

  function refreshList(container) {
    let data = [...allSnippets];
    const q   = (container.querySelector('#snippets-search')?.value||'').toLowerCase();
    const lang= container.querySelector('#snippets-lang-filter')?.value||'all';
    if (q)       data = data.filter(s => (s.title||'').toLowerCase().includes(q)||(s.code||'').toLowerCase().includes(q)||(s.language||'').toLowerCase().includes(q)||(s.tags||[]).some(t=>t.toLowerCase().includes(q)));
    if (lang!=='all') data = data.filter(s=>s.language===lang);
    data.sort((a,b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred)  return 1;
      return (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0);
    });
    const grid = container.querySelector('#snippets-grid'); if (!grid) return;
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i data-lucide="code" width="40" height="40"></i><h3>No snippets yet</h3><p>Save your first reusable code block</p><button class="btn btn-primary" id="empty-new-snippet"><i data-lucide="plus" width="15" height="15"></i> New Snippet</button></div>`;
      grid.querySelector('#empty-new-snippet')?.addEventListener('click', ()=>openAddModal(container));
      lucide.createIcons({el:grid}); return;
    }
    grid.innerHTML = data.map(s => renderCard(s)).join('');
    grid.querySelectorAll('.snippet-card').forEach(card => bindCardEvents(card, container));
    // Apply syntax highlighting
    grid.querySelectorAll('pre code').forEach(block => {
      if (window.hljs) hljs.highlightElement(block);
    });
    lucide.createIcons({el:grid});
  }

  function renderCard(s) {
    const langKey = LANG_MAP[s.language]||'plaintext';
    const tags = (s.tags||[]).map(t=>`<span class="snippet-tag">${escHtml(t)}</span>`).join('');
    const preview = escHtml((s.code||'').slice(0,500));
    return `
      <div class="snippet-card${s.starred?' starred':''}" data-id="${s.id}">
        <div class="snippet-header">
          <span class="snippet-title">${escHtml(s.title||'Untitled')}</span>
          <span class="snippet-lang lang-${langKey}">${escHtml(s.language||'Text')}</span>
          <div class="snippet-actions">
            <button class="btn-ghost btn-icon btn-sm" data-action="edit" aria-label="Edit snippet" data-tooltip="Edit"><i data-lucide="pencil" width="13" height="13"></i></button>
            <button class="btn-ghost btn-icon btn-sm" data-action="delete" aria-label="Delete snippet" data-tooltip="Delete"><i data-lucide="trash-2" width="13" height="13"></i></button>
          </div>
          <button class="snippet-star${s.starred?' active':''}" data-action="star" aria-label="${s.starred?'Unstar':'Star'}" data-tooltip="${s.starred?'Unstar':'Star'}">
            <i data-lucide="${s.starred?'star':'star'}" width="15" height="15" ${s.starred?'style="fill:var(--warning)"':''}></i>
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
    const id = card.dataset.id;
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteSnippet(id));
    card.querySelector('[data-action="edit"]')?.addEventListener('click', () => openEditModal(id, container));
    card.querySelector('[data-action="copy"]')?.addEventListener('click', e => copyCode(card, e.currentTarget));
    card.querySelector('[data-action="star"]')?.addEventListener('click', async () => {
      const s = allSnippets.find(x=>x.id===id);
      await Store.update(COL, id, { starred: !s?.starred });
      App.toast(s?.starred?'Unstarred':'Starred!','success');
    });
  }

  function copyCode(card, btn) {
    const code = card.querySelector('code')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      btn.classList.add('copied');
      btn.innerHTML = '<i data-lucide="check" width="12" height="12"></i> Copied!';
      lucide.createIcons({el:btn});
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i data-lucide="copy" width="12" height="12"></i> Copy'; lucide.createIcons({el:btn}); }, 2000);
    }).catch(() => App.toast('Copy failed','error'));
  }

  function openAddModal(container) {
    editingId = null;
    container.querySelector('#snippet-modal-title').textContent = 'New Snippet';
    container.querySelector('#snippet-title').value = '';
    container.querySelector('#snippet-lang').value  = 'JavaScript';
    container.querySelector('#snippet-code').value  = '';
    container.querySelector('#snippet-tags').value  = '';
    App.openModal('snippet-modal');
  }

  function openEditModal(id, container) {
    const s = allSnippets.find(x=>x.id===id); if (!s) return;
    editingId = id;
    container.querySelector('#snippet-modal-title').textContent = 'Edit Snippet';
    container.querySelector('#snippet-title').value = s.title||'';
    container.querySelector('#snippet-lang').value  = s.language||'JavaScript';
    container.querySelector('#snippet-code').value  = s.code||'';
    container.querySelector('#snippet-tags').value  = (s.tags||[]).join(', ');
    App.openModal('snippet-modal');
  }

  async function saveSnippet(container) {
    const title = container.querySelector('#snippet-title').value.trim();
    const lang  = container.querySelector('#snippet-lang').value;
    const code  = container.querySelector('#snippet-code').value;
    const tags  = container.querySelector('#snippet-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
    if (!title) { App.toast('Title is required','error'); return; }
    if (!code.trim()) { App.toast('Code cannot be empty','error'); return; }
    const payload = { title, language:lang, code, tags };
    if (editingId) { await Store.update(COL, editingId, payload); App.toast('Snippet updated!','success'); }
    else { await Store.add(COL, { ...payload, starred:false }); App.toast('Snippet saved!','success'); }
    App.closeModal('snippet-modal');
  }

  async function deleteSnippet(id) {
    if (!confirm('Delete this snippet?')) return;
    await Store.remove(COL, id);
    App.toast('Deleted','info');
  }

  function bindEvents(container) {
    container.querySelector('#btn-new-snippet')?.addEventListener('click', () => openAddModal(container));
    container.querySelector('#snippet-modal-save')?.addEventListener('click', () => saveSnippet(container));
    container.querySelector('#snippets-search')?.addEventListener('input', () => refreshList(container));
    container.querySelector('#snippets-lang-filter')?.addEventListener('change', () => refreshList(container));
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function unmount() { unsub?.(); }

  return { render, unmount };
})();
