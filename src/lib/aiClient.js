import {
  createId,
  generateNotesSummary,
  generateResearchReport,
  generateStudyPack,
  solveProblem,
} from './intelligence'
import { getServiceSettings } from './serviceSettings'
import { getBackendState, markBackendMissing, probeBackend } from './backend'

const MODEL_LABELS = ['NVIDIA reasoning', 'Symbolic verification', 'Context review']

function clamp(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, number))
}

function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

let lastAiError = null

export function getLastAiError() {
  return lastAiError
}

/** A short, human explanation of why the last AI request could not be used. */
export function aiFallbackReason() {
  if (!lastAiError) return 'No AI provider is connected.'
  const messages = {
    NO_API_KEY: 'No AI key is connected.',
    INVALID_KEY: 'Your AI key was rejected by the provider.',
    NO_INFERENCE_ACCESS: 'This key has no access to the model endpoint.',
    RATE_LIMITED: 'The AI provider is rate limiting right now.',
    UPSTREAM_RATE_LIMITED: 'The AI provider is rate limiting right now.',
    BAD_BASE_URL: 'The API base URL is not valid.',
    NETWORK_ERROR: 'The AI provider could not be reached.',
    TIMEOUT: 'The AI provider took too long to answer.',
  }
  return messages[lastAiError.code] || lastAiError.message || 'The AI provider is unavailable.'
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.detail || data.error || `AI request failed (${response.status}).`)
    error.code = data.code
    error.status = response.status
    error.noKey = data.code === 'NO_API_KEY'
    error.retryAfter = Number(data.retryAfter) || Number(response.headers?.get?.('retry-after')) || 0
    throw error
  }
  return data
}

const DIRECT_PROMPTS = {
  solve: 'Solve this academic question accurately. Reply with ONLY JSON: {"subject","finalAnswer","answerText","confidence","steps":[{"title","body","math"}],"checks":["label"],"followups":["question"],"graph":null}. Use 3-5 steps.',
  'study-pack': 'Convert this material into study content. Reply with ONLY JSON: {"title","summary","keywords":[],"flashcards":[{"front","back","topic"}],"quiz":[{"prompt","options":["a","b","c","d"],"correctIndex":0,"explanation","topic"}],"guide":{"summary","topics":[{"name","mastery","bullets":[]}],"keyTerms":[{"term","definition"}],"reviewQuestions":[],"examples":[]},"predictedTopics":[{"topic","likelihood","mastery"}],"cheatSheet":[]}. Generate 12 flashcards, 8 quiz questions, 6 topics, 6 terms.',
  research: 'Write a balanced research draft. Reply with ONLY JSON: {"title","sections":[{"heading","paragraphs":[]}],"references":[]}. Use Introduction, Key findings, Analysis, Conclusion. Do not invent citations.',
  notes: 'Summarize this lecture transcript. Reply with ONLY JSON: {"summary","keyPoints":[],"keywords":[],"actionItems":[]}.',
  tutor: 'Answer as a patient tutor. Reply with ONLY JSON: {"answer":"..."}. Keep it under 180 words.',
  ocr: 'Transcribe the question or material in this image exactly, preserving equations in plain text. Reply with ONLY JSON: {"text","subject","notes"}.',
  exam: 'Predict likely exam topics from this material. Reply with ONLY JSON: {"predictedTopics":[{"topic","likelihood","mastery"}],"weakTopics":[],"reviewPlan":[{"day","topic","task","minutes"}]}. Include 6 topics and a 7-day plan.',
}

