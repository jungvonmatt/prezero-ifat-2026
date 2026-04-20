<template>
  <section class="playground">
    <div :ref="setCanvasWrapEl" class="canvas-wrap">
      <canvas :ref="setCanvasEl" class="circle-canvas" @pointerdown="emit('start-round', $event)" @pointermove="emit('move-round', $event)" @pointerup="emit('end-round', $event)" @pointercancel="emit('end-round', $event)" />

      <Transition name="fade">
        <div v-if="!hasStarted" class="intro-copy">
          <span>Zeichne den<br />perfekten Kreis!</span>
          <button class="btn" @click="emit('start-game')">Los geht's!</button>
        </div>
      </Transition>

      <strong v-if="isDrawing || hasResult" class="score-display">{{ scoreDisplayText }}</strong>

      <Transition name="timer">
        <div v-if="isDrawing && !hasResult" class="timer-overlay" :class="{ warning: roundTimeLeftMs <= 3000 }">
          <svg class="timer-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="timer-ring-track" cx="50" cy="50" r="42" />
            <circle class="timer-ring-progress" cx="50" cy="50" r="42" :style="{ strokeDashoffset: timerDashoffset }" />
          </svg>
          <div class="timer-overlay-content">
            <strong class="timer-caption">{{ timerText }}</strong>
          </div>
        </div>
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";

defineProps<{
  setCanvasWrapEl: (value: Element | ComponentPublicInstance | null) => void;
  setCanvasEl: (value: Element | ComponentPublicInstance | null) => void;
  hasStarted: boolean;
  isDrawing: boolean;
  hasResult: boolean;
  scoreDisplayText: string;
  roundTimeLeftMs: number;
  timerText: string;
  timerDashoffset: string;
}>();

const emit = defineEmits<{
  (event: "start-game"): void;
  (event: "start-round", value: PointerEvent): void;
  (event: "move-round", value: PointerEvent): void;
  (event: "end-round", value: PointerEvent): void;
}>();
</script>

<style scoped lang="scss">
@use "~/assets/styles/colors" as variables;

.playground {
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  position: absolute;

  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);

  margin-top: -16px;

  z-index: 3;

  pointer-events: none;

  color: #a5c814;
  font-family: Goldman;
  font-size: 100px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

.intro-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;

  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: variables.$core-color-white;
  text-align: center;
  font-size: 48px;
  font-style: normal;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 1px;
  z-index: 3;
}

.timer-overlay {
  position: absolute;
  left: 50%;
  top: 50%;

  margin-top: 80px;

  width: 48px;
  height: 48px;

  transform: translate(-50%, -50%);

  display: grid;
  place-items: center;

  border-radius: 50%;
}

.timer-overlay strong {
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.timer-caption {
  font-size: 0.65rem;
  letter-spacing: 0.04em;
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
  stroke-width: 6;
}

.timer-ring-track {
  stroke: variables.$core-color-white;
}

.timer-ring-progress {
  stroke: variables.$core-color-green;
  stroke-linecap: round;
  stroke-dasharray: 263.89378290154264;
  transition: stroke 0.2s ease;
}

.timer-overlay.warning .timer-ring-progress {
  //   stroke: #e05b3f;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 300ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .canvas-wrap {
    height: min(80vw, 480px);
    flex: none;
  }
}
</style>
