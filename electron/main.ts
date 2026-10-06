import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  screen,
  Tray,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyStartWithWindows } from './services/loginItem'
import {
  completeReminderInteraction,
  getSchedulerStatus,
  initializeScheduler,
  triggerReminder,
  updateSchedulerSettings,
} from './services/scheduler'
import { loadSettings, saveSettings } from './services/settingsStore'
import { createTrayIcon } from './trayIcon'
import { CHARACTER_WIDTH_PX, type AppSettings } from '../src/shared/settings'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let companionWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let tray: Tray | null = null
let currentSettings: AppSettings = loadSettings()

function getDisplaySettingsPayload() {
  return {
    characterSize: currentSettings.general.characterSize,
    characterPosition: currentSettings.general.characterPosition,
    videoWidthPx: CHARACTER_WIDTH_PX[currentSettings.general.characterSize],
  }
}

function broadcastSchedulerStatus(): void {
  const status = getSchedulerStatus()
  settingsWindow?.webContents.send('scheduler:status-updated', status)
}

function sendCompanionTrigger(source: 'scheduled' | 'test'): void {
  if (!companionWindow || companionWindow.isDestroyed()) {
    return
  }
  companionWindow.webContents.send('companion:trigger-reminder', { source })
}

function pushDisplaySettingsToCompanion(): void {
  if (!companionWindow || companionWindow.isDestroyed()) {
    return
  }
  companionWindow.webContents.send(
    'companion:display-settings',
    getDisplaySettingsPayload(),
  )
}

function createCompanionWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().bounds

  companionWindow = new BrowserWindow({
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
  companionWindow.setMenuBarVisibility(false)
  companionWindow.setAutoHideMenuBar(true)
  companionWindow.setTitle('')
  if (process.platform === 'win32') {
    companionWindow.setBackgroundMaterial('none')
  }
  companionWindow.setIgnoreMouseEvents(true, { forward: true })

  companionWindow.on('page-title-updated', (event) => {
    event.preventDefault()
    companionWindow?.setTitle('')
  })

  const bounds = companionWindow.getBounds()
  console.log('[Companion] Native Electron BrowserWindow created')
  console.log(
    `[Companion] BrowserWindow id=${companionWindow.id} bounds=${JSON.stringify(bounds)}`,
  )

  companionWindow.once('ready-to-show', () => {
    console.log('[Companion] Full-screen transparent stage created')
    companionWindow?.show()
    pushDisplaySettingsToCompanion()
  })

  companionWindow.webContents.on('did-finish-load', () => {
    pushDisplaySettingsToCompanion()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    companionWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    companionWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  companionWindow.on('closed', () => {
    companionWindow = null
  })
}

function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 700,
    title: 'Desktop Companion Settings',
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  settingsWindow.once('ready-to-show', () => {
    console.log('[Settings] Settings window opened')
    settingsWindow?.show()
    broadcastSchedulerStatus()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}settings.html`)
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../dist/settings.html'))
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

function createTray(): void {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('Desktop Companion')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Desktop Companion',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow()
      },
    },
    {
      label: 'Test Reminder',
      click: () => {
        triggerReminder('test')
      },
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

function registerIpcHandlers(): void {
  ipcMain.handle('desktop-companion:ping', () => 'pong')

  ipcMain.handle('desktop-companion:cursor-point', () =>
    screen.getCursorScreenPoint(),
  )

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

  ipcMain.handle('companion:get-display-settings', () =>
    getDisplaySettingsPayload(),
  )

  ipcMain.on('companion:reminder-complete', () => {
    completeReminderInteraction()
    broadcastSchedulerStatus()
  })

  ipcMain.handle('settings:get', () => currentSettings)

  ipcMain.handle('settings:save', (_event, settings: AppSettings) => {
    currentSettings = saveSettings(settings)
    applyStartWithWindows(currentSettings.general.startWithWindows)
    updateSchedulerSettings(currentSettings)
    pushDisplaySettingsToCompanion()
    broadcastSchedulerStatus()
    console.log('[Settings] Settings saved')
    return currentSettings
  })

  ipcMain.handle('reminder:test', () => {
    triggerReminder('test')
  })

  ipcMain.handle('scheduler:status', () => getSchedulerStatus())
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  currentSettings = loadSettings()
  applyStartWithWindows(currentSettings.general.startWithWindows)

  registerIpcHandlers()
  createCompanionWindow()
  createTray()

  initializeScheduler(currentSettings, (source) => {
    sendCompanionTrigger(source)
    broadcastSchedulerStatus()
  })

  broadcastSchedulerStatus()
})

app.on('window-all-closed', () => {
  // Keep running in tray; quit only from tray Exit.
})

app.on('before-quit', () => {
  tray?.destroy()
  tray = null
})
