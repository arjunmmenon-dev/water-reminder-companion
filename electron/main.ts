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
import { getAppIconPath } from './appPaths'
import { createTrayIcon } from './trayIcon'
import { CHARACTER_WIDTH_PX, type AppSettings } from '../src/shared/settings'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let companionWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let settingsWindowMode: 'setup' | 'settings' | null = null
let tray: Tray | null = null
let schedulerStarted = false
let currentSettings: AppSettings = loadSettings()

function getWindowIconOptions(): { icon: string } | Record<string, never> {
  const iconPath = getAppIconPath()
  return iconPath ? { icon: iconPath } : {}
}

function getDisplaySettingsPayload() {
  return {
    characterSize: currentSettings.general.characterSize,
    characterPosition: currentSettings.general.characterPosition,
    videoWidthPx: CHARACTER_WIDTH_PX[currentSettings.general.characterSize],
  }
}

function settingsPageUrl(mode: 'setup' | 'settings'): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    return `${process.env.VITE_DEV_SERVER_URL}settings.html?mode=${mode}`
  }
  return `file://${path.join(__dirname, '../dist/settings.html')}?mode=${mode}`
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

const WM_ACTIVATE = 0x0006
const WM_SETTEXT = 0x000c
const WM_SETICON = 0x0080
const WM_NCPAINT = 0x0085
const WM_NCACTIVATE = 0x0086
const CAPTION_REPAINT_MESSAGES = [
  WM_ACTIVATE,
  WM_SETTEXT,
  WM_SETICON,
  WM_NCPAINT,
  WM_NCACTIVATE,
]

let captionRefreshTimer: ReturnType<typeof setTimeout> | null = null
let captionRefreshing = false

// Windows' default handling of these messages can paint a classic title bar
// into the frameless transparent window, and it persists until the window is
// re-shown.
function scheduleCaptionRefresh(message: number): void {
  if (captionRefreshing || captionRefreshTimer) {
    return
  }

  captionRefreshTimer = setTimeout(() => {
    captionRefreshTimer = null
    const win = companionWindow
    if (!win || win.isDestroyed() || !win.isVisible()) {
      return
    }

    console.log(
      `[Companion] Caption repaint (msg 0x${message.toString(16)}) — refreshing window`,
    )
    captionRefreshing = true
    win.hide()
    win.showInactive()
    setTimeout(() => {
      captionRefreshing = false
    }, 500)
  }, 100)
}

function guardAgainstCaptionPaint(win: BrowserWindow): void {
  if (process.platform !== 'win32') {
    return
  }
  for (const message of CAPTION_REPAINT_MESSAGES) {
    win.hookWindowMessage(message, () => {
      scheduleCaptionRefresh(message)
    })
  }
}

function createCompanionWindow(): void {
  if (companionWindow && !companionWindow.isDestroyed()) {
    pushDisplaySettingsToCompanion()
    return
  }

  const { width, height } = screen.getPrimaryDisplay().bounds

  companionWindow = new BrowserWindow({
    ...getWindowIconOptions(),
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
    if (companionWindow) {
      guardAgainstCaptionPaint(companionWindow)
    }
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

function createSettingsWindow(mode: 'setup' | 'settings'): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindowMode === mode) {
      settingsWindow.focus()
      return
    }
    settingsWindow.close()
  }

  settingsWindowMode = mode
  const isSetup = mode === 'setup'

  settingsWindow = new BrowserWindow({
    ...getWindowIconOptions(),
    width: 540,
    height: isSetup ? 760 : 700,
    center: true,
    title: isSetup ? 'Desktop Companion Setup' : 'Desktop Companion Settings',
    resizable: !isSetup,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  settingsWindow.once('ready-to-show', () => {
    console.log(
      isSetup ? '[Settings] Setup window opened' : '[Settings] Settings window opened',
    )
    settingsWindow?.show()
    if (!isSetup) {
      broadcastSchedulerStatus()
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(settingsPageUrl(mode))
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../dist/settings.html'), {
      query: { mode },
    })
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
    settingsWindowMode = null
  })
}

function startCompanionAndScheduler(): void {
  createCompanionWindow()

  if (!schedulerStarted) {
    initializeScheduler(currentSettings, (source) => {
      sendCompanionTrigger(source)
      broadcastSchedulerStatus()
    })
    schedulerStarted = true
  } else {
    updateSchedulerSettings(currentSettings)
  }

  broadcastSchedulerStatus()
}

function createTray(): void {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('Desktop Companion')
  updateTrayMenu()
}

function updateTrayMenu(): void {
  if (!tray) {
    return
  }

  const setupDone = currentSettings.setupCompleted

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Desktop Companion',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (!currentSettings.setupCompleted) {
          createSettingsWindow('setup')
          return
        }
        createSettingsWindow('settings')
      },
    },
    {
      label: 'Test Reminder',
      enabled: setupDone && Boolean(companionWindow),
      click: () => {
        if (!currentSettings.setupCompleted) {
          return
        }
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
    const next = { ...settings, setupCompleted: currentSettings.setupCompleted }
    currentSettings = saveSettings(next)
    applyStartWithWindows(currentSettings.general.startWithWindows)
    if (schedulerStarted) {
      updateSchedulerSettings(currentSettings)
      pushDisplaySettingsToCompanion()
    }
    broadcastSchedulerStatus()
    updateTrayMenu()
    console.log('[Settings] Settings saved')
    return currentSettings
  })

  ipcMain.handle('settings:complete-setup', (_event, settings: AppSettings) => {
    currentSettings = saveSettings({ ...settings, setupCompleted: true })
    applyStartWithWindows(currentSettings.general.startWithWindows)
    console.log('[Settings] Settings saved')
    console.log('[Settings] First-launch setup completed')

    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close()
    }

    startCompanionAndScheduler()
    updateTrayMenu()
    return currentSettings
  })

  ipcMain.handle('reminder:test', () => {
    if (!currentSettings.setupCompleted) {
      return
    }
    triggerReminder('test')
  })

  ipcMain.handle('scheduler:status', () => getSchedulerStatus())
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.desktop.companion')
  }

  currentSettings = loadSettings()

  registerIpcHandlers()
  createTray()

  if (!currentSettings.setupCompleted) {
    createSettingsWindow('setup')
    return
  }

  applyStartWithWindows(currentSettings.general.startWithWindows)
  startCompanionAndScheduler()
})

app.on('window-all-closed', () => {
  // Keep running in tray; quit only from tray Exit.
})

app.on('before-quit', () => {
  tray?.destroy()
  tray = null
})
