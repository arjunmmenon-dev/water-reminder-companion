import { powerMonitor } from 'electron'
import type { AppSettings, SchedulerStatus } from '../../src/shared/settings'

export type ReminderSource = 'scheduled' | 'test'

type TriggerHandler = (source: ReminderSource) => void

let settings: AppSettings
let triggerHandler: TriggerHandler | null = null
let reminderTimeout: ReturnType<typeof setTimeout> | null = null
let reminderActive = false
let nextReminderAt: Date | null = null

function parseTimeParts(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number)
  return { hours, minutes }
}

function atTime(base: Date, time: string): Date {
  const { hours, minutes } = parseTimeParts(time)
  const result = new Date(base)
  result.setHours(hours, minutes, 0, 0)
  return result
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTimeParts(time)
  return hours * 60 + minutes
}

function isWithinWindow(now: Date, startTime: string, endTime: string): boolean {
  const nowMinutes = minutesSinceMidnight(now)
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return nowMinutes >= start && nowMinutes <= end
}

function isInQuietHours(now: Date, quietStart: string, quietEnd: string): boolean {
  const nowMinutes = minutesSinceMidnight(now)
  const start = timeToMinutes(quietStart)
  const end = timeToMinutes(quietEnd)

  if (start === end) {
    return false
  }

  if (start < end) {
    return nowMinutes >= start && nowMinutes < end
  }

  return nowMinutes >= start || nowMinutes < end
}

function enumerateSlotsForDay(
  day: Date,
  startTime: string,
  endTime: string,
  intervalMinutes: number,
): Date[] {
  const slots: Date[] = []
  const dayStart = atTime(day, startTime)
  const dayEnd = atTime(day, endTime)

  for (
    let slot = new Date(dayStart);
    slot.getTime() <= dayEnd.getTime();
    slot = new Date(slot.getTime() + intervalMinutes * 60_000)
  ) {
    slots.push(new Date(slot))
  }

  return slots
}

export function getNextReminderDate(
  from: Date,
  currentSettings: AppSettings,
): Date | null {
  if (!currentSettings.reminders.enabled) {
    return null
  }

  const { intervalMinutes, startTime, endTime, quietHoursEnabled, quietStart, quietEnd } =
    currentSettings.reminders

  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const day = new Date(from)
    day.setDate(from.getDate() + dayOffset)
    day.setHours(0, 0, 0, 0)

    const slots = enumerateSlotsForDay(day, startTime, endTime, intervalMinutes)
    for (const slot of slots) {
      if (slot.getTime() < from.getTime()) {
        continue
      }

      if (quietHoursEnabled && isInQuietHours(slot, quietStart, quietEnd)) {
        continue
      }

      return slot
    }
  }

  return null
}

function formatStatusLabel(date: Date | null, currentSettings: AppSettings): string {
  if (!date) {
    return '—'
  }

  const now = new Date()
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return time
  }

  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()

  if (isTomorrow) {
    return `Tomorrow, ${time}`
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getSchedulerStatus(): SchedulerStatus {
  return {
    enabled: settings.reminders.enabled,
    nextReminderAt: nextReminderAt ? nextReminderAt.toISOString() : null,
    nextReminderLabel: settings.reminders.enabled
      ? formatStatusLabel(nextReminderAt, settings)
      : 'Disabled',
    reminderActive,
  }
}

function clearReminderTimeout(): void {
  if (reminderTimeout) {
    clearTimeout(reminderTimeout)
    reminderTimeout = null
  }
}

function scheduleNextReminder(): void {
  clearReminderTimeout()

  if (!settings.reminders.enabled) {
    nextReminderAt = null
    console.log('[Scheduler] Next reminder: none (disabled)')
    return
  }

  nextReminderAt = getNextReminderDate(new Date(), settings)

  if (!nextReminderAt) {
    console.log('[Scheduler] Next reminder: none')
    return
  }

  const delay = Math.max(0, nextReminderAt.getTime() - Date.now())
  console.log(
    `[Scheduler] Next reminder: ${nextReminderAt.toLocaleString()} (in ${Math.round(delay / 1000)}s)`,
  )

  reminderTimeout = setTimeout(() => {
    attemptScheduledReminder()
  }, delay)
}

function attemptScheduledReminder(): void {
  const now = new Date()

  if (!settings.reminders.enabled) {
    console.log('[Scheduler] Reminder skipped - outside active hours')
    scheduleNextReminder()
    return
  }

  if (!isWithinWindow(now, settings.reminders.startTime, settings.reminders.endTime)) {
    console.log('[Scheduler] Reminder skipped - outside active hours')
    scheduleNextReminder()
    return
  }

  if (
    settings.reminders.quietHoursEnabled &&
    isInQuietHours(now, settings.reminders.quietStart, settings.reminders.quietEnd)
  ) {
    console.log('[Scheduler] Reminder skipped - quiet hours')
    scheduleNextReminder()
    return
  }

  if (reminderActive) {
    console.log('[Scheduler] Reminder skipped - already active')
    scheduleNextReminder()
    return
  }

  console.log('[Scheduler] Reminder triggered')
  triggerReminder('scheduled')
}

export function triggerReminder(source: ReminderSource): void {
  if (source === 'scheduled' && reminderActive) {
    console.log('[Scheduler] Reminder skipped - already active')
    return
  }

  if (source === 'test') {
    console.log('[Scheduler] Test reminder triggered')
  }

  reminderActive = true
  triggerHandler?.(source)
}

export function completeReminderInteraction(): void {
  reminderActive = false
  console.log('[Scheduler] Scheduler recalculated')
  scheduleNextReminder()
}

export function initializeScheduler(
  initialSettings: AppSettings,
  onTrigger: TriggerHandler,
): void {
  settings = initialSettings
  triggerHandler = onTrigger

  powerMonitor.on('resume', () => {
    console.log('[Scheduler] Scheduler recalculated')
    scheduleNextReminder()
  })

  console.log('[Scheduler] Initialized')
  console.log('[Scheduler] Settings loaded')
  scheduleNextReminder()
}

export function updateSchedulerSettings(nextSettings: AppSettings): void {
  settings = nextSettings
  console.log('[Scheduler] Settings updated')
  console.log('[Scheduler] Scheduler recalculated')
  scheduleNextReminder()
}
