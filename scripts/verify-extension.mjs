import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('dist')
const manifestPath = resolve(outputDirectory, 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

if (manifest.manifest_version !== 3) {
  throw new Error('The production manifest must use Manifest V3')
}

if (typeof manifest.background?.service_worker !== 'string') {
  throw new Error('The production manifest must declare a background service worker')
}

if (manifest.chrome_url_overrides?.newtab !== 'index.html') {
  throw new Error('The production manifest must register TabSpace as the Chrome new-tab page')
}

const requiredFiles = new Set([
  manifest.chrome_url_overrides.newtab,
  manifest.background.service_worker,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
])

await Promise.all([...requiredFiles].map((path) => access(resolve(outputDirectory, path))))

console.log(`Verified unpacked extension output (${requiredFiles.size} referenced files).`)
