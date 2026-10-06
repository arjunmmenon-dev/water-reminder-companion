import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

/**
 * Resolves app-icon.png for dev (dist-electron + src) and packaged layouts.
 */
export function getAppIconPath(): string | undefined {
  const candidates = [
    path.join(moduleDir, 'assets/icons/app-icon.png'),
    path.join(moduleDir, '../src/assets/icons/app-icon.png'),
    path.join(app.getAppPath(), 'src/assets/icons/app-icon.png'),
    path.join(app.getAppPath(), 'assets/icons/app-icon.png'),
    path.join(process.resourcesPath, 'assets/icons/app-icon.png'),
    path.join(process.resourcesPath, 'app-icon.png'),
  ]

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate
    }
  }

  return undefined
}
