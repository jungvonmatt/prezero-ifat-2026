<template>
  <section class="playground">
    <div :ref="setCanvasWrapEl" class="canvas-wrap">
      <canvas :ref="setCanvasEl" class="circle-canvas" @pointerdown="emit('start-round', $event)" @pointermove="emit('move-round', $event)" @pointerup="emit('end-round', $event)" @pointercancel="emit('end-round', $event)" />

      <Transition name="fade">
        <img v-if="showIntro && !hasStarted" class="intro-circle" src="/intro-circle.svg" alt="" aria-hidden="true" />
      </Transition>

      <Transition name="fade">
        <div v-if="showIntro && !hasStarted" class="intro-copy">
          <span v-html="(t('game.intro') as string).replace('\n', '<br />')"></span>
          <button class="btn" @click="emit('start-game')">{{ t("game.start") }}</button>
        </div>
      </Transition>

      <div class="score-container">
        <Transition name="fade">
          <p v-if="isDrawing || (!hasResult && hasStarted) || (hasResult)" class="score-display" :class="{ 'has-result': hasResult }">{{ scoreDisplayText }}</p>
        </Transition>
        <Transition name="fade">
          <p v-if="hasResult && isNewHighscore" class="highscore-hint">{{ t("game.highscore") }}</p>
        </Transition>
      </div>

      <CmConfettiRain :active="shouldShowConfetti" />

      <Transition name="timer">
        <div v-if="isDrawing && !hasResult" class="timer-overlay" :class="{ warning: roundTimeLeftMs <= 3000 }">
          <svg class="timer-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="timer-ring-track" cx="50" cy="50" r="42" />
            <circle class="timer-ring-progress" cx="50" cy="50" r="42" :style="{ strokeDashoffset: timerDashoffset }" />
          </svg>
          <div class="timer-overlay-content">
            <p class="timer-caption">{{ timerText }}</p>
          </div>
        </div>
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useLocale } from "~/composables/useLocale";

const { t } = useLocale();

const props = defineProps<{
  setCanvasWrapEl: (value: Element | ComponentPublicInstance | null) => void;
  setCanvasEl: (value: Element | ComponentPublicInstance | null) => void;
  showIntro: boolean;
  hasStarted: boolean;
  isDrawing: boolean;
  hasResult: boolean;
  resultScore: number | null;
  showErrorLabel: boolean;
  isNewHighscore: boolean;
  resultLabel: string;
  scoreDisplayText: string;
  roundTimeLeftMs: number;
  timerText: string;
  timerDashoffset: string;
}>();

const shouldShowConfetti = computed(() => {
  return (props.hasResult && !props.showErrorLabel && (props.resultScore ?? 0) >= 90) || props.isNewHighscore;
});

const emit = defineEmits<{
  (event: "start-game"): void;
  (event: "start-round", value: PointerEvent): void;
  (event: "move-round", value: PointerEvent): void;
  (event: "end-round", value: PointerEvent): void;
}>();
</script>

<style scoped lang="scss">
@use "~/assets/styles/colors" as variables;
@use "~/assets/styles/fonts" as fonts;

.playground {
  display: flex;
  flex-direction: column;
  min-height: 0;

  width: 100%;
  height: 100%;
}

.canvas-wrap {
  height: 100%;
  width: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-canvas {
  height: 100%;
  width: auto;
  max-width: 100%;
  aspect-ratio: 1;
  display: block;
  touch-action: none;
  background: transparent;
}

.score-display {
  position: relative;

  z-index: 3;

  pointer-events: none;

  color: variables.$color-off-white;
  font-size: 130px;
  line-height: 1;

  &.has-result {
    color: variables.$color-bright-green;
  }
}

.highscore-hint {
  position: relative;
  
  z-index: 5;

  pointer-events: none;

  color: variables.$color-off-white;
  @include fonts.font-secondary-semibold;
  font-size: 65px;
  line-height: 1;
}

.score-container {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;

  z-index: 3;

  pointer-events: none;
}

.intro-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60px;

  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);

  color: variables.$color-off-white;
  text-align: center;
  @include fonts.font-secondary-regular;
  font-size: 80px;
  line-height: 105%;

  z-index: 3;
}

.intro-circle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);

  width: 95%;
  height: auto;
  max-width: 95%;
  max-height: 95%;

  z-index: 2;
  pointer-events: none;
}

.timer-overlay {
  position: absolute;
  left: 50%;
  top: 50%;

  margin-top: 160px;

  width: 80px;
  height: 80px;

  transform: translate(-50%, -50%);

  display: grid;
  place-items: center;

  border-radius: 50%;
}

.timer-overlay p {
  font-variant-numeric: tabular-nums;
}

.timer-caption {
  display: inline-block;
  min-width: 5ch;
  text-align: center;
  white-space: nowrap;
  font-size: 16px;
  letter-spacing: 1.1;
}

.timer-overlay-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.timer-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.timer-ring-track,
.timer-ring-progress {
  fill: none;
  stroke-width: 8;
}

.timer-ring-track {
  stroke: variables.$color-off-white;
}

.timer-ring-progress {
  stroke: variables.$color-bright-green;
  stroke-linecap: round;
  stroke-dasharray: 263.89378290154264;
  transition: stroke 0.2s ease;
}

@media (max-width: 860px) {
  .canvas-wrap {
    height: min(80vw, 480px);
    flex: none;
  }
}
</style>
