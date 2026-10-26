import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { createAiHandler } from './nvidiaAiPlugin.js'
import { createAccountHandler } from './accountPlugin.js'
import { applyCors, handlePreflight } from './cors.js'

const DIST = resolve(process.env.DIST_DIR || 'dist')
const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '0.0.0.0'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

const aiHandler = createAiHandler(process.env)
const accountHandler = createAccountHandler()

function sendText(res, status, text) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(text)
}

const server = http.createServer((req, res) => {
  // The static build can live on another origin (GitHub Pages) and call this
  // server for accounts and AI, so CORS is negotiated before anything else.
  applyCors(req, res)
  if (handlePreflight(req, res)) return

  let url
  try {
    url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  } catch {
    sendText(res, 400, 'Bad request')
    return
  }

  if (url.pathname === '/api/ai' || url.pathname.startsWith('/api/ai/')) {
    aiHandler(req, res)
    return
  }

  if (url.pathname === '/api/auth' || url.pathname.startsWith('/api/auth/')) {
    accountHandler(req, res)
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    sendText(res, 405, 'Method not allowed')
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    sendText(res, 400, 'Bad request')
    return
  }

  let filePath = join(DIST, pathname)
  if (filePath !== DIST && !filePath.startsWith(`${DIST}${sep}`)) {
    sendText(res, 403, 'Forbidden')
    return
  }

  const exists = existsSync(filePath) && statSync(filePath).isFile()
  if (!exists) {
    const nestedIndex = join(filePath, 'index.html')
    filePath = existsSync(nestedIndex) ? nestedIndex : join(DIST, 'index.html')
  }

  if (!existsSync(filePath)) {
    sendText(res, 404, 'Build output not found. Run "npm run build" first.')
    return
  }

  const extension = extname(filePath).toLowerCase()
  const isHashedAsset = pathname.startsWith('/assets/')
  res.statusCode = 200
  res.setHeader('Content-Type', MIME_TYPES[extension] || 'application/octet-stream')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Cache-Control', isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache')

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  const stream = createReadStream(filePath)
  stream.on('error', () => {
    if (!res.headersSent) sendText(res, 500, 'Could not read the file.')
    else res.destroy()
  })
  stream.pipe(res)
})

server.listen(PORT, HOST, () => {
  console.log(`WeSolve is serving ${DIST}`)
  console.log(`Listening on http://${HOST}:${PORT}`)
  console.log(`AI proxy: ${process.env.WESOLVE_SHARED_KEY === 'true' && process.env.NVIDIA_API_KEY ? 'shared key enabled' : 'per-user keys only'}`)
  console.log('Cross-origin API: ' + (process.env.WESOLVE_ALLOWED_ORIGINS || 'https://jaiek2k25.github.io, localhost').trim())
})

function shutdown() {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
