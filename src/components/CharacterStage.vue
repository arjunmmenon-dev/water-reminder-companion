<script setup lang="ts">
import { useCompanionAnimation } from '../composables/useCompanionAnimation'
import ReminderBubble from './ReminderBubble.vue'

const {
  currentSrc,
  showReminderUi,
  onVideoEnded,
  onVideoError,
  onVideoPlaying,
  onRemindLater,
  onYes,
} = useCompanionAnimation()
</script>

<template>
  <div class="character-stage">
    <ReminderBubble
      :visible="showReminderUi"
      @remind-later="onRemindLater"
      @yes="onYes"
    />

    <div class="character-layer">
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
      />
    </div>
  </div>
</template>

<style scoped>
.character-stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  overflow: hidden;
  background: transparent;
}

.character-layer {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
  pointer-events: none;
}

.character-video {
  display: block;
  width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center bottom;
  background: transparent;
}
</style>
