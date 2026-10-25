import { Buffer } from 'node:buffer'
import { aiKeyStatus, getAiCredentials, readSession } from './authStore.js'
import { DEFAULT_BASE_URL, chatCompletionsUrl, validateBaseUrl } from './aiEndpoint.js'

const DEFAULT_TEXT_MODEL = 'meta/llama-3.3-70b-instruct'
const DEFAULT_VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct'
const MAX_BODY_BYTES = 12 * 1024 * 1024

// Quota guards. A shared server key is a single pool of NVIDIA credits, so every
// caller gets a burst limit and a rolling window limit. Signed-in accounts get a
// larger allowance than anonymous visitors.
const LIMITS = {
  // Abuse protection only: the caller pays for their own tokens.
  personal: { burst: { max: 20, windowMs: 30 * 1000 }, window: { max: 200, windowMs: 5 * 60 * 1000 } },
  // Opt-in shared server key = one shared budget, so it stays tighter.
  shared: { burst: { max: 4, windowMs: 30 * 1000 }, window: { max: 12, windowMs: 5 * 60 * 1000 } },
}

const buckets = new Map()

function takeToken(key, max, windowMs) {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || entry.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, reset: now + windowMs }
  }
  if (entry.count >= max) return { ok: false, reset: entry.reset }
  entry.count += 1
  return { ok: true, reset: entry.reset }
}

function pruneBuckets(now) {
  if (buckets.size < 2000) return
  for (const [key, entry] of buckets) if (entry.reset <= now) buckets.delete(key)
}

function checkRateLimit(identity, tier) {
  const limits = LIMITS[tier]
  pruneBuckets(Date.now())
  const burst = takeToken(`${identity}:burst`, limits.burst.max, limits.burst.windowMs)
  if (!burst.ok) return { ok: false, retryAfter: Math.max(1, Math.ceil((burst.reset - Date.now()) / 1000)), scope: 'burst' }
  const window = takeToken(`${identity}:window`, limits.window.max, limits.window.windowMs)
  if (!window.ok) return { ok: false, retryAfter: Math.max(1, Math.ceil((window.reset - Date.now()) / 1000)), scope: 'window' }
  return { ok: true }
}

function parseCookies(header = '') {
  const result = {}
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    try {
      result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
    } catch {
      result[part.slice(0, index).trim()] = part.slice(index + 1).trim()
    }
  }
  return result
}

function callerIdentity(req) {
  const user = readSession(parseCookies(req.headers.cookie).wesolve_session)
  if (user) return { id: `user:${user.id}`, tier: 'account' }
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return { id: `ip:${forwarded || req.socket?.remoteAddress || 'unknown'}`, tier: 'anonymous' }
}

/**
 * Resolve the endpoint for this request: explicit per-browser override, then the
 * endpoint saved on the signed-in account, then the server default.
 */
function resolveBaseUrl(req, env, account) {
  const headerValue = req.headers['x-ai-base-url']
  const header = Array.isArray(headerValue) ? headerValue[0] : headerValue
  const candidate = header || account?.baseUrl || process.env.NVIDIA_BASE_URL || env.NVIDIA_BASE_URL || DEFAULT_BASE_URL
  const { url, error } = validateBaseUrl(candidate, { req })
  if (error) throw Object.assign(new Error(error), { status: 400 })
  return url || DEFAULT_BASE_URL
}

