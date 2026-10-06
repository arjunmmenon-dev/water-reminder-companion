import { app } from 'electron'

export function applyStartWithWindows(enabled: boolean): void {
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    return
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: [],
    })
  } catch (error) {
    console.error('[Settings] Failed to apply start-with-Windows setting', error)
  }
}
