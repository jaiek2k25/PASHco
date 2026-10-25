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