const TASK_CONFIG = {
  solve: {
    maxTokens: 3000,
    temperature: 0.2,
    system: 'You are WeSolve, an expert multi-subject tutor. Solve accurately, show clear steps, and verify the result. Return ONLY a single valid JSON object. Do not use markdown code fences.',
    schema: `Return this exact JSON shape:
{
  "subject": "string",
  "finalAnswer": "short final answer",
  "answerText": "one-sentence explanation",
  "confidence": 0,
  "steps": [{"title":"string","body":"string","math":"optional string"}],
  "checks": ["verification label"],
  "followups": ["follow-up question"],
  "graph": null
}
For graph, return null unless the question is clearly about a quadratic/linear function. If relevant, return {"kind":"quadratic","a":1,"b":0,"c":0,"roots":[]}. Keep 3-5 steps and 3-4 follow-ups.`,
  },
  'study-pack': {
    maxTokens: 6000,
    temperature: 0.35,
    system: 'You are an expert instructional designer. Convert source material into accurate, study-ready JSON. Return ONLY a single valid JSON object. Do not use markdown code fences.',
    schema: `Return this exact JSON shape:
{
  "title": "string",
  "summary": "string",
  "keywords": ["string"],
  "flashcards": [{"front":"string","back":"string","topic":"string"}],
  "quiz": [{"prompt":"string","options":["A","B","C","D"],"correctIndex":0,"explanation":"string","topic":"string"}],
  "guide": {
    "summary": "string",
    "topics": [{"name":"string","mastery":0,"bullets":["string"]}],
    "keyTerms": [{"term":"string","definition":"string"}],
    "reviewQuestions": ["string"],
    "examples": ["string"]
  },
  "predictedTopics": [{"topic":"string","likelihood":0,"mastery":0}],
  "cheatSheet": ["string"]
}
Generate 10-14 flashcards, 8 quiz questions with exactly 4 options each, 5-7 topics, 6 key terms, 5 review questions, and 6 cheat-sheet lines. Base everything on the supplied material.`,
  },
  research: {
    maxTokens: 6000,
    temperature: 0.45,
    system: 'You are an academic research assistant. Produce a balanced, source-aware draft. Return ONLY a single valid JSON object. Do not use markdown code fences and do not invent citations.',
    schema: `Return this exact JSON shape:
{
  "title": "string",
  "sections": [{"heading":"string","paragraphs":["string"]}],
  "references": ["string"]
}
Use 4 sections: Introduction, Key findings, Analysis, Conclusion. Each section needs 1-2 substantial paragraphs. Use only supplied sources and clearly qualify unsupported claims.`,
  },
  notes: {
    maxTokens: 3000,
    temperature: 0.3,
    system: 'You are an expert lecture note taker. Convert transcripts into concise, structured notes. Return ONLY a single valid JSON object. Do not use markdown code fences.',
    schema: `Return this exact JSON shape:
{
  "summary": "string",
  "keyPoints": ["string"],
  "keywords": ["string"],
  "actionItems": ["string"]
}
Generate 6-10 key points, 6-10 keywords, and 3 action items.`,
  },
  tutor: {
    maxTokens: 1500,
    temperature: 0.4,
    system: 'You are a patient one-on-one tutor. Explain clearly, adapt to the learner, and never simply give up. Return ONLY a single valid JSON object. Do not use markdown code fences.',
    schema: 'Return {"answer":"string"}. Keep the answer conversational, accurate, and under 180 words.',
  },
  ocr: {
    maxTokens: 1600,
    temperature: 0.1,
    vision: true,
    system: 'You are an expert OCR and homework-question reader. Read all visible mathematical notation and text carefully. Return ONLY a single valid JSON object. Do not use markdown code fences.',
    schema: 'Return {"text":"exact transcription","subject":"best guess","notes":"brief description of diagrams or ambiguity"}. Preserve equations using plain text with ^ for powers and * for multiplication.',
  },
  lesson: {
    maxTokens: 4000,
    temperature: 0.5,
    system: 'You are an expert whiteboard tutor. Turn a topic, question, or source material into a short spoken-and-written lesson. Return ONLY a single valid JSON object. Do not use markdown code fences.',
    schema: `Return this exact JSON shape:
{
  "title": "string",
  "subject": "string",
  "steps": [
    {
      "lines": ["short handwritten line", "another line"],
      "note": "one-sentence description of this step",
      "speech": "what the tutor says out loud (1-2 sentences)",
      "sketch": "parabola | leaf | chloroplast | cycle | chromosomes | cells | tangent | null"
    }
  ],
  "checkpoint": {
    "prompt": "string",
    "options": ["string", "string", "string"],
    "correctIndex": 0
  }
}
Rules: 4-6 steps. Every step needs 2-4 lines, each under 58 characters. Use plain text maths with ^ for powers and Unicode symbols where helpful. Choose a sketch only when it genuinely helps. Make the checkpoint test the core idea.`,
  },
  exam: {
    maxTokens: 4000,
    temperature: 0.35,
    system: 'You are an exam prediction assistant. Analyze supplied material and produce realistic study priorities. Return ONLY a single valid JSON object. Do not use markdown code fences.',
    schema: `Return this exact JSON shape:
{
  "predictedTopics": [{"topic":"string","likelihood":0,"mastery":0}],
  "weakTopics": ["string"],
  "reviewPlan": [{"day":"string","topic":"string","task":"string","minutes":0}]
}
Generate 6 predicted topics and a 7-day plan. Likelihood and mastery are numbers from 0 to 100.`,
  },
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('Invalid JSON body.'))
      }
    })
    req.on('error', reject)
  })
}