/** Sensible default models per provider, so nobody has to guess slugs. */
const PROVIDER_DEFAULTS = [
  { match: 'integrate.api.nvidia.com', base: 'https://integrate.api.nvidia.com/v1', text: 'meta/llama-3.3-70b-instruct', vision: 'meta/llama-3.2-11b-vision-instruct' },
  { match: 'openrouter.ai', text: 'meta-llama/llama-3.3-70b-instruct', vision: 'meta-llama/llama-3.2-11b-vision-instruct' },
  { match: 'api.groq.com', text: 'llama-3.3-70b-versatile', vision: 'meta-llama/llama-4-scout-17b-16e-instruct' },
  { match: 'api.deepseek.com', text: 'deepseek-chat', vision: '' },
  { match: 'generativelanguage.googleapis.com', text: 'gemini-2.0-flash', vision: 'gemini-2.0-flash' },
  { match: 'api.openai.com', text: 'gpt-4o-mini', vision: 'gpt-4o-mini' },
  { match: 'api.mistral.ai', text: 'mistral-large-latest', vision: 'pixtral-12b-2409' },
  { match: 'api.together.xyz', text: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', vision: '' },
]

function providerFor(baseUrl) {
  // An empty base URL means the built-in NVIDIA endpoint.
  if (!baseUrl) return PROVIDER_DEFAULTS[0]
  return PROVIDER_DEFAULTS.find((item) => baseUrl.includes(item.match)) || null
}

/**
 * Providers known to refuse browser requests (no CORS headers). On the static
 * build these only work through a proxy URL, so the UI says so up front.
 */
export function providerNeedsServer(baseUrl) {
  if (!baseUrl) return true
  return /integrate\.api\.nvidia\.com|api\.deepseek\.com|api\.together\.xyz/.test(baseUrl)
}

function providerLabel(baseUrl) {
  const provider = providerFor(baseUrl)
  if (!provider) return (() => {
    try {
      return new URL(baseUrl).host
    } catch {
      return 'the AI provider'
    }
  })()
  return provider.match
}

function aiError(message, code, extra = {}) {
  const error = new Error(message)
  error.code = code
  Object.assign(error, extra)
  return error
}

async function directNvidiaRequest(task, payload, settings) {
  const isVision = task === 'ocr'
  const provider = providerFor(settings.nvidiaBaseUrl)
  const baseUrl = (settings.nvidiaBaseUrl || provider?.base || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '')
  const label = providerLabel(baseUrl)
  const model = isVision
    ? settings.nvidiaVisionModel || provider?.vision || ''
    : settings.nvidiaModel || provider?.text || ''

  if (!model) {
    throw aiError(
      `Add a model name for ${label} in the AI settings — this endpoint does not have a default.`,
      'MODEL_REQUIRED',
    )
  }

  const content = isVision
    ? [
        { type: 'text', text: DIRECT_PROMPTS.ocr },
        { type: 'image_url', image_url: { url: payload?.image } },
      ]
    : `${DIRECT_PROMPTS[task]}\n\nDATA:\n${JSON.stringify(payload || {}).slice(0, 30000)}`

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), 90_000) : null
  let response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.nvidiaApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: controller?.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are WeSolve, an accurate study assistant. Return only valid JSON.' },
          { role: 'user', content },
        ],
        temperature: 0.3,
        top_p: 0.85,
        max_tokens: 4096,
        stream: false,
      }),
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw aiError(`${label} did not answer within 90 seconds.`, 'TIMEOUT')
    }
    throw aiError(
      `Your browser could not reach ${label}. Browsers can only call providers that allow cross-origin requests; use a provider that does (OpenRouter, Groq, Gemini) or a proxy URL.`,
      'NETWORK_ERROR',
    )
  } finally {
    if (timer) clearTimeout(timer)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const detail = body?.error?.message || body?.detail || body?.message || ''
    if (response.status === 401) {
      throw aiError(detail || `${label} rejected this API key.`, 'INVALID_KEY', { status: 401 })
    }
    if (response.status === 403) {
      throw aiError(detail || `This key has no access to ${model} on ${label}.`, 'NO_INFERENCE_ACCESS', { status: 403 })
    }
    if (response.status === 429) {
      throw aiError(detail || `${label} is rate limiting requests. Wait a moment and try again.`, 'RATE_LIMITED', { status: 429 })
    }
    if (response.status === 404) {
      throw aiError(detail || `${label} does not recognise the model “${model}”.`, 'BAD_MODEL', { status: 404 })
    }
    throw aiError(detail || `${label} returned HTTP ${response.status}.`, 'UPSTREAM_ERROR', { status: response.status })
  }

  const result = await response.json().catch(() => null)
  const text = result?.choices?.[0]?.message?.content
  if (!text) throw aiError(`${label} returned an empty response.`, 'EMPTY_RESPONSE')
  const cleaned = String(text).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw aiError(`${label} answered, but not in the JSON format WeSolve needs.`, 'BAD_FORMAT')
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    throw aiError(`${label} answered with malformed JSON.`, 'BAD_FORMAT')
  }
}

