import { ref } from 'vue'

export function useCharacterLayout() {
  const anchorHidden = ref(true)
  let entranceLogged = false
  let reachedPositionLogged = false

  function resetSessionLogs(): void {
    entranceLogged = false
    reachedPositionLogged = false
  }

  function onArrivalStarted(): void {
    if (entranceLogged) {
      return
    }
    entranceLogged = true
    console.log('[Companion] Character entering')
  }

  function onArrivalFinished(): void {
    if (reachedPositionLogged) {
      return
    }
    reachedPositionLogged = true
    console.log('[Companion] Character reached position')
  }

  function showCompanion(): void {
    anchorHidden.value = false
  }

  function hideCompanion(): void {
    anchorHidden.value = true
    console.log('[Companion] Companion hidden')
  }

  return {
    anchorHidden,
    resetSessionLogs,
    onArrivalStarted,
    onArrivalFinished,
    showCompanion,
    hideCompanion,
  }
}