function safeString(value, max = 24000) {
  return String(value ?? '').slice(0, max)
}

function extractJson(text) {
  const cleaned = safeString(text, 200000)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first === -1 || last <= first) throw new Error('The model did not return a JSON object.')
  return JSON.parse(cleaned.slice(first, last + 1))
}

const sharedKeyEnabled = () => String(process.env.WESOLVE_SHARED_KEY || '').toLowerCase() === 'true'

function headerKey(req) {
  const value = req.headers['x-ai-api-key'] ?? req.headers['x-nvidia-api-key']
  return safeString(Array.isArray(value) ? value[0] : value || '', 2000).trim()
}

/**
 * Every user brings their own key. Resolution order:
 *   1. an explicit per-request key (a guest keeps theirs in this browser)
 *   2. the key saved on the signed-in account, encrypted at rest
 *   3. an opt-in shared server key, only when WESOLVE_SHARED_KEY=true
 */
function resolveCredentials(req, env) {
  const sessionUser = readSession(parseCookies(req.headers.cookie).wesolve_session)
  const account = sessionUser
    ? getAiCredentials(sessionUser)
    : { key: '', baseUrl: '', model: '', visionModel: '' }
  const personal = headerKey(req)
  const shared = sharedKeyEnabled() ? safeString(process.env.NVIDIA_API_KEY || env.NVIDIA_API_KEY || '', 2000).trim() : ''
  const key = personal || account.key || shared
  const source = personal ? 'browser' : account.key ? 'account' : shared ? 'shared' : 'none'
  return { key, source, account, user: sessionUser, sharedAvailable: Boolean(shared) }
}

function buildMessages(task, payload) {
  const config = TASK_CONFIG[task]
  const context = safeString(JSON.stringify(payload || {}), 30000)
  if (config.vision) {
    const image = safeString(payload?.image || '', MAX_BODY_BYTES)
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(image)) {
      throw new Error('A base64 image data URL is required for OCR.')
    }
    return [
      { role: 'system', content: `${config.system}\n\n${config.schema}` },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe the homework question or study material in this image accurately.' },
          { type: 'image_url', image_url: { url: image } },
        ],
      },
    ]
  }
  return [
    { role: 'system', content: `${config.system}\n\n${config.schema}` },
    { role: 'user', content: `Task: ${task}\n\nUse this data:\n${context}` },
  ]
}

