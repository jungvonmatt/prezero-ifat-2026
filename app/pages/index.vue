<template>
  <div class="game-grid">
    <Transition name="fade">
      <div v-if="!hasStarted" class="language-gate-actions">
        <button class="btn language-btn" type="button" aria-label="Sprache Deutsch" @click.stop="selectLanguage('de')">
          <img class="language-flag" src="/flagge-de.svg" alt="" aria-hidden="true" />
        </button>
        <button class="btn language-btn" type="button" aria-label="Language English" @click.stop="selectLanguage('en')">
          <img class="language-flag" src="/flagge-en.svg" alt="" aria-hidden="true" />
        </button>
      </div>
    </Transition>

    <!-- Tooltip-Info - show if result -->
    <div>
      <Transition name="tooltip">
        <div v-if="hasResult && result?.label && !isTooltipDismissed" class="tooltip-info">
          <div class="tooltip-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path
                d="M25.0049 44.5199C23.9249 44.5199 23.0099 44.1299 22.2449 43.3649C21.4799 42.5999 21.1049 41.6699 21.1049 40.6049V36.1049C18.7799 34.5749 16.9799 32.5949 15.6899 30.1799C14.3999 27.7649 13.7549 25.1849 13.7549 22.4399C13.7549 17.9399 15.3299 14.1149 18.4949 10.9799C21.6599 7.82988 25.4999 6.25488 30.0149 6.25488C34.5299 6.25488 38.3699 7.82988 41.5199 10.9949C44.6699 14.1449 46.2599 17.9849 46.2599 22.5149C46.2599 25.2749 45.6149 27.8549 44.3099 30.2549C43.0199 32.6399 41.2199 34.6049 38.9249 36.1199V40.6199C38.9249 41.6849 38.5349 42.6149 37.7699 43.3799C37.0049 44.1449 36.0899 44.5349 35.0099 44.5349H25.0049V44.5199ZM25.1549 41.3849H34.8449C35.0699 41.3849 35.2499 41.3099 35.3999 41.1749C35.5499 41.0249 35.6099 40.8449 35.6099 40.6199V34.5899L37.4849 33.2849C39.2549 32.0549 40.6349 30.4799 41.6099 28.5899C42.5849 26.6999 43.0949 24.6599 43.0949 22.5149C43.0949 18.8699 41.8199 15.7799 39.2699 13.2299C36.7199 10.6799 33.6299 9.40488 29.9849 9.40488C26.3399 9.40488 23.2499 10.6799 20.6999 13.2449C18.1499 15.8099 16.8749 18.8999 16.8749 22.5299C16.8749 24.6899 17.3699 26.6999 18.3599 28.6049C19.3499 30.4949 20.7299 32.0549 22.4849 33.2849L24.3599 34.5749V40.6199C24.3599 40.8449 24.4349 41.0249 24.5699 41.1749C24.7199 41.3249 24.8999 41.3849 25.1249 41.3849H25.1549ZM25.1249 53.7449C24.6749 53.7449 24.2999 53.5949 23.9999 53.2949C23.6999 52.9949 23.5499 52.6199 23.5499 52.1699V50.5949H36.4649V52.1699C36.4649 52.6199 36.3149 52.9949 36.0149 53.2799C35.7149 53.5799 35.3399 53.7299 34.8899 53.7299H25.1099H25.1249V53.7449Z"
                fill="#003D49" />
            </svg>
            <p>{{ t('tooltip.label') }}</p>
            <button class="tooltip-close" type="button" aria-label="Hinweis schließen" @click="dismissTooltip">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="60"
                height="60"
                viewBox="0 0 60 60"
                fill="none"
                aria-hidden="true">
                <path
                  d="M15.7948 46.4255L13.5898 44.2205L27.7948 30.0155L13.5898 15.8105L15.7948 13.6055L29.9998 27.8105L44.2048 13.6055L46.4098 15.8105L32.2048 30.0155L46.4098 44.2205L44.2048 46.4255L29.9998 32.2205L15.7948 46.4255Z"
                  fill="#003D49" />
              </svg>
            </button>
          </div>
          <p class="tooltip-body">{{ tooltipLabel }}</p>
        </div>
      </Transition>
    </div>

    <CmDraw
      :set-canvas-wrap-el="setCanvasWrapEl"
      :set-canvas-el="setCanvasEl"
      :show-intro="true"
      :has-started="hasStarted"
      :is-drawing="isDrawing"
      :has-result="hasResult"
      :result-score="result?.score ?? null"
      :show-error-label="showErrorLabel"
      :is-new-highscore="isNewHighscore"
      :result-label="result?.label || ''"
      :score-display-text="scoreDisplayText"
      :round-time-left-ms="roundTimeLeftMs"
      :timer-text="timerText"
      :timer-dashoffset="timerDashoffset"
      @startGame="startGame"
      @startRound="startRound"
      @moveRound="moveRound"
      @endRound="endRound" />

    <aside v-if="Boolean(result)" class="sidebar">
      <h2>{{ t('highscores.title') }}</h2>
      <span v-if="isLocalMode" class="local-badge">{{ t('highscores.localBadge') }}</span>
      <CmHighscore
        :highscores="highscores"
        :is-local-mode="isLocalMode"
        :latest-saved-score="latestSavedScore"
        :result-label="result?.label"
        :result-is-error="showErrorLabel" />
      <button class="btn restart" @click="resetRound">{{ t('game.restart') }}</button>
    </aside>
  </div>
</template>

<script setup lang="ts">
import CmDraw from '../components/CmDraw.vue';
import CmHighscore from '../components/CmHighscore.vue';
import { useCircleGame } from '../composables/useCircleGame';
import { useHighscores } from '../composables/useHighscores';
import type { Locale } from '../composables/useLocale';
import {
  ERROR_LABEL_INVALID_FORM,
  ERROR_LABEL_CLOSURE,
  ERROR_LABEL_DIRECTION,
  ERROR_LABEL_TIMEOUT,
  ERROR_LABEL_TOO_SMALL,
  getLabelRotationIndex,
} from '../composables/useCircleScoring';
import { useLocale } from '../composables/useLocale';
import { INACTIVITY_TIMEOUT_MS } from '../constants/game';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useState } from '#imports';

const {
  setCanvasWrapEl,
  setCanvasEl,
  isDrawing,
  result,
  hasStarted,
  roundTimeLeftMs,
  hasResult,
  isErrorResult,
  scoreDisplayText,
  timerText,
  timerDashoffset,
  startGame,
  startRound,
  moveRound,
  endRound,
  resetRound: resetGameRound,
  resetToStartScreen: resetGameToStartScreen,
} = useCircleGame();

const { highscores, isSaving, isLocalMode, latestSavedScore, saveScore, resetLatestSavedScore } = useHighscores({
  result,
});
const { t, setLocale } = useLocale();
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
const isTooltipDismissed = ref(false);

const showErrorLabel = computed(() => isErrorResult.value);

const tooltipLabel = computed(() => {
  if (showErrorLabel.value) {
    const errorVariants = t('score.label0') as unknown as string[];
    const index = getLabelRotationIndex() % 3;
    return errorVariants[index];
  }
  return result.value?.label ?? '';
});

function dismissTooltip() {
  isTooltipDismissed.value = true;
}

watch(result, nextResult => {
  isTooltipDismissed.value = false;

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
  isTooltipDismissed.value = false;
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

function selectLanguage(locale: Locale) {
  setLocale(locale);
}
</script>

<style src="./index.scss" scoped lang="scss" />
