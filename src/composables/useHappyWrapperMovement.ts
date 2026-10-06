import { computed, ref } from 'vue'

const RIGHT_MARGIN_PX = 5
const DEFAULT_RUN_START_SEC = 2.5
const DEFAULT_RUN_END_SEC = 6.5

function easeOutQuad(progress: number): number {
  return 1 - (1 - progress) ** 2
}

function resolveRunWindow(duration: number): {
  runStart: number
  runEnd: number
} {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { runStart: DEFAULT_RUN_START_SEC, runEnd: DEFAULT_RUN_END_SEC }
  }

  if (duration >= DEFAULT_RUN_END_SEC) {
    return { runStart: DEFAULT_RUN_START_SEC, runEnd: DEFAULT_RUN_END_SEC }
  }

  const runEnd = Math.max(duration * 0.85, DEFAULT_RUN_START_SEC + 0.5)
  const runStart = Math.min(
    DEFAULT_RUN_START_SEC,
    runEnd * (DEFAULT_RUN_START_SEC / DEFAULT_RUN_END_SEC),
  )
  return { runStart, runEnd }
}

export function useHappyWrapperMovement() {
  const translateXPx = ref(0)

  let targetDeltaPx = 0
  let targetLeftPx = 0
  let runStartedLogged = false
  let movementStartedLogged = false
  let movementFinishedLogged = false
  let rafId = 0
  let activeVideo: HTMLVideoElement | null = null

  const movementStyle = computed(() => {
    if (translateXPx.value === 0) {
      return {}
    }
    return {
      transform: `translateX(${translateXPx.value}px)`,
    }
  })

  function cancelRaf(): void {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function reset(): void {
    cancelRaf()
    activeVideo = null
    translateXPx.value = 0
    targetDeltaPx = 0
    targetLeftPx = 0
    runStartedLogged = false
    movementStartedLogged = false
    movementFinishedLogged = false
  }

  function applyVideoTime(currentTime: number, duration: number): void {
    const { runStart, runEnd } = resolveRunWindow(duration)

    if (currentTime >= runStart && !runStartedLogged) {
      runStartedLogged = true
      console.log(`[Companion] Happy run started at: ${currentTime.toFixed(2)}s`)
    }

    if (currentTime >= runStart && !movementStartedLogged) {
      movementStartedLogged = true
      console.log('[Companion] Happy wrapper movement started')
    }

    if (currentTime < runStart) {
      translateXPx.value = 0
      return
    }

    if (currentTime >= runEnd) {
      translateXPx.value = targetDeltaPx
      if (!movementFinishedLogged) {
        movementFinishedLogged = true
        console.log('[Companion] Happy wrapper movement finished')
      }
      return
    }

    const progress = (currentTime - runStart) / (runEnd - runStart)
    translateXPx.value = targetDeltaPx * easeOutQuad(progress)
  }

  function rafTick(): void {
    const video = activeVideo
    if (!video || video.ended) {
      cancelRaf()
      return
    }

    const duration = video.duration
    if (Number.isFinite(duration)) {
      applyVideoTime(video.currentTime, duration)
    }

    rafId = requestAnimationFrame(rafTick)
  }

  function startRafLoop(): void {
    cancelRaf()
    rafId = requestAnimationFrame(rafTick)
  }

  function begin(
    wrapper: HTMLElement | null,
    video: HTMLVideoElement | null,
  ): void {
    reset()

    if (!wrapper) {
      console.warn('[Companion] Happy movement wrapper not available')
      return
    }

    activeVideo = video

    const rect = wrapper.getBoundingClientRect()
    const startX = rect.left
    const wrapperWidth = rect.width
    targetLeftPx = Math.max(
      0,
      window.innerWidth - wrapperWidth - RIGHT_MARGIN_PX,
    )
    targetDeltaPx = targetLeftPx - startX

    console.log('[Companion] Happy animation started')
    console.log(`[Companion] Happy wrapper target X: ${targetLeftPx}`)

    if (video) {
      startRafLoop()
    }
  }

  function syncVideoTime(currentTime: number, duration: number): void {
    if (!activeVideo) {
      return
    }
    applyVideoTime(currentTime, duration)
  }

  function stop(): void {
    cancelRaf()
    activeVideo = null
    translateXPx.value = 0
    targetDeltaPx = 0
    targetLeftPx = 0
    runStartedLogged = false
    movementStartedLogged = false
    movementFinishedLogged = false
  }

  return {
    movementStyle,
    begin,
    syncVideoTime,
    reset,
    stop,
  }
}
