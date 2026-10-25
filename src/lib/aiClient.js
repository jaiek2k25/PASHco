import {
  createId,
  generateNotesSummary,
  generateResearchReport,
  generateStudyPack,
  solveProblem,
} from './intelligence'
import { getServiceSettings } from './serviceSettings'

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

async function directNvidiaRequest(task, payload, settings) {
  const isVision = task === 'ocr'
  const model = isVision
    ? settings.nvidiaVisionModel || 'meta/llama-3.2-11b-vision-instruct'
    : settings.nvidiaModel || 'meta/llama-3.3-70b-instruct'
  const content = isVision
    ? [
        { type: 'text', text: DIRECT_PROMPTS.ocr },
        { type: 'image_url', image_url: { url: payload?.image } },
      ]
    : `${DIRECT_PROMPTS[task]}\n\nDATA:\n${JSON.stringify(payload || {}).slice(0, 30000)}`
  const baseUrl = (settings.nvidiaBaseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '')
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.nvidiaApiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
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
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || body.message || `NVIDIA returned HTTP ${response.status}.`)
  }
  const result = await response.json()
  const text = result?.choices?.[0]?.message?.content
  if (!text) throw new Error('NVIDIA returned an empty response.')
  const cleaned = String(text).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('NVIDIA did not return JSON.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function getAiStatus() {
  const settings = getServiceSettings()
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

  let proxyError = null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
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

  // If the proxy host has no outbound access but the browser holds a key,
  // try the public NVIDIA endpoint directly. CORS may block this; the local
  // engine remains the final fallback.
  if (settings.nvidiaApiKey && !options.noDirect) {
    try {
      const data = await directNvidiaRequest(task, payload, settings)
      lastAiError = null
      return data
    } catch (directError) {
      lastAiError = proxyError
      directError.message = `${proxyError.message} · ${directError.message}`
      throw directError
    }
  }

  lastAiError = proxyError
  throw proxyError
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
    return fallback
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
    return fallback
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
    return fallback
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
    return fallback
  }
}

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
    return cleanString(data.answer || data.text, '')
  } catch {
    return ''
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
    return fallback
  }
}
