# TNPSC Study Library

A clean, fast, mobile-first study library for the **relevant Tamil Nadu school
textbooks** (2026–27) used for **TNPSC / TNUSRB** preparation.

> Focused library — not a copy of any textbook website. Books that are not useful
> for competitive preparation are omitted. Every book is clearly labelled with its
> academic year and edition.

## Quick start

The site is fully static. Open it with any static server:

```bash
# from the project root
npx serve .
```

or

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

**Why a server?** The PDF reader (PDF.js) and `books.json` are loaded with
`fetch()`, which browsers block from the `file://` protocol. Always run a small
local server during development.

## Pages

| Page          | Purpose                                                    |
| ------------- | ---------------------------------------------------------- |
| `index.html`  | Home — choose a standard, resume last read book            |
| `library.html`| Browse/search/filter books, view book details             |
| `reader.html` | In-browser PDF reader (PDF.js, lazy page rendering)        |

## Project structure

```
tnpsc-study-library/
├── index.html
├── library.html
├── reader.html
├── manifest.json              # PWA manifest
├── robots.txt
├── service-worker.js          # caches app shell only (never PDFs)
├── data/
│   └── books.json             # the ONLY place to edit book data
├── assets/
│   ├── css/  style.css  reader.css
│   ├── js/   utils.js  app.js  library.js  reader.js
│   ├── images/  logo.svg  icon-192.png  icon-512.png
│   └── covers/<6..12>/*.svg   # generated cover placeholders
├── pdfjs/  pdf.min.js  pdf.worker.min.js   # PDF.js v3
└── tools/                      # dev-only tooling (Node, no deps)
    ├── check.cjs              # sanity checks for books.json, URLs & assets
    ├── generate-books.cjs     # regenerates data/books.json + cover SVGs
    └── generate-icons.cjs     # regenerates PWA PNG icons
```

## Book data — `data/books.json`

All book metadata lives in `data/books.json`. No backend, no database, no admin.
Edit it with any text editor and the site picks up the changes.

Structure:

```
app        → site name, current academic year, default relevance, last updated
classes    → per standard:
              terms    → 6th, 7th (Term 1/2/3)
              subjects → 8th, 9th, 10th (single "All Subjects" group),
                         11th, 12th (High Relevance / Basic Reference)
                each group has:  id, name, books[]
books[]    → id, title, subject, medium, academicYear, edition,
             relevance, pdfUrl, sourceUrl, cover, lastVerified
```

### Adding / updating a book

1. Open `data/books.json`.
2. Find the class → term/subject section, then the subject.
3. Add or edit the book object:

```json
{
  "id": "6-t1-science",
  "title": "Science",
  "subject": "Science",
  "medium": "Tamil Medium",
  "academicYear": "2026-27",
  "edition": "Current",
  "relevance": "relevant",
  "pdfUrl": "",
  "sourceUrl": "",
  "cover": "assets/covers/6/science.svg",
  "lastVerified": "2026-09-19"
}
```

Rules:

- **Never invent URLs.** `pdfUrl` / `sourceUrl` must be real, verified links.
  If a link is not yet verified, leave the value `""`. The UI then shows
  **“PDF link not configured”** instead of a broken link.
- Only `http://` and `https://` are accepted (the app rejects everything else).
- Keep every book in ONE place. Don’t duplicate entries.
- `relevance` values: `high` · `basic` · `relevant`. School books use
  `relevant`; 11th/12th use `high` (Humanities) or `basic` (Physics/Chemistry/
  Botany/Zoology) as a label only — every approved book is always shown.

### Bulk regeneration (optional)

`tools/generate-books.cjs` recreates `books.json` and the placeholder cover SVGs
from compact subject tables. Regenerate if you want a clean rebuild:

```bash
node tools/generate-books.cjs
```

If you hand-edit `data/books.json`, don’t run the generator afterwards — it would
overwrite your manual edits. Pick one workflow.

### Validation

`tools/check.cjs` sanity-checks `books.json` against the approved 2026–27 book
list (structure, counts, exact Google Drive URLs per book id, covers and core
assets). Run it before deploying:

```bash
node tools/check.cjs
```

## Reader & PDF.js

- PDF.js v3 ships locally in `pdfjs/` (no CDN dependency, works offline).
- The reader renders only the pages near the current viewport
  (lazy spooling) — big books stay responsive, memory stays low.
- PDFs are **never downloaded or stored** on this project; the app opens the
  official `pdfUrl` directly. If a server blocks in-browser PDF reading
  (CORS/hotlink protection), the reader shows a friendly error with an
  **Open Official Source** button instead.
- Reading position (book + page) is saved to `localStorage` and shown as
  “Continue Reading” on the home page. No PDF content is stored.

## Deployment

Any static host works:

- **GitHub Pages** — push the folder to a repo, enable Pages.
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder.
- **Any nginx/Apache static directory** — drop the files in the web root.

Service worker + PWA install only activate over HTTPS (or localhost). HTTPS is
strongly recommended. `robots.txt` is already included.

## Performance notes

- Vanilla JS only; no frameworks, no build step required.
- `books.json` is loaded once and cached in memory + (optionally) by the
  service worker.
- Cover images are lazy-loaded; missing covers fall back to generated art.
- Debounced search, event delegation, and no page-wide re-renders.
- The service worker caches only the app shell — textbook PDFs are never
  cached.

## Disclaimer

Book links point to their respective official/source pages. This is an
independent study-aid project and is not affiliated with the Government of
Tamil Nadu, TNPSC, or TNSCERT.

Created by Venkateswaran.