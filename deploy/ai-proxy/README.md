# Make AI work on the static site

GitHub Pages can only serve files. It cannot keep a secret, and browsers refuse
to call NVIDIA's API directly because NVIDIA does not allow cross-origin
requests. So on the Pages build, AI answers need one of these:

## Option A — a provider that allows browser calls (fastest)

OpenRouter, Groq, and Google Gemini all accept requests straight from a browser.

1. Open WeSolve → **Connect AI**.
2. Pick **OpenRouter**, **Groq**, or **Google Gemini** in *Quick set-up*.
3. Paste that provider's key and press **Test connection**.

No server, no deploy. The key stays in this browser (or on the account when the
Node server is deployed).

## Option B — a 20-second Cloudflare Worker proxy

Use this when you want to keep using your **NVIDIA** key on the Pages site.

```bash
npx wrangler deploy deploy/ai-proxy/worker.js \
  --name wesolve-ai \
  --compatibility-date 2024-11-01
```

Wrangler prints a URL such as `https://wesolve-ai.you.workers.dev`. Then:

1. WeSolve → **Connect AI**.
2. **Quick set-up** → NVIDIA.
3. **API base URL** → `https://wesolve-ai.you.workers.dev/v1`
4. Paste your `nvapi-…` key → **Test connection**.

The worker forwards only the chat-completions call, adds CORS headers, and
stores nothing. Your key travels in the `Authorization` header on each request.

> Sharing the worker URL is fine — it holds no credentials. Anyone who uses it
> still needs their own key, and the key is billed to whoever owns it.

## Option C — the full Node server (accounts + sync + no CORS trouble)

`npm start` on Fly.io, Render, Railway, a VPS, or Docker. See
[`DEPLOY.md`](../../DEPLOY.md). This is the only mode where accounts sync across
devices and AI keys are stored encrypted on the server.
