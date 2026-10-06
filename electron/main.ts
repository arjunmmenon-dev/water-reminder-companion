import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const primary = screen.getPrimaryDisplay()
  const { x, y, width, height } = primary.bounds

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  mainWindow.once('ready-to-show', () => {
    console.log('[Companion] Full-screen transparent stage created')
    mainWindow?.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

ipcMain.handle('desktop-companion:ping', () => 'pong')

ipcMain.handle('desktop-companion:cursor-point', () => screen.getCursorScreenPoint())

ipcMain.handle('desktop-companion:window-bounds', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const bounds = win?.getBounds()
  return bounds ?? { x: 0, y: 0, width: 0, height: 0 }
})

ipcMain.on(
  'desktop-companion:set-ignore-mouse-events',
  (event, ignore: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.setIgnoreMouseEvents(ignore, { forward: true })
  },
)

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
