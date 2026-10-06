import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().bounds

  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    title: '',
    frame: false,
    thickFrame: false,
    transparent: true,
    autoHideMenuBar: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    ...(process.platform === 'win32' ? { backgroundMaterial: 'none' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  Menu.setApplicationMenu(null)
  mainWindow.setMenuBarVisibility(false)
  mainWindow.setAutoHideMenuBar(true)
  mainWindow.setTitle('')
  if (process.platform === 'win32') {
    mainWindow.setBackgroundMaterial('none')
  }
  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault()
    mainWindow?.setTitle('')
  })

  const bounds = mainWindow.getBounds()
  console.log('[Companion] Native Electron BrowserWindow created')
  console.log(
    `[Companion] BrowserWindow id=${mainWindow.id} bounds=${JSON.stringify(bounds)}`,
  )

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
  Menu.setApplicationMenu(null)
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
