import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { CharacterPosition } from '../shared/settings'

const DEFAULT_WIDTH = 600

export function useCharacterDisplay() {
  const videoWidthPx = ref(DEFAULT_WIDTH)
  const characterPosition = ref<CharacterPosition>('bottom-left')

  const anchorClass = computed(() => {
    return `position-${characterPosition.value}`
  })

  const anchorStyle = computed(() => ({
    '--character-video-width': `${videoWidthPx.value}px`,
  }))

  function applyDisplaySettings(settings: {
    videoWidthPx: number
    characterPosition: CharacterPosition
  }): void {
    videoWidthPx.value = settings.videoWidthPx
    characterPosition.value = settings.characterPosition
  }

  let unsubscribeDisplay: (() => void) | undefined

  onMounted(async () => {
    const api = window.desktopCompanion
    if (!api?.getDisplaySettings) {
      return
    }

    const initial = await api.getDisplaySettings()
    applyDisplaySettings(initial)

    if (api.onDisplaySettingsUpdated) {
      unsubscribeDisplay = api.onDisplaySettingsUpdated(applyDisplaySettings)
    }
  })

  onUnmounted(() => {
    unsubscribeDisplay?.()
  })

  return {
    anchorClass,
    anchorStyle,
  }
}
