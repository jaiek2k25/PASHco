# PASHco — Solvely-style AI Study Platform

A polished, fully interactive recreation of the Solvely.ai product experience, built as a personalized PASHco demo edition. It includes the public marketing website, pricing flow, mobile/extension pages, and a complete study workspace with browser-local application logic.

## What’s included

### Public site
- Responsive landing page with product mega-menu, animated tool carousel, feature tabs, visual previews, university marquee, testimonials, free-tools collection, FAQ, and footer
- Interactive pricing page with weekly/monthly/yearly billing, plan comparison, testimonials, and FAQ
- Download/app and Chrome extension pages
- Local demo sign-in, sign-up, and account/profile flows

### Study workspace
- **AI Solver** — typed questions, quick prompts, file/image uploads, link sources, image cropper, scientific calculator, voice input, symbolic/numeric solving, step-by-step answers, interactive graphs, video-style explanations, cross-check cards, follow-up chat, feedback, and solve history
- **Whiteboard Tutor** — narrated lessons, animated board steps, freehand drawing canvas, checkpoints, follow-up chat, and print/PDF export
- **Flashcards** — generated from notes or files, flip animation, known/unknown tracking, shuffle, keyboard shortcuts, and mastery reporting
- **Quiz** — multiple-choice questions, hints, instant explanations, timer, question navigator, score report, and weak-topic analysis
- **Study Guide** — source ingestion, topic breakdown, key terms, review questions, voice playback, printable cheat sheet, and Markdown export
- **AI Research** — topic composer, source management, target length, generated report sections, references, history, copy, and download
- **AI Live Notes** — browser speech recognition, recording controls, editable transcript, generated structured notes, and one-click flashcards/quizzes
- **Exam Predictor** — exam setup, 10-question diagnostic, mock exams, predicted topics, readiness, 7-day plan, and cheat sheet
- **Library, History, and Account** — local persistence, usage stats, preferences, settings, plan switching, and workspace reset

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
npm run preview   # Preview the production build
npm run lint      # ESLint
```

## NVIDIA AI + Google OAuth setup

The app now supports real NVIDIA Build inference through a **same-origin server proxy**. The browser never needs to call NVIDIA directly, which avoids CORS issues and keeps server keys out of the front-end bundle.

### Option A — recommended server key

1. Copy `.env.example` to `.env.local`.
2. Add your key to `NVIDIA_API_KEY` (starts with `nvapi-`).
3. Optionally set `NVIDIA_MODEL`, `NVIDIA_VISION_MODEL`, and `VITE_GOOGLE_CLIENT_ID`.
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

### Google OAuth

Add `VITE_GOOGLE_CLIENT_ID` to `.env.local`, or paste the public client ID in **Connect AI → Google OAuth client ID**. The auth modal then renders Google’s official sign-in button. The returned ID token is verified against `oauth2.googleapis.com/tokeninfo` and the configured audience before a local user profile is created. Demo sign-in remains available.

## About the local fallback

The deterministic engine uses Math.js for safe expression parsing and symbolic differentiation. Study packs, research drafts, notes, and exam predictions use explainable text heuristics. Browser-native Speech Recognition, Speech Synthesis, MediaRecorder, Canvas, Clipboard, and Print APIs provide the interactive features.

Demo Pro activation, app-store buttons, and extension install actions remain simulated. No audio or uploaded file is stored on a server. With NVIDIA AI enabled, the text or image content you submit is sent to NVIDIA through the proxy to generate a response.

## Personalization

The visible brand is `solvely.ai` with a “PASHco personalized demo edition” marker. User-specific state—including name, email, education level, study goal, plan, solve history, study sets, notes, reports, and exam plans—is persisted in the browser. To rebrand completely, start with `src/components/Brand.jsx`, `src/pages/Landing.jsx`, and `src/App.jsx` (`PAGE_TITLES`).
