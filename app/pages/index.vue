<template>
  <div class="game-grid">
    <div v-if="showLanguageGate" class="language-gate" @pointerdown="handleGateTouch">
      <div class="language-gate-content">
        
        <!-- Tap to start -->
        <Transition name="fade">
          <div v-if="!hasTouchedGate" class="tap-actions">
            <img class="language-gate-logo" src="/logo.svg" alt="PreZero" />
            <p class="language-gate-title">Tap to start</p>
          </div>
        </Transition>

        <!-- Language selection buttons -->
        <Transition name="fade">
          <div v-if="hasTouchedGate" class="language-gate-actions">
            <button class="btn language-btn" @click.stop="selectLanguage('de')">Deutsch</button>
            <button class="btn language-btn" @click.stop="selectLanguage('en')">English</button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Tooltip-Info - show if result -->
    <div>
      <Transition name="tooltip">
        <div v-if="hasResult && !showErrorLabel && result?.label && !isTooltipDismissed" class="tooltip-info">
          <div class="tooltip-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path
                d="M25.0049 44.5199C23.9249 44.5199 23.0099 44.1299 22.2449 43.3649C21.4799 42.5999 21.1049 41.6699 21.1049 40.6049V36.1049C18.7799 34.5749 16.9799 32.5949 15.6899 30.1799C14.3999 27.7649 13.7549 25.1849 13.7549 22.4399C13.7549 17.9399 15.3299 14.1149 18.4949 10.9799C21.6599 7.82988 25.4999 6.25488 30.0149 6.25488C34.5299 6.25488 38.3699 7.82988 41.5199 10.9949C44.6699 14.1449 46.2599 17.9849 46.2599 22.5149C46.2599 25.2749 45.6149 27.8549 44.3099 30.2549C43.0199 32.6399 41.2199 34.6049 38.9249 36.1199V40.6199C38.9249 41.6849 38.5349 42.6149 37.7699 43.3799C37.0049 44.1449 36.0899 44.5349 35.0099 44.5349H25.0049V44.5199ZM25.1549 41.3849H34.8449C35.0699 41.3849 35.2499 41.3099 35.3999 41.1749C35.5499 41.0249 35.6099 40.8449 35.6099 40.6199V34.5899L37.4849 33.2849C39.2549 32.0549 40.6349 30.4799 41.6099 28.5899C42.5849 26.6999 43.0949 24.6599 43.0949 22.5149C43.0949 18.8699 41.8199 15.7799 39.2699 13.2299C36.7199 10.6799 33.6299 9.40488 29.9849 9.40488C26.3399 9.40488 23.2499 10.6799 20.6999 13.2449C18.1499 15.8099 16.8749 18.8999 16.8749 22.5299C16.8749 24.6899 17.3699 26.6999 18.3599 28.6049C19.3499 30.4949 20.7299 32.0549 22.4849 33.2849L24.3599 34.5749V40.6199C24.3599 40.8449 24.4349 41.0249 24.5699 41.1749C24.7199 41.3249 24.8999 41.3849 25.1249 41.3849H25.1549ZM25.1249 53.7449C24.6749 53.7449 24.2999 53.5949 23.9999 53.2949C23.6999 52.9949 23.5499 52.6199 23.5499 52.1699V50.5949H36.4649V52.1699C36.4649 52.6199 36.3149 52.9949 36.0149 53.2799C35.7149 53.5799 35.3399 53.7299 34.8899 53.7299H25.1099H25.1249V53.7449Z"
                fill="#003D49"
              />
            </svg>
            <p>{{ t("tooltip.label") }}</p>
            <button class="tooltip-close" type="button" aria-label="Hinweis schließen" @click="dismissTooltip">
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none" aria-hidden="true">
                <path d="M15.7948 46.4255L13.5898 44.2205L27.7948 30.0155L13.5898 15.8105L15.7948 13.6055L29.9998 27.8105L44.2048 13.6055L46.4098 15.8105L32.2048 30.0155L46.4098 44.2205L44.2048 46.4255L29.9998 32.2205L15.7948 46.4255Z" fill="#003D49" />
              </svg>
            </button>
          </div>
          <p class="tooltip-body">{{ result.label }}</p>
        </div>
      </Transition>
    </div>

    <CmDraw
      :class="{ 'game-content-hidden': showLanguageGate }"
      :set-canvas-wrap-el="setCanvasWrapEl"
      :set-canvas-el="setCanvasEl"
      :show-intro="!showLanguageGate"
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
      @start-game="startGame"
      @start-round="startRound"
      @move-round="moveRound"
      @end-round="endRound"
    />

    <aside v-if="!showLanguageGate && Boolean(result)" class="sidebar">
      <h2>{{ t("highscores.title") }}</h2>
      <span v-if="isLocalMode" class="local-badge">{{ t("highscores.localBadge") }}</span>
      <CmHighscore :highscores="highscores" :is-local-mode="isLocalMode" :latest-saved-score="latestSavedScore" :result-label="result?.label" />
      <button class="btn restart" @click="resetRound">{{ t("game.restart") }}</button>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useCircleGame } from "../composables/useCircleGame";
import { useHighscores } from "../composables/useHighscores";
import type { Locale } from "../composables/useLocale";
import { ERROR_LABEL_INVALID_FORM, ERROR_LABEL_CLOSURE, ERROR_LABEL_DIRECTION, ERROR_LABEL_TIMEOUT } from "../composables/useCircleScoring";
import { useLocale } from "../composables/useLocale";

