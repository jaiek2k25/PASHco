/**
 * Document text extraction that runs entirely in the browser.
 *
 * Everything here is dynamically imported so the initial bundle stays small and
 * a user who never uploads a PDF never downloads the PDF engine.
 */

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp']
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|html?|xml|rtf|log|tex)$/i
const LEGACY_OFFICE = /\.(doc|ppt|xls|docm|pptm)$/i

export const MAX_TEXT_PER_FILE = 200_000

export class ExtractionError extends Error {
  constructor(message, code = 'EXTRACT_FAILED') {
    super(message)
    this.name = 'ExtractionError'
    this.code = code
  }
}

export function fileKind(file) {
  const name = String(file?.name || '')
  const type = String(file?.type || '')
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf'
  if (/\.docx$/i.test(name) || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (/\.pptx$/i.test(name) || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'pptx'
  if (/\.xlsx$/i.test(name) || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx'
  if (IMAGE_TYPES.includes(type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) return 'image'
  if (LEGACY_OFFICE.test(name)) return 'legacy-office'
  if (TEXT_EXT.test(name) || type.startsWith('text/')) return 'text'
  return 'unsupported'
}

/* ---------------------------------------------------------------- text ---- */

async function readTextFile(file) {
  const raw = await file.text()
  if (/\.html?$/i.test(file.name)) {
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    doc.querySelectorAll('script, style, noscript').forEach((node) => node.remove())
    return doc.body?.textContent || ''
  }
  if (/\.rtf$/i.test(file.name)) {
    return raw.replace(/\\[a-z]+-?\d* ?/gi, ' ').replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim()
  }
  return raw
}

/* ----------------------------------------------------------------- pdf ---- */

let pdfEnginePromise = null

/**
 * pdfjs 5 needs Promise.withResolvers (Chrome 119+, Safari 17.4+). Older
 * browsers would otherwise fail with an unrelated-looking error.
 */
function ensureModernPromise() {
  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function withResolvers() {
      let resolve
      let reject
      const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }
  }
}

async function loadPdfEngine() {
  if (!pdfEnginePromise) {
    ensureModernPromise()
    pdfEnginePromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?worker'),
    ]).then(([pdfjs, workerModule]) => {
      // Vite bundles the worker as an asset, so it works from any base path.
      if (!pdfjs.GlobalWorkerOptions.workerPort && typeof Worker !== 'undefined') {
        try {
          pdfjs.GlobalWorkerOptions.workerPort = new workerModule.default()
        } catch {
          // Falls back to pdfjs's in-thread worker.
        }
      }
      return pdfjs
    })
  }
  return pdfEnginePromise
}

async function extractPdf(file, onProgress) {
  const pdfjs = await loadPdfEngine()
  const data = new Uint8Array(await file.arrayBuffer())
  let pdf
  try {
    pdf = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise
  } catch (error) {
    const message = String(error?.message || '')
    if (error?.name === 'PasswordException' || /password/i.test(message)) {
      throw new ExtractionError('This PDF is password protected. Remove the password and try again.', 'PDF_LOCKED')
    }
    if (/withResolvers|structuredClone|Worker|import\(/i.test(message)) {
      throw new ExtractionError('This browser could not start the PDF reader. Try another browser, or paste the text instead.', 'PDF_UNSUPPORTED_BROWSER')
    }
    throw new ExtractionError(
      `This PDF could not be read${message ? ` (${message.slice(0, 80)})` : ''}. It may be damaged — try re-saving it, or paste the text instead.`,
      'PDF_INVALID',
    )
  }

  const pages = []
  let scannedPages = 0
  for (let index = 1; index <= pdf.numPages; index += 1) {
    onProgress?.({ page: index, pages: pdf.numPages })
    const page = await pdf.getPage(index)
    const content = await page.getTextContent()
    let lastY = null
    const lines = []
    let line = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = Math.round(item.transform?.[5] ?? 0)
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line.trim())
        line = ''
      }
      line += item.str
      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trim())
        line = ''
      }
      lastY = y
    }
    if (line.trim()) lines.push(line.trim())
    const pageText = lines.join('\n').replace(/[ \t]{2,}/g, ' ').trim()
    if (!pageText) scannedPages += 1
    pages.push(pageText)
    page.cleanup?.()
  }

  const text = pages.filter(Boolean).join('\n\n')
  if (!text.trim()) {
    throw new ExtractionError(
      scannedPages
        ? 'This PDF looks like a scan with no selectable text. Upload the pages as images instead and WeSolve can read them with OCR.'
        : 'No readable text was found in this PDF.',
      'PDF_NO_TEXT',
    )
  }
  return { text, pages: pdf.numPages, meta: { scannedPages } }
}

