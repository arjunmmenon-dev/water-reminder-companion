export type CharacterSize = 'small' | 'medium' | 'large'
export type CharacterPosition = 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface GeneralSettings {
  startWithWindows: boolean
  characterSize: CharacterSize
  characterPosition: CharacterPosition
}

export interface ReminderSettings {
  enabled: boolean
  mode: 'interval'
  intervalMinutes: number
  startTime: string
  endTime: string
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
}

export interface SoundSettings {
  enabled: boolean
  volume: number
}

export interface AppSettings {
  setupCompleted: boolean
  general: GeneralSettings
  reminders: ReminderSettings
  sound: SoundSettings
}

export interface SchedulerStatus {
  enabled: boolean
  nextReminderAt: string | null
  nextReminderLabel: string
  reminderActive: boolean
}

export const CHARACTER_WIDTH_PX: Record<CharacterSize, number> = {
  small: 550,
  medium: 600,
  large: 700,
}

export const DEFAULT_SETTINGS: AppSettings = {
  setupCompleted: false,
  general: {
    startWithWindows: true,
    characterSize: 'medium',
    characterPosition: 'bottom-left',
  },
  reminders: {
    enabled: true,
    mode: 'interval',
    intervalMinutes: 60,
    startTime: '09:00',
    endTime: '21:00',
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  },
  sound: {
    enabled: true,
    volume: 0.6,
  },
}

export const INTERVAL_OPTIONS = [30, 60, 120, 180] as const
