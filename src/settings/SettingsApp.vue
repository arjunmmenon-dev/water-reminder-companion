<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  DEFAULT_SETTINGS,
  INTERVAL_OPTIONS,
  type AppSettings,
  type CharacterPosition,
  type CharacterSize,
  type SchedulerStatus,
} from '../shared/settings'

const isSetupMode = new URLSearchParams(window.location.search).get('mode') === 'setup'

const form = reactive<AppSettings>({ ...DEFAULT_SETTINGS })
const status = ref<SchedulerStatus>({
  enabled: true,
  nextReminderAt: null,
  nextReminderLabel: '—',
  reminderActive: false,
})

const saving = ref(false)
const savedMessage = ref('')
let savedTimer: ReturnType<typeof setTimeout> | undefined
let unsubscribeStatus: (() => void) | undefined

const intervalLabel = computed(() => {
  const minutes = form.reminders.intervalMinutes
  if (minutes === 30) return 'Every 30 minutes'
  if (minutes === 60) return 'Every 1 hour'
  if (minutes === 120) return 'Every 2 hours'
  return 'Every 3 hours'
})

function cloneSettings(settings: AppSettings): AppSettings {
  return JSON.parse(JSON.stringify(settings)) as AppSettings
}

async function loadSettings(): Promise<void> {
  const api = window.settingsApi
  if (!api) {
    return
  }
  Object.assign(form, cloneSettings(await api.getSettings()))
  status.value = await api.getSchedulerStatus()
}

async function refreshStatus(): Promise<void> {
  const api = window.settingsApi
  if (!api) {
    return
  }
  status.value = await api.getSchedulerStatus()
}

function showSavedMessage(): void {
  savedMessage.value = 'Settings saved'
  if (savedTimer) {
    clearTimeout(savedTimer)
  }
  savedTimer = setTimeout(() => {
    savedMessage.value = ''
  }, 1500)
}

async function saveSettings(): Promise<void> {
  const api = window.settingsApi
  if (!api || saving.value) {
    return
  }

  saving.value = true
  try {
    const saved = await api.saveSettings(cloneSettings(form))
    Object.assign(form, saved)
    await refreshStatus()
    showSavedMessage()
  } finally {
    saving.value = false
  }
}

async function completeSetup(): Promise<void> {
  const api = window.settingsApi
  if (!api || saving.value) {
    return
  }

  saving.value = true
  try {
    await api.completeSetup(cloneSettings(form))
  } finally {
    saving.value = false
  }
}

async function testReminder(): Promise<void> {
  await window.settingsApi?.testReminder()
  await refreshStatus()
}

function setCharacterSize(size: CharacterSize): void {
  form.general.characterSize = size
}

function setCharacterPosition(position: CharacterPosition): void {
  form.general.characterPosition = position
}

function setIntervalMinutes(minutes: number): void {
  form.reminders.intervalMinutes = minutes
}

onMounted(async () => {
  await loadSettings()
  if (!isSetupMode) {
    unsubscribeStatus = window.settingsApi?.onSchedulerStatus((next) => {
      status.value = next
    })
  }
})

onUnmounted(() => {
  unsubscribeStatus?.()
  if (savedTimer) {
    clearTimeout(savedTimer)
  }
})
</script>

