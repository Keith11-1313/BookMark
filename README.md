i# BookMark

> An open-source, curated directory of developer bookmarks, notes, code snippets, and AI prompts. No login required. Browse, search, and export.

## What Is This?

BookMark is a static site that serves as a public-facing developer resource directory:

- **Bookmarks** — Curated links organized by category with search, filters, and auto-detected favicons
- **Notes** — Developer notes and knowledge articles with rich formatting
- **Code Snippets** — Reusable code blocks with syntax highlighting (16 languages) and copy-to-clipboard
- **Prompts** — AI/text prompt library organized by category
- **Directory** — A virtual file tree showing project structure

All data is stored in plain JSON files. No database, no authentication, no server-side code.

## Tech Stack

| Layer            | Technology                              |
|------------------|-----------------------------------------|
| Frontend         | Vanilla JavaScript (ES6+), Custom CSS   |
| Data             | Static JSON files (`data/*.json`)       |
| Icons            | Lucide Icons (CDN, pinned v0.460.0)     |
| Fonts            | Inter + JetBrains Mono (Google Fonts)   |
| Syntax Highlight | highlight.js 11.9.0                     |

**No build tools, no npm, no frameworks, no database.** Pure static files.

## Project Structure

```
BookMark/
├── index.html              Single-page app shell
├── data/
│   ├── bookmarks.json      All bookmarks
│   ├── notes.json          All notes
│   ├── snippets.json       All code snippets
│   ├── prompts.json        All AI prompts
│   └── directory.json      File tree structure
├── assets/
│   └── icons/
│       └── logo.png        App logo
├── css/
│   ├── index.css           Design tokens, reset, layout, responsive
│   ├── sidebar.css         Desktop sidebar + mobile bottom nav
│   ├── command-palette.css Ctrl+K search overlay
│   ├── dashboard.css       Home page styles
│   ├── links.css           Bookmark cards, filters
│   ├── notes.css           Note cards, viewer
│   ├── directory.css       File tree, detail panel
│   ├── snippets.css        Code cards, syntax highlighting
│   └── prompts.css         Prompt cards, categories
└── js/
    ├── store.js            Read-only data layer (fetch JSON + export)
    ├── app.js              Hash router, toasts, utilities
    ├── sidebar.js          Desktop sidebar + mobile bottom nav
    ├── command-palette.js  Ctrl+K global search
    ├── dashboard.js        Home/overview page
    ├── links.js            Bookmark browser
    ├── notes.js            Notes viewer
    ├── directory.js        File tree viewer
    ├── snippets.js         Code snippet viewer
    └── prompts.js          Prompt library
```

## How to Add Data

Edit the JSON files in `data/` directly:

### Add a bookmark (`data/bookmarks.json`)
```json
{
  "id": "unique-id",
  "url": "https://example.com",
  "title": "Example Site",
  "category": "Web Dev",
  "tags": ["example", "demo"],
  "notes": "Why this site is useful",
  "favicon": "https://www.google.com/s2/favicons?domain=example.com&sz=32",
  "pinned": false,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Add a note (`data/notes.json`)
```json
{
  "id": "unique-id",
  "title": "Note Title",
  "body": "<p>HTML content here</p>",
  "pinned": false,
  "color": "#5865f2",
  "linkedBookmarks": [],
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### Add a snippet (`data/snippets.json`)
```json
{
  "id": "unique-id",
  "title": "Snippet Title",
  "language": "JavaScript",
  "code": "console.log('hello');",
  "tags": ["javascript"],
  "starred": false,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Add a prompt (`data/prompts.json`)
```json
{
  "id": "unique-id",
  "title": "Prompt Title",
  "category": "Coding",
  "body": "Prompt text here...",
  "tags": ["ai"],
  "favorite": false,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

## Run Locally

```bash
# Option A: any static server
npx serve .

# Option B: Python
python -m http.server 8000
```

Then open `http://localhost:8000`.

> Note: Opening `index.html` directly via `file://` won't work because `fetch()` requires HTTP.

## Deploy

Static site — deploy anywhere:

- **GitHub Pages**: push to `gh-pages` branch
- **Netlify / Vercel**: connect repo, no build command, publish directory: `.`
- **Any web server**: upload the folder as-is

## Features for Visitors

- **Search** — Ctrl+K command palette searches across all data types
- **Filter** — Category pills on bookmarks, language filter on snippets
- **Export** — Download data as JSON or CSV from each section
- **Print / PDF** — Use the Print button or Ctrl+P for a clean printable view
- **Request a Site** — Opens a GitHub Issue form to suggest additions

## Keyboard Shortcuts

| Shortcut   | Action                  |
|------------|-------------------------|
| `Ctrl+K`   | Open command palette    |
| `1` – `6`  | Navigate to each page   |
| `Escape`   | Close palette           |

## Contributing

Want to suggest a bookmark or resource? Click "Request a Site" in the sidebar, or open an issue on GitHub.

## License

MIT