export function createAiHandler(env = {}) {
  return async (req, res) => {
    let path = new URL(req.url || '/', 'http://localhost').pathname.replace(/\/$/, '') || '/'
    // Support both Connect-style mounts (path already stripped) and a raw
    // Node server that forwards the full /api/ai/... URL.
    const marker = '/api/ai'
    const markerIndex = path.indexOf(marker)
    if (markerIndex !== -1) {
      path = path.slice(markerIndex + marker.length).replace(/\/$/, '') || '/'
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Allow', 'GET, POST, OPTIONS')
      res.end()
      return
    }

    // Lets the front-end know it is talking to a real server before it offers
    // sign-in or account key storage.
    if (req.method === 'GET' && path === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'wesolve',
        ai: true,
        accounts: true,
        sharedKey: sharedKeyEnabled(),
        time: new Date().toISOString(),
      })
      return
    }

    if (req.method === 'GET' && (path === '/status' || path === '/')) {
      const { key, source, account, user, sharedAvailable } = resolveCredentials(req, env)
      sendJson(res, 200, {
        configured: Boolean(key),
        keySource: source,
        hint: aiKeyStatus(user).hint || '',
        model: safeString(account.model || process.env.NVIDIA_MODEL || env.NVIDIA_MODEL || DEFAULT_TEXT_MODEL, 200),
        visionModel: safeString(account.visionModel || process.env.NVIDIA_VISION_MODEL || env.NVIDIA_VISION_MODEL || DEFAULT_VISION_MODEL, 200),
        baseUrl: account.baseUrl || '',
        provider: account.baseUrl || process.env.NVIDIA_BASE_URL || DEFAULT_BASE_URL,
        signedIn: Boolean(user),
        accountKeySaved: aiKeyStatus(user).configured,
        sharedKeyAvailable: sharedAvailable,
      })
      return
    }

    if (req.method !== 'POST' || path !== '/') {
      sendJson(res, 404, { error: 'Not found.' })
      return
    }

    let body
    try {
      body = await readBody(req)
    } catch (error) {
      sendJson(res, 400, { error: error.message })
      return
    }

    const task = safeString(body?.task || '', 80)
    const config = TASK_CONFIG[task]
    if (!config) {
      sendJson(res, 400, { error: 'Unsupported AI task.' })
      return
    }

    const credentials = resolveCredentials(req, env)

    let baseUrl
    try {
      baseUrl = resolveBaseUrl(req, env, credentials.account)
    } catch (error) {
      sendJson(res, error.status || 400, { error: error.message, code: 'BAD_BASE_URL' })
      return
    }

    if (!credentials.key) {
      sendJson(res, 503, {
        error: credentials.user
          ? 'Connect your own AI key in Settings to turn on live AI. It is stored encrypted on your account.'
          : 'Connect your own AI key in Settings to turn on live AI.',
        code: 'NO_API_KEY',
      })
      return
    }

    const model = config.vision
      ? safeString(body.model || credentials.account.visionModel || process.env.NVIDIA_VISION_MODEL || env.NVIDIA_VISION_MODEL || DEFAULT_VISION_MODEL, 200)
      : safeString(body.model || credentials.account.model || process.env.NVIDIA_MODEL || env.NVIDIA_MODEL || DEFAULT_TEXT_MODEL, 200)

    let messages
    try {
      messages = buildMessages(task, body.payload || {})
    } catch (error) {
      sendJson(res, 400, { error: error.message })
      return
    }

    // Protect the configured key's quota: a shared server key would otherwise let
    // one visitor drain it. Personal browser keys still share the per-IP limit.
    const caller = callerIdentity(req)
    const tier = credentials.source === 'shared' ? 'shared' : 'personal'
    const limit = checkRateLimit(caller.id, tier)
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfter))
      sendJson(res, 429, {
        error: limit.scope === 'burst'
          ? 'You are sending requests too quickly. Give it a few seconds.'
          : 'You have reached the AI usage limit for now. Try again shortly.',
        code: 'RATE_LIMITED',
        retryAfter: limit.retryAfter,
        tier,
      })
      return
    }
    const endpoint = chatCompletionsUrl(baseUrl)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: safeString(body.model || model, 200),
          messages,
          max_tokens: Math.min(Math.max(Number(body.maxTokens) || config.maxTokens, 128), 8192),
          temperature: config.temperature,
          top_p: 0.85,
          stream: false,
        }),
        signal: controller.signal,
      })

      const rawText = await upstream.text()
      let upstreamData = {}
      try {
        upstreamData = JSON.parse(rawText)
      } catch {
        upstreamData = { detail: rawText.slice(0, 500) }
      }

      if (!upstream.ok) {
        const detail = upstreamData?.detail || upstreamData?.message || upstreamData?.error?.message || `NVIDIA returned HTTP ${upstream.status}.`
        sendJson(res, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502, {
          error: 'The AI provider rejected the request.',
          detail: safeString(detail, 500),
          code: upstream.status === 401 ? 'INVALID_KEY' : upstream.status === 403 ? 'NO_INFERENCE_ACCESS' : upstream.status === 429 ? 'UPSTREAM_RATE_LIMITED' : 'UPSTREAM_ERROR',
          retryAfter: Number(upstream.headers.get('retry-after')) || undefined,
        })
        return
      }

      const content = upstreamData?.choices?.[0]?.message?.content || upstreamData?.choices?.[0]?.message?.reasoning_content || ''
      if (!content) {
        sendJson(res, 502, { error: 'The AI model returned an empty response.', code: 'EMPTY_RESPONSE' })
        return
      }

      let data
      try {
        data = extractJson(typeof content === 'string' ? content : JSON.stringify(content))
      } catch {
        data = { text: safeString(typeof content === 'string' ? content : JSON.stringify(content), 12000) }
      }

      sendJson(res, 200, {
        ok: true,
        task,
        data,
        model: safeString(body.model || model, 200),
        usage: upstreamData.usage || null,
      })
    } catch (error) {
      sendJson(res, 504, {
        error: error.name === 'AbortError' ? 'The NVIDIA request timed out.' : 'Could not reach the NVIDIA API.',
        detail: safeString(error.message, 300),
        code: error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      })
    } finally {
      clearTimeout(timeout)
    }
  }
}

export function nvidiaAiPlugin(env = {}) {
  return {
    name: 'pashco-nvidia-ai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai', createAiHandler(env))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/ai', createAiHandler(env))
    },
  }
}