export async function getAiStatus() {
  const settings = getServiceSettings()
  const backend = await probeBackend().catch(() => ({ available: false, checked: true }))
  if (!backend.available) {
    return {
      configured: Boolean(settings.nvidiaApiKey),
      keySource: settings.nvidiaApiKey ? 'browser' : 'none',
      hint: '',
      model: settings.nvidiaModel || 'provider default',
      visionModel: settings.nvidiaVisionModel || '',
      baseUrl: settings.nvidiaBaseUrl || '',
      provider: settings.nvidiaBaseUrl || 'direct browser call',
      signedIn: false,
      accountKeySaved: false,
      sharedKeyAvailable: false,
      staticHost: true,
    }
  }
  const headers = {}
  if (settings.nvidiaApiKey) headers['x-ai-api-key'] = settings.nvidiaApiKey
  if (settings.nvidiaBaseUrl) headers['x-ai-base-url'] = settings.nvidiaBaseUrl
  try {
    const response = await fetch('/api/ai/status', { headers, cache: 'no-store' })
    return await parseResponse(response).catch(() => ({ configured: false, keySource: 'none' }))
  } catch {
    return { configured: false, keySource: 'none', offline: true }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Retry only failures that a retry can actually fix. Bad keys never retry. */
function isRetryable(error) {
  if (!error || error.noKey) return false
  if (error.code === 'INVALID_KEY' || error.code === 'NO_INFERENCE_ACCESS' || error.code === 'BAD_BASE_URL') return false
  if ([429, 502, 503, 504].includes(error.status)) return true
  return !error.status
}

export async function requestAi(task, payload = {}, options = {}) {
  const settings = getServiceSettings()
  const headers = { 'Content-Type': 'application/json' }
  if (settings.nvidiaApiKey) headers['x-ai-api-key'] = settings.nvidiaApiKey
  if (settings.nvidiaBaseUrl) headers['x-ai-base-url'] = settings.nvidiaBaseUrl
  const attempts = Math.max(1, options.retries ?? 3)

  // On a static host there is no /api/ai to call: go straight to the provider
  // with the user's own key instead of burning retries on a 404.
  const knownBackend = getBackendState()
  const backendMissing = knownBackend.checked ? !knownBackend.available : false

  let proxyError = null
  for (let attempt = 0; attempt < attempts && !backendMissing; attempt += 1) {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task,
          payload,
          model: options.vision ? settings.nvidiaVisionModel : settings.nvidiaModel || undefined,
          maxTokens: options.maxTokens,
        }),
      })
      const result = await parseResponse(response)
      lastAiError = null
      return result.data
    } catch (error) {
      proxyError = error
      if (error.status === 404 || error.status === 405) markBackendMissing()
      // A server with no key of its own is not fatal: this browser may hold one.
      if (error.noKey && !settings.nvidiaApiKey) {
        lastAiError = error
        throw error
      }
      if (error.noKey) break
      if (!isRetryable(error) || attempt === attempts - 1) break
      // Respect Retry-After, otherwise exponential backoff with jitter.
      const wait = error.retryAfter ? Math.min(error.retryAfter, 20) * 1000 : Math.round(600 * 2 ** attempt + Math.random() * 400)
      await sleep(wait)
    }
  }

  // If the proxy host has no outbound access but the browser holds a key,
  // try the public NVIDIA endpoint directly. CORS may block this; the local
  // engine remains the final fallback.
  if (settings.nvidiaApiKey && !options.noDirect) {
    try {
      const data = await directNvidiaRequest(task, payload, settings)
      lastAiError = null
      return data
    } catch (directError) {
      // The provider's own message is the most useful thing to show.
      lastAiError = directError
      throw directError
    }
  }

  lastAiError = proxyError || aiError('Connect your own API key to turn on live AI answers.', 'NO_API_KEY')
  throw lastAiError
}


