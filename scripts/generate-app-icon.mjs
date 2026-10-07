import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(scriptDir, '..')
const pngPath = path.join(projectRoot, 'src/assets/icons/app-icon.png')
const outDir = path.join(projectRoot, 'assets/icons')
const icoPath = path.join(outDir, 'app-icon.ico')

const sizes = [16, 24, 32, 48, 64, 128, 256]

if (!fs.existsSync(pngPath)) {
  console.error(`[icons] Missing source PNG: ${pngPath}`)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const pngBuffers = await Promise.all(
  sizes.map((size) =>
    sharp(pngPath).resize(size, size, { fit: 'contain' }).png().toBuffer(),
  ),
)

const icoBuffer = await toIco(pngBuffers)
fs.writeFileSync(icoPath, icoBuffer)
console.log(`[icons] Wrote ${icoPath} (${sizes.join(', ')}px)`)
