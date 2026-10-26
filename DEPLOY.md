# Deploying WeSolve

WeSolve is a single Node service: it serves the built React app, proxies AI calls to NVIDIA,
and stores accounts + synced workspaces on disk. That means it needs **a Node host with a
persistent disk** — a purely static host (Netlify, GitHub Pages, Vercel static) will serve the
pages but the AI proxy and accounts will not work.

Three required settings:

| Variable | Purpose |
| --- | --- |
| `NVIDIA_API_KEY` | **Not required.** Each user connects their own key in Settings. Add this plus `WESOLVE_SHARED_KEY=true` only if you want to pay for everyone. |
| `WESOLVE_SESSION_SECRET` | 32+ random bytes that sign session cookies **and encrypt each account's saved AI key**. If unset, one is generated in the data directory — but set it explicitly so keys survive a redeploy. |
| `WESOLVE_DATA_DIR` | Directory holding `accounts.json` + the session secret. Must be the mounted persistent disk. |

Rotate `WESOLVE_SESSION_SECRET` to sign every existing session out.

## GitHub Pages (static preview only)

`https://jaiek2k25.github.io/PASHco/`

Pages can be configured two ways, and this repo works with both:

| Pages source | How the site gets built |
| --- | --- |
| **GitHub Actions** (preferred) | `.github/workflows/deploy-pages.yml` builds `dist/` and publishes it |
| **Deploy from a branch** | `npm run build:pages` writes a committed `site/` bundle; the root `index.html` loads it when its dev entry is missing |

The branch mode exists because a plain Vite repo cannot be served from source: the checked-in
`index.html` points at `/src/main.jsx`, which a browser cannot execute. That is why the URL used
to render a blank page. The shell now detects the failed request and boots `site/app.js` instead,
and `404.html` keeps deep links working without a server.

After changing app code, refresh the committed bundle:

```bash
npm run build:pages     # rebuilds site/ and 404.html
```

For a custom domain, set `PAGES_CNAME=wesolve.ai` when building so a `CNAME` file is written, and
point the domain's DNS at GitHub Pages. Use `VITE_BASE_PATH=/` for a domain that serves from the
root.

**What works there:** the landing page, pricing, and the whole app in guest mode — solver,
whiteboard, flashcards, quizzes, study packs — using the local engine, with work saved in the
browser.

**What cannot work there:** accounts and live AI. Pages serves files only; there is no Node
process for `/api/auth` or `/api/ai`. A notice in the app says so.

## Option 1 — Fly.io (recommended: persistent volume, cheap, always on)

```bash
# once
fly launch --no-deploy --copy-config      # uses fly.toml + Dockerfile
fly volumes create wesolve_data --size 1
fly secrets set NVIDIA_API_KEY=nvapi-xxxxxxxx WESOLVE_SESSION_SECRET=$(openssl rand -hex 32)
fly deploy
fly open
```

`fly.toml` already sets `WESOLVE_DATA_DIR=/data` and mounts `wesolve_data` there. Redeploy with
`fly deploy` after pulling changes.

## Option 2 — Render (Blueprint)

1. Push this repo to GitHub (already done).
2. Render dashboard → **New → Blueprint** → select the repo. `render.yaml` is detected.
3. Enter `NVIDIA_API_KEY` when prompted; Render generates `WESOLVE_SESSION_SECRET`.
4. Apply. The disk `wesolve-data` is mounted at `/var/data`.

The blueprint uses the `starter` plan because Render's free tier does not allow a disk.

## Option 3 — Railway / any container host

Railway → **New Project → Deploy from GitHub repo**, add a volume mounted at `/data`, then set
the three variables. Railway builds the included `Dockerfile` automatically.

Any other host works too:

```bash
npm ci && npm run build
NVIDIA_API_KEY=... WESOLVE_SESSION_SECRET=... WESOLVE_DATA_DIR=/srv/wesolve node server/production.js
```

`PORT` and `HOST` are honoured if your platform assigns a port.

## Option 4 — your own VPS

```bash
git clone https://github.com/jaiek2k25/PASHco.git wesolve && cd wesolve
npm ci --no-audit --no-fund && npm run build
sudo mkdir -p /srv/wesolve && sudo chown $USER /srv/wesolve
sudo WESOLVE_DATA_DIR=/srv/wesolve NVIDIA_API_KEY=nvapi-... PORT=3000 node server/production.js
```

Put Caddy or Nginx in front for TLS:

```
wesolve.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

TLS matters: session cookies are marked `Secure` automatically when `X-Forwarded-Proto: https`
is present, and the browser will not send them over plain HTTP.

## Post-deploy checklist

- `https://your-domain/api/auth/me` → `{"user":null}`
- Create an account, refresh, and confirm the avatar keeps you signed in
- Solve one problem, sign out, sign back in — the solve should still be in History
- Create an account, connect a key in **Settings → AI**, sign out and back in, and confirm the masked hint persists
- Run a solve to confirm live AI is spending that account's key
- Back up the disk: the only durable state is `accounts.json` in `WESOLVE_DATA_DIR`

## Not supported on purpose

- Static-only hosting (no accounts, no AI proxy)
- Serverless/edge functions (accounts live on a disk)
- Multiple replicas without shared storage — `accounts.json` is a single-writer file

## AI runs on the Node server, never in the browser

Every AI request is a `POST /api/ai` to the WeSolve server. The browser holds
the key at most, forwards it to the server, and the server calls the provider.
Nothing is sent from the page to NVIDIA, OpenRouter, or anyone else — so
provider CORS rules, browser storage limits, and leaked keys stop mattering.

### 1. Deploy the server (one click, free)

| Host | What to do | Accounts |
| --- | --- | --- |
| Render | New → Blueprint → pick this repo. `render.yaml` is ready (`plan: free`) | reset on restart (ephemeral disk) |
| Render + disk | Switch to `plan: starter`, attach the disk block in `render.yaml` | permanent |
| Fly.io | `fly launch --no-deploy --copy-config`, create the volume, `fly deploy` | permanent |
| Docker | `docker build -t wesolve . && docker run -p 3000:3000 -v wesolve-data:/data wesolve` | permanent |

The server serves the built app *and* the API on the same URL, so the simplest
result is to use that URL directly and skip GitHub Pages.

### 2. Point the static build at it (optional)

The GitHub Pages build is only the interface. Open **Connect AI → WeSolve
server**, paste the deployed URL, press **Connect**. From then on:

- AI calls go `page → your server → provider`;
- sign-in and account sync use that server (session cookie set for cross-site);
- the status line in the app reads `SERVER CONNECTED`.

Cross-origin access is controlled by `WESOLVE_ALLOWED_ORIGINS` on the server.
The default already allows `https://jaiek2k25.github.io` plus localhost. Add
your own origin if you fork the front end:

```bash
WESOLVE_ALLOWED_ORIGINS=https://jaiek2k25.github.io,https://your-frontend.example
```

### 3. Connect an AI key

Each person uses their own key (NVIDIA, OpenRouter, Groq, Gemini, DeepSeek, or
any OpenAI-compatible endpoint). Signed in, the key is stored encrypted on the
account; otherwise it stays in the browser and is forwarded per request.
