<script setup lang="ts">
import { useCharacterDisplay } from '../composables/useCharacterDisplay'
import { useCharacterLayout } from '../composables/useCharacterLayout'
import { useCompanionAnimation } from '../composables/useCompanionAnimation'
import { usePointerPassthrough } from '../composables/usePointerPassthrough'
import ReminderBubble from './ReminderBubble.vue'

const {
  anchorHidden,
  resetSessionLogs,
  onArrivalStarted,
  onArrivalFinished,
  showCompanion,
  hideCompanion,
} = useCharacterLayout()

const { anchorClass, anchorStyle } = useCharacterDisplay()

const {
  currentSrc,
  showReminder,
  onVideoEnded,
  onVideoError,
  onVideoPlaying,
  onVideoLoadedMetadata,
  onVideoTimeUpdate,
  onRemindLater,
  onYes,
} = useCompanionAnimation({
  onArrivalStarted,
  onArrivalFinished,
  onSessionStart: () => {
    resetSessionLogs()
    showCompanion()
  },
  onYesHappyComplete: hideCompanion,
  onInteractionComplete: () => {
    window.desktopCompanion?.notifyReminderComplete?.()
  },
})

usePointerPassthrough(anchorHidden)
</script>

<template>
  <div class="companion-stage">
    <div
      v-show="!anchorHidden"
      class="character-anchor"
      :class="anchorClass"
      :style="anchorStyle"
    >
      <div class="character-content">
        <ReminderBubble
          v-if="showReminder"
          @remind-later="onRemindLater"
          @yes="onYes"
        />

        <video
          ref="companionVideo"
          class="character-video"
          :src="currentSrc"
          autoplay
          playsinline
          muted
          preload="auto"
          @ended="onVideoEnded"
          @error="onVideoError"
          @playing="onVideoPlaying"
          @loadedmetadata="onVideoLoadedMetadata"
          @timeupdate="onVideoTimeUpdate"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.companion-stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}

.character-anchor {
  position: absolute;
  bottom: 20px;
  display: block;
  pointer-events: auto;
}

.character-anchor.position-bottom-left {
  left: 0;
  right: auto;
}

.character-anchor.position-bottom-center {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}

.character-anchor.position-bottom-right {
  left: auto;
  right: 0;
}

.character-content {
  position: relative;
  display: inline-block;
}

.character-video {
  display: block;
  width: var(--character-video-width, 600px);
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background: transparent;
  pointer-events: none;
}
</style>
