// icons.js - local inline SVG registry for core UI icons.
const Icons = (() => {
  const attrs = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    home: '<path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V20h5v-5h3v5h5V9.5"/>',
    dashboard: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="4.5" rx="2"/><rect x="13.5" y="10.5" width="7" height="10" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/>',
    bookmark: '<path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17.5 6.5 21Z"/>',
    note: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h8L19 7.5v12A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5Z"/><path d="M14 3v5h5"/><path d="M8 12h8M8 16h5"/>',
    code: '<path d="m9 8-4 4 4 4"/><path d="m15 8 4 4-4 4"/><path d="m13 5-2 14"/>',
    prompt: '<path d="M12 3.5 13.8 9l5.7 1.2-5.1 3.1.7 5.9-4.4-3.9-5.4 2.4 2.3-5.4-3.9-4.4 5.9.7Z"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.04.04a2.1 2.1 0 0 1-2.96 2.96l-.04-.04a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21a2.1 2.1 0 0 1-4.2 0v-.06A1.8 1.8 0 0 0 8.4 19.3a1.8 1.8 0 0 0-2 .36l-.04.04A2.1 2.1 0 0 1 3.4 16.74l.04-.04a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 2.15 13H2a2.1 2.1 0 0 1 0-4.2h.15A1.8 1.8 0 0 0 3.8 7.7a1.8 1.8 0 0 0-.36-2l-.04-.04A2.1 2.1 0 0 1 6.36 2.7l.04.04a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 9.5 1.45V1a2.1 2.1 0 0 1 4.2 0v.45a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.04-.04a2.1 2.1 0 0 1 2.96 2.96l-.04.04a1.8 1.8 0 0 0-.36 2A1.8 1.8 0 0 0 21.05 8.8H22a2.1 2.1 0 0 1 0 4.2h-.95A1.8 1.8 0 0 0 19.4 15Z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    searchX: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4M9 9l4 4m0-4-4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    collapse: '<path d="M4 5h16M4 19h16M8 9l-3 3 3 3M13 9h7M13 15h7"/>',
    external: '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
    random: '<path d="M3 7h3.5c2.5 0 3.5 10 6 10H16"/><path d="M3 17h3.5c1.1 0 1.9-1.8 2.7-3.9"/><path d="M16 5l4 2-4 2M16 15l4 2-4 2"/>',
    heart: '<path d="M20.2 5.8a5 5 0 0 0-7.1 0L12 6.9l-1.1-1.1a5 5 0 1 0-7.1 7.1L12 21l8.2-8.1a5 5 0 0 0 0-7.1Z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 15.5V6a2 2 0 0 1 2-2h9.5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    inbox: '<path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 13 7 5h10l2 8v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/>',
    edit: '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    delete: '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    warning: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17h.01"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    fork: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v3a4 4 0 0 0 4 4h2v3M18 7v3a4 4 0 0 1-4 4h-2"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    filter: '<path d="M4 5h16l-6 7v6l-4 2v-8Z"/>',
    github: '<path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.45.08.6-.2.6-.43v-1.6c-2.5.54-3-1.05-3-1.05-.4-1.05-1-1.32-1-1.32-.82-.56.06-.55.06-.55.9.06 1.38.94 1.38.94.82 1.38 2.14.98 2.66.75.08-.6.32-.98.58-1.2-2-.23-4.1-1-4.1-4.45 0-.98.35-1.78.93-2.4-.1-.23-.4-1.15.08-2.38 0 0 .76-.24 2.5.92a8.6 8.6 0 0 1 4.54 0c1.72-1.16 2.48-.92 2.48-.92.5 1.23.18 2.15.1 2.38.58.62.92 1.42.92 2.4 0 3.46-2.1 4.22-4.1 4.44.33.29.63.86.63 1.74v2.58c0 .24.15.52.62.43A9.2 9.2 0 0 0 12 2.8Z"/>',
    ai: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="4"/>',
    design: '<path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="M13 7l4 4"/>',
    ui: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M7 9h4M7 13h10M7 16h6"/>',
    asset: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 4.5-4 3.5 3 2-2 4 3"/>',
    dev: '<path d="M4 6h16v12H4Z"/><path d="m8 10 3 2-3 2M13 15h3"/>',
    openSource: '<circle cx="12" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="m10.5 9.5-3 5M13.5 9.5l3 5M9 17h6"/>',
    api: '<path d="M8 7V4M16 7V4M7 9h10v4a5 5 0 0 1-10 0Z"/><path d="M12 18v3"/>',
    docs: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21Z"/><path d="M5 5.5V21M9 7h6M9 11h6"/>',
    utility: '<path d="m14.5 5 4.5 4.5-9.5 9.5H5v-4.5Z"/><path d="m13 6.5 4.5 4.5"/>',
    game: '<path d="M7 9h10a4 4 0 0 1 3.8 3l1 4a2.5 2.5 0 0 1-4 2.5L15 16H9l-2.8 2.5a2.5 2.5 0 0 1-4-2.5l1-4A4 4 0 0 1 7 9Z"/><path d="M8 12v3M6.5 13.5h3M16.5 12.5h.01M18.5 14.5h.01"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',
    finance: '<path d="M4 10h16M6 10V8l6-4 6 4v2M7 10v8M12 10v8M17 10v8M5 18h14"/>',
    education: '<path d="m12 4 10 5-10 5L2 9Z"/><path d="M6 11v5c2.8 2 9.2 2 12 0v-5"/>',
    culture: '<path d="M4 20V7l8-4 8 4v13"/><path d="M8 20v-6h8v6M8 9h.01M12 9h.01M16 9h.01"/>',
    car: '<path d="M5 16h14l-1.5-5a3 3 0 0 0-2.9-2H9.4a3 3 0 0 0-2.9 2Z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>',
    craft: '<path d="M4 20 20 4M8 20l12-12M4 16 16 4"/><path d="M5 5h4v4H5Z"/>',
    fallback: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    notebook: '<path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h9.5a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M8 3v18"/><path d="M12 8h4M12 12h4M12 16h2"/>',
    notebookPen: '<path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h5v18H8a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M15 3.5h2.5A1.5 1.5 0 0 1 19 5v5"/><path d="M15 3.5V8h4"/><path d="m14 13.5 4.5-4.5a1.4 1.4 0 0 1 2 2L16 15.5l-2.6.5Z"/>',
    code2: '<path d="m9 8-4 4 4 4"/><path d="m15 8 4 4-4 4"/><path d="m13 5-2 14"/>',
    sparkles: '<path d="M12 3.5 13.6 8.2l4.7 1.6-4.7 1.6L12 16.1l-1.6-4.7-4.7-1.6 4.7-1.6Z"/><path d="M18.5 14l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9Z"/><path d="M5.5 3l.6 1.7 1.7.6-1.7.6L5.5 7.6 4.9 5.9 3.2 5.3l1.7-.6Z"/>',
    pencil: '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M10.8 5.8 12.3 4.3a4 4 0 0 1 5.7 5.7l-1.6 1.5"/><path d="M13.2 18.2 11.7 19.7a4 4 0 0 1-5.7-5.7l1.6-1.5"/>',
    alert: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17h.01"/>',
    stickyNote: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H14l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5Z"/><path d="M14 3v5h5"/>',
    package: '<path d="m12 3 9 4.5v9L12 21l-9-4.5v-9Z"/><path d="M12 12.2 21 7.5M12 12.2 3 7.5M12 12.2V21"/><path d="m7.5 5.5 9 4.5"/>',
    tag: '<path d="M3 4h7l10 10-7 7L3 11Z"/><circle cx="8" cy="8" r="1.3"/>',
    bold: '<path d="M7 4h6.5a3.5 3.5 0 0 1 0 7H7Z"/><path d="M7 11h7.5a3.5 3.5 0 0 1 0 7H7Z"/><path d="M7 4v14"/>',
    italic: '<path d="M10 5h8M14 5l-4 14M6 19h8"/>',
    underline: '<path d="M7 4v7a5 5 0 0 0 10 0V4"/><path d="M5 20h14"/>',
    strike: '<path d="M5 12h14"/><path d="M16 5.5a4.5 4.5 0 0 0-8 1M8 18.5a4.5 4.5 0 0 0 8-1"/>',
    heading1: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/>',
    heading2: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>',
    heading3: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2c-.7 0-1.3-.2-1.7-.6"/><path d="M17 18.4c1.2.8 3.2.6 3.7-1.4"/>',
    listOrdered: '<path d="M10 6h11"/><path d="M10 12h11"/><path d="M10 18h11"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    quote: '<path d="M9.5 7C6.7 7 5 9 5 11.5V17h5v-6H7.6c0-1.9.6-2.8 2.4-3Z"/><path d="M18.5 7c-2.8 0-4.5 2-4.5 4.5V17h5v-6h-2.4c0-1.9.6-2.8 2.4-3Z"/>'
  };

  const routeMap = { dashboard: 'dashboard', links: 'bookmark', notes: 'note', snippets: 'code', prompts: 'prompt', settings: 'settings' };
  const typeMap = { link: 'bookmark', note: 'note', snippet: 'code', prompt: 'prompt' };
  const categoryMap = {
    AI: 'ai', Design: 'design', 'Design Tools': 'design', 'Design Inspiration': 'design', 'UI Libraries': 'ui', 'Libraries/Frameworks': 'ui', Assets: 'asset', 'Icons & Assets': 'asset', 'Developer Tools': 'dev', Tools: 'utility', Utilities: 'utility', 'Open Source': 'openSource', APIs: 'api', Documentation: 'docs', Reference: 'docs', Games: 'game', Music: 'music', Finance: 'finance', Education: 'education', Culture: 'culture', Automotive: 'car', Craft: 'craft'
  };

  function svg(name, size = 18, className = 'ui-icon') {
    const body = paths[name] || paths.fallback;
    return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" ${attrs} aria-hidden="true">${body}</svg>`;
  }

  function route(routeName, size = 18, className = 'ui-icon') { return svg(routeMap[routeName] || 'fallback', size, className); }
  function type(typeName, size = 18, className = 'ui-icon') { return svg(typeMap[typeName] || 'fallback', size, className); }
  function category(categoryName, size = 18, className = 'ui-icon') { return svg(categoryMap[categoryName] || 'fallback', size, className); }
  function tile(name, size = 18) { return `<span class="icon-tile">${svg(name, size)}</span>`; }

  return { svg, route, type, category, tile };
})();
