import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { ANIMATION_CLIPS, type AnimationState } from '../types/animation'

export function useCompanionAnimation(options: {
  onArrivalStarted: () => void
  onArrivalFinished: () => void
  onYesHappyComplete: () => void
}) {
  const state = ref<AnimationState>('arriving')
  const currentSrc = ref<string>(ANIMATION_CLIPS.arrive)
  const videoRef = useTemplateRef<HTMLVideoElement>('companionVideo')
  let arrivalPlayLogged = false
  let yesHappyPlayingLogged = false

  const showReminderUi = computed(() => state.value === 'reminder')

  function logVideoLoadError(target: HTMLVideoElement): void {
    const path = target.currentSrc || target.src
    console.error(`[Companion] Video failed to load: ${path}`)
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

  function onVideoEnded(): void {
    const video = videoRef.value
    if (!video) {
      return
    }

    video.pause()

    if (state.value === 'arriving') {
      options.onArrivalFinished()
      state.value = 'reminder'
      console.log('[Companion] Reminder displayed')
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
    state.value = 'remindLater'
    console.log('[Companion] Sad animation started')
    await playSrc(ANIMATION_CLIPS.remindLaterSad)
  }

  async function onYes(): Promise<void> {
    console.log('[Companion] YES clicked')
    state.value = 'yesHappy'
    console.log('[Companion] Happy animation started')
    await playSrc(ANIMATION_CLIPS.yesHappy)
  }

  onMounted(() => {
    console.log('[Companion] Application started')
    void playSrc(ANIMATION_CLIPS.arrive)
  })

  return {
    state,
    videoRef,
    currentSrc,
    showReminderUi,
    onVideoEnded,
    onVideoError,
    onVideoPlaying,
    onRemindLater,
    onYes,
  }
}
