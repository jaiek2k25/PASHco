# WeSolve — AI study platform

A polished, fully interactive AI study platform. It pairs a public marketing site and pricing flow with a complete study workspace: solver, whiteboard tutor, flashcards, quizzes, study guides, research, live notes, and exam prep.

Accounts are real: email + password registration, salted scrypt hashes, signed HTTP-only session cookies, and per-user workspace sync across devices.

## What’s included

### Public site
- Responsive landing page with product mega-menu, animated tool carousel, feature tabs, visual previews, university marquee, testimonials, free-tools collection, FAQ, and footer
- Interactive pricing page with weekly/monthly/yearly billing, plan comparison, testimonials, and FAQ
- Download/app and Chrome extension pages
- Real account creation, login, profile editing, password change, and account deletion
- Guest mode for using the app without an account

### Study workspace
- **AI Solver** — typed questions, quick prompts, file/image uploads, link sources, image cropper, scientific calculator, voice input, symbolic/numeric solving, step-by-step answers, interactive graphs, video-style explanations, cross-check cards, follow-up chat, feedback, and solve history
- **Whiteboard Tutor** — a full whiteboard studio with step-by-step handwritten animation, narrated lessons, marker/highlighter/eraser tools, undo and redo, fullscreen, PNG export, checkpoints, and an AI question dock
- **Flashcards** — generated from notes or files, flip animation, known/unknown tracking, shuffle, keyboard shortcuts, and mastery reporting
- **Quiz** — multiple-choice questions, hints, instant explanations, timer, question navigator, score report, and weak-topic analysis
- **Study Guide** — source ingestion, topic breakdown, key terms, review questions, voice playback, printable cheat sheet, and Markdown export
- **AI Research** — topic composer, source management, target length, generated report sections, references, history, copy, and download
- **AI Live Notes** — browser speech recognition, recording controls, editable transcript, generated structured notes, and one-click flashcards/quizzes
- **Exam Predictor** — exam setup, 10-question diagnostic, mock exams, predicted topics, readiness, 7-day plan, and cheat sheet
- **Library, History, and Account** — per-account workspace sync, usage stats, preferences, security settings, plan switching, and workspace reset

### Accounts and sync
- Create an account with name, email, and password
- Passwords hashed with scrypt and a per-user salt
- Sessions signed with HMAC-SHA256 in an HTTP-only, SameSite=Lax cookie
- Workspace (solves, study sets, notes, research, exams, settings, plan) synced to the server with debounced saves
- Change password (invalidates other sessions) and delete account from the Account page
- Guests keep everything in local storage; signing up uploads the current local workspace

## Tech stack

- React 18 + Vite 6
- React Router
- Math.js for safe expression parsing and symbolic differentiation
- Lucide React icons
- CSS-only responsive design system (no external UI framework)
- Browser APIs: Local Storage, Speech Recognition, Speech Synthesis, MediaRecorder, Canvas, Clipboard, and Print

## Run locally

```bash
npm install
npm run dev
```

The development server runs on `http://0.0.0.0:3000`.

Other commands:

```bash
npm run build     # Production build
npm start         # Serve dist/ and /api/ai with the Node server
npm run serve     # Build, then start the production server
npm run preview   # Vite preview (AI proxy included)
npm run lint      # ESLint
```

### Deploying

WeSolve is one Node service: it serves the built app, proxies AI calls to NVIDIA, and stores
accounts plus synced workspaces in a data directory. It needs a **Node host with a persistent
disk** — static hosts can serve the pages but not accounts or the AI proxy.

```bash
npm ci && npm run build
NVIDIA_API_KEY=nvapi-... WESOLVE_SESSION_SECRET=... WESOLVE_DATA_DIR=/data node server/production.js
```

| Variable | Purpose |
| --- | --- |
| `NVIDIA_API_KEY` | Server-side AI key. Without it the local engines handle every feature. |
| `WESOLVE_SESSION_SECRET` | Signs session cookies. Generated on first run if unset. |
| `WESOLVE_DATA_DIR` | Where `accounts.json` and the session secret live. Use the mounted disk. |

Ready-made configs are in the repo: **`Dockerfile`** + **`fly.toml`** (Fly.io, 1 GB volume),
**`render.yaml`** (Render blueprint), and a generic container path for Railway or a VPS.
Full instructions, including the post-deploy checklist, are in **[DEPLOY.md](DEPLOY.md)**.

A GitHub Pages preview is at `https://jaiek2k25.github.io/PASHco/`. It runs entirely in the
browser, so accounts and live AI are unavailable there — see [DEPLOY.md](DEPLOY.md). The committed
`site/` folder is that build; regenerate it with `npm run build:pages` after changing app code.

## Reading uploaded documents

Uploads are parsed **in the browser** — the file never leaves the device just to be read.

| Format | How it is read |
| --- | --- |
| PDF | `pdfjs-dist` text layer, line-grouped by position |
| Word `.docx` | `mammoth`, keeping headings, lists, and tables |
| PowerPoint `.pptx` | slide XML, plus speaker notes |
| Excel `.xlsx` | shared strings and sheet rows |
| TXT / MD / CSV / JSON / HTML / RTF | direct text (HTML scripts and styles stripped) |
| Images | downscaled on canvas, then transcribed by the vision model (needs a key) |
| Legacy `.doc` / `.ppt` / `.xls` | refused with instructions to re-save as a modern format |