export function blobUrlToDataUrl(blobUrl) {
  return new Promise((resolve, reject) => {
    fetch(blobUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Could not read the image.'))
        reader.readAsDataURL(blob)
      })
      .catch(reject)
  })
}

function normalizeSolution(data, fallback) {
  const steps = ensureArray(data.steps, fallback.steps)
    .map((step, index) => typeof step === 'string'
      ? { title: `Step ${index + 1}`, body: step }
      : {
          title: cleanString(step?.title, `Step ${index + 1}`),
          body: cleanString(step?.body, fallback.steps[index]?.body || ''),
          math: cleanString(step?.math, ''),
        })
    .filter((step) => step.body)
  const checks = ensureArray(data.checks, fallback.checks.map((check) => check.label))
    .map((label, index) => ({
      label: cleanString(typeof label === 'string' ? label : label?.label, fallback.checks[index]?.label || 'Verification'),
      model: cleanString(typeof label === 'object' ? label?.model : '', MODEL_LABELS[index % MODEL_LABELS.length]),
      passed: typeof label === 'object' && label?.passed === false ? false : true,
    }))
  const followups = ensureArray(data.followups, fallback.followups)
    .map((item) => cleanString(item, ''))
    .filter(Boolean)
  return {
    ...fallback,
    id: createId('solve'),
    createdAt: new Date().toISOString(),
    subject: cleanString(data.subject, fallback.subject),
    finalAnswer: cleanString(data.finalAnswer, fallback.finalAnswer),
    answerText: cleanString(data.answerText, fallback.answerText),
    confidence: clamp(data.confidence, 0, 100, fallback.confidence),
    steps: steps.length ? steps : fallback.steps,
    checks: checks.length ? checks : fallback.checks,
    followups: followups.length ? followups : fallback.followups,
    graph: data.graph || fallback.graph,
    source: 'nvidia',
  }
}

export async function aiSolve(input, attachments = []) {
  const fallback = solveProblem(input, attachments)
  try {
    let question = fallback.question
    const image = attachments.find((item) => item.isImage && item.url)
    if (image) {
      try {
        const dataUrl = image.url.startsWith('data:image/') ? image.url : await blobUrlToDataUrl(image.url)
        if (dataUrl.length < 9 * 1024 * 1024) {
          const ocr = await requestAi('ocr', { image: dataUrl }, { vision: true })
          const text = cleanString(ocr.text || ocr.transcription || '')
          if (text) question = `${question ? `${question}\n\n` : ''}Image text: ${text}`
        }
      } catch {
        // OCR is optional; continue with the typed question.
      }
    }
    const data = await requestAi('solve', {
      question,
      attachments: attachments.map((item) => ({
        name: item.name,
        type: item.type,
        isLink: Boolean(item.isLink),
        url: item.isLink ? item.url : undefined,
        text: item.textContent ? String(item.textContent).slice(0, 8000) : undefined,
      })),
    })
    return normalizeSolution(data, fallback)
  } catch {
    // Keep the reason so the UI can explain why this is not AI output.
    return { ...fallback, source: 'local', aiError: aiFallbackReason() }
  }
}

