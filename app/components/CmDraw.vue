<template>
  <section class="playground">
    <div :ref="setCanvasWrapEl" class="canvas-wrap">
      <canvas
        :ref="setCanvasEl"
        class="circle-canvas"
        @pointerdown="emit('startRound', $event)"
        @pointermove="emit('moveRound', $event)"
        @pointerup="emit('endRound', $event)"
        @pointercancel="emit('endRound', $event)"></canvas>

      <Transition name="fade">
        <img
          v-if="showIntro && !isDrawing && !hasResult"
          class="intro-circle"
          src="/intro-circle.svg"
          alt=""
          aria-hidden="true" />
      </Transition>

      <Transition name="fade">
        <div v-if="showIntro && !hasStarted" class="intro-copy">
          <span v-html="(t('game.intro') as string).replace('\n', '<br />')"></span>
          <button class="btn" @click="emit('startGame')">
            {{ t('game.start') }}
          </button>
        </div>
      </Transition>

      <div class="score-container">
        <Transition name="fade">
          <p
            v-if="isDrawing || (!hasResult && hasStarted) || hasResult"
            class="score-display"
            :class="{
              'has-result': hasResult && !showErrorLabel,
              'has-error': showErrorLabel,
            }">
            {{ scoreDisplayText }}
          </p>
        </Transition>
        <Transition name="fade">
          <p v-if="hasResult && showErrorLabel && resultLabel" class="error-label">
            {{ resultLabel }}
          </p>
        </Transition>
        <Transition name="fade">
          <p v-if="hasResult && isNewHighscore" class="highscore-hint">
            {{ t('game.highscore') }}
          </p>
        </Transition>
      </div>

      <CmConfettiRain :active="shouldShowConfetti" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { t } from '~/composables/useMessages';
import CmConfettiRain from '~/components/CmConfettiRain.vue';

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
}>();

const shouldShowConfetti = computed(() => {
  return (props.hasResult && !props.showErrorLabel && (props.resultScore ?? 0) >= 90) || props.isNewHighscore;
});

const emit = defineEmits<{
  (event: 'startGame'): void;
  (event: 'startRound', value: PointerEvent): void;
  (event: 'moveRound', value: PointerEvent): void;
  (event: 'endRound', value: PointerEvent): void;
}>();
</script>

<style src="./CmDraw.scss" scoped lang="scss" />
