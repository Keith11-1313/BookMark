// store.js — Firestore + localStorage dual-write layer

const Store = (() => {
  const COLLECTIONS = { links: 'bookmarks', notes: 'notes', snippets: 'snippets', dirs: 'directories', settings: 'settings' };
  const LS_PREFIX   = 'bookmark_';
  const listeners   = {};
  let unsubscribes  = {};

  // ── Helpers ─────────────────────────────────────────────
  function uid()       { return Auth.getUid(); }
  function ref(col)    { return db.collection('users').doc(uid()).collection(col); }
  function lsKey(col)  { return LS_PREFIX + col; }

  function lsGet(col) {
    try { return JSON.parse(localStorage.getItem(lsKey(col))) || []; }
    catch { return []; }
  }
  function lsSet(col, data) {
    try { localStorage.setItem(lsKey(col), JSON.stringify(data)); } catch {}
  }

  function emit(col, data) {
    (listeners[col] || []).forEach(fn => fn(data));
  }

  // ── Real-time listener ───────────────────────────────────
  function subscribe(col, callback) {
    if (!listeners[col]) listeners[col] = [];
    listeners[col].push(callback);

    // immediate cache hit
    const cached = lsGet(col);
    if (cached.length) callback(cached);

    // Firestore live listener
    if (!unsubscribes[col]) {
      const unsub = ref(col).orderBy('createdAt', 'desc')
        .onSnapshot(snap => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          lsSet(col, data);
          emit(col, data);
        }, err => console.error('Snapshot error:', col, err));
      unsubscribes[col] = unsub;
    }

    return () => {
      listeners[col] = (listeners[col] || []).filter(fn => fn !== callback);
    };
  }

  function stopListeners() {
    Object.values(unsubscribes).forEach(fn => fn && fn());
    unsubscribes = {};
    Object.keys(listeners).forEach(k => { listeners[k] = []; });
  }

  // ── CRUD ─────────────────────────────────────────────────
  async function add(col, data) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = ref(col).doc();
    const item = { ...data, id: doc.id, createdAt: now, updatedAt: now };
    await doc.set(item);
    return doc.id;
  }

  async function update(col, id, changes) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    await ref(col).doc(id).update({ ...changes, updatedAt: now });
  }

  async function remove(col, id) {
    await ref(col).doc(id).delete();
  }

  async function getAll(col) {
    const snap = await ref(col).orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function getOne(col, id) {
    const doc = await ref(col).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  // ── Settings (single doc) ────────────────────────────────
  function settingsRef() {
    return db.collection('users').doc(uid()).collection('settings').doc('prefs');
  }

  async function getSettings() {
    try {
      const doc = await settingsRef().get();
      return doc.exists ? doc.data() : {};
    } catch { return {}; }
  }

  async function saveSettings(data) {
    await settingsRef().set(data, { merge: true });
  }

  // ── Duplicate check ──────────────────────────────────────
  function checkDuplicate(url) {
    const cached = lsGet(COLLECTIONS.links);
    return cached.find(b => b.url && b.url.trim() === url.trim()) || null;
  }

  // ── Search ───────────────────────────────────────────────
  function searchAll(query) {
    const q = query.toLowerCase();
    const results = [];

    const links = lsGet(COLLECTIONS.links);
    links.filter(b =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.url   || '').toLowerCase().includes(q) ||
      (b.notes || '').toLowerCase().includes(q) ||
      (b.tags  || []).some(t => t.toLowerCase().includes(q))
    ).forEach(b => results.push({ type: 'link', item: b }));

    const notes = lsGet(COLLECTIONS.notes);
    notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.body  || '').toLowerCase().includes(q)
    ).forEach(n => results.push({ type: 'note', item: n }));

    const snippets = lsGet(COLLECTIONS.snippets);
    snippets.filter(s =>
      (s.title    || '').toLowerCase().includes(q) ||
      (s.code     || '').toLowerCase().includes(q) ||
      (s.language || '').toLowerCase().includes(q) ||
      (s.tags     || []).some(t => t.toLowerCase().includes(q))
    ).forEach(s => results.push({ type: 'snippet', item: s }));

    return results;
  }

  // ── Import / Export ──────────────────────────────────────
  async function exportAll() {
    const [links, notes, snippets, settings] = await Promise.all([
      getAll(COLLECTIONS.links),
      getAll(COLLECTIONS.notes),
      getAll(COLLECTIONS.snippets),
      getSettings()
    ]);
    const payload = { exportedAt: new Date().toISOString(), version: 1, links, notes, snippets, settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'bookmark-export.json' });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const batch = db.batch();
    const now   = firebase.firestore.FieldValue.serverTimestamp();

    (data.links    || []).forEach(item => { const d = ref(COLLECTIONS.links).doc();    batch.set(d, { ...item, createdAt: now, updatedAt: now }); });
    (data.notes    || []).forEach(item => { const d = ref(COLLECTIONS.notes).doc();    batch.set(d, { ...item, createdAt: now, updatedAt: now }); });
    (data.snippets || []).forEach(item => { const d = ref(COLLECTIONS.snippets).doc(); batch.set(d, { ...item, createdAt: now, updatedAt: now }); });

    await batch.commit();
    return { links: (data.links || []).length, notes: (data.notes || []).length, snippets: (data.snippets || []).length };
  }

  // ── Parse Chrome/Firefox HTML bookmark export ────────────
  function parseBrowserBookmarks(html) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');
    const result = [];

    function walk(node, category) {
      node.querySelectorAll(':scope > dt').forEach(dt => {
        const a = dt.querySelector(':scope > a');
        const h = dt.querySelector(':scope > h3');
        const dl = dt.querySelector(':scope > dl');

        if (a) {
          result.push({
            url:      a.href,
            title:    a.textContent.trim() || a.href,
            category: category || 'Other',
            tags:     [],
            favicon:  `https://www.google.com/s2/favicons?domain=${new URL(a.href).hostname}&sz=32`,
            pinned:   false,
            notes:    ''
          });
        }

        if (dl) walk(dl, h ? h.textContent.trim() : category);
      });
    }

    const root = doc.querySelector('dl');
    if (root) walk(root, 'Other');
    return result;
  }

  function clear() { stopListeners(); }

  return {
    COLLECTIONS,
    subscribe, stopListeners,
    add, update, remove, getAll, getOne,
    getSettings, saveSettings,
    checkDuplicate, searchAll,
    exportAll, importJSON, parseBrowserBookmarks,
    lsGet, lsSet,
    clear
  };
})();
