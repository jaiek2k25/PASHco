import {
  createId,
  generateNotesSummary,
  generateResearchReport,
  generateStudyPack,
  solveProblem,
} from './intelligence'
import { getServiceSettings } from './serviceSettings'
import { markBackendMissing, probeBackend } from './backend'
import { apiInit, apiUrl, getServerUrl } from './apiBase'

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
    NO_SERVER: 'No WeSolve server is connected, and AI only runs on the server.',
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
function aiError(message, code, extra = {}) {
  const error = new Error(message)
  error.code = code
  Object.assign(error, extra)
  return error
}

export async function getAiStatus() {
  const settings = getServiceSettings()
  const backend = await probeBackend().catch(() => ({ available: false, checked: true }))
  if (!backend.available) {
    // Nothing here can answer: AI is written by the server, not the page.
    return {
      configured: false,
      keySource: 'none',
      hint: '',
      model: '',
      visionModel: '',
      baseUrl: '',
      provider: '',
      signedIn: false,
      accountKeySaved: false,
      sharedKeyAvailable: false,
      needsServer: true,
      server: getServerUrl(),
      staticHost: !getServerUrl(),
    }
  }
  const headers = { 'X-Requested-With': 'wesolve' }
  if (settings.nvidiaApiKey) headers['x-ai-api-key'] = settings.nvidiaApiKey
  if (settings.nvidiaBaseUrl) headers['x-ai-base-url'] = settings.nvidiaBaseUrl
  try {
    const response = await fetch(apiUrl('/api/ai/status'), apiInit({ headers, cache: 'no-store' }))
    const data = await parseResponse(response)
    return { ...data, server: getServerUrl() }
  } catch {
    return { configured: false, keySource: 'none', offline: true, server: getServerUrl() }
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
  const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'wesolve' }
  // The key is forwarded to the WeSolve server, which makes the provider call.
  // It never travels from this page to the provider.
  if (settings.nvidiaApiKey) headers['x-ai-api-key'] = settings.nvidiaApiKey
  if (settings.nvidiaBaseUrl) headers['x-ai-base-url'] = settings.nvidiaBaseUrl
  if (options.vision && settings.nvidiaVisionModel) headers['x-ai-vision-model'] = settings.nvidiaVisionModel
  else if (settings.nvidiaModel) headers['x-ai-model'] = settings.nvidiaModel

  const backend = await probeBackend().catch(() => ({ available: false }))
  if (!backend.available) {
    lastAiError = aiError(
      'AI runs on the WeSolve server. Add your server URL in AI settings — the page never calls the provider itself.',
      'NO_SERVER',
    )
    throw lastAiError
  }

  const attempts = Math.max(1, options.retries ?? 3)
  let proxyError = null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(apiUrl('/api/ai'), apiInit({
        method: 'POST',
        headers,
        body: JSON.stringify({
          task,
          payload,
          model: options.vision ? settings.nvidiaVisionModel : settings.nvidiaModel || undefined,
          maxTokens: options.maxTokens,
        }),
      }))
      const result = await parseResponse(response)
      lastAiError = null
      return result.data
    } catch (error) {
      proxyError = error
      if (error.status === 404 || error.status === 405) markBackendMissing()
      if (error.noKey) {
        lastAiError = error
        throw error
      }
      if (!isRetryable(error) || attempt === attempts - 1) break
      // Respect Retry-After, otherwise exponential backoff with jitter.
      const wait = error.retryAfter ? Math.min(error.retryAfter, 20) * 1000 : Math.round(600 * 2 ** attempt + Math.random() * 400)
      await sleep(wait)
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

/** Trim conversational scaffolding so a title is a topic, not a sentence. */
function lessonTitleFrom(topic) {
  let text = String(topic || '').replace(/\s+/g, ' ').trim()
  text = text.replace(/^(please\s+|hey\s+|ok(ay)?\s+)?(can you\s+|could you\s+|would you\s+)?/i, '')
  text = text.replace(/^(explain|describe|define|teach me|tell me about|tell me|show me|walk me through|help me( understand)?|summari[sz]e)\b(\s+(about|with|on|to|me|what|how|why|is|are|it|this|that))*\s*/i, '')
  text = text.replace(/^(what|who|why|how|when|where)\s+(is|are|was|were|does|do|did|can|could|should|would)\s+/i, '')
  text = text.replace(/^(what|who|why|how|when|where)\s+/i, '')
  text = text.replace(/[?.!]+$/, '').replace(/\s+/g, ' ').trim()
  if (!text) text = String(topic || 'Your lesson').replace(/[?.!]+$/, '').trim() || 'Your lesson'
  text = text.charAt(0).toUpperCase() + text.slice(1)
  return text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text
}

/** Keep every board line meaningful: no blanks, no bare numbers, no repeats. */
function boardLines(lines) {
  const seen = new Set()
  return lines
    .map((line) => String(line || '').replace(/\s+/g, ' ').trim())
    .filter((line) => line && !/^[\d\s.\-–—)("'`]+$/.test(line))
    .filter((line) => {
      const key = line.toLowerCase().replace(/[.!]+$/, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24)
}

/**
 * Offline lessons.
 *
 * Order of preference:
 *   1. the user's own material — real content, so the board teaches it;
 *   2. a problem the built-in solver can actually work — real steps;
 *   3. a labelled study outline that names the questions the topic must answer.
 *
 * The old version pasted the solver's meta-steps ("Understand what is being
 * asked") onto the board, twice, and titled the lesson with the raw question.
 */
function buildLocalLesson(topic, material = '') {
  const cleanTopic = String(topic || '').trim()
  const title = lessonTitleFrom(cleanTopic)
  const solution = solveProblem(cleanTopic, [])
  const materialText = String(material || '').trim()
  const steps = []

  const addStep = (lines, note, speech, sketch = null) => {
    const cleaned = boardLines(lines).map((line) => line.slice(0, 74))
    if (!cleaned.length) return
    const board = cleaned[0].slice(0, 90)
    steps.push({
      lines: cleaned,
      board,
      note: note && note.toLowerCase() !== board.toLowerCase() ? note.slice(0, 110) : `Step ${steps.length + 1}`,
      speech,
      sketch,
    })
  }

  if (materialText.length > 160) {
    // Build the lesson from what the user supplied, so every line is real.
    const sentences = splitSentences(materialText)
    addStep([title, 'from your own notes'], 'What this covers', `This lesson is built from your notes on ${title}.`)
    if (sentences[0]) addStep(['Key idea', sentences[0]], 'The main claim', sentences[0])
    if (sentences[1] || sentences[2]) {
      addStep(['Supporting details', sentences[1], sentences[2]].filter(Boolean), 'How it is supported', [sentences[1], sentences[2]].filter(Boolean).join(' '))
    }
    if (sentences[3]) addStep(['More detail', sentences[3]], 'How it fits together', sentences[3])
    addStep(['Recap', sentences[0] ? sentences[0].slice(0, 110) : title], 'Say it back in your own words', 'Try to say the key idea without looking at the board.')
  } else if (solution.type !== 'concept' && solution.type !== 'empty' && solution.steps?.length >= 2) {
    // A problem the built-in engine can genuinely solve.
    addStep([title, 'worked step by step'], 'Set up the problem', `Let's work through ${title} together.`)
    solution.steps.slice(0, 4).forEach((step, index) => {
      const body = splitSentences(step.body)
      const first = body[0] && body[0].toLowerCase().replace(/[.!]+$/, '') !== String(step.title).toLowerCase() ? body[0] : ''
      addStep([step.title, first, body[1]], step.title, step.body || step.title, index === 0 ? solution.graph?.kind : null)
    })
    addStep(['Answer', solution.finalAnswer], 'Check it before moving on', `That gives ${solution.finalAnswer}. Put it back into the question to confirm.`)
  } else {
    // Nothing to solve and no notes: an honest, clearly-labelled outline.
    addStep(['Offline outline', `Connect your server for the full AI lesson on ${title}`], 'Why this is an outline', 'This board has no AI server connected, so it can only outline the topic, not explain it.')
    addStep(['What it is', `Define ${title} in one sentence, with its symbols.`], 'Start with a definition', `Begin by saying what ${title} means, in one sentence.`)
    addStep(['Where it comes from', 'Which rule or principle produces it?', 'What has to be true for it to apply?'], 'The reasoning and its conditions', 'Every rule has conditions. Name them before you use the rule.')
    addStep(['Worked example', 'Apply it once, slowly, one line at a time.', 'Then check the result against the original question.'], 'See it used', 'Try a small example from start to finish, and check the answer at the end.')
    addStep(['Watch out for', 'Signs, limits, order of operations, special cases.'], 'The usual mistakes', 'Most lost marks come from the conditions, not the formula.')
    addStep(['Recap', `Explain ${title} without looking at the board.`], 'Close the loop', 'If you can explain it out loud, you know it.')
  }

  return {
    id: createId('lesson'),
    title,
    subject: solution.subject || 'Study',
    duration: `${Math.max(3, steps.length * 2)} min`,
    color: '#6c55f6',
    custom: true,
    steps,
    checkpoint: {
      prompt: `How do you know you actually understand “${title}”?`,
      options: ['State it, use it on a new example, then check the result', 'Copy the final answer without the steps', 'Skip the conditions and memorise the result'],
      correctIndex: 0,
    },
    source: 'local',
    material: String(material).slice(0, 2000),
  }
}

function normalizeLesson(data, fallback) {
  const steps = ensureArray(data.steps, fallback.steps).map((step, index) => {
    const lines = boardLines(ensureArray(step?.lines, fallback.steps[index]?.lines || [])
      .map((line) => cleanString(line, ''))
      .filter(Boolean)
      .map((line) => line.slice(0, 76)))
    if (!lines.length) return null
    const note = cleanString(step?.note, fallback.steps[index]?.note || '')
    return {
      lines,
      board: lines[0],
      note: note && note.toLowerCase() !== lines[0].toLowerCase() ? note : `Step ${index + 1}`,
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
