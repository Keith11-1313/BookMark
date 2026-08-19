// smart-add.js — detect what pasted search text should become (site / prompt / note)

const SmartAdd = (() => {
  function isUrl(t) {
    if (/^https?:\/\/[^\s]+$/i.test(t)) return true;
    return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?$/i.test(t);
  }

  // Returns 'bookmark' | 'prompt' | 'note' | null
  function classify(text, opts = {}) {
    const t = (text || '').trim();
    if (!t) return null;
    if (t.length > 500) return 'note';
    if (isUrl(t)) return 'bookmark';
    if (/^(you are|you're|act as|assume the role|system prompt|your role is|respond (only )?with|output (valid )?json|instruction:)/i.test(t)) return 'prompt';
    if (/system prompt|you are an ai|ai assistant|respond with json|role:/.test(t) && t.length <= 1000) return 'prompt';
    const sentenceEnds = (t.match(/[.!?…]\s+[A-Z0-9"“']/g) || []).length;
    if (t.length >= 80 && sentenceEnds >= 1) return 'note';
    if (t.split(/\s+/).length >= 15) return 'note';
    return null;
  }

  function normalizeUrl(text) {
    const t = (text || '').trim();
    return /^https?:\/\//i.test(t) ? t : 'https://' + t;
  }

  function firstLine(text) {
    const t = (text || '').replace(/^#+\s*/, '').split(/\r?\n/)[0].trim();
    return t.slice(0, 60) || 'Untitled';
  }

  function label(type) {
    return type === 'bookmark' ? 'Add as site' : type === 'prompt' ? 'Add to Prompts' : 'Add to Notes';
  }

  function hintHtml(text, type) {
    const icon = type === 'bookmark' ? 'bookmark' : type === 'prompt' ? 'sparkles' : 'notebook';
    const msg = type === 'bookmark'
      ? `"${escHtml(text)}" isn't saved yet`
      : type === 'prompt' ? 'Looks like a prompt' : 'Looks like a note';
    return `<span>${Icons.svg(icon, 14)} ${msg} —</span><button type="button" class="btn btn-secondary btn-sm" data-smart-add="${type}">${label(type)}</button>`;
  }

  function routeTo(type, text) {
    const container = document.getElementById('page-content');
    if (type === 'bookmark') {
      App.navigate('links');
      setTimeout(() => Links.openModal?.(container, { url: normalizeUrl(text) }), 120);
    } else if (type === 'prompt') {
      App.navigate('prompts');
      setTimeout(() => Prompts.openModal?.(container, { title: firstLine(text), body: text }), 120);
    } else if (type === 'note') {
      App.navigate('notes');
      setTimeout(() => Notes.createNewNote?.(container, { title: firstLine(text), body: text }), 120);
    }
  }

  function escHtml(s) { return App.escapeHtml(s); }

  return { classify, isUrl, normalizeUrl, firstLine, label, hintHtml, routeTo };
})();