function normalizeStudyPack(data, fallback, title, sourceText) {
  const flashcards = ensureArray(data.flashcards, fallback.flashcards).map((card, index) => ({
    id: createId('card'),
    front: cleanString(card?.front, fallback.flashcards[index]?.front || `Key idea ${index + 1}`),
    back: cleanString(card?.back, fallback.flashcards[index]?.back || ''),
    topic: cleanString(card?.topic, `Topic ${index + 1}`),
  })).filter((card) => card.back)
  const quiz = ensureArray(data.quiz, fallback.quiz).map((question, index) => {
    const options = ensureArray(question?.options, fallback.quiz[index]?.options || []).map((option, optionIndex) => cleanString(option, `Option ${optionIndex + 1}`))
    while (options.length < 4) options.push(`None of the above ${options.length + 1}`)
    return {
      id: createId('quiz'),
      prompt: cleanString(question?.prompt, fallback.quiz[index]?.prompt || `Question ${index + 1}`),
      options: options.slice(0, 4),
      correctIndex: clamp(question?.correctIndex, 0, 3, 0),
      explanation: cleanString(question?.explanation, fallback.quiz[index]?.explanation || 'Review the source material.'),
      topic: cleanString(question?.topic, 'General'),
    }
  })
  const guideData = data.guide && typeof data.guide === 'object' ? data.guide : {}
  const topics = ensureArray(guideData.topics, fallback.guide.topics).map((topic, index) => ({
    name: cleanString(topic?.name, fallback.guide.topics[index]?.name || `Topic ${index + 1}`),
    mastery: clamp(topic?.mastery, 0, 100, 65),
    bullets: ensureArray(topic?.bullets, fallback.guide.topics[index]?.bullets || []).map((bullet) => cleanString(bullet, 'Review this concept.')),
  }))
  const keyTerms = ensureArray(guideData.keyTerms, fallback.guide.keyTerms).map((term, index) => ({
    term: cleanString(term?.term, fallback.guide.keyTerms[index]?.term || `Term ${index + 1}`),
    definition: cleanString(term?.definition, fallback.guide.keyTerms[index]?.definition || ''),
  })).filter((term) => term.definition)
  const guide = {
    title: cleanString(guideData.title, title),
    summary: cleanString(guideData.summary || data.summary, fallback.guide.summary),
    topics: topics.length ? topics : fallback.guide.topics,
    keyTerms: keyTerms.length ? keyTerms : fallback.guide.keyTerms,
    reviewQuestions: ensureArray(guideData.reviewQuestions, fallback.guide.reviewQuestions).map((question) => cleanString(question, '')).filter(Boolean),
    examples: ensureArray(guideData.examples, fallback.guide.examples).map((example) => cleanString(example, '')).filter(Boolean),
  }
  const predictedTopics = ensureArray(data.predictedTopics, fallback.predictedTopics).map((topic, index) => ({
    topic: cleanString(topic?.topic, fallback.predictedTopics[index]?.topic || `Topic ${index + 1}`),
    likelihood: clamp(topic?.likelihood, 0, 100, 70),
    mastery: clamp(topic?.mastery, 0, 100, 55),
  }))
  return {
    ...fallback,
    id: createId('pack'),
    createdAt: new Date().toISOString(),
    title: cleanString(data.title, title),
    sourceText,
    summary: cleanString(data.summary, fallback.summary),
    keywords: ensureArray(data.keywords, fallback.keywords).map((keyword) => cleanString(keyword, '')).filter(Boolean),
    flashcards: flashcards.length ? flashcards : fallback.flashcards,
    quiz: quiz.length ? quiz : fallback.quiz,
    guide,
    predictedTopics: predictedTopics.length ? predictedTopics : fallback.predictedTopics,
    cheatSheet: ensureArray(data.cheatSheet, fallback.cheatSheet).map((item) => cleanString(item, '')).filter(Boolean),
    source: 'nvidia',
  }
}

