<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useCharacterDisplay } from '../composables/useCharacterDisplay'
import { useCharacterLayout } from '../composables/useCharacterLayout'
import { useCompanionAnimation } from '../composables/useCompanionAnimation'
import { useHappyWrapperMovement } from '../composables/useHappyWrapperMovement'
import { usePointerPassthrough } from '../composables/usePointerPassthrough'
import ReminderBubble from './ReminderBubble.vue'

const happyMovementWrapperRef = useTemplateRef<HTMLElement>(
  'happyMovementWrapper',
)
const {
  movementStyle: happyMovementStyle,
  begin: beginHappyMovement,
  syncVideoTime: syncHappyMovement,
  stop: stopHappyMovement,
} = useHappyWrapperMovement()

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
  getHappyMovementWrapper: () => happyMovementWrapperRef.value,
  onYesHappyMovementBegin: beginHappyMovement,
  onYesHappyMovementSync: syncHappyMovement,
  onYesHappyMovementStop: stopHappyMovement,
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
      <div
        ref="happyMovementWrapper"
        class="happy-movement-wrapper"
        :style="happyMovementStyle"
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

.happy-movement-wrapper {
  display: inline-block;
  will-change: transform;
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
