<template>
  <div class="game-grid">
    <CmDraw
      :setCanvasWrapEl="setCanvasWrapEl"
      :setCanvasEl="setCanvasEl"
      :showIntro="true"
      :hasStarted="hasStarted"
      :isDrawing="isDrawing"
      :hasResult="hasResult"
      :resultScore="result?.score ?? null"
      :showErrorLabel="showErrorLabel"
      :isNewHighscore="isNewHighscore"
      :resultLabel="result?.label || ''"
      :scoreDisplayText="scoreDisplayText"
      @startGame="startGame"
      @startRound="startRound"
      @moveRound="moveRound"
      @endRound="endRound" />

    <Transition name="sidebar">
      <aside v-if="Boolean(result)" class="sidebar">
        <h2>SCORES</h2>
        <CmHighscore
          :highscores="highscores"
          :latest-saved-score="latestSavedScore"
          :result-label="result?.label"
          :result-is-error="showErrorLabel" />
        <button class="btn restart" @click="resetRound">Restart</button>
      </aside>
    </Transition>

    <Transition name="tooltips" :duration="750">
      <div v-if="hasResult" class="tooltips-container">
        <div class="tooltip is-history">
          <div class="tooltip-header">
            <svg fill="none" height="30" viewBox="0 0 30 30" width="30" xmlns="http://www.w3.org/2000/svg">
              <path
                d="m19.5751 20.735 1.1475-1.1475-4.8825-4.905v-6.1275h-1.5675v6.7725l5.31 5.4075zm-4.575 6.1425c-1.635 0-3.1725-.315-4.6125-.9375-1.43998-.6225-2.69998-1.47-3.77998-2.55-1.0725-1.0725-1.9275-2.3325-2.55-3.7725s-.9375-2.9775-.9375-4.6125.315-3.1725.9375-4.6125 1.47-2.7 2.55-3.78c1.0725-1.0725 2.3325-1.9275 3.77248-2.55 1.44-.6225 2.9775-.9375 4.6125-.9375s3.1725.315 4.6125.9375 2.7 1.47 3.78 2.55c1.0725 1.0725 1.9275 2.3325 2.55 3.7725s.9375 2.9775.9375 4.6125-.315 3.1725-.9375 4.6125-1.47 2.7-2.55 3.78c-1.0725 1.0725-2.3325 1.9275-3.7725 2.55s-2.9775.9375-4.6125.9375zm0-1.5675c2.8425 0 5.2725-1.005 7.2825-3.0225 2.0175-2.0175 3.0225-4.44 3.0225-7.2825s-1.005-5.2725-3.0225-7.2825c-2.0175-2.0175-4.44-3.0225-7.2825-3.0225s-5.27248 1.005-7.28248 3.0225c-2.0175 2.0175-3.0225 4.44-3.0225 7.2825s1.005 5.2725 3.0225 7.2825 4.43998 3.0225 7.28248 3.0225z"
                fill="#003d49" />
            </svg>
            <p>HISTORY</p>
          </div>
          <div class="recent-circles-grid">
            <div class="recent-circles-item">Circle 1</div>
            <div class="recent-circles-item">Circle 2</div>
            <div class="recent-circles-item">Circle 3</div>
            <div class="recent-circles-item">Circle 4</div>
            <div class="recent-circles-item">Circle 5</div>
            <div class="recent-circles-item">Circle 6</div>
          </div>
        </div>
        <div v-if="result?.label" class="tooltip is-info">
          <div class="tooltip-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path
                d="M25.0049 44.5199C23.9249 44.5199 23.0099 44.1299 22.2449 43.3649C21.4799 42.5999 21.1049 41.6699 21.1049 40.6049V36.1049C18.7799 34.5749 16.9799 32.5949 15.6899 30.1799C14.3999 27.7649 13.7549 25.1849 13.7549 22.4399C13.7549 17.9399 15.3299 14.1149 18.4949 10.9799C21.6599 7.82988 25.4999 6.25488 30.0149 6.25488C34.5299 6.25488 38.3699 7.82988 41.5199 10.9949C44.6699 14.1449 46.2599 17.9849 46.2599 22.5149C46.2599 25.2749 45.6149 27.8549 44.3099 30.2549C43.0199 32.6399 41.2199 34.6049 38.9249 36.1199V40.6199C38.9249 41.6849 38.5349 42.6149 37.7699 43.3799C37.0049 44.1449 36.0899 44.5349 35.0099 44.5349H25.0049V44.5199ZM25.1549 41.3849H34.8449C35.0699 41.3849 35.2499 41.3099 35.3999 41.1749C35.5499 41.0249 35.6099 40.8449 35.6099 40.6199V34.5899L37.4849 33.2849C39.2549 32.0549 40.6349 30.4799 41.6099 28.5899C42.5849 26.6999 43.0949 24.6599 43.0949 22.5149C43.0949 18.8699 41.8199 15.7799 39.2699 13.2299C36.7199 10.6799 33.6299 9.40488 29.9849 9.40488C26.3399 9.40488 23.2499 10.6799 20.6999 13.2449C18.1499 15.8099 16.8749 18.8999 16.8749 22.5299C16.8749 24.6899 17.3699 26.6999 18.3599 28.6049C19.3499 30.4949 20.7299 32.0549 22.4849 33.2849L24.3599 34.5749V40.6199C24.3599 40.8449 24.4349 41.0249 24.5699 41.1749C24.7199 41.3249 24.8999 41.3849 25.1249 41.3849H25.1549ZM25.1249 53.7449C24.6749 53.7449 24.2999 53.5949 23.9999 53.2949C23.6999 52.9949 23.5499 52.6199 23.5499 52.1699V50.5949H36.4649V52.1699C36.4649 52.6199 36.3149 52.9949 36.0149 53.2799C35.7149 53.5799 35.3399 53.7299 34.8899 53.7299H25.1099H25.1249V53.7449Z"
                fill="#003D49" />
            </svg>
            <p>DID YOU KNOW?</p>
          </div>
          <p class="tooltip-body">{{ tooltipLabel }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import CmDraw from '../components/CmDraw.vue';
import CmHighscore from '../components/CmHighscore.vue';
import { useCircleGame } from '../composables/useCircleGame';
import { useHighscores } from '../composables/useHighscores';
import {
  ERROR_LABEL_INVALID_FORM,
  ERROR_LABEL_CLOSURE,
  ERROR_LABEL_DIRECTION,
  ERROR_LABEL_TIMEOUT,
  ERROR_LABEL_TOO_SMALL,
  getLabelRotationIndex,
} from '../composables/useCircleScoring';
import { INACTIVITY_TIMEOUT_MS } from '../constants/game';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useState } from '#imports';