export async function aiStudyPack(sourceText, title = 'My study set') {
  const fallback = generateStudyPack(sourceText, title)
  try {
    const data = await requestAi('study-pack', {
      title,
      material: String(sourceText).slice(0, 30000),
    })
    return normalizeStudyPack(data, fallback, title, sourceText)
  } catch {
    return { ...fallback, source: fallback.source || 'local', aiError: aiFallbackReason() }
  }
}

/**
 * Build a study pack from a long document.
 *
 * Short material goes straight to one request. Long material is read in chunks,
 * each chunk condensed by the model, and the condensed notes are then used to
 * write the pack — so a 200-page PDF is actually covered instead of the first
 * 30k characters only.
 */
export async function aiStudyPackFromDocument(sourceText, title = 'My study set', { onProgress } = {}) {
  const text = String(sourceText || '')
  if (text.length <= 28000) {
    onProgress?.({ stage: 'generating', done: 0, total: 1 })
    const pack = await aiStudyPack(text, title)
    onProgress?.({ stage: 'done', done: 1, total: 1 })
    return pack
  }

  const { splitIntoChunks } = await import('./fileExtract')
  const chunks = splitIntoChunks(text, 12000, 12)
  const notes = []
  const total = chunks.length + 1
  let noKey = false
  for (let index = 0; index < chunks.length; index += 1) {
    if (noKey) break
    onProgress?.({ stage: 'reading', done: index, total })
    try {
      const data = await requestAi('notes', {
        course: title,
        transcript: `Part ${index + 1} of ${chunks.length}:\n\n${chunks[index]}`,
      })
      const summary = cleanString(data.summary, '')
      const points = ensureArray(data.keyPoints, []).map((point) => cleanString(point, '')).filter(Boolean)
      const terms = ensureArray(data.keywords, []).map((term) => cleanString(term, '')).filter(Boolean)
      if (summary || points.length) {
        notes.push([`Part ${index + 1}`, summary, ...points.map((point) => `- ${point}`), terms.length ? `Terms: ${terms.join(', ')}` : ''].filter(Boolean).join('\n'))
      }
    } catch (error) {
      // Without a key every chunk would fail the same way: stop early and let
      // the local engine handle the material in one pass.
      if (error?.noKey) {
        noKey = true
        break
      }
      // Any other failure should not discard the rest of the document.
      notes.push(`Part ${index + 1} (unread)\n${chunks[index].slice(0, 1200)}`)
    }
  }

  onProgress?.({ stage: 'generating', done: total - 1, total })
  const digest = notes.join('\n\n').slice(0, 28000)
  const pack = await aiStudyPack(digest || text.slice(0, 28000), title)
  onProgress?.({ stage: 'done', done: total, total })
  return { ...pack, deepRead: true, sectionsRead: chunks.length }
}

export async function aiResearch(topic, sources = [], targetWords = 700) {
  const fallback = generateResearchReport(topic, sources, targetWords)
  try {
    const data = await requestAi('research', {
      topic,
      targetWords,
      sources: sources.map((source) => ({
        title: source.title || source.name || '',
        url: source.url || '',
        content: String(source.content || '').slice(0, 12000),
      })),
    }, { maxTokens: Math.min(7000, Math.max(2500, targetWords * 3)) })
    const sections = ensureArray(data.sections, fallback.sections).map((section, index) => ({
      heading: cleanString(section?.heading, fallback.sections[index]?.heading || `Section ${index + 1}`),
      paragraphs: ensureArray(section?.paragraphs, fallback.sections[index]?.paragraphs || []).map((paragraph) => cleanString(paragraph, '')).filter(Boolean),
    })).filter((section) => section.paragraphs.length)
    return {
      ...fallback,
      id: createId('research'),
      createdAt: new Date().toISOString(),
      title: cleanString(data.title, fallback.title),
      sections: sections.length ? sections : fallback.sections,
      references: ensureArray(data.references, fallback.references).map((reference) => cleanString(reference, '')).filter(Boolean),
      source: 'nvidia',
    }
  } catch {
    return { ...fallback, source: fallback.source || 'local', aiError: aiFallbackReason() }
  }
}

