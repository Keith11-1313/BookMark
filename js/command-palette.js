// command-palette.js — Ctrl+K global search

const CommandPalette = (() => {
  let isOpen_ = false;
  let focusedIndex = -1;

  function init() {
    const backdrop = document.getElementById('command-palette-backdrop');
    const input = document.getElementById('palette-input');

    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    input.addEventListener('input', () => renderResults(input.value));
    input.addEventListener('keydown', handleKeydown);
  }

  function open() {
    const backdrop = document.getElementById('command-palette-backdrop');
    const input = document.getElementById('palette-input');
    backdrop.classList.add('open');
    isOpen_ = true;
    input.value = '';
    focusedIndex = -1;
    renderResults('');
    setTimeout(() => input.focus(), 50);
  }

  function close() {
    const backdrop = document.getElementById('command-palette-backdrop');
    backdrop.classList.remove('open');
    isOpen_ = false;
  }

  function isOpen() { return isOpen_; }

  function renderResults(query) {
    const container = document.getElementById('palette-results');
    if (!query.trim()) {
      container.innerHTML = `<div class="palette-empty"><i data-lucide="search" width="24" height="24" style="opacity:.4"></i><p>Search bookmarks, notes, snippets, prompts…</p></div>`;
      lucide.createIcons({ el: container });
      return;
    }

    const results = Store.searchAll(query.trim());
    if (!results.length) {
      container.innerHTML = `<div class="palette-empty"><i data-lucide="search-x" width="24" height="24" style="opacity:.4"></i><p>No results for "${App.escapeHtml(query)}"</p></div>`;
      lucide.createIcons({ el: container });
      return;
    }

    const icons = { link: 'bookmark', note: 'notebook-pen', snippet: 'code-2', prompt: 'sparkles' };
    const routes = { link: 'links', note: 'notes', snippet: 'snippets', prompt: 'prompts' };

    container.innerHTML = results.slice(0, 20).map((r, i) => {
      const item = r.item;
      const isLink = r.type === 'link';
      const url = isLink ? App.safeUrl(item.url, '') : '';
      const favicon = isLink && item.favicon ? App.safeImageUrl(item.favicon, '') : '';
      const iconHtml = favicon
        ? `<img src="${App.escapeAttr(favicon)}" width="16" height="16" style="border-radius:2px" onerror="this.outerHTML='<i data-lucide=\\'bookmark\\' width=\\'16\\' height=\\'16\\'></i>'">`
        : `<i data-lucide="${icons[r.type]}" width="16" height="16"></i>`;
      return `
        <button class="palette-item${i === focusedIndex ? ' focused' : ''}" data-route="${routes[r.type]}" data-url="${App.escapeAttr(url)}" data-i="${i}">
          <div class="palette-item-icon">${iconHtml}</div>
          <div class="palette-item-body">
            <div class="palette-item-title">${App.escapeHtml(item.title || 'Untitled')}</div>
            <div class="palette-item-sub">${App.escapeHtml(item.category || item.language || r.type)}</div>
          </div>
          <span class="palette-item-type">${r.type}</span>
        </button>`;
    }).join('');

    lucide.createIcons({ el: container });

    container.querySelectorAll('.palette-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.url) window.open(btn.dataset.url, '_blank');
        else App.navigate(btn.dataset.route);
        close();
      });
    });
  }

  function handleKeydown(e) {
    const items = document.querySelectorAll('.palette-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('focused', i === focusedIndex));
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('focused', i === focusedIndex));
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && items[focusedIndex]) items[focusedIndex].click();
    }
  }

  return { init, open, close, isOpen };
})();