/* ---------------------------------------------------------------- docx ---- */

async function extractDocx(file) {
  const mammoth = await import('mammoth/mammoth.browser.js')
  const buffer = await file.arrayBuffer()
  const result = await mammoth.default.convertToHtml({ arrayBuffer: buffer })
  const doc = new DOMParser().parseFromString(result.value || '', 'text/html')
  // Keep block structure: headings, paragraphs, list items, and table cells.
  const blocks = []
  doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote').forEach((node) => {
    const value = node.textContent?.replace(/\s+/g, ' ').trim()
    if (!value) return
    const tag = node.tagName.toLowerCase()
    if (tag.startsWith('h')) blocks.push(`## ${value}`)
    else if (tag === 'li') blocks.push(`- ${value}`)
    else blocks.push(value)
  })
  const text = blocks.join('\n').trim()
  if (!text.trim()) throw new ExtractionError('No text was found in this Word document.', 'DOCX_EMPTY')
  return { text, pages: null, meta: { warnings: result.messages?.length || 0 } }
}

/* ------------------------------------------------------- pptx / xlsx ---- */

function paragraphsFromXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) return []
  const output = []
  doc.querySelectorAll('a\\:p, p').forEach((paragraph) => {
    const runs = Array.from(paragraph.querySelectorAll('a\\:t, t')).map((node) => node.textContent || '')
    const line = runs.join('').replace(/\s+/g, ' ').trim()
    if (line) output.push(line)
  })
  return output
}

async function extractPptx(file, onProgress) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]))
  if (!slidePaths.length) throw new ExtractionError('No slides were found in this presentation.', 'PPTX_EMPTY')

  const sections = []
  for (let index = 0; index < slidePaths.length; index += 1) {
    onProgress?.({ page: index + 1, pages: slidePaths.length })
    const xml = await zip.file(slidePaths[index]).async('string')
    const lines = paragraphsFromXml(xml)
    if (lines.length) sections.push(`## Slide ${index + 1}\n${lines.join('\n')}`)
  }

  // Speaker notes often carry the actual explanation.
  const notePaths = Object.keys(zip.files).filter((path) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path))
  const notes = []
  for (const path of notePaths) {
    const lines = paragraphsFromXml(await zip.file(path).async('string')).filter((line) => !/^\d+$/.test(line))
    if (lines.length) notes.push(lines.join(' '))
  }
  if (notes.length) sections.push(`## Speaker notes\n${notes.join('\n\n')}`)

  const text = sections.join('\n\n')
  if (!text.trim()) throw new ExtractionError('No text was found in this presentation.', 'PPTX_EMPTY')
  return { text, pages: slidePaths.length, meta: { slides: slidePaths.length, notes: notes.length } }
}

async function extractXlsx(file) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string')
  const shared = []
  if (sharedXml) {
    const doc = new DOMParser().parseFromString(sharedXml, 'application/xml')
    doc.querySelectorAll('si').forEach((si) => {
      const value = Array.from(si.querySelectorAll('t')).map((node) => node.textContent || '').join('')
      shared.push(value)
    })
  }

  const workbookXml = await zip.file('xl/workbook.xml')?.async('string')
  const sheetNames = []
  if (workbookXml) {
    const doc = new DOMParser().parseFromString(workbookXml, 'application/xml')
    doc.querySelectorAll('sheet').forEach((sheet) => sheetNames.push(sheet.getAttribute('name') || ''))
  }

  const sheetPaths = Object.keys(zip.files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]))

  const sections = []
  for (let index = 0; index < sheetPaths.length; index += 1) {
    const xml = await zip.file(sheetPaths[index]).async('string')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    const rows = []
    doc.querySelectorAll('row').forEach((row) => {
      const cells = []
      row.querySelectorAll('c').forEach((cell) => {
        const type = cell.getAttribute('t')
        const raw = cell.querySelector('v')?.textContent || ''
        const inline = Array.from(cell.querySelectorAll('is t')).map((node) => node.textContent || '').join('')
        let value = ''
        if (type === 's') value = shared[Number(raw)] || ''
        else if (type === 'inlineStr') value = inline
        else value = raw
        if (value) cells.push(value.replace(/\s+/g, ' ').trim())
      })
      if (cells.length) rows.push(cells.join(' | '))
    })
    if (rows.length) sections.push(`## ${sheetNames[index] || `Sheet ${index + 1}`}\n${rows.join('\n')}`)
  }

  const text = sections.join('\n\n')
  if (!text.trim()) throw new ExtractionError('No cell text was found in this spreadsheet.', 'XLSX_EMPTY')
  return { text, pages: sheetPaths.length, meta: { sheets: sheetPaths.length } }
}