export async function aiNotes(transcript, course = 'Untitled lecture') {
  const fallback = generateNotesSummary(transcript, course)
  try {
    const data = await requestAi('notes', { course, transcript: String(transcript).slice(0, 30000) })
    return {
      ...fallback,
      id: createId('note'),
      createdAt: new Date().toISOString(),
      summary: cleanString(data.summary, fallback.summary),
      keyPoints: ensureArray(data.keyPoints, fallback.keyPoints).map((point) => cleanString(point, '')).filter(Boolean),
      keywords: ensureArray(data.keywords, fallback.keywords).map((keyword) => cleanString(keyword, '')).filter(Boolean),
      actionItems: ensureArray(data.actionItems, fallback.actionItems).map((item) => cleanString(item, '')).filter(Boolean),
      source: 'nvidia',
    }
  } catch {
    return { ...fallback, source: fallback.source || 'local', aiError: aiFallbackReason() }
  }
}

/**
 * Returns { answer, source, error }. `source: 'local'` means the caller must
 * write the answer itself and label it — never pass it off as AI text.
 */
export async function aiTutorAnswer(question, context) {
  try {
    const data = await requestAi('tutor', {
      question,
      lesson: context?.lesson || '',
      step: context?.step || '',
      board: context?.board || '',
      finalAnswer: context?.finalAnswer || '',
      subject: context?.subject || '',
    })
    const answer = cleanString(data.answer || data.text, '')
    if (!answer) return { answer: '', source: 'local', error: 'The AI reply was empty.' }
    return { answer, source: 'nvidia', error: '' }
  } catch {
    return { answer: '', source: 'local', error: aiFallbackReason() }
  }
}

export async function aiOcr(imageDataUrl) {
  try {
    const data = await requestAi('ocr', { image: imageDataUrl }, { vision: true })
    return cleanString(data.text || data.transcription || '', '')
  } catch {
    return ''
  }
}

/**
 * OCR that tells the caller why it failed, so the upload UI can explain it
 * instead of silently producing an empty study set.
 */
export async function readImageText(imageDataUrl) {
  try {
    const data = await requestAi('ocr', { image: imageDataUrl }, { vision: true })
    const text = cleanString(data.text || data.transcription || '', '')
    if (!text) {
      return { ok: false, code: 'EMPTY_OCR', error: 'No readable text was found in that image.' }
    }
    return { ok: true, text, subject: cleanString(data.subject, '') }
  } catch (error) {
    return {
      ok: false,
      code: error.code || 'OCR_FAILED',
      error: error.code === 'NO_API_KEY'
        ? 'Connect an AI key in Settings to read text from images.'
        : error.message || 'Could not read that image.',
    }
  }
}

export async function aiExamPrediction(material, details = {}) {
  try {
    const data = await requestAi('exam', {
      material: String(material).slice(0, 30000),
      details,
    })
    return {
      predictedTopics: ensureArray(data.predictedTopics, []).map((topic, index) => ({
        topic: cleanString(topic?.topic, `Topic ${index + 1}`),
        likelihood: clamp(topic?.likelihood, 0, 100, 70),
        mastery: clamp(topic?.mastery, 0, 100, 55),
      })),
      weakTopics: ensureArray(data.weakTopics, []).map((topic) => cleanString(topic, '')).filter(Boolean),
      reviewPlan: ensureArray(data.reviewPlan, []).map((item, index) => ({
        day: cleanString(item?.day, `Day ${index + 1}`),
        topic: cleanString(item?.topic, 'Mixed review'),
        task: cleanString(item?.task, 'Review notes and complete a short quiz.'),
        minutes: clamp(item?.minutes, 5, 180, 30),
      })),
    }
  } catch {
    return null
  }
}

