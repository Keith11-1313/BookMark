// store.js — Data layer: read-only JSON + user CRUD via localStorage
//
// ID scheme per data type:
//   bookmarks  — curated: id = full URL string; user: id = "u_" + uuid
//   notes      — curated: sequential string; user: id = "u_" + uuid
//   slides     — curated: id = folder name under assets/slides/; user: id = "u_" + uuid
//   prompts    — curated: sequential string; user: id = "u_" + uuid
//
// localStorage keys:
//   user_bookmarks / user_notes / user_slides / user_prompts
//     — JSON arrays of user-created items (each has _isUser: true flag)
//   likes_bookmarks / likes_notes / likes_slides / likes_prompts
//     — arrays of liked item IDs
//   bm_note_<id>
//     — per-bookmark inline note overrides (managed by links.js)
//
// githubMeta: only present on bookmark entries that have real GitHub data.
// updatedAt on notes: used for sort + display; fallback to createdAt if absent.

const Store = (() => {
  const cache = {};       // merged (JSON + user) arrays per type
  const jsonCache = {};   // JSON-only, never mutated
  const PATHS = {
    bookmarks: 'data/bookmarks.json',
    notes:     'data/notes.json',
    slides:    'data/slides.json',
    prompts:   'data/prompts.json'
  };
  const USER_KEYS = {
    bookmarks: 'user_bookmarks',
    notes:     'user_notes',
    slides:    'user_slides',
    prompts:   'user_prompts'
  };

  // ── UUID helper ────────────────────────────────────────────
  function uuid() {
    // crypto.randomUUID available in all modern browsers
    if (crypto.randomUUID) return 'u_' + crypto.randomUUID();
    return 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // ── localStorage helpers ───────────────────────────────────
  function readUserItems(type) {
    try { return JSON.parse(localStorage.getItem(USER_KEYS[type])) || []; }
    catch { return []; }
  }

  function writeUserItems(type, items) {
    localStorage.setItem(USER_KEYS[type], JSON.stringify(items));
  }

  function mergeIntoCache(type) {
    cache[type] = [...(jsonCache[type] || []), ...readUserItems(type)];
  }

  // ── Load ───────────────────────────────────────────────────
  async function load(key) {
    if (jsonCache[key]) { mergeIntoCache(key); return cache[key]; }
    try {
      const res = await fetch(PATHS[key]);
      if (!res.ok) throw new Error(res.status);
      jsonCache[key] = await res.json();
    } catch {
      jsonCache[key] = [];
    }
    mergeIntoCache(key);
    return cache[key];
  }

  async function loadAll() {
    await Promise.all(Object.keys(PATHS).map(load));
    return cache;
  }

  // get() returns merged JSON + user items
  function get(key) { return cache[key] || []; }

  // getUserItems() returns only user-created items
  function getUserItems(type) { return readUserItems(type); }

  // ── User CRUD ──────────────────────────────────────────────

  // addUser — creates a new item, stamps it with _isUser:true, returns the new item
  function addUser(type, data) {
    const now = new Date().toISOString();
    const item = {
      ...data,
      id: uuid(),
      _isUser: true,
      createdAt: now,
      updatedAt: now
    };
    const items = readUserItems(type);
    items.unshift(item); // newest first
    writeUserItems(type, items);
    mergeIntoCache(type);
    return item;
  }

  // updateUser — merges changes into an existing user item by id
  function updateUser(type, id, changes) {
    const items = readUserItems(type);
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return null;
    items[idx] = { ...items[idx], ...changes, id, _isUser: true, updatedAt: new Date().toISOString() };
    writeUserItems(type, items);
    mergeIntoCache(type);
    return items[idx];
  }

  // removeUser — removes a user item by id, returns true if found
  function removeUser(type, id) {
    const items = readUserItems(type);
    const filtered = items.filter(i => i.id !== id);
    if (filtered.length === items.length) return false;
    writeUserItems(type, filtered);
    mergeIntoCache(type);
    return true;
  }

  // ── Search ─────────────────────────────────────────────────
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

    (cache.slides || []).filter(d =>
      (d.title    || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q) ||
      (d.tags     || []).some(t => t.toLowerCase().includes(q))
    ).forEach(d => results.push({ type: 'slides', item: d }));

    (cache.prompts || []).filter(p =>
      (p.title    || '').toLowerCase().includes(q) ||
      (p.body     || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.tags     || []).some(t => t.toLowerCase().includes(q))
    ).forEach(p => results.push({ type: 'prompt', item: p }));

    return results;
  }

  // ── Spelling suggestions ("Did you mean") ─────────────────
  // opts.scope: array of types to pull candidate terms from, e.g. ['bookmarks','notes','prompts']
  function levDist(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1), curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }

  function suggestSpelling(query, opts = {}) {
    const q = (query || '').toLowerCase().trim();
    if (q.length < 3) return [];
    const types = opts.scope && opts.scope.length ? opts.scope : ['bookmarks', 'notes', 'slides', 'prompts'];
    const pool = new Set();
    types.forEach(t => {
      (cache[t] || []).forEach(item => {
        if (item.title) pool.add(item.title.toLowerCase());
        (item.tags || []).forEach(tag => pool.add(tag.toLowerCase()));
        if (item.category) pool.add(item.category.toLowerCase());
      });
    });
    const maxDist = Math.min(2, Math.max(1, Math.floor(q.length / 4)));
    const scored = [];
    pool.forEach(c => {
      if (c === q) return;
      if (c[0] !== q[0]) return;
      const d = levDist(q, c);
      if (d <= maxDist && Math.abs(c.length - q.length) <= maxDist) scored.push({ c, d });
    });
    scored.sort((x, y) => x.d - y.d || x.c.length - y.c.length);
    return scored.slice(0, 2).map(s => s.c);
  }

  // ── Related suggestions ("You might like") ────────────────
  // Returns existing item titles sharing meaningful words with the query.
  // Matching is token-based with 1-char typo tolerance; empty when unrelated.
  // opts.scope: array of store types.
  const STOPWORDS = new Set(['the','and','for','with','from','that','this','you','are','how','what','your','into','about','more','have','will','can','using','use','but','not','all']);

  function tokenMatches(token, word) {
    if (word === token) return true;
    if (word.includes(token) || token.includes(word)) return true;
    return levDist(token, word) <= 1;
  }

  function suggestRelated(query, opts = {}) {
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) return [];
    const types = opts.scope && opts.scope.length ? opts.scope : ['bookmarks', 'notes', 'slides', 'prompts'];
    const tokens = q.split(/[^a-z0-9]+/i).filter(t => t.length >= 3 && !STOPWORDS.has(t));
    if (!tokens.length) return [];
    const scored = [];
    types.forEach(t => {
      (cache[t] || []).forEach(item => {
        const title = (item.title || '').toLowerCase();
        if (!title) return;
        const hay = (title + ' ' + (item.tags || []).join(' ') + ' ' + (item.category || '')).toLowerCase();
        const words = hay.split(/[^a-z0-9]+/i).filter(Boolean);
        let score = 0;
        tokens.forEach(tok => {
          if (words.some(w => tokenMatches(tok, w))) score += 1;
        });
        if (score > 0) scored.push({ title: item.title, score });
      });
    });
    scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    return scored.slice(0, 4).map(s => s.title);
  }

  // ── Explore suggestions ("Would you like") ────────────────
  // Randomized sample of words already in the app (tags, categories, titles)
  // so every no-result search still offers fresh discovery options.
  function suggestExplore(query, opts = {}) {
    const q = (query || '').toLowerCase().trim();
    const types = opts.scope && opts.scope.length ? opts.scope : ['bookmarks', 'notes', 'slides', 'prompts'];
    const exclude = new Set(q.split(/[^a-z0-9]+/i).filter(Boolean));
    const pool = new Set();
    types.forEach(t => {
      (cache[t] || []).forEach(item => {
        (item.tags || []).forEach(tag => {
          const k = tag.toLowerCase();
          if (k.length >= 2 && !exclude.has(k)) pool.add(k);
        });
        if (item.category) {
          const k = item.category.toLowerCase();
          if (k.length >= 2 && !exclude.has(k)) pool.add(k);
        }
        String(item.title || '').split(/[^a-z0-9]+/i).forEach(w => {
          const k = w.toLowerCase();
          if (k.length >= 3 && !STOPWORDS.has(k) && !exclude.has(k)) pool.add(k);
        });
      });
    });
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 4);
  }

  // ── Clear user data ────────────────────────────────────────
  // scope: 'likes' | 'bm_notes' | 'user' | 'cats' | 'all'
  // After clearing, re-merges cache from JSON so Store.get() returns clean data.
  function clearUserData(scope) {
    const doLikes  = scope === 'likes'    || scope === 'all';
    const doNotes  = scope === 'bm_notes' || scope === 'all';
    const doUser   = scope === 'user'     || scope === 'all';
    const doCats   = scope === 'cats'     || scope === 'all';

    if (doLikes) {
      ['bookmarks','notes','slides','prompts']
        .forEach(t => localStorage.removeItem('likes_' + t));
    }
    if (doNotes) {
      Object.keys(localStorage)
        .filter(k => k.startsWith('bm_note_'))
        .forEach(k => localStorage.removeItem(k));
    }
    if (doUser) {
      ['bookmarks','notes','slides','prompts'].forEach(t => {
        localStorage.removeItem('user_' + t);
        mergeIntoCache(t);
      });
    }
    if (doCats) {
      localStorage.removeItem('user_custom_cats');
    }
  }

  // ── Likes (localStorage, per-type) ─────────────────────────
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

  return {
    load, loadAll, get, getUserItems,
    addUser, updateUser, removeUser,
    searchAll, suggestSpelling, suggestRelated, suggestExplore,
    isLiked, toggleLike, getLiked,
    clearUserData
  };
})();
