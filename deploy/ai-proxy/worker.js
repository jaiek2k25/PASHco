/**
 * WeSolve AI proxy — a single Cloudflare Worker.
 *
 * Browsers cannot call NVIDIA (or most providers) directly because those APIs
 * do not send CORS headers. This worker forwards the request and adds CORS
 * headers, so the static WeSolve build gets real AI answers.
 *
 * Deploy (no account needed beyond Cloudflare's free tier):
 *   1. npx wrangler deploy deploy/ai-proxy/worker.js --name wesolve-ai --compatibility-date 2024-11-01
 *   2. In WeSolve → Connect AI → set "API base URL" to
 *        https://wesolve-ai.<your-subdomain>.workers.dev/v1
 *      and pick the NVIDIA preset, or enter your provider's model name.
 *
 * The user's own key travels in the Authorization header; this worker never
 * stores it and adds no secrets of its own.
 */

const UPSTREAM = 'https://integrate.api.nvidia.com/v1'

function corsHeaders(request) {
  const requested = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': requested,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)
    // Everything after /v1 is forwarded upstream, so the app can use this
    // worker as a drop-in OpenAI-compatible base URL.
    const path = url.pathname.replace(/^\/v1/, '') || '/chat/completions'
    const target = `${UPSTREAM}${path.startsWith('/') ? path : `/${path}`}`

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Use POST /v1/chat/completions.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      })
    }

    const authorization = request.headers.get('Authorization') || ''
    if (!authorization.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing Authorization: Bearer <your key> header.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      })
    }

    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: await request.text(),
    })

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        ...corsHeaders(request),
      },
    })
  },
}