function buildLocalLesson(topic, material = '') {
  const solution = solveProblem(topic, [])
  const clean = String(topic).trim()
  const title = clean.length > 48 ? `${clean.slice(0, 45)}…` : clean || 'Your lesson'
  const steps = [
    {
      lines: [title, 'let’s break this down'],
      note: 'Set up the lesson',
      speech: `Let's work through ${title} together. I'll write each idea on the board as we go.`,
      sketch: null,
    },
    ...solution.steps.slice(0, 4).map((step) => ({
      lines: [step.title, ...String(step.body).replace(/\s+/g, ' ').split(/(?<=\.)\s/).slice(0, 2)],
      note: step.title,
      speech: step.body,
      sketch: null,
    })),
    {
      lines: ['Answer', solution.finalAnswer],
      note: 'The result',
      speech: `That gives us ${solution.finalAnswer}. Say it back in your own words to make it stick.`,
      sketch: null,
    },
  ]
  const boardSteps = steps.map((step) => ({
    ...step,
    lines: step.lines.map((line) => String(line).slice(0, 70)),
    board: String(step.lines[0]).slice(0, 90),
  }))
  return {
    id: createId('lesson'),
    title,
    subject: solution.subject || 'Study',
    duration: `${boardSteps.length * 2} min`,
    color: '#6c55f6',
    custom: true,
    steps: boardSteps,
    checkpoint: {
      prompt: `Which idea is the key to ${title}?`,
      options: [solution.steps[0]?.title || 'Identify the goal first', 'Skip the setup', 'Memorize only the final answer'],
      correctIndex: 0,
    },
    source: 'local',
    material: String(material).slice(0, 2000),
  }
}

function normalizeLesson(data, fallback) {
  const steps = ensureArray(data.steps, fallback.steps).map((step, index) => {
    const lines = ensureArray(step?.lines, fallback.steps[index]?.lines || [])
      .map((line) => cleanString(line, ''))
      .filter(Boolean)
      .map((line) => line.slice(0, 76))
    if (!lines.length) return null
    return {
      lines,
      board: lines[0],
      note: cleanString(step?.note, fallback.steps[index]?.note || lines[0]),
      speech: cleanString(step?.speech, fallback.steps[index]?.speech || lines.join('. ')),
      sketch: ['parabola', 'parabolaRoots', 'leaf', 'chloroplast', 'cycle', 'chromosomes', 'cells', 'tangent'].includes(step?.sketch) ? step.sketch : null,
    }
  }).filter(Boolean)

  const fallbackCheckpoint = fallback.checkpoint
  const options = ensureArray(data.checkpoint?.options, fallbackCheckpoint.options).map((option) => cleanString(option, '')).filter(Boolean)

  return {
    ...fallback,
    id: createId('lesson'),
    title: cleanString(data.title, fallback.title),
    subject: cleanString(data.subject, fallback.subject),
    duration: `${Math.max(3, (steps.length || 4) * 2)} min`,
    custom: true,
    color: '#6c55f6',
    steps: steps.length ? steps : fallback.steps,
    checkpoint: {
      prompt: cleanString(data.checkpoint?.prompt, fallbackCheckpoint.prompt),
      options: options.length >= 2 ? options.slice(0, 4) : fallbackCheckpoint.options,
      correctIndex: clamp(data.checkpoint?.correctIndex, 0, Math.max((options.length || 3) - 1, 0), 0),
    },
    source: 'nvidia',
  }
}

export async function aiLesson(topic, material = '') {
  const fallback = buildLocalLesson(topic, material)
  try {
    const data = await requestAi('lesson', {
      topic: String(topic).slice(0, 400),
      material: String(material).slice(0, 16000),
    }, { maxTokens: 4000 })
    return normalizeLesson(data, fallback)
  } catch {
    return { ...fallback, source: fallback.source || 'local', aiError: aiFallbackReason() }
  }
}
