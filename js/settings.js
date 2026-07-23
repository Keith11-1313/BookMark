// settings.js — Settings page
//
// Provides two sections:
//   1. Data Management — granular clears for likes, inline notes,
//      user-added items, and custom categories. Each uses a custom
//      confirm modal (no window.confirm / window.alert).
//
//   2. Danger Zone — "Restore to Default" wipes all app localStorage
//      data. Requires the user to type the phrase "delete my saves"
//      before the confirm button enables. Triggers a page reload after.
//
// All localStorage keys managed here:
//   likes_bookmarks / likes_notes / likes_snippets / likes_prompts
//   bm_note_<id>          (inline note overrides — dynamic)
//   user_bookmarks / user_notes / user_snippets / user_prompts
//   user_custom_cats
//   bookmark_sidebar_collapsed  (cleared only on full restore)

const Settings = (() => {

  // ── Counts for display ─────────────────────────────────────
  function countKeys(scope) {
    switch (scope) {
      case 'likes':
        return ['bookmarks','notes','snippets','prompts']
          .reduce((n, t) => n + (JSON.parse(localStorage.getItem('likes_' + t)) || []).length, 0);
      case 'bm_notes':
        return Object.keys(localStorage).filter(k => k.startsWith('bm_note_')).length;
      case 'user':
        return ['bookmarks','notes','snippets','prompts']
          .reduce((n, t) => n + (JSON.parse(localStorage.getItem('user_' + t)) || []).length, 0);
      case 'cats':
        return (JSON.parse(localStorage.getItem('user_custom_cats')) || []).length;
      default:
        return 0;
    }
  }

  // ── Render ────────────────────────────────────────────────
  function render(container) {
    container.innerHTML = buildShell();
    lucide.createIcons({ el: container });
    bindEvents(container);
  }

  function buildShell() {
    const rows = [
      {
        scope: 'likes',
        label: 'Liked Items',
        desc: 'Bookmarks, notes, snippets, and prompts you have liked.',
        btn: 'Clear Likes',
        icon: 'heart',
      },
      {
        scope: 'bm_notes',
        label: 'Inline Bookmark Notes',
        desc: 'Notes you have typed directly on bookmark cards.',
        btn: 'Clear Notes',
        icon: 'sticky-note',
      },
      {
        scope: 'user',
        label: 'My Added Items',
        desc: 'Bookmarks, notes, snippets, and prompts you have created.',
        btn: 'Clear Added Items',
        icon: 'package',
      },
      {
        scope: 'cats',
        label: 'Custom Categories',
        desc: 'Category names you have typed in the add forms.',
        btn: 'Clear Categories',
        icon: 'tag',
      },
    ];

    return `
      <div class="page-header">
        <div class="page-header-left">
          <i data-lucide="settings" width="24" height="24" style="color:var(--accent)"></i>
          <div>
            <div class="page-title">Settings</div>
            <div class="page-subtitle">Manage your saved data</div>
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h2 class="settings-section-title">Data Management</h2>
          <p class="settings-section-desc">Clear specific categories of locally saved data. These actions cannot be undone.</p>
        </div>
        <div class="settings-card">
          ${rows.map((r, i) => `
            <div class="settings-row${i < rows.length - 1 ? '' : ' settings-row-last'}">
              <div class="settings-row-left">
                <div class="settings-row-icon">
                  <i data-lucide="${r.icon}" width="16" height="16"></i>
                </div>
                <div>
                  <div class="settings-row-label">${r.label}</div>
                  <div class="settings-row-desc">${r.desc}</div>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm settings-clear-btn" data-scope="${r.scope}" data-label="${r.label}" data-btn="${r.btn}">
                ${r.btn}
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h2 class="settings-section-title" style="color:var(--danger)">Danger Zone</h2>
          <p class="settings-section-desc">Permanently remove all your saved data and restore the app to its default state.</p>
        </div>
        <div class="settings-card danger-zone">
          <div class="settings-row settings-row-last">
            <div class="settings-row-left">
              <div class="settings-row-icon" style="background:var(--danger-light);color:var(--danger)">
                <i data-lucide="trash-2" width="16" height="16"></i>
              </div>
              <div>
                <div class="settings-row-label">Restore to Default</div>
                <div class="settings-row-desc">Clears all liked items, inline notes, added items, custom categories, and sidebar state. The page will reload.</div>
              </div>
            </div>
            <button class="btn btn-danger btn-sm" id="btn-restore-default">
              Restore to Default
            </button>
          </div>
        </div>
      </div>

      <!-- Scoped confirm modal -->
      <div class="modal-backdrop" id="settings-confirm-backdrop" role="dialog" aria-modal="true" aria-label="Confirm">
        <div class="modal" style="max-width:420px">
          <div class="modal-header">
            <span class="modal-title" id="settings-confirm-title">Confirm</span>
            <button class="btn-ghost btn-sm btn-icon" id="settings-confirm-close" aria-label="Close">
              <i data-lucide="x" width="16" height="16"></i>
            </button>
          </div>
          <div class="modal-body" style="gap:var(--space-3)">
            <p id="settings-confirm-body" style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.6"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="settings-confirm-cancel">Cancel</button>
            <button class="btn btn-danger" id="settings-confirm-ok">Clear</button>
          </div>
        </div>
      </div>

      <!-- Restore to default modal (phrase required) -->
      <div class="modal-backdrop" id="settings-restore-backdrop" role="dialog" aria-modal="true" aria-label="Restore to Default">
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <span class="modal-title" style="color:var(--danger)">
              <i data-lucide="alert-triangle" width="18" height="18" style="vertical-align:middle;margin-right:6px"></i>
              Restore to Default
            </span>
            <button class="btn-ghost btn-sm btn-icon" id="settings-restore-close" aria-label="Close">
              <i data-lucide="x" width="16" height="16"></i>
            </button>
          </div>
          <div class="modal-body" style="gap:var(--space-4)">
            <div class="inline-notice" style="border-color:rgba(218,55,60,0.35);background:var(--danger-light)">
              <i data-lucide="alert-triangle" width="14" height="14" style="flex-shrink:0;margin-top:1px;color:var(--danger)"></i>
              <span style="color:var(--danger)">This action is permanent and cannot be undone.</span>
            </div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.7">
              The following will be permanently deleted:
              <ul style="margin:var(--space-2) 0 0 var(--space-5);display:flex;flex-direction:column;gap:4px">
                <li>All items you have added (bookmarks, notes, snippets, prompts)</li>
                <li>All liked items</li>
                <li>All inline bookmark notes</li>
                <li>All custom categories</li>
                <li>Sidebar collapse state</li>
              </ul>
            </div>
            <div class="form-field">
              <label class="form-label" for="restore-phrase">
                Type <span style="font-family:var(--font-mono);color:var(--text-primary);letter-spacing:0.02em">delete my saves</span> to confirm
              </label>
              <input class="input" id="restore-phrase" type="text" autocomplete="off" placeholder="delete my saves">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="settings-restore-cancel">Cancel</button>
            <button class="btn btn-danger" id="settings-restore-ok" disabled>Delete Everything</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents(container) {
    lucide.createIcons({ el: container });

    // ── Scoped clear buttons ───────────────────────────────
    let pendingScope = null;

    container.querySelectorAll('.settings-clear-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingScope = btn.dataset.scope;
        const label  = btn.dataset.label;
        const count  = countKeys(pendingScope);
        const bodyEl = container.querySelector('#settings-confirm-body');
        const titleEl = container.querySelector('#settings-confirm-title');
        titleEl.textContent = `Clear ${label}`;
        bodyEl.textContent  = count > 0
          ? `You have ${count} ${label.toLowerCase()} item${count === 1 ? '' : 's'} saved. This will permanently delete them.`
          : `You have no ${label.toLowerCase()} saved. Nothing to clear.`;
        container.querySelector('#settings-confirm-ok').disabled = count === 0;
        openModal(container, 'settings-confirm-backdrop');
      });
    });

    // Scoped confirm modal events
    container.querySelector('#settings-confirm-close')?.addEventListener('click', () => closeModal(container, 'settings-confirm-backdrop'));
    container.querySelector('#settings-confirm-cancel')?.addEventListener('click', () => closeModal(container, 'settings-confirm-backdrop'));
    container.querySelector('#settings-confirm-backdrop')?.addEventListener('click', e => {
      if (e.target === container.querySelector('#settings-confirm-backdrop')) closeModal(container, 'settings-confirm-backdrop');
    });
    container.querySelector('#settings-confirm-ok')?.addEventListener('click', () => {
      if (!pendingScope) return;
      Store.clearUserData(pendingScope);
      closeModal(container, 'settings-confirm-backdrop');
      App.toast('Cleared successfully', 'success');
      pendingScope = null;
    });

    // ── Restore to default button ──────────────────────────
    container.querySelector('#btn-restore-default')?.addEventListener('click', () => {
      container.querySelector('#restore-phrase').value = '';
      container.querySelector('#settings-restore-ok').disabled = true;
      openModal(container, 'settings-restore-backdrop');
      setTimeout(() => container.querySelector('#restore-phrase')?.focus(), 80);
    });

    // Phrase input — enable confirm button only when phrase matches
    container.querySelector('#restore-phrase')?.addEventListener('input', e => {
      const matches = e.target.value.trim().toLowerCase() === 'delete my saves';
      container.querySelector('#settings-restore-ok').disabled = !matches;
    });

    // Restore modal close events
    container.querySelector('#settings-restore-close')?.addEventListener('click', () => closeModal(container, 'settings-restore-backdrop'));
    container.querySelector('#settings-restore-cancel')?.addEventListener('click', () => closeModal(container, 'settings-restore-backdrop'));
    container.querySelector('#settings-restore-backdrop')?.addEventListener('click', e => {
      if (e.target === container.querySelector('#settings-restore-backdrop')) closeModal(container, 'settings-restore-backdrop');
    });

    // Restore confirm — wipe everything and reload
    container.querySelector('#settings-restore-ok')?.addEventListener('click', () => {
      Store.clearUserData('all');
      localStorage.removeItem('bookmark_sidebar_collapsed');
      // Small delay so the modal closes visually before reload
      closeModal(container, 'settings-restore-backdrop');
      setTimeout(() => location.reload(), 150);
    });

    // Escape key closes whichever modal is open
    document.addEventListener('keydown', onEscape);
  }

  function onEscape(e) {
    if (e.key !== 'Escape') return;
    const container = document.getElementById('page-content');
    if (!container) return;
    ['settings-confirm-backdrop','settings-restore-backdrop'].forEach(id => {
      const el = container.querySelector('#' + id);
      if (el?.classList.contains('open')) closeModal(container, id);
    });
  }

  function openModal(container, id) {
    container.querySelector('#' + id)?.classList.add('open');
  }

  function closeModal(container, id) {
    container.querySelector('#' + id)?.classList.remove('open');
  }

  function unmount() {
    document.removeEventListener('keydown', onEscape);
  }

  return { render, unmount };
})();