<template>
  <div class="settings-page">
    <header class="page-header">
      <h1 v-if="isSetupMode">Welcome to your Desktop Companion 👋</h1>
      <h1 v-else>Desktop Companion Settings</h1>
      <p v-if="isSetupMode" class="subtitle">
        Let's set up your companion before we start.
      </p>
      <p v-else class="subtitle">Configure reminders and appearance</p>
    </header>

    <section class="card">
      <h2>General</h2>

      <label v-if="!isSetupMode" class="row">
        <span>Start with Windows</span>
        <button
          type="button"
          class="toggle"
          :class="{ on: form.general.startWithWindows }"
          @click="form.general.startWithWindows = !form.general.startWithWindows"
        >
          {{ form.general.startWithWindows ? 'ON' : 'OFF' }}
        </button>
      </label>

      <div class="field">
        <span class="label">Character size</span>
        <div class="segmented">
          <button
            type="button"
            :class="{ active: form.general.characterSize === 'small' }"
            @click="setCharacterSize('small')"
          >
            Small
          </button>
          <button
            type="button"
            :class="{ active: form.general.characterSize === 'medium' }"
            @click="setCharacterSize('medium')"
          >
            Medium
          </button>
          <button
            type="button"
            :class="{ active: form.general.characterSize === 'large' }"
            @click="setCharacterSize('large')"
          >
            Large
          </button>
        </div>
      </div>

      <div class="field">
        <span class="label">Character position</span>
        <div class="segmented">
          <button
            type="button"
            :class="{ active: form.general.characterPosition === 'bottom-left' }"
            @click="setCharacterPosition('bottom-left')"
          >
            {{ isSetupMode ? 'Left' : 'Bottom Left' }}
          </button>
          <button
            type="button"
            :class="{ active: form.general.characterPosition === 'bottom-center' }"
            @click="setCharacterPosition('bottom-center')"
          >
            {{ isSetupMode ? 'Center' : 'Bottom Center' }}
          </button>
          <button
            type="button"
            :class="{ active: form.general.characterPosition === 'bottom-right' }"
            @click="setCharacterPosition('bottom-right')"
          >
            {{ isSetupMode ? 'Right' : 'Bottom Right' }}
          </button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Reminders</h2>

      <label class="row">
        <span>Enable water reminders</span>
        <button
          type="button"
          class="toggle"
          :class="{ on: form.reminders.enabled }"
          @click="form.reminders.enabled = !form.reminders.enabled"
        >
          {{ form.reminders.enabled ? 'ON' : 'OFF' }}
        </button>
      </label>

      <div v-if="!isSetupMode" class="field">
        <span class="label">Reminder mode</span>
        <div class="mode-pill">Interval</div>
      </div>

      <div class="field">
        <span class="label">{{ isSetupMode ? 'Remind me every' : 'Interval' }}</span>
        <select
          :value="form.reminders.intervalMinutes"
          @change="setIntervalMinutes(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="minutes in INTERVAL_OPTIONS" :key="minutes" :value="minutes">
            {{
              minutes === 30
                ? 'Every 30 minutes'
                : minutes === 60
                  ? 'Every 1 hour'
                  : minutes === 120
                    ? 'Every 2 hours'
                    : 'Every 3 hours'
            }}
          </option>
        </select>
        <p v-if="!isSetupMode" class="hint">Current: {{ intervalLabel }}</p>
      </div>

      <div class="time-grid">
        <label>
          {{ isSetupMode ? 'From' : 'Start time' }}
          <input v-model="form.reminders.startTime" type="time" />
        </label>
        <label>
          {{ isSetupMode ? 'To' : 'End time' }}
          <input v-model="form.reminders.endTime" type="time" />
        </label>
      </div>

      <label class="row">
        <span>Enable quiet hours</span>
        <button
          type="button"
          class="toggle"
          :class="{ on: form.reminders.quietHoursEnabled }"
          @click="form.reminders.quietHoursEnabled = !form.reminders.quietHoursEnabled"
        >
          {{ form.reminders.quietHoursEnabled ? 'ON' : 'OFF' }}
        </button>
      </label>

      <div v-if="form.reminders.quietHoursEnabled" class="time-grid">
        <label>
          Quiet hours start
          <input v-model="form.reminders.quietStart" type="time" />
        </label>
        <label>
          Quiet hours end
          <input v-model="form.reminders.quietEnd" type="time" />
        </label>
      </div>

      <button
        v-if="!isSetupMode"
        type="button"
        class="btn-test"
        @click="testReminder"
      >
        ▶ Test Reminder
      </button>

      <div v-if="!isSetupMode" class="status-box">
        <p>
          <strong>Reminder status:</strong>
          <span v-if="status.enabled" class="status-on">● Enabled</span>
          <span v-else class="status-off">○ Disabled</span>
        </p>
        <p><strong>Next reminder:</strong> {{ status.nextReminderLabel }}</p>
      </div>
    </section>

    <section class="card">
      <h2>Sound</h2>

      <label class="row">
        <span>Sound</span>
        <button
          type="button"
          class="toggle"
          :class="{ on: form.sound.enabled }"
          @click="form.sound.enabled = !form.sound.enabled"
        >
          {{ form.sound.enabled ? 'ON' : 'OFF' }}
        </button>
      </label>

      <label class="field">
        <span class="label">Volume ({{ Math.round(form.sound.volume * 100) }}%)</span>
        <input
          v-model.number="form.sound.volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
        />
      </label>
    </section>

    <footer class="footer">
      <button
        v-if="isSetupMode"
        type="button"
        class="btn-save btn-start"
        :disabled="saving"
        @click="completeSetup"
      >
        Save &amp; Start 🚀
      </button>
      <button
        v-else
        type="button"
        class="btn-save"
        :disabled="saving"
        @click="saveSettings"
      >
        Save Settings
      </button>
      <span v-if="savedMessage" class="saved">{{ savedMessage }}</span>
    </footer>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 460px;
  margin: 0 auto;
  padding: 20px 18px 28px;
}

.page-header h1 {
  margin: 0;
  font-size: 1.35rem;
}

.subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 0.92rem;
}

.card {
  margin-top: 16px;
  padding: 14px 14px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.card h2 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 0.95rem;
}

.field {
  margin-bottom: 12px;
}

.label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: #334155;
}

.toggle {
  min-width: 58px;
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  font-weight: 600;
  font-size: 0.78rem;
  cursor: pointer;
  background: #e2e8f0;
  color: #475569;
}

.toggle.on {
  background: #2563eb;
  color: #fff;
}

.segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.segmented button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.82rem;
  cursor: pointer;
}

.segmented button.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.mode-pill {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.85rem;
  font-weight: 600;
}

select,
input[type='time'],
input[type='range'] {
  width: 100%;
}

.hint {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.time-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.time-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: #334155;
}

.btn-test {
  width: 100%;
  margin-top: 4px;
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
}

.status-box {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 0.88rem;
}

.status-on {
  color: #15803d;
  font-weight: 600;
}

.status-off {
  color: #64748b;
  font-weight: 600;
}

.footer {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-save {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: #0f172a;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-start {
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

.saved {
  color: #15803d;
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
