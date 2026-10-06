<script setup lang="ts">
import { useCharacterLayout } from '../composables/useCharacterLayout'
import { useCompanionAnimation } from '../composables/useCompanionAnimation'
import { usePointerPassthrough } from '../composables/usePointerPassthrough'
import ReminderBubble from './ReminderBubble.vue'

const { anchorHidden, onArrivalStarted, onArrivalFinished, hideCompanion } =
  useCharacterLayout()

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
  onYesHappyComplete: hideCompanion,
})

usePointerPassthrough(anchorHidden)
</script>

<template>
  <div class="companion-stage">
    <div v-show="!anchorHidden" class="character-anchor">
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
  left: 0;
  bottom: 20px;
  display: block;
  pointer-events: auto;
}

.character-content {
  position: relative;
  display: inline-block;
}

.character-video {
  display: block;
  width: 600px;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background: transparent;
  pointer-events: none;
}
</style>
