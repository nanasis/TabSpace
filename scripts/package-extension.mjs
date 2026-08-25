import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

import { ZipArchive } from 'archiver'

const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'))
const releaseDirectory = resolve('release')
const outputPath = resolve(releaseDirectory, `tabspace-v${packageJson.version}.zip`)

await mkdir(releaseDirectory, { recursive: true })
await rm(outputPath, { force: true })

await new Promise((resolveArchive, rejectArchive) => {
  const output = createWriteStream(outputPath)
  const archive = new ZipArchive({ zlib: { level: 9 } })
  output.on('close', resolveArchive)
  output.on('error', rejectArchive)
  archive.on('error', rejectArchive)
  archive.pipe(output)
  archive.directory(resolve('dist'), false)
  void archive.finalize()
})

console.log(`Packaged ${outputPath}`)
