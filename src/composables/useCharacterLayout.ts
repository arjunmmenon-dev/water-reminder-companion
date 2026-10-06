import { ref } from 'vue'

let entranceLogged = false
let reachedPositionLogged = false

export function useCharacterLayout() {
  const anchorHidden = ref(false)

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

  function hideCompanion(): void {
    anchorHidden.value = true
    console.log('[Companion] Companion hidden')
  }

  return {
    anchorHidden,
    onArrivalStarted,
    onArrivalFinished,
    hideCompanion,
  }
}
