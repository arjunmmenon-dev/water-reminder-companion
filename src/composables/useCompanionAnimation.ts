import { nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { ANIMATION_CLIPS, type AnimationState } from '../types/animation'

const REMINDER_BEFORE_END_SEC = 2.5

export function useCompanionAnimation(options: {
  onArrivalStarted: () => void
  onArrivalFinished: () => void
  onYesHappyComplete: () => void
  onInteractionComplete: () => void
  onSessionStart: () => void
  getHappyMovementWrapper?: () => HTMLElement | null
  onYesHappyMovementBegin?: (
    wrapper: HTMLElement | null,
    video: HTMLVideoElement | null,
  ) => void
  onYesHappyMovementSync?: (currentTime: number, duration: number) => void
  onYesHappyMovementStop?: () => void
}) {
  const state = ref<AnimationState>('arriving')
  const currentSrc = ref<string>('')
  const showReminder = ref(false)
  const videoRef = useTemplateRef<HTMLVideoElement>('companionVideo')
  let arrivalPlayLogged = false
  let yesHappyPlayingLogged = false
  let reminderShown = false
  let arrivalReminderLocked = false

  function logVideoLoadError(
    target: HTMLVideoElement,
    error?: unknown,
  ): void {
    const path = target.currentSrc || target.src
    console.error(`[Companion] Video error: ${path}`, error)
  }

  function resetArrivalReminderScheduling(): void {
    reminderShown = false
    arrivalReminderLocked = false
  }

  function resetSessionState(): void {
    arrivalPlayLogged = false
    yesHappyPlayingLogged = false
    resetArrivalReminderScheduling()
    options.onYesHappyMovementStop?.()
    state.value = 'arriving'
    showReminder.value = false
    currentSrc.value = ''
  }

  function lockArrivalReminderScheduling(): void {
    arrivalReminderLocked = true
  }

  function showReminderOnce(fromEarlyTrigger = false): void {
    if (reminderShown) {
      return
    }
    reminderShown = true
    showReminder.value = true
    if (fromEarlyTrigger) {
      console.log('[Companion] Reminder shown before arrival finished')
    }
  }

  async function playSrc(src: string): Promise<void> {
    currentSrc.value = src
    await nextTick()

    const video = videoRef.value
    if (!video) {
      console.error('[Companion] Video element not available for playback')
      return
    }

    try {
      video.pause()
      video.currentTime = 0
      video.load()
      await video.play()
    } catch (error) {
      logVideoLoadError(video, error)
    }
  }

  async function triggerReminder(source: 'scheduled' | 'test'): Promise<void> {
    console.log(`[Companion] Reminder flow started (${source})`)
    resetSessionState()
    options.onSessionStart()
    await playSrc(ANIMATION_CLIPS.arrive)
  }

  function onVideoLoadedMetadata(): void {
    if (state.value !== 'arriving') {
      return
    }

    const video = videoRef.value
    if (!video || !Number.isFinite(video.duration)) {
      return
    }

    const triggerTime = Math.max(0, video.duration - REMINDER_BEFORE_END_SEC)
    console.log(`[Companion] Arrival duration: ${video.duration}`)
    console.log(`[Companion] Reminder trigger time: ${triggerTime}`)
  }

  function onVideoTimeUpdate(): void {
    const video = videoRef.value
    if (!video) {
      return
    }

    if (state.value === 'yesHappy' && Number.isFinite(video.duration)) {
      options.onYesHappyMovementSync?.(video.currentTime, video.duration)
      return
    }

    if (state.value !== 'arriving' || arrivalReminderLocked) {
      return
    }

    if (!Number.isFinite(video.duration)) {
      return
    }

    const triggerTime = Math.max(0, video.duration - REMINDER_BEFORE_END_SEC)
    if (video.currentTime >= triggerTime) {
      showReminderOnce(true)
    }
  }

  function onVideoEnded(): void {
    const video = videoRef.value
    if (!video) {
      return
    }

    video.pause()

    if (state.value === 'arriving') {
      lockArrivalReminderScheduling()
      if (!reminderShown) {
        showReminderOnce()
      }
      options.onArrivalFinished()
      state.value = 'reminder'
      console.log('[Companion] Arrival animation finished')
      return
    }

    if (state.value === 'remindLater') {
      console.log('[Companion] Sad animation finished')
      options.onInteractionComplete()
      return
    }

    if (state.value === 'yesHappy') {
      options.onYesHappyMovementStop?.()
      console.log('[Companion] Happy animation ended')
      currentSrc.value = ''
      options.onYesHappyComplete()
      options.onInteractionComplete()
    }
  }

  function onVideoError(event: Event): void {
    const target = event.target
    if (target instanceof HTMLVideoElement) {
      logVideoLoadError(target, event)
    }
  }

  function onVideoPlaying(): void {
    if (state.value === 'arriving' && !arrivalPlayLogged) {
      arrivalPlayLogged = true
      options.onArrivalStarted()
    }

    if (state.value === 'yesHappy' && !yesHappyPlayingLogged) {
      yesHappyPlayingLogged = true
      console.log('[Companion] Happy animation play started')
    }
  }

  async function onRemindLater(): Promise<void> {
    console.log('[Companion] Remind later clicked')
    lockArrivalReminderScheduling()
    showReminder.value = false
    state.value = 'remindLater'
    console.log('[Companion] Sad animation started')
    await playSrc(ANIMATION_CLIPS.remindLaterSad)
  }

  async function onYes(): Promise<void> {
    console.log('[Companion] YES clicked')
    lockArrivalReminderScheduling()
    showReminder.value = false
    state.value = 'yesHappy'
    console.log('[Companion] Switching to happy animation')
    console.log(`[Companion] Happy animation source: ${ANIMATION_CLIPS.yesHappy}`)
    await playSrc(ANIMATION_CLIPS.yesHappy)
    options.onYesHappyMovementBegin?.(
      options.getHappyMovementWrapper?.() ?? null,
      videoRef.value,
    )
  }

  let unsubscribeTrigger: (() => void) | undefined

  onMounted(() => {
    console.log('[Companion] Application started')
    const api = window.desktopCompanion
    if (api?.onReminderTrigger) {
      unsubscribeTrigger = api.onReminderTrigger((payload) => {
        void triggerReminder(payload.source)
      })
    }
  })

  onUnmounted(() => {
    unsubscribeTrigger?.()
  })

  return {
    state,
    videoRef,
    currentSrc,
    showReminder,
    onVideoEnded,
    onVideoError,
    onVideoPlaying,
    onVideoLoadedMetadata,
    onVideoTimeUpdate,
    onRemindLater,
    onYes,
    triggerReminder,
  }
}
