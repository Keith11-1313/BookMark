// store.js — Read-only data layer + per-visitor likes (localStorage)

const Store = (() => {
  const cache = {};
  const PATHS = {
    bookmarks: 'data/bookmarks.json',
    notes:     'data/notes.json',
    snippets:  'data/snippets.json',
    prompts:   'data/prompts.json'
  };

  async function load(key) {
    if (cache[key]) return cache[key];
    try {
      const res = await fetch(PATHS[key]);
      if (!res.ok) throw new Error(res.status);
      cache[key] = await res.json();
    } catch {
      cache[key] = [];
    }
    return cache[key];
  }

  async function loadAll() {
    await Promise.all(Object.keys(PATHS).map(load));
    return cache;
  }

  function get(key) { return cache[key] || []; }

  function searchAll(query) {
    const q = query.toLowerCase();
    const results = [];

    (cache.bookmarks || []).filter(b =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.url   || '').toLowerCase().includes(q) ||
      (b.notes || '').toLowerCase().includes(q) ||
      (b.tags  || []).some(t => t.toLowerCase().includes(q))
    ).forEach(b => results.push({ type: 'link', item: b }));

    (cache.notes || []).filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.body  || '').toLowerCase().includes(q)
    ).forEach(n => results.push({ type: 'note', item: n }));

    (cache.snippets || []).filter(s =>
      (s.title    || '').toLowerCase().includes(q) ||
      (s.code     || '').toLowerCase().includes(q) ||
      (s.language || '').toLowerCase().includes(q) ||
      (s.tags     || []).some(t => t.toLowerCase().includes(q))
    ).forEach(s => results.push({ type: 'snippet', item: s }));

    (cache.prompts || []).filter(p =>
      (p.title    || '').toLowerCase().includes(q) ||
      (p.body     || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.tags     || []).some(t => t.toLowerCase().includes(q))
    ).forEach(p => results.push({ type: 'prompt', item: p }));

    return results;
  }

  // ── Export ───────────────────────────────────────────────
  function toCSV(items, columns) {
    const header = columns.map(c => c.label).join(',');
    const rows = items.map(item =>
      columns.map(c => {
        let val = typeof c.get === 'function' ? c.get(item) : (item[c.key] ?? '');
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    return header + '\n' + rows.join('\n');
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
  }

  function exportJSON(key) {
    downloadFile(JSON.stringify(get(key), null, 2), `bookmark-${key}.json`, 'application/json');
  }

  const CSV_COLUMNS = {
    bookmarks: [
      { label: 'Title', key: 'title' }, { label: 'URL', key: 'url' },
      { label: 'Category', key: 'category' }, { label: 'Tags', get: i => (i.tags || []).join('; ') },
      { label: 'Notes', key: 'notes' }
    ],
    notes: [
      { label: 'Title', key: 'title' }, { label: 'Body', get: i => (i.body || '').replace(/<[^>]+>/g, '') }
    ],
    snippets: [
      { label: 'Title', key: 'title' }, { label: 'Language', key: 'language' },
      { label: 'Code', key: 'code' }, { label: 'Tags', get: i => (i.tags || []).join('; ') }
    ],
    prompts: [
      { label: 'Title', key: 'title' }, { label: 'Category', key: 'category' },
      { label: 'Body', key: 'body' }, { label: 'Tags', get: i => (i.tags || []).join('; ') }
    ]
  };

  function exportCSV(key) {
    if (!CSV_COLUMNS[key]) return;
    downloadFile(toCSV(get(key), CSV_COLUMNS[key]), `bookmark-${key}.csv`, 'text/csv');
  }

  // ── Likes (localStorage, per-type) ──────────────────────
  function getLikes(type) {
    try { return JSON.parse(localStorage.getItem('likes_' + type)) || []; }
    catch { return []; }
  }

  function isLiked(type, id) { return getLikes(type).includes(id); }

  function toggleLike(type, id) {
    const likes = getLikes(type);
    const idx = likes.indexOf(id);
    if (idx >= 0) likes.splice(idx, 1); else likes.push(id);
    localStorage.setItem('likes_' + type, JSON.stringify(likes));
    return idx < 0;
  }

  function getLiked(type) {
    const likes = getLikes(type);
    return (cache[type] || []).filter(item => likes.includes(item.id));
  }

  return { load, loadAll, get, searchAll, exportJSON, exportCSV, isLiked, toggleLike, getLiked };
})();
