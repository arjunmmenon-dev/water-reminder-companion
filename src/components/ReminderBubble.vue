<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  remindLater: []
  yes: []
}>()
</script>

<template>
  <div v-show="visible" class="reminder-ui" aria-live="polite">
    <div class="speech-bubble">
      <p class="speech-text">Time to drink some water! 💧</p>
      <div class="actions">
        <button type="button" class="btn btn-primary" @click="emit('yes')">
          YES
        </button>
        <button type="button" class="btn btn-secondary" @click="emit('remindLater')">
          Remind me later
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reminder-ui {
  position: absolute;
  top: 6%;
  left: 50%;
  z-index: 2;
  width: min(92%, 280px);
  transform: translateX(-50%);
  pointer-events: auto;
}

.speech-bubble {
  position: relative;
  padding: 12px 14px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 8px 24px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(15, 23, 42, 0.06);
}

.speech-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -10px;
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.96);
  transform: translateX(-50%) rotate(45deg);
  border-radius: 3px;
  box-shadow: 3px 3px 6px rgba(15, 23, 42, 0.06);
}

.speech-text {
  margin: 0 0 12px;
  font:
    600 14px/1.35 system-ui,
    -apple-system,
    Segoe UI,
    sans-serif;
  color: #0f172a;
  text-align: center;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font:
    600 12px/1 system-ui,
    -apple-system,
    Segoe UI,
    sans-serif;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  color: #fff;
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.btn-secondary {
  color: #334155;
  background: #f1f5f9;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}
</style>
