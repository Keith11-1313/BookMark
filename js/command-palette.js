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
      container.innerHTML = `<div class="palette-empty">${Icons.svg('search', 24)}<p>Search bookmarks, notes, prompts, slides…</p></div>`;
      return;
    }

    const results = Store.searchAll(query.trim());
    if (!results.length) {
      const sugg = Store.suggestSpelling(query);
      const did = sugg.length ? `<div class="did-mean">Did you mean ${sugg.map(s => `<button type="button" class="did-mean-btn" data-suggest="${App.escapeAttr(s)}">${App.escapeHtml(s)}</button>`).join('')}?</div>` : '';
      const type = SmartAdd.classify(query);
      const smart = type ? `<button type="button" class="palette-add" data-smart-add="${type}">${Icons.svg(type === 'bookmark' ? 'bookmark' : type === 'prompt' ? 'sparkles' : 'notebook', 14)} ${SmartAdd.label(type)}: "${App.escapeHtml(query.trim())}"</button>` : '';
      container.innerHTML = `<div class="palette-empty">${Icons.svg('searchX', 24)}<p>No results for "${App.escapeHtml(query)}"</p>${did}${smart}</div>`;
      container.querySelectorAll('.did-mean-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = document.getElementById('palette-input');
          input.value = btn.dataset.suggest;
          renderResults(input.value);
        });
      });
      container.querySelector('[data-smart-add]')?.addEventListener('click', () => {
        close();
        SmartAdd.routeTo(type, query.trim());
      });
      return;
    }

    const routes = { link: 'links', note: 'notes', slides: 'slides', prompt: 'prompts' };

    container.innerHTML = results.slice(0, 20).map((r, i) => {
      const item = r.item;
      const isLink = r.type === 'link';
      const url = isLink ? App.safeUrl(item.url, '') : '';
      const favicon = isLink && item.favicon ? App.safeImageUrl(item.favicon, '') : '';
      const iconHtml = favicon
        ? `<img src="${App.escapeAttr(favicon)}" width="16" height="16" style="border-radius:2px" onerror="this.style.display='none'">`
        : Icons.type(r.type, 16);
      return `
        <button class="palette-item${i === focusedIndex ? ' focused' : ''}" data-route="${routes[r.type]}" data-type="${r.type}" data-url="${App.escapeAttr(url)}" data-id="${App.escapeAttr(item.id)}" data-i="${i}">
          <div class="palette-item-icon">${iconHtml}</div>
          <div class="palette-item-body">
            <div class="palette-item-title">${App.escapeHtml(item.title || 'Untitled')}</div>
            <div class="palette-item-sub">${App.escapeHtml(item.category || item.language || r.type)}</div>
          </div>
          <span class="palette-item-type">${r.type}</span>
        </button>`;
    }).join('');

    container.querySelectorAll('.palette-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.type === 'link' && btn.dataset.id) {
          App.navigate('links');
          setTimeout(() => Links.reveal?.(btn.dataset.id), 120);
        } else {
          App.navigate(btn.dataset.route);
        }
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
