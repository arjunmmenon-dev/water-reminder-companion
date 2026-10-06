import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { ANIMATION_CLIPS, type AnimationState } from '../types/animation'

const REMINDER_BEFORE_END_SEC = 2.5

export function useCompanionAnimation(options: {
  onArrivalStarted: () => void
  onArrivalFinished: () => void
  onYesHappyComplete: () => void
}) {
  const state = ref<AnimationState>('arriving')
  const currentSrc = ref<string>(ANIMATION_CLIPS.arrive)
  const showReminder = ref(false)
  const videoRef = useTemplateRef<HTMLVideoElement>('companionVideo')
  let arrivalPlayLogged = false
  let yesHappyPlayingLogged = false
  let reminderShown = false
  let arrivalReminderLocked = false

  function logVideoLoadError(target: HTMLVideoElement): void {
    const path = target.currentSrc || target.src
    console.error(`[Companion] Video failed to load: ${path}`)
  }

  function resetArrivalReminderScheduling(): void {
    reminderShown = false
    arrivalReminderLocked = false
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
      return
    }

    try {
      video.load()
      await video.play()
    } catch {
      logVideoLoadError(video)
    }
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
    if (state.value !== 'arriving' || arrivalReminderLocked) {
      return
    }

    const video = videoRef.value
    if (!video || !Number.isFinite(video.duration)) {
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
      return
    }

    if (state.value === 'yesHappy') {
      console.log('[Companion] Happy animation finished')
      console.log('[Companion] Character exited via video')
      currentSrc.value = ''
      options.onYesHappyComplete()
    }
  }

  function onVideoError(event: Event): void {
    const target = event.target
    if (target instanceof HTMLVideoElement) {
      logVideoLoadError(target)
    }
  }

  function onVideoPlaying(): void {
    if (state.value === 'arriving' && !arrivalPlayLogged) {
      arrivalPlayLogged = true
      options.onArrivalStarted()
    }

    if (state.value === 'yesHappy' && !yesHappyPlayingLogged) {
      yesHappyPlayingLogged = true
      console.log(
        '[Companion] Happy animation playing — container position locked',
      )
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
    console.log('[Companion] Happy animation started')
    await playSrc(ANIMATION_CLIPS.yesHappy)
  }

  onMounted(() => {
    console.log('[Companion] Application started')
    resetArrivalReminderScheduling()
    void playSrc(ANIMATION_CLIPS.arrive)
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
  }
}
