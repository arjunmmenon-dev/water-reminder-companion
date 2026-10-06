import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, SchedulerStatus } from '../src/shared/settings'
import type { CharacterPosition, CharacterSize } from '../src/shared/settings'

export interface DisplaySettings {
  characterSize: CharacterSize
  characterPosition: CharacterPosition
  videoWidthPx: number
}

export type ReminderTriggerPayload = {
  source: 'scheduled' | 'test'
}

contextBridge.exposeInMainWorld('desktopCompanion', {
  ping: (): Promise<string> => ipcRenderer.invoke('desktop-companion:ping'),
  getCursorScreenPoint: (): Promise<{ x: number; y: number }> =>
    ipcRenderer.invoke('desktop-companion:cursor-point'),
  getWindowBounds: (): Promise<{ x: number; y: number; width: number; height: number }> =>
    ipcRenderer.invoke('desktop-companion:window-bounds'),
  setIgnoreMouseEvents: (ignore: boolean): void => {
    ipcRenderer.send('desktop-companion:set-ignore-mouse-events', ignore)
  },
  getDisplaySettings: (): Promise<DisplaySettings> =>
    ipcRenderer.invoke('companion:get-display-settings'),
  onDisplaySettingsUpdated: (
    callback: (settings: DisplaySettings) => void,
  ): (() => void) => {
    const listener = (_event: unknown, settings: DisplaySettings) => {
      callback(settings)
    }
    ipcRenderer.on('companion:display-settings', listener)
    return () => {
      ipcRenderer.removeListener('companion:display-settings', listener)
    }
  },
  onReminderTrigger: (
    callback: (payload: ReminderTriggerPayload) => void,
  ): (() => void) => {
    const listener = (_event: unknown, payload: ReminderTriggerPayload) => {
      callback(payload)
    }
    ipcRenderer.on('companion:trigger-reminder', listener)
    return () => {
      ipcRenderer.removeListener('companion:trigger-reminder', listener)
    }
  },
  notifyReminderComplete: (): void => {
    ipcRenderer.send('companion:reminder-complete')
  },
})

contextBridge.exposeInMainWorld('settingsApi', {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:save', settings),
  completeSetup: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:complete-setup', settings),
  testReminder: (): Promise<void> => ipcRenderer.invoke('reminder:test'),
  getSchedulerStatus: (): Promise<SchedulerStatus> =>
    ipcRenderer.invoke('scheduler:status'),
  onSchedulerStatus: (
    callback: (status: SchedulerStatus) => void,
  ): (() => void) => {
    const listener = (_event: unknown, status: SchedulerStatus) => {
      callback(status)
    }
    ipcRenderer.on('scheduler:status-updated', listener)
    return () => {
      ipcRenderer.removeListener('scheduler:status-updated', listener)
    }
  },
})
