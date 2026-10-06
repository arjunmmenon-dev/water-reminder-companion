import { nativeImage } from 'electron'

// 16x16 blue droplet-style tray icon (PNG)
const TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVQ4T2NkYGD4z0ABYBw1gGE0DBhGwwAGBgZGBgZGBgYGBgYAAGQABf5a8k8AAAAASUVORK5CYII='

export function createTrayIcon() {
  return nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`)
}
