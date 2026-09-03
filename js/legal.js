// legal.js — Privacy Notice + Terms of Use as a popup modal.
//
// Short legal docs work better as a modal than a full page: no route change,
// context preserved, same pattern as App.confirm (body-appended backdrop,
// Esc/backdrop-click close, focus moved inside on open).

const Legal = (() => {
  const UPDATED = 'September 3, 2026';

  const DOCS = {
    privacy: {
      icon: 'shield',
      title: 'Privacy Notice',
      body: `
        <p class="legal-lead">
          BookMark runs entirely in your browser. There is no account, no server,
          no analytics, and nothing you save is sent anywhere by the app itself.
        </p>
        <h3>Data stored on your device</h3>
        <p>
          Everything you create or like is kept in your browser's
          <span class="font-mono">localStorage</span> under these keys:
        </p>
        <ul>
          <li><span class="font-mono">user_bookmarks, user_notes, user_prompts, user_slides</span> — items you add</li>
          <li><span class="font-mono">likes_bookmarks, likes_notes, likes_slides, likes_prompts</span> — items you like</li>
          <li><span class="font-mono">bm_note_&lt;id&gt;</span> — inline notes you type on bookmark cards</li>
          <li><span class="font-mono">user_custom_cats</span> — category names you type in add forms</li>
          <li><span class="font-mono">bookmark_theme, bookmark_sidebar_collapsed</span> — interface preferences</li>
        </ul>
        <p>
          Clearing your browser's site data, or using the Settings page (granular
          clear controls or "Restore to Default"), permanently removes this data.
          The curated content shipped in <span class="font-mono">data/*.json</span>
          is read-only and unaffected.
        </p>
        <h3>Third parties contacted</h3>
        <p>
          The app itself sets no cookies and runs no trackers, but loading and
          using it makes a few direct requests to third-party services, which
          will see your IP address and browser details as with any web request:
        </p>
        <ul>
          <li><strong>Google Fonts</strong> (<span class="font-mono">fonts.googleapis.com</span>, <span class="font-mono">fonts.gstatic.com</span>) — loads the Inter and JetBrains Mono typefaces</li>
          <li><strong>cdnjs (Cloudflare)</strong> (<span class="font-mono">cdnjs.cloudflare.com</span>) — loads the highlight.js syntax-highlighting library</li>
          <li><strong>Google favicon service</strong> (<span class="font-mono">google.com/s2/favicons</span>) — fetches site icons for bookmarks</li>
          <li><strong>GitHub</strong> — only if you click the GitHub or "Request a Site" links in the sidebar</li>
          <li><strong>Bookmark destinations</strong> — only when you choose to open an external link; those sites have their own privacy practices</li>
        </ul>
        <h3>What we don't do</h3>
        <ul>
          <li>No accounts, no passwords, nothing to leak from a server — there isn't one</li>
          <li>No analytics, advertising, or cross-site tracking code</li>
          <li>No cookies set by the app itself</li>
        </ul>
        <h3>Changes and contact</h3>
        <p>
          If this notice changes, the "Last updated" date below will change with it.
          Questions? Open an issue on the
          <a href="https://github.com/Keith11-1313/BookMark" target="_blank" rel="noopener">GitHub repository</a>.
        </p>`
    },
    terms: {
      icon: 'docs',
      title: 'Terms of Use',
      body: `
        <p class="legal-lead">
          BookMark is a free, open-source personal reference tool. By using it,
          you agree to the terms below.
        </p>
        <h3>The app</h3>
        <p>
          BookMark is provided as-is for organizing bookmarks, notes, prompts,
          and slide decks. The source code is released under the MIT license
          (see the project README). Nothing here constitutes professional advice.
        </p>
        <h3>Your content stays yours — and local</h3>
        <p>
          Anything you add or edit is stored only in your own browser
          (<span class="font-mono">localStorage</span>) and never transmitted to us —
          there is no server to receive it. You are responsible for the content
          you add, and for keeping any backup of it you care about: clearing
          browser data or using "Restore to Default" in Settings deletes it
          permanently.
        </p>
        <h3>External links and curated content</h3>
        <p>
          BookMark links to third-party websites it does not control. Availability,
          accuracy, safety, and privacy practices of external sites are the
          responsibility of their operators. Open external links at your own
          discretion. If a curated bookmark is broken or inappropriate, please
          report it via the "Request a Site" link in the sidebar.
        </p>
        <h3>Acceptable use</h3>
        <ul>
          <li>Do not use the project (including its issue tracker) for unlawful, abusive, or infringing activity</li>
          <li>Do not attempt to disrupt the app or misrepresent curated content as your own work beyond what the MIT license permits</li>
        </ul>
        <h3>No warranty</h3>
        <p>
          To the maximum extent permitted by law, BookMark is provided without
          warranties of any kind — including merchantability, fitness for a
          particular purpose, and non-infringement. We are not liable for data
          loss (for example, cleared browser storage) or for any issue arising
          from external linked sites.
        </p>
        <h3>Changes and contact</h3>
        <p>
          These terms may be updated; the "Last updated" date below will reflect
          the latest version. Questions? Open an issue on the
          <a href="https://github.com/Keith11-1313/BookMark" target="_blank" rel="noopener">GitHub repository</a>.
        </p>`
    }
  };

  function open(type) {
    const doc = DOCS[type];
    if (!doc) return;
    document.getElementById('legal-backdrop')?.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'legal-backdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', doc.title);
    backdrop.innerHTML = `
      <div class="modal legal-modal">
        <div class="modal-header">
          <span class="modal-title" style="display:flex;align-items:center;gap:var(--space-2)">
            ${Icons.svg(doc.icon, 18)}
            ${doc.title}
          </span>
          <button class="btn-ghost btn-sm btn-icon" id="legal-close" aria-label="Close">${Icons.svg('close', 16)}</button>
        </div>
        <div class="modal-body legal-modal-body">${doc.body}</div>
        <div class="modal-footer">
          <span class="legal-updated">Last updated ${UPDATED}</span>
          <button class="btn btn-secondary" id="legal-ok">Close</button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    function close() {
      backdrop.classList.remove('open');
      backdrop.addEventListener('transitionend', () => backdrop.remove(), { once: true });
      document.removeEventListener('keydown', onEsc);
    }

    function onEsc(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    }

    backdrop.querySelector('#legal-ok').addEventListener('click', close);
    backdrop.querySelector('#legal-close').addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onEsc);

    setTimeout(() => backdrop.querySelector('#legal-ok')?.focus(), 50);
  }

  return { open };
})();
