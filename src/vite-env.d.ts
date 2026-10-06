/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

import type { AppSettings, SchedulerStatus } from './shared/settings'
import type { CharacterPosition, CharacterSize } from './shared/settings'

interface DisplaySettings {
  characterSize: CharacterSize
  characterPosition: CharacterPosition
  videoWidthPx: number
}

interface ReminderTriggerPayload {
  source: 'scheduled' | 'test'
}

interface DesktopCompanionApi {
  ping: () => Promise<string>
  getCursorScreenPoint: () => Promise<{ x: number; y: number }>
  getWindowBounds: () => Promise<{
    x: number
    y: number
    width: number
    height: number
  }>
  setIgnoreMouseEvents: (ignore: boolean) => void
  getDisplaySettings?: () => Promise<DisplaySettings>
  onDisplaySettingsUpdated?: (
    callback: (settings: DisplaySettings) => void,
  ) => () => void
  onReminderTrigger?: (
    callback: (payload: ReminderTriggerPayload) => void,
  ) => () => void
  notifyReminderComplete?: () => void
}

interface SettingsApi {
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<AppSettings>
  testReminder: () => Promise<void>
  getSchedulerStatus: () => Promise<SchedulerStatus>
  onSchedulerStatus: (callback: (status: SchedulerStatus) => void) => () => void
}

declare global {
  interface Window {
    desktopCompanion: DesktopCompanionApi
    settingsApi?: SettingsApi
  }
}

export {}
