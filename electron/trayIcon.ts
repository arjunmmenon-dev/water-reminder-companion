import { nativeImage } from 'electron'
import { getAppIconPath } from './appPaths'

const FALLBACK_TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVQ4T2NkYGD4z0ABYBw1gGE0DBhGwwAGBgZGBgZGBgYGBgYAAGQABf5a8k8AAAAASUVORK5CYII='

export function createTrayIcon() {
  const iconPath = getAppIconPath()
  if (iconPath) {
    const image = nativeImage.createFromPath(iconPath)
    if (!image.isEmpty()) {
      return image.resize({ width: 16, height: 16 })
    }
  }

  return nativeImage.createFromDataURL(
    `data:image/png;base64,${FALLBACK_TRAY_ICON_BASE64}`,
  )
}
