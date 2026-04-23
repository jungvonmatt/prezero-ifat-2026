<template>
  <div class="game-grid">
    <div v-if="showLanguageGate" class="language-gate" @pointerdown="handleGateTouch">
      <div class="language-gate-content">

        <!-- Tap to start -->
        <div v-if="!hasTouchedGate" class="tap-actions">
          <img class="language-gate-logo" src="/logo.svg" alt="PreZero" />
          <p class="language-gate-title">Tap to start</p>
        </div>

        <!-- Language selection buttons -->
        <div v-if="hasTouchedGate" class="language-gate-actions">
          <button class="btn language-btn" @click.stop="selectLanguage('de')">Deutsch</button>
          <button class="btn language-btn" @click.stop="selectLanguage('en')">English</button>
        </div>
      </div>
    </div>

    <CmDraw
      :class="{ 'game-content-hidden': showLanguageGate }"
      :set-canvas-wrap-el="setCanvasWrapEl"
      :set-canvas-el="setCanvasEl"
      :has-started="hasStarted"
      :is-drawing="isDrawing"
      :has-result="hasResult"
      :result-score="result?.score ?? null"
      :show-result-label="showResultLabel"
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
const showResultLabel = computed(() => {
  const label = result.value?.label;
  return Boolean(label && RESULT_ERROR_LABELS.value.has(label));
});

// Reset entire app when logo is clicked
watch(hasTouchedGate, (newValue) => {
  if (!newValue && !showLanguageGate.value) {
    showLanguageGate.value = true;
    resetGameRound();
    resetLatestSavedScore();
  }
});

watch(result, (nextResult) => {
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
  visibility: hidden;
  pointer-events: none;
}


.tap-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

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
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
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

// .sidebar-save-and-restart {
//   display: flex;
//   flex-direction: column;
//   align-items: flex-end;
//   gap: 10px;
//   margin-top: 10px;
// }

// @media (max-width: 860px) {
//   .sidebar {
//     position: static;
//     width: 100%;
//     margin-top: 24px;
//     align-items: stretch;
//   }

//   .sidebar-save-and-restart {
//     align-items: stretch;
//   }
// }
</style>
