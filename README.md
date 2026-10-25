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

The app needs a **Node process** so the `/api/ai` proxy and `/api/auth` account service can run.

1. Push this repository to GitHub.
2. Create a Node web service on Vercel, Render, Railway, Fly.io, or any VPS.
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add the `NVIDIA_API_KEY` environment variable (plus optional model overrides) and mount a persistent volume for `server/data`.
6. Set the service port to the platform’s `PORT` (the server already reads `process.env.PORT`).

Static hosts such as GitHub Pages or plain S3 cannot run the proxy. On those, the app still works with the deterministic local engine; the browser can also attempt a direct NVIDIA call with a BYOK key, but that depends on NVIDIA’s CORS policy and exposes the key to the browser.

Accounts and workspace sync need the Node process (or a Node-compatible host) so `/api/auth` is available. On a purely static host the app still works in guest mode.

## NVIDIA AI setup

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
