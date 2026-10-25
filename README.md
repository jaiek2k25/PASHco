# PASHco — Active Learning Arena

PASHco is a dark-theme learning MVP with shape-coded retrieval quizzes, 15 high-duration course-track outlines, sample course modules, account-scoped progress, a rewards vault, and shareable scorecards.

## Run locally

```bash
npm install
npm run dev
```

Create a local `.env.local` from `.env.example` to configure Google Identity Services, the progress API, and the secure course-generator endpoint. The Google client ID is public; **do not add a Google client secret or a NVIDIA NIM API key to this frontend**. The app now uses separate hash-routed pages with a YouTube-style dark top bar/search/sidebar and a Duolingo-inspired course path. The supplied Solvely link is treated as a high-level product reference; this repo does not fetch or copy its assets.

## Google sign-in and progress

1. Create an OAuth **Web application** client ID in Google Cloud Console.
2. Add the app’s development/production origin to **Authorized JavaScript origins**.
3. Set `VITE_GOOGLE_CLIENT_ID` in `.env.local`, or enter the client ID on the Google & API settings page and save settings.
4. Open Profile and sign in with the Google Identity Services button. The sign-in is real, not a local account selector; the ID token is kept in memory only.

The app reads the Google OpenID Connect `sub` claim and uses it to key each account’s progress separately in this browser. Google ID tokens are held in memory only, not written to browser storage. On reload, the learner signs in again to reopen the same local progress record.

**Local account progress is not cloud sync.** Remote persistence is disabled until a progress API URL is configured. A configured server must verify the Google ID token’s signature, issuer, audience, and expiry, then upsert the learner by the verified `sub` claim. Client-side JWT decoding is only for displaying the profile and is not server-side authentication.

## Progress API contract

Configure an HTTPS endpoint on the Google & API settings page. Before writing, PASHco performs a `GET` with `Authorization: Bearer <Google ID token>` to restore the account record. Return `200` with `{ "googleSub": "<verified-sub>", "progress": { ... } }` when a record exists, or `404` when no record exists yet. A lookup error or subject mismatch pauses automatic writes so local progress cannot silently overwrite remote data. PASHco sends a `POST` with JSON and the same Bearer token after a valid snapshot or confirmed `404`. The server must enable CORS for the deployed app origin and allow `GET`, `POST`, `Content-Type`, and `Authorization`.

Example request shape:

```json
{
  "platform": "PASHco",
  "action": "SYNC_PROGRESS",
  "occurredAt": "2026-10-17T12:00:00.000Z",
  "contactEmail": "cyberjai2k25@gmail.com",
  "instagram": "love_me_for_my_wits",
  "googleSub": "verified-google-subject",
  "email": "learner@example.com",
  "progress": {
    "xp": 0,
    "arenaPoints": 0,
    "completedLessonIds": [],
    "solvedChallengeIds": [],
    "calibrationObservations": [],
    "courseReviewById": {}
  }
}
```

Example `GET` response for an existing account:

```json
{
  "googleSub": "verified-google-subject",
  "progress": {
    "xp": 120,
    "arenaPoints": 450,
    "completedLessonIds": ["lesson-1"],
    "activityDates": ["2026-10-17"],
    "courseReviewById": {}
  }
}
```

Other `POST` actions are `GOOGLE_AUTH`, `COURSE_COMPLETE`, and `CLAIM_REWARD`. Return a successful 2xx response after validation and persistence. If no API URL is configured or the network is unavailable, progress remains in local browser storage. Never trust the submitted email or `googleSub` without validating the bearer token on the server.

## AI Course Studio and NVIDIA NIM

The AI Course Studio calls a separately hosted HTTPS backend at `VITE_PASHCO_COURSE_API_URL` (or the URL saved in Google & API settings). It sends the signed-in user's Google ID token as a Bearer token and a bounded course-design request. The server verifies the Google ID token, applies a per-account request limit, calls the configured NVIDIA NIM model, validates the returned outline, and responds with course objectives and sample retrieval questions.

**GitHub Pages is a static host and cannot keep a provider secret private. Do not encode, obfuscate, or place an NVIDIA NIM API key in React code, `VITE_*` variables, the Pages artifact, or browser storage; anyone can recover it from a deployed site.** The key belongs only in the API host's server-side environment variable `NVIDIA_NIM_API_KEY`. The API example is in `server/`; copy `server/.env.example` to a private server environment, set the Google client ID and NVIDIA key there, and set `ALLOWED_ORIGINS` to the exact development and GitHub Pages origins. Configure `VITE_PASHCO_COURSE_API_URL` to the backend route `/api/courses/generate`.

Run the API locally with Node 20+:

```bash
cd server
npm install
cp .env.example .env
# Add the Google client ID and NVIDIA key to server/.env (never commit that file)
npm start
```

The frontend may be hosted on GitHub Pages, but the course API must run on a separate server/serverless host with HTTPS, CORS, and its secret environment variables. Generated outlines are drafts and require human review. Provider quotas, rate limits, and terms still apply even if a key is described as unlimited.

The Pages workflow in `.github/workflows/pages.yml` builds `/PASHco/` assets. Add the public client ID and API URLs as GitHub Actions **Variables** (`VITE_GOOGLE_CLIENT_ID`, `VITE_PASHCO_API_URL`, `VITE_PASHCO_COURSE_API_URL`), not as secrets embedded in a browser build. Never set the NVIDIA API key as a frontend build variable.

## Curriculum scope

The catalog contains **15 course tracks totaling 465 estimated study hours** (18–48 hours per track). This MVP currently includes **one sample module per track**; completing a sample module does not mean the full track or its estimated hours are complete. Profile and scorecards use this distinction.

## Learning-science approach

The learning loop uses retrieval attempts, explanatory feedback, and review suggestions informed by distributed-practice research. Confidence is compared with quiz outcomes using a Brier score. Review intervals use a small, transparent accuracy-based heuristic—not an individualized Ebbinghaus fit, memory-strength measurement, or neural measurement. Color is used for interface grouping and is paired with labels/shapes; PASHco does not claim that hues trigger specific neurotransmitters or improve cognition directly.

Selected references are listed on the Learning Science page in-app (including Roediger & Karpicke, 2006; Cepeda et al., 2006; Dunlosky et al., 2013; Fleming & Lau, 2014; and Sweller, 1988).

## Rewards, contact, and social

Rewards are account-scoped requests or local unlocks. External mentorship and social-feature requests are **not fulfilled until confirmed by the PASHco team or configured API**. Contact: [cyberjai2k25@gmail.com](mailto:cyberjai2k25@gmail.com). Instagram: [@love_me_for_my_wits](https://instagram.com/love_me_for_my_wits).

## Build

```bash
npm run build
```
