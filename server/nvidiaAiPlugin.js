import { Buffer } from 'node:buffer'

const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const DEFAULT_TEXT_MODEL = 'meta/llama-3.3-70b-instruct'
const DEFAULT_VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct'
const MAX_BODY_BYTES = 12 * 1024 * 1024

const TASK_CONFIG = {
  solve: {
    maxTokens: 3000,
    temperature: 0.2,
    system: 'You are Solvely, an expert multi-subject tutor. Solve accurately, show clear steps, and verify the result. Return ONLY a single valid JSON object. Do not use markdown code fences.',
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

function getKey(req, env) {
  const headerValue = req.headers['x-nvidia-api-key']
  const headerKey = Array.isArray(headerValue) ? headerValue[0] : headerValue
  return safeString(headerKey || process.env.NVIDIA_API_KEY || env.NVIDIA_API_KEY || '', 2000).trim()
}

function getSetting(body, env, key, fallback) {
  return safeString(body?.[key] || process.env[key] || env[key] || fallback, 200).trim() || fallback
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

    if (req.method === 'GET' && (path === '/status' || path === '/')) {
      const key = getKey(req, env)
      sendJson(res, 200, {
        configured: Boolean(key),
        keySource: req.headers['x-nvidia-api-key'] ? 'browser' : key ? 'server' : 'none',
        model: getSetting({}, env, 'NVIDIA_MODEL', DEFAULT_TEXT_MODEL),
        visionModel: getSetting({}, env, 'NVIDIA_VISION_MODEL', DEFAULT_VISION_MODEL),
        googleOAuthConfigured: Boolean(process.env.VITE_GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID),
        provider: 'NVIDIA build.nvidia.com',
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

    const key = getKey(req, env)
    if (!key) {
      sendJson(res, 503, {
        error: 'No NVIDIA API key configured. Add one in AI Settings or set NVIDIA_API_KEY on the server.',
        code: 'NO_API_KEY',
      })
      return
    }

    const model = config.vision
      ? getSetting(body, env, 'NVIDIA_VISION_MODEL', DEFAULT_VISION_MODEL)
      : getSetting(body, env, 'NVIDIA_MODEL', DEFAULT_TEXT_MODEL)

    let messages
    try {
      messages = buildMessages(task, body.payload || {})
    } catch (error) {
      sendJson(res, 400, { error: error.message })
      return
    }

    const baseUrl = getSetting({}, env, 'NVIDIA_BASE_URL', DEFAULT_NVIDIA_BASE_URL).replace(/\/$/, '')
    const endpoint = /\/chat\/completions$/.test(baseUrl) ? baseUrl : `${baseUrl}/chat/completions`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
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
          error: 'NVIDIA AI request failed.',
          detail: safeString(detail, 500),
          code: upstream.status === 401 ? 'INVALID_KEY' : upstream.status === 403 ? 'NO_INFERENCE_ACCESS' : 'UPSTREAM_ERROR',
        })
        return
      }

      const content = upstreamData?.choices?.[0]?.message?.content || upstreamData?.choices?.[0]?.message?.reasoning_content || ''
      if (!content) {
        sendJson(res, 502, { error: 'The NVIDIA model returned an empty response.', code: 'EMPTY_RESPONSE' })
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
