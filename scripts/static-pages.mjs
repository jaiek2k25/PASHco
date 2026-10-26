/**
 * Finishes the GitHub Pages build.
 *
 * The repo publishes a branch, so Pages serves files straight from the working
 * tree: the root index.html is the dev entry (it points at /src/main.jsx and
 * cannot run in a browser). That file now falls back to `site/app.js` when its
 * dev entry fails to load, so this script only has to:
 *
 *   1. give the CSS a stable name the fallback can reference
 *   2. copy the shell to 404.html so deep links resolve without a server
 *   3. optionally write a CNAME for a custom domain
 *
 * Run with: npm run build:pages
 */
import { copyFileSync, existsSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SITE = 'site'
const cssDir = join(SITE, 'assets')

if (!existsSync(join(SITE, 'app.js'))) {
  console.error('site/app.js is missing — run "vite build --config vite.pages.config.js" first.')
  process.exit(1)
}

const cssFiles = existsSync(cssDir) ? readdirSync(cssDir).filter((file) => file.endsWith('.css')) : []
if (cssFiles.length === 1) {
  renameSync(join(cssDir, cssFiles[0]), join(SITE, 'app.css'))
  console.log(`css    site/app.css  (from ${cssFiles[0]})`)
} else if (cssFiles.length > 1) {
  console.warn(`Expected one CSS file, found ${cssFiles.length}; leaving names as-is.`)
}

copyFileSync('index.html', '404.html')
writeFileSync('.nojekyll', '')
console.log('shell  index.html -> 404.html (deep links)')
console.log('marker .nojekyll')

if (process.env.PAGES_CNAME) {
  writeFileSync('CNAME', `${process.env.PAGES_CNAME.trim()}\n`)
  console.log(`cname  ${process.env.PAGES_CNAME.trim()}`)
}

console.log('done: Pages will serve site/app.js through the root index.html fallback.')