const { setCanvasWrapEl, setCanvasEl, isDrawing, result, hasStarted, roundTimeLeftMs, hasResult, scoreDisplayText, timerText, timerDashoffset, startGame, startRound, moveRound, endRound, resetRound: resetGameRound } = useCircleGame();

const { highscores, isSaving, isLocalMode, latestSavedScore, saveScore, resetLatestSavedScore } = useHighscores({ result });
const { t, setLocale } = useLocale();

const showLanguageGate = ref(true);
const hasTouchedGate = useState<boolean>("hasTouchedGate", () => false);

const RESULT_ERROR_LABELS = computed(() => new Set([ERROR_LABEL_INVALID_FORM(), ERROR_LABEL_CLOSURE(), ERROR_LABEL_DIRECTION(), ERROR_LABEL_TIMEOUT()]));

const isNewHighscore = ref(false);
const isTooltipDismissed = ref(false);
const showErrorLabel = computed(() => {
  const label = result.value?.label;
  return Boolean(label && RESULT_ERROR_LABELS.value.has(label));
});

function dismissTooltip() {
  isTooltipDismissed.value = true;
}

// Reset entire app when logo is clicked
watch(hasTouchedGate, (newValue) => {
  if (!newValue && !showLanguageGate.value) {
    showLanguageGate.value = true;
    resetGameRound();
    resetLatestSavedScore();
  }
});

watch(result, (nextResult) => {
  isTooltipDismissed.value = false;

  if (!nextResult) {
    isNewHighscore.value = false;
    return;
  }

  const bestExistingScore = highscores.value.reduce((maxScore, entry) => {
    return Math.max(maxScore, entry.score);
  }, Number.NEGATIVE_INFINITY);

  isNewHighscore.value = nextResult.score > bestExistingScore;

  if (!RESULT_ERROR_LABELS.value.has(nextResult.label) && !isSaving.value) {
    // Save successful rounds automatically without user input.
    void saveScore();
  }
});

function resetRound() {
  resetGameRound();
  resetLatestSavedScore();
}

function handleGateTouch() {
  if (hasTouchedGate.value) return;
  hasTouchedGate.value = true;
}

function selectLanguage(locale: Locale) {
  setLocale(locale);
  showLanguageGate.value = false;
}
</script>

<style scoped lang="scss">
@use "~/assets/styles/colors" as variables;
@use "~/assets/styles/fonts" as fonts;

article {
  width: 100%;
}

.game-grid {
  position: relative;
  width: 100%;
  height: 100%;
}

.game-content-hidden {
  pointer-events: none;
}

.tap-actions {
  position: absolute;
  inset: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 80px;
}

.language-gate {
  position: absolute;
  inset: 0;
  z-index: 250;

  display: grid;
  place-items: center;
}

.language-gate-content {
  position: relative;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  width: min(100%, 620px);
  min-height: 360px;

  gap: 26px;
  padding: 30px 20px;
  text-align: center;

  cursor: pointer;
}

.language-gate-logo {
  width: 480px;
  height: auto;
}

.language-gate-title {
  color: variables.$color-off-white;
  font-family: fonts.$font-secondary-regular;
  font-size: 56px;
  line-height: 1;
  pointer-events: none;
}

.language-gate-actions {
  position: absolute;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.language-btn {
  min-width: 190px;
}

.sidebar {
  position: absolute;

  right: 0;
  top: 0;

  width: 548px;
  height: 100%;

  z-index: 100;
  background-color: variables.$color-petrol-light;

  padding: 64px 40px;

  display: inline-flex;
  flex-direction: column;
  justify-content: space-between;

  .btn {
    width: 100%;
  }
}

.tooltip-info {
  position: absolute;
  left: 0;
  bottom: 64px;
  z-index: 500;

  width: 640px;

  display: inline-flex;
  padding: 40px 32px;
  flex-direction: column;
  justify-content: center;
  gap: 32px;

  border-radius: 60px 0;
  background: #fff;

  @include fonts.font-secondary-regular;
  color: variables.$color-petrol;
  font-size: 32px;
  line-height: 1.25;
}

.tooltip-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;

  width: 100%;

  font-size: 24px;
  @include fonts.font-secondary-semibold;

  p {
    flex-grow: 1;
  }

  svg {
    width: 24px;
    height: auto;
  }

  svg:last-child {
    width: 32px;
  }
}

.tooltip-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;
}

.tooltip-close:focus-visible {
  outline: 2px solid variables.$color-petrol;
  outline-offset: 4px;
}

.tooltip-enter-active {
  transition:
    opacity 520ms ease,
    transform 760ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: 780ms, 780ms;
}

.tooltip-leave-active {
  transition: opacity 180ms ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}

.tooltip-enter-from {
  transform-origin: left bottom;
  transform: scale(0.86);
}

.tooltip-enter-to,
.tooltip-leave-from {
  opacity: 1;
  transform-origin: left bottom;
  transform: scale(1);
}

.tooltip-header {
  opacity: 0;
  animation: tooltipHeaderIn 900ms cubic-bezier(0.36, 1, 0.36, 1) forwards;
}

.tooltip-body {
  opacity: 0;
  transform: translateY(8px);
  animation: tooltipContentIn 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.tooltip-header,
.tooltip-body {
  animation-delay: 900ms;
}

@keyframes tooltipHeaderIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes tooltipContentIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tooltip-enter-active,
  .tooltip-leave-active {
    transition: none;
  }
  .tooltip-header,
  .tooltip-body {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
