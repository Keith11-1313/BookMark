// store.js — Data layer: read-only JSON + user CRUD via localStorage
//
// ID scheme per data type:
//   bookmarks  — curated: id = full URL string; user: id = "u_" + uuid
//   notes      — curated: sequential string; user: id = "u_" + uuid
//   snippets   — curated: sequential string; user: id = "u_" + uuid
//   prompts    — curated: sequential string; user: id = "u_" + uuid
//
// localStorage keys:
//   user_bookmarks / user_notes / user_snippets / user_prompts
//     — JSON arrays of user-created items (each has _isUser: true flag)
//   likes_bookmarks / likes_notes / likes_snippets / likes_prompts
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
    snippets:  'data/snippets.json',
    prompts:   'data/prompts.json'
  };
  const USER_KEYS = {
    bookmarks: 'user_bookmarks',
    notes:     'user_notes',
    snippets:  'user_snippets',
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

  // ── Clear user data ────────────────────────────────────────
  // scope: 'likes' | 'bm_notes' | 'user' | 'cats' | 'all'
  // After clearing, re-merges cache from JSON so Store.get() returns clean data.
  function clearUserData(scope) {
    const doLikes  = scope === 'likes'    || scope === 'all';
    const doNotes  = scope === 'bm_notes' || scope === 'all';
    const doUser   = scope === 'user'     || scope === 'all';
    const doCats   = scope === 'cats'     || scope === 'all';

    if (doLikes) {
      ['bookmarks','notes','snippets','prompts']
        .forEach(t => localStorage.removeItem('likes_' + t));
    }
    if (doNotes) {
      Object.keys(localStorage)
        .filter(k => k.startsWith('bm_note_'))
        .forEach(k => localStorage.removeItem(k));
    }
    if (doUser) {
      ['bookmarks','notes','snippets','prompts'].forEach(t => {
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
    searchAll,
    isLiked, toggleLike, getLiked,
    clearUserData
  };
})();
