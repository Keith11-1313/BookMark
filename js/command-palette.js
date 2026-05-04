// command-palette.js — Universal search overlay (Ctrl+K)

const CommandPalette = (() => {
  let isOpen    = false;
  let focusIdx  = -1;
  let debounce  = null;
  let recentSearches = [];

  function init() {
    const backdrop = document.getElementById('command-palette-backdrop');
    const input    = document.getElementById('palette-input');
    if (!backdrop || !input) return;

    recentSearches = JSON.parse(localStorage.getItem('bookmark_recent_searches') || '[]');

    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => search(input.value.trim()), 200);
    });

    input.addEventListener('keydown', handleKeyNav);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

    showRecent();
  }

  function open() {
    const backdrop = document.getElementById('command-palette-backdrop');
    const input    = document.getElementById('palette-input');
    if (!backdrop || !input) return;

    backdrop.classList.add('open');
    isOpen = true;
    focusIdx = -1;
    input.value = '';
    input.focus();
    showRecent();
  }

  function close() {
    const backdrop = document.getElementById('command-palette-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('open');
    isOpen = false;
    focusIdx = -1;
  }

  function search(query) {
    const results = document.getElementById('palette-results');
    if (!query) { showRecent(); return; }

    const matches = Store.searchAll(query);
    focusIdx = -1;

    if (!matches.length) {
      results.innerHTML = `<div class="palette-empty"><i data-lucide="search-x" width="32" height="32"></i><span>No results for "${escHtml(query)}"</span></div>`;
      lucide.createIcons({ el: results });
      return;
    }

    const grouped = { link: [], note: [], snippet: [] };
    matches.forEach(m => (grouped[m.type] || []).push(m));

    const groupConfig = {
      link:    { label: 'Bookmarks', icon: 'bookmark',     route: 'links' },
      note:    { label: 'Notes',     icon: 'notebook-pen', route: 'notes' },
      snippet: { label: 'Snippets',  icon: 'code-2',       route: 'snippets' }
    };

    let html = '';
    ['link', 'note', 'snippet'].forEach(type => {
      if (!grouped[type].length) return;
      const cfg = groupConfig[type];
      html += `<div class="palette-group-label">${cfg.label}</div>`;
      grouped[type].slice(0, 5).forEach(({ item }) => {
        const favicon = type === 'link' && item.favicon
          ? `<img src="${item.favicon}" alt="" onerror="this.style.display='none'">`
          : `<i data-lucide="${cfg.icon}" width="16" height="16"></i>`;
        const sub = type === 'link'    ? item.url
                  : type === 'note'    ? (item.body || '').replace(/<[^>]+>/g, '').slice(0, 80)
                  : item.language;
        html += `
          <button class="palette-item" data-type="${type}" data-id="${item.id}" data-route="${cfg.route}" data-url="${type === 'link' ? item.url : ''}">
            <div class="palette-item-icon">${favicon}</div>
            <div class="palette-item-body">
              <div class="palette-item-title">${highlight(item.title || item.url || 'Untitled', query)}</div>
              ${sub ? `<div class="palette-item-sub">${escHtml(sub.slice(0, 80))}</div>` : ''}
            </div>
            <span class="palette-item-type">${cfg.label.slice(0,-1)}</span>
          </button>`;
      });
    });

    results.innerHTML = html;
    lucide.createIcons({ el: results });

    results.querySelectorAll('.palette-item').forEach(btn => {
      btn.addEventListener('click', () => selectItem(btn, query));
    });
  }

  function selectItem(btn, query) {
    const type  = btn.dataset.type;
    const route = btn.dataset.route;
    const url   = btn.dataset.url;

    if (query) {
      recentSearches = [query, ...recentSearches.filter(r => r !== query)].slice(0, 6);
      localStorage.setItem('bookmark_recent_searches', JSON.stringify(recentSearches));
    }

    if (type === 'link' && url) {
      window.open(url, '_blank', 'noopener');
    } else {
      App.navigate(route);
    }
    close();
  }

  function showRecent() {
    const results = document.getElementById('palette-results');
    if (!results) return;

    if (!recentSearches.length) {
      results.innerHTML = `<div class="palette-empty"><i data-lucide="search" width="28" height="28" style="opacity:.4"></i><span>Search bookmarks, notes, snippets…</span></div>`;
      lucide.createIcons({ el: results });
      return;
    }

    results.innerHTML = `
      <div class="palette-recent-label">Recent Searches</div>
      ${recentSearches.map(q => `
        <button class="palette-item" data-recent="${q}">
          <div class="palette-item-icon"><i data-lucide="history" width="16" height="16"></i></div>
          <div class="palette-item-body"><div class="palette-item-title">${escHtml(q)}</div></div>
        </button>`).join('')}
    `;
    lucide.createIcons({ el: results });

    results.querySelectorAll('.palette-item[data-recent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('palette-input');
        input.value = btn.dataset.recent;
        search(btn.dataset.recent);
      });
    });
  }

  function handleKeyNav(e) {
    const items = document.querySelectorAll('#palette-results .palette-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusIdx = Math.min(focusIdx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusIdx = Math.max(focusIdx - 1, -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0) items[focusIdx]?.click();
      return;
    } else { return; }

    items.forEach((el, i) => el.classList.toggle('focused', i === focusIdx));
    if (focusIdx >= 0) items[focusIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function highlight(text, query) {
    if (!query) return escHtml(text);
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escHtml(text);
    return escHtml(text.slice(0, idx)) + '<mark>' + escHtml(text.slice(idx, idx + query.length)) + '</mark>' + escHtml(text.slice(idx + query.length));
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, open, close };
})();