/* -------------------------------------------------------------- images ---- */

/** Downscale and re-encode so OCR payloads stay small and fast. */
export async function prepareImage(file, { maxEdge = 1600, quality = 0.85 } = {}) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new ExtractionError('This browser cannot process images.', 'NO_CANVAS')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', quality)
}

/* --------------------------------------------------------------- public ---- */

/**
 * Extract readable text from a file.
 * @returns {Promise<{ text: string, kind: string, pages: number|null, image?: string, meta: object }>}
 */
export async function extractDocumentText(file, { onProgress } = {}) {
  const kind = fileKind(file)
  switch (kind) {
    case 'text': {
      const text = await readTextFile(file)
      if (!text.trim()) throw new ExtractionError('This file is empty.', 'EMPTY_FILE')
      return { text, kind, pages: null, meta: {} }
    }
    case 'pdf':
      return { ...(await extractPdf(file, onProgress)), kind }
    case 'docx':
      return { ...(await extractDocx(file)), kind }
    case 'pptx':
      return { ...(await extractPptx(file, onProgress)), kind }
    case 'xlsx':
      return { ...(await extractXlsx(file)), kind }
    case 'image':
      return { text: '', kind, pages: 1, image: await prepareImage(file), meta: { needsOcr: true } }
    case 'legacy-office':
      throw new ExtractionError(
        'Old .doc/.ppt/.xls files cannot be read in the browser. Save the file as .docx, .pptx, .xlsx, or PDF and upload it again.',
        'LEGACY_OFFICE',
      )
    default:
      throw new ExtractionError(
        'That file type is not supported yet. Use PDF, Word, PowerPoint, Excel, TXT, Markdown, CSV, or an image.',
        'UNSUPPORTED_TYPE',
      )
  }
}

/**
 * Long documents get sampled across their whole length rather than cut off, so
 * the end of a chapter still influences the generated pack.
 */
export function condenseMaterial(text, limit = 30000) {
  const clean = String(text || '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (clean.length <= limit) return { text: clean, truncated: false, originalLength: clean.length }

  const paragraphs = clean.split(/\n{2,}/).filter((part) => part.trim())
  const budget = limit - 500
  const average = clean.length / Math.max(1, paragraphs.length)
  // How many paragraphs roughly fill the budget, then take that many spread
  // evenly across the entire document so the ending still counts.
  const wanted = Math.max(2, Math.min(paragraphs.length, Math.floor(budget / Math.max(80, average))))
  const picked = []
  let used = 0
  for (let slot = 0; slot < wanted && used < budget; slot += 1) {
    const index = wanted === 1 ? 0 : Math.round((slot * (paragraphs.length - 1)) / (wanted - 1))
    const part = paragraphs[index]
    if (!part) continue
    const room = budget - used
    if (part.length <= room) {
      picked.push(part)
      used += part.length + 2
    } else if (room > 200) {
      picked.push(`${part.slice(0, room - 1)}…`)
      used = budget
    }
  }

  const sampled = picked.join('\n\n')
  return {
    text: `${sampled}\n\n[Even excerpts from a ${clean.length.toLocaleString()}-character document. Long documents are also read in full parts when generating.]`,
    truncated: true,
    originalLength: clean.length,
  }
}

/** Split into roughly even chunks, preferring paragraph boundaries. */
export function splitIntoChunks(text, targetChars = 12000, maxChunks = 12) {
  const clean = String(text || '').trim()
  if (clean.length <= targetChars) return [clean]
  const chunks = []
  let cursor = 0
  while (cursor < clean.length && chunks.length < maxChunks) {
    let end = Math.min(clean.length, cursor + targetChars)
    if (end < clean.length) {
      const boundary = clean.lastIndexOf('\n\n', end)
      if (boundary > cursor + targetChars * 0.5) end = boundary
    }
    chunks.push(clean.slice(cursor, end).trim())
    cursor = end
  }
  if (cursor < clean.length && chunks.length) {
    chunks[chunks.length - 1] += `\n\n[…${(clean.length - cursor).toLocaleString()} more characters omitted]`
  }
  return chunks
}
