// dropdown.js — Custom dropdown (themed listbox replacing native <select> popups).
//
// Native select popups are OS-rendered and ignore app themes (see screenshots:
// white list in dark-glass, dark list in default). Dropdown.enhance(select)
// wraps a native select with a token-styled button + fixed-position listbox
// while keeping the native select in the DOM (hidden) as source of truth:
//   - existing `select.value` reads keep working
//   - choosing an option sets .value and dispatches a bubbling `change`
//     event, so existing change listeners fire untouched
//   - calling enhance() again re-syncs options (needed after modal code
//     rebuilds option innerHTML, e.g. category selects in openModal)
//
// Accessibility: aria-haspopup/expanded on the button, role=listbox/option,
// arrow/Home/End navigation, Enter/Space to pick, Esc to close with focus
// returned to the button, outside-pointer and scroll/resize auto-close.

const Dropdown = (() => {
  let openInst = null;
  let uid = 0;
  let globalsBound = false;

  function closeAll() {
    if (openInst) openInst.close();
  }

  // Removes every detached listbox (route changes destroy selects but
  // their body-appended lists would otherwise linger). Called from
  // App.navigate before the next page renders its own dropdowns.
  function reset() {
    closeAll();
    document.querySelectorAll('.dd-list').forEach(el => el.remove());
  }

  function bindGlobals() {
    if (globalsBound) return;
    globalsBound = true;
    document.addEventListener('pointerdown', e => {
      if (openInst && !openInst.list.contains(e.target) && !openInst.wrap.contains(e.target)) {
        openInst.close();
      }
    }, true);
    window.addEventListener('scroll', () => { if (openInst) openInst.close(); }, true);
    window.addEventListener('resize', () => { if (openInst) openInst.close(); });
  }

  function enhance(select) {
    if (!select || select.tagName !== 'SELECT') return null;
    if (select._dd) { select._dd.sync(); return select._dd; }

    const inst = {
      select,
      id: 'dd-' + (++uid),
      focusIdx: -1,
      btn: null,
      label: null,
      list: null,
      wrap: null,
    };

    // Wrap select, transfer inline sizing to the wrapper
    const wrap = document.createElement('div');
    wrap.className = 'dd';
    if (select.style.cssText) wrap.style.cssText = select.style.cssText;
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('dd-native');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    inst.wrap = wrap;

    // Trigger button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.disabled = select.disabled;
    btn.innerHTML = `<span class="dd-label"></span>
      <span class="dd-chevron">${Icons.svg('chevronDown', 14, 'ui-icon')}</span>`;
    wrap.appendChild(btn);
    inst.btn = btn;
    inst.label = btn.querySelector('.dd-label');

    // Fixed-position listbox in body (escapes modal overflow clipping)
    const list = document.createElement('div');
    list.className = 'dd-list';
    list.setAttribute('role', 'listbox');
    list.id = inst.id + '-list';
    list.hidden = true;
    document.body.appendChild(list);
    btn.setAttribute('aria-controls', list.id);
    inst.list = list;

    inst.sync = () => {
      list.innerHTML = '';
      const opts = Array.from(select.options);
      opts.forEach((opt, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'dd-option' + (opt.selected ? ' selected' : '');
        el.setAttribute('role', 'option');
        el.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
        el.id = inst.id + '-opt-' + i;
        el.dataset.index = i;
        el.innerHTML = `<span class="dd-option-text">${App.escapeHtml(opt.text)}</span>
          <span class="dd-check">${Icons.svg('check', 14, 'ui-icon')}</span>`;
        el.addEventListener('click', () => inst.pick(i, true));
        el.addEventListener('mousemove', () => inst.focus(i, false));
        list.appendChild(el);
      });
      updateLabel();
    };

    function updateLabel() {
      const opt = select.options[select.selectedIndex];
      inst.label.textContent = opt ? opt.text : '';
    }

    inst.pick = (i, refocus) => {
      const opts = select.options;
      if (!opts[i] || opts[i].disabled) return;
      select.selectedIndex = i;
      inst.sync();
      select.dispatchEvent(new Event('change', { bubbles: true }));
      inst.close();
      if (refocus) btn.focus();
    };

    inst.focus = (i, scroll = true) => {
      const items = list.querySelectorAll('.dd-option');
      if (!items.length) return;
      inst.focusIdx = Math.max(0, Math.min(i, items.length - 1));
      items.forEach((el, k) => el.classList.toggle('focused', k === inst.focusIdx));
      const active = items[inst.focusIdx];
      btn.setAttribute('aria-activedescendant', active.id);
      if (scroll) active.scrollIntoView({ block: 'nearest' });
    };

    inst.open = () => {
      if (openInst && openInst !== inst) openInst.close();
      if (!list.isConnected) document.body.appendChild(list);
      inst.sync();
      const r = btn.getBoundingClientRect();
      const listH = Math.min(220, list.scrollHeight || 220);
      let top = r.bottom + 4;
      if (top + listH > window.innerHeight - 8) {
        top = Math.max(8, r.top - listH - 4);
      }
      list.style.minWidth = Math.max(160, r.width) + 'px';
      list.style.left = Math.min(r.left, window.innerWidth - Math.max(160, r.width) - 8) + 'px';
      list.style.top = top + 'px';
      list.hidden = false;
      list.classList.add('open');
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      inst.focus(select.selectedIndex, false);
      openInst = inst;
    };

    inst.close = (refocus = false) => {
      if (list.hidden) return;
      list.hidden = true;
      list.classList.remove('open');
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-activedescendant');
      inst.focusIdx = -1;
      if (openInst === inst) openInst = null;
      if (refocus) btn.focus();
    };

    inst.isOpen = () => !list.hidden;

    btn.addEventListener('click', () => {
      if (inst.isOpen()) inst.close();
      else inst.open();
    });

    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!inst.isOpen()) {
          inst.open();
          inst.focus(e.key === 'ArrowUp' ? list.querySelectorAll('.dd-option').length - 1 : select.selectedIndex);
        } else {
          inst.focus(inst.focusIdx + (e.key === 'ArrowDown' ? 1 : -1));
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && !inst.isOpen()) {
        e.preventDefault();
        inst.open();
      } else if (e.key === 'Escape' && inst.isOpen()) {
        e.preventDefault();
        e.stopPropagation();
        inst.close(true);
      }
    });

    list.addEventListener('keydown', e => {
      const items = list.querySelectorAll('.dd-option');
      if (e.key === 'ArrowDown') { e.preventDefault(); inst.focus(inst.focusIdx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); inst.focus(inst.focusIdx - 1); }
      else if (e.key === 'Home') { e.preventDefault(); inst.focus(0); }
      else if (e.key === 'End') { e.preventDefault(); inst.focus(items.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inst.pick(inst.focusIdx, true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); inst.close(true); }
      else if (e.key === 'Tab') { inst.close(); }
    });

    // Options are buttons: keep Tab moving out naturally, arrows handled above.
    // Make list focusable only via roving option focus.
    list.addEventListener('focusin', e => {
      const el = e.target.closest('.dd-option');
      if (el) inst.focus(Number(el.dataset.index), false);
    });

    bindGlobals();

    // If a previous page left a same-id list behind it was removed by
    // reset(); re-attach this instance's list if missing from the DOM.
    // Keep label/disabled in sync if something mutates the native select
    select.addEventListener('change', updateLabel);

    select._dd = inst;
    inst.sync();
    return inst;
  }

  return { enhance, closeAll, reset };
})();