const {
  setCanvasWrapEl,
  setCanvasEl,
  isDrawing,
  result,
  hasStarted,
  hasResult,
  isErrorResult,
  scoreDisplayText,
  startGame,
  startRound,
  moveRound,
  endRound,
  resetRound: resetGameRound,
  resetToStartScreen: resetGameToStartScreen,
} = useCircleGame();

const { highscores, isSaving, latestSavedScore, saveScore, resetLatestSavedScore } = useHighscores({
  result,
});
const appResetSignal = useState<number>('appResetSignal', () => 0);

let inactivityTimeoutId: number | null = null;

const RESULT_ERROR_LABELS = computed(
  () =>
    new Set([
      ERROR_LABEL_INVALID_FORM(),
      ERROR_LABEL_CLOSURE(),
      ERROR_LABEL_DIRECTION(),
      ERROR_LABEL_TIMEOUT(),
      ERROR_LABEL_TOO_SMALL(),
    ])
);

const isNewHighscore = ref(false);

const showErrorLabel = computed(() => isErrorResult.value);

const ERROR_LABEL_0_VARIANTS = [
  'Every beginning is difficult. Start again and give it more shape!',
  'Every cycle begins with the first movement. Try again right away.',
  'Do not lose heart. Every expert started small.',
];

const tooltipLabel = computed(() => {
  if (showErrorLabel.value) {
    const index = getLabelRotationIndex() % 3;
    return ERROR_LABEL_0_VARIANTS[index];
  }
  return result.value?.label ?? '';
});

watch(result, nextResult => {
  if (!nextResult) {
    isNewHighscore.value = false;
    return;
  }

  const bestExistingScore = highscores.value.reduce((maxScore, entry) => {
    return Math.max(maxScore, entry.score);
  }, Number.NEGATIVE_INFINITY);

  isNewHighscore.value = nextResult.score > bestExistingScore;

  if (!RESULT_ERROR_LABELS.value.has(nextResult.label ?? '') && !isSaving.value) {
    // Save successful rounds automatically without user input.
    void saveScore();
  }
});

function resetRound() {
  resetGameRound();
  resetLatestSavedScore();
}

function resetToStartScreen() {
  resetGameToStartScreen();
  resetLatestSavedScore();
  isNewHighscore.value = false;
}

function clearInactivityTimeout() {
  if (inactivityTimeoutId === null) return;
  window.clearTimeout(inactivityTimeoutId);
  inactivityTimeoutId = null;
}

function restartInactivityTimeout() {
  clearInactivityTimeout();
  if (!hasStarted.value) return;

  inactivityTimeoutId = window.setTimeout(() => {
    resetToStartScreen();
  }, INACTIVITY_TIMEOUT_MS);
}

function handleUserActivity() {
  restartInactivityTimeout();
}

watch(
  appResetSignal,
  () => {
    resetToStartScreen();
  },
  { flush: 'post' }
);

watch(hasStarted, started => {
  if (started) {
    restartInactivityTimeout();
    return;
  }

  clearInactivityTimeout();
});

onMounted(() => {
  const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
  for (const eventName of activityEvents) {
    window.addEventListener(eventName, handleUserActivity, { passive: true });
  }
});

onBeforeUnmount(() => {
  clearInactivityTimeout();

  const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
  for (const eventName of activityEvents) {
    window.removeEventListener(eventName, handleUserActivity);
  }
});
</script>

<style src="./index.scss" scoped lang="scss" />