Long documents are not silently cut off. Anything over ~28k characters is split into chunks,
each chunk is summarised through the AI, and the summaries are combined to write the study set —
so a 40-page PDF contributes all of its pages, not just the first few. Extremely long files are
capped at 12 chunks and the UI says so.

Documents can be added when creating flashcards, quizzes, study guides, or exam prep, when
asking the solver a question, and when creating a whiteboard lesson.

The parsers are dynamically imported: a visitor who never uploads a PDF never downloads the PDF
engine (the main bundle is unchanged in practice).

## AI keys: one per user

WeSolve does not ship a shared key. **Every user connects their own**, so each person pays for
their own inference and nobody can spend someone else's credits.

| Where the user is | Where the key lives | Lifetime |
| --- | --- | --- |
| Signed in | Encrypted on their account (AES-256-GCM, key derived from the server secret) | Follows them to every device |
| Guest | `localStorage` in that browser | Until they clear site data |
| Both | Never in the workspace sync, never returned to any browser | — |

The API only ever exposes a masked hint (`nvapi-••••1234`). Plaintext keys exist in memory for
the duration of one upstream request and are never logged or written unencrypted.

Requests are paid for by the caller's own key, so rate limits are abuse protection rather than
budget protection: 20 requests per 30 s and 200 per 5 min per identity. A site owner can still
opt into a shared key for a demo by setting **both** `NVIDIA_API_KEY` and
`WESOLVE_SHARED_KEY=true`; in that mode the tighter allowance (4 / 30 s, 12 / 5 min) applies to
protect the shared budget. A user's own key always takes precedence over a shared one.

The **API base URL** field accepts any OpenAI-compatible endpoint, so DeepSeek, Groq, OpenRouter,
Together, or a self-hosted gateway work with the matching model id:

```text
Base URL  https://integrate.api.nvidia.com/v1    Model  deepseek-ai/deepseek-r1
Base URL  https://api.groq.com/openai/v1         Model  llama-3.3-70b-versatile
Base URL  https://openrouter.ai/api/v1           Model  deepseek/deepseek-r1
```

URLs must use HTTPS. Loopback addresses are only accepted while the app itself runs on localhost,
and private network ranges are rejected, so the proxy cannot be pointed at internal services.

## NVIDIA AI setup## NVIDIA AI setup

The app now supports real NVIDIA Build inference through a **same-origin server proxy**. The browser never needs to call NVIDIA directly, which avoids CORS issues and keeps server keys out of the front-end bundle.

### Option A — recommended server key

1. Copy `.env.example` to `.env.local`.
2. Add your key to `NVIDIA_API_KEY` (starts with `nvapi-`).
3. Optionally set `NVIDIA_MODEL` and `NVIDIA_VISION_MODEL`.
4. Restart the dev server.

`.env.local` is ignored by Git. Never commit an API key.

### Option B — personal browser-stored key (BYOK)

Open **Connect AI** in the website header or **AI on / Connect AI** in the workspace topbar. Paste the key into the settings modal; it is saved in this browser’s `localStorage` and sent only to the same-origin `/api/ai` proxy. This is convenient for a personal local app, but a shared browser profile should use Option A instead.

The proxy supports:
- AI solver answers and verification
- Image OCR / visual question reading with a vision model
- AI-generated study guides, flashcards, quizzes, and cheat sheets
- AI research drafts
- AI lecture notes
- AI tutor follow-up answers
- AI exam-topic predictions and review plans

If no key is configured, or NVIDIA returns an error, every tool automatically falls back to the deterministic local engine. This keeps the site usable offline.

## Account storage

Accounts live in `server/data/accounts.json`, and the session signing secret lives in `server/data/session-secret`. Both are created on first use, mode `0600`, and ignored by Git. Use `WESOLVE_DATA_DIR` to point at a persistent volume in production, or `WESOLVE_SESSION_SECRET` to pin the signing secret.

Passwords are hashed with Node's `scrypt` (N=16384, 64-byte key). Login and registration are rate-limited per IP. State-changing requests require a same-origin check plus an `X-Requested-With: wesolve` header, and cookies are HTTP-only and SameSite=Lax.

## About the local fallback

The deterministic engine uses Math.js for safe expression parsing and symbolic differentiation. Study packs, research drafts, notes, and exam predictions use explainable text heuristics. Browser-native Speech Recognition, Speech Synthesis, MediaRecorder, Canvas, Clipboard, and Print APIs provide the interactive features.

Demo Pro activation, app-store buttons, and extension install actions remain simulated. No audio or uploaded file is stored on a server. With NVIDIA AI enabled, the text or image content you submit is sent to NVIDIA through the proxy to generate a response.

## Branding

The product is branded **WeSolve** (`wesolve.ai`). Brand marks live in `src/components/Brand.jsx` and `public/favicon.svg`; page titles live in `src/App.jsx` (`PAGE_TITLES`). User state is stored under `wesolve-v1` in local storage and, for signed-in users, in the account database.
