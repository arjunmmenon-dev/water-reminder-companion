import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type CharacterPosition,
  type CharacterSize,
  type GeneralSettings,
  type ReminderSettings,
  type SoundSettings,
} from '../../src/shared/settings'

const SETTINGS_FILE = 'settings.json'

function settingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE)
}

function isCharacterSize(value: unknown): value is CharacterSize {
  return value === 'small' || value === 'medium' || value === 'large'
}

function isCharacterPosition(value: unknown): value is CharacterPosition {
  return (
    value === 'bottom-left' ||
    value === 'bottom-center' ||
    value === 'bottom-right'
  )
}

function parseTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) {
    return fallback
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(1, Math.max(0, value))
}

export function normalizeSettings(raw: unknown): AppSettings {
  const source =
    raw && typeof raw === 'object' ? (raw as Partial<AppSettings>) : {}

  const general = (source.general ?? {}) as Partial<GeneralSettings>
  const reminders = (source.reminders ?? {}) as Partial<ReminderSettings>
  const sound = (source.sound ?? {}) as Partial<SoundSettings>

  const intervalMinutes = [30, 60, 120, 180].includes(
    reminders.intervalMinutes as number,
  )
    ? (reminders.intervalMinutes as number)
    : DEFAULT_SETTINGS.reminders.intervalMinutes

  return {
    setupCompleted: source.setupCompleted === true,
    general: {
      startWithWindows:
        typeof general.startWithWindows === 'boolean'
          ? general.startWithWindows
          : DEFAULT_SETTINGS.general.startWithWindows,
      characterSize: isCharacterSize(general.characterSize)
        ? general.characterSize
        : DEFAULT_SETTINGS.general.characterSize,
      characterPosition: isCharacterPosition(general.characterPosition)
        ? general.characterPosition
        : DEFAULT_SETTINGS.general.characterPosition,
    },
    reminders: {
      enabled:
        typeof reminders.enabled === 'boolean'
          ? reminders.enabled
          : DEFAULT_SETTINGS.reminders.enabled,
      mode: 'interval',
      intervalMinutes,
      startTime: parseTime(reminders.startTime, DEFAULT_SETTINGS.reminders.startTime),
      endTime: parseTime(reminders.endTime, DEFAULT_SETTINGS.reminders.endTime),
      quietHoursEnabled:
        typeof reminders.quietHoursEnabled === 'boolean'
          ? reminders.quietHoursEnabled
          : DEFAULT_SETTINGS.reminders.quietHoursEnabled,
      quietStart: parseTime(
        reminders.quietStart,
        DEFAULT_SETTINGS.reminders.quietStart,
      ),
      quietEnd: parseTime(reminders.quietEnd, DEFAULT_SETTINGS.reminders.quietEnd),
    },
    sound: {
      enabled:
        typeof sound.enabled === 'boolean'
          ? sound.enabled
          : DEFAULT_SETTINGS.sound.enabled,
      volume: clampVolume(sound.volume, DEFAULT_SETTINGS.sound.volume),
    },
  }
}

export function loadSettings(): AppSettings {
  try {
    const filePath = settingsPath()
    if (!fs.existsSync(filePath)) {
      return { ...DEFAULT_SETTINGS }
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
    return normalizeSettings(raw)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  const normalized = normalizeSettings(settings)
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
  fs.writeFileSync(settingsPath(), JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}
