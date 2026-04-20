<template>
  <div class="game-grid">
    <CmDraw
      :set-canvas-wrap-el="setCanvasWrapEl"
      :set-canvas-el="setCanvasEl"
      :has-started="hasStarted"
      :is-drawing="isDrawing"
      :has-result="hasResult"
      :is-new-highscore="isNewHighscore"
      :score-display-text="scoreDisplayText"
      :round-time-left-ms="roundTimeLeftMs"
      :timer-text="timerText"
      :timer-dashoffset="timerDashoffset"
      @start-game="startGame"
      @start-round="startRound"
      @move-round="moveRound"
      @end-round="endRound"
    />

    <aside class="sidebar">
      <!-- <section class="hero">
        <div class="stats">
          <span v-if="result">{{ result.label }}</span>
          <span v-else class="muted">Round not finished yet</span>
        </div>
      </section> -->

      <CmHighscore :highscores="highscores" :is-local-mode="isLocalMode" />

      <div class="sidebar-save-and-restart" v-if="result" >
        <CmSave :player-name="playerName" :can-submit="Boolean(result)" :is-saving="isSaving" @update:player-name="playerName = $event" @submit="saveScore" />
        <button class="btn restart" @click="resetRound">Neustart</button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useCircleGame } from "../composables/useCircleGame";
import { useHighscores } from "../composables/useHighscores";

const { setCanvasWrapEl, setCanvasEl, isDrawing, result, hasStarted, roundTimeLeftMs, hasResult, scoreDisplayText, timerText, timerDashoffset, startGame, startRound, moveRound, endRound, resetRound: resetGameRound } = useCircleGame();

const { highscores, playerName, isSaving, isLocalMode, saveScore } = useHighscores({ result });

const isNewHighscore = ref(false);

watch(result, (nextResult) => {
  if (!nextResult) {
    isNewHighscore.value = false;
    return;
  }

  const bestExistingScore = highscores.value.reduce((maxScore, entry) => {
    return Math.max(maxScore, entry.score);
  }, Number.NEGATIVE_INFINITY);

  isNewHighscore.value = nextResult.score > bestExistingScore;
});

function resetRound() {
  resetGameRound();
  playerName.value = "";
}
</script>

<style scoped lang="scss">
article {
  width: 100%;
}

.game-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 48px;
  flex: 1;
  min-height: 0;
}

.sidebar-save-and-restart {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.sidebar {
  z-index: 100;

  margin-top: 15vh;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;

  padding: 0;
}

@media (max-width: 860px) {
  .game-grid {
    position: relative;
    grid-template-columns: 1fr;
    overflow-y: auto;
    flex: none;
    padding-bottom: 32px;
  }
}
</style>
