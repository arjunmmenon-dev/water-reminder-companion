import { onMounted, onUnmounted, type Ref } from 'vue'

export function usePointerPassthrough(anchorHidden: Ref<boolean>): void {
  let intervalId: number | undefined

  async function syncPassthrough(): Promise<void> {
    const api = window.desktopCompanion
    if (!api?.setIgnoreMouseEvents) {
      return
    }

    if (anchorHidden.value) {
      api.setIgnoreMouseEvents(true)
      return
    }

    const point = await api.getCursorScreenPoint()
    const bounds = await api.getWindowBounds()
    const x = point.x - bounds.x
    const y = point.y - bounds.y

    if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) {
      api.setIgnoreMouseEvents(true)
      return
    }

    const el = document.elementFromPoint(x, y)
    const overCompanion = Boolean(el?.closest('.character-anchor'))
    api.setIgnoreMouseEvents(!overCompanion)
  }

  onMounted(() => {
    intervalId = window.setInterval(() => {
      void syncPassthrough()
    }, 50)
  })

  onUnmounted(() => {
    if (intervalId !== undefined) {
      window.clearInterval(intervalId)
    }
  })
}
