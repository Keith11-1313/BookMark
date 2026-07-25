# Curated Data Entry Prompts

## 1. Bookmarks

```text
Add these URLs as curated bookmark entries in data/bookmarks.json.

Requirements:
- Verify each URL live before writing anything.
- If I provide notes beside URLs, verify those notes against the live site.
- Validate existing bookmark notes, tags, and categories too; only change old entries when live verification proves a mismatch.
- New categories are allowed. Do not force sites into existing categories.
- Do not add duplicates.
- If a site blocks automation, mark it blocked and do not invent notes, tags, or category.

Entry shape:
{
  "id": "https://example.com/",
  "url": "https://example.com/",
  "title": "Example Site",
  "category": "Best Verified Category",
  "tags": ["tag-one", "tag-two", "tag-three"],
  "notes": "Concise verified description of what the site does.",
  "favicon": "https://www.google.com/s2/favicons?domain=example.com&sz=32",
  "createdAt": "YYYY-MM-DDTHH:mm:ss"
}

Rules:
- id must equal url exactly.
- Use local time for createdAt, e.g. "2026-07-25T22:13:00".
- Use 2-3 lowercase kebab-case tags.
- Keep notes factual, short, and verified.
- Verify JSON parse, required fields, id === url, duplicate URLs, and live status after editing.

URLs:
[paste URLs here]
```

## 2. Notes

```text
Add these as curated notes in data/notes.json.

Requirements:
- Validate the note topic/source before writing if URLs, copied claims, docs, or references are provided.
- Do not guess facts. If source material is missing, ask for it or write only from supplied text.
- Keep notes useful as reference material, not filler.
- Preserve HTML body format used by existing notes.
- Do not add categories unless the notes schema already uses them.
- Do not rewrite old notes unless explicitly requested or a factual mismatch is verified.

Entry shape:
{
  "id": "next-sequential-string-id",
  "title": "Note Title",
  "body": "<p>HTML content here</p>",
  "color": "#5865f2",
  "linkedBookmarks": [],
  "createdAt": "YYYY-MM-DDTHH:mm:ss",
  "updatedAt": "YYYY-MM-DDTHH:mm:ss"
}

Rules:
- Use the next available numeric string id.
- Set createdAt and updatedAt to the same local-time timestamp for new notes, e.g. "2026-07-25T22:13:00".
- Keep body valid, simple HTML: p, ul, ol, li, strong, code, pre when needed.
- Link related bookmark URLs in linkedBookmarks only when a matching bookmark id exists.
- Verify JSON parse, unique ids, required fields, and valid linkedBookmarks after editing.

Notes to add:
[paste note titles/content/sources here]
```

## 3. Prompts

```text
Add these as curated prompts in data/prompts.json.

Requirements:
- Validate the prompt purpose and category from the supplied prompt text.
- Do not invent capabilities, tool names, or workflow claims.
- New categories are allowed when the prompt content supports them.
- Keep prompt bodies complete and directly usable.
- Do not rewrite old prompts unless explicitly requested or a verified mismatch exists.

Entry shape:
{
  "id": "next-sequential-string-id",
  "title": "Prompt Title",
  "category": "Best Verified Category",
  "body": "Prompt text here...",
  "tags": ["tag-one", "tag-two", "tag-three"],
  "createdAt": "YYYY-MM-DDTHH:mm:ss"
}

Rules:
- Use the next available numeric string id.
- Use local time for createdAt, e.g. "2026-07-25T22:13:00".
- Use 2-3 lowercase kebab-case tags.
- Category should describe actual prompt use, not where it came from.
- Preserve important formatting inside body.
- Verify JSON parse, unique ids, required fields, and category/tag sanity after editing.

Prompts to add:
[paste prompts here]
```

## 4. Snippets

```text
Add these as curated snippets in data/snippets.json.

Requirements:
- Validate that each snippet is syntactically plausible for its language.
- Do not add broken, unsafe, or placeholder code unless clearly labeled as pseudocode.
- Prefer the smallest useful snippet. No scaffolding for future use.
- Do not add dependencies unless the snippet explicitly needs an already-known library.
- Do not rewrite old snippets unless explicitly requested or a verified bug exists.

Entry shape:
{
  "id": "next-sequential-string-id",
  "title": "Snippet Title",
  "language": "JavaScript",
  "code": "console.log('hello');",
  "tags": ["javascript", "logging"],
  "createdAt": "YYYY-MM-DDTHH:mm:ss"
}

Rules:
- Use the next available numeric string id.
- Use local time for createdAt, e.g. "2026-07-25T22:13:00".
- Use the actual language name format already used in data/snippets.json.
- Use 2-3 lowercase kebab-case tags.
- Keep code exactly escaped as valid JSON.
- Run a syntax check when practical for the snippet language.
- Verify JSON parse, unique ids, required fields, and duplicate title/language combos after editing.

Snippets to add:
[paste snippets here]
```
