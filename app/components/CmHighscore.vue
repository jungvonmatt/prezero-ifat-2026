<template>
  <article class="highscore-article">
    
    <!-- 3 best scores -->
    <div class="highscore-top-3">
      <div v-for="(entry, index) in highscores.slice(0, 3)" :key="entry.createdAt + index" class="highscore-top-entry" :style="{ '--entry-height': getTopEntryHeight(entry.score) }">
        <span>#{{ index + 1 }}</span>
        <span>{{ entry.score.toFixed(1) }}%</span>
      </div>
    </div>

    <!-- highscre-list -->
    <div v-if="highscores.length" class="highscore-list-wrap">
      <ol class="highscore-list">
        <li v-for="(entry, index) in highscores" :key="entry.createdAt + index" :style="{ '--list-index': index }">
          <span>#{{ index + 1 }}</span>
          <span>{{ entry.score.toFixed(1) }}%</span>
        </li>
      </ol>
    </div>
    <p v-else class="muted">{{ t("highscores.noScores") }}</p>

    <!-- ranking info -->
    <div class="ranking">
      <p v-if="currentRank && currentRank <= 3" class="ranking-info">{{ t("highscores.rankTop", { rank: currentRank }) }}</p>
      <p v-else-if="currentRank && currentRank > 3 && currentTopPercent !== null" class="ranking-info">{{ t("highscores.rankPercent", { rank: currentRank, percent: currentTopPercent }) }}</p>
      <p v-else class="ranking-info">{{ t("highscores.noRanking") }}</p>
      <p v-if="resultLabel && !currentRank" class="ranking-error-hint">{{ resultLabel }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLocale } from "~/composables/useLocale";

const { t } = useLocale();

interface HighscoreEntry {
  score: number;
  createdAt: string;
}

const props = defineProps<{
  highscores: HighscoreEntry[];
  isLocalMode: boolean;
  latestSavedScore: number | null;
  resultLabel?: string;
}>();

const currentRank = computed<number | null>(() => {
  if (props.latestSavedScore === null || !props.highscores.length) return null;

  const latestScore = props.latestSavedScore;
  const higherScores = props.highscores.filter((entry) => entry.score > latestScore).length;
  if (higherScores === 0) {
    return 1; // Latest score is the highest
  }
  return higherScores;
});

const currentTopPercent = computed<number | null>(() => {
  if (currentRank.value === null || !props.highscores.length) return null;

  const oneBasedRank = currentRank.value;
  return Math.max(1, Math.round((oneBasedRank / props.highscores.length) * 100));
});

function getTopEntryHeight(score: number): string {
  const TOP_ENTRY_HEIGHT_EXPONENT = 3.4;
  const roundedScore = Number(score.toFixed(1));
  const clampedScore = Math.min(Math.max(roundedScore, 0), 100);

  if (clampedScore <= 50) {
    return "50%";
  }

  const normalizedTopRange = (clampedScore - 50) / 50;
  const emphasizedTopRange = Math.pow(normalizedTopRange, TOP_ENTRY_HEIGHT_EXPONENT);
  const heightPercent = 50 + emphasizedTopRange * 50;
  return `${heightPercent}%`;
}
</script>

<style scoped lang="scss">
@use "~/assets/styles/colors" as variables;
@use "~/assets/styles/fonts" as fonts;

.highscore-article {
  height: 80%;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.highscore-top-3 {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;

  align-items: flex-end;

  height: 180px;

  .highscore-top-entry {
    --bar-delay: 0ms;

    flex: 1;
    background-color: variables.$color-petrol-light;
    border-radius: 10px;
    padding: 12px;

    display: flex;
    flex-direction: column;
    justify-content: space-between;

    background-color: variables.$color-bright-green;
    border-radius: 22px 0 22px 22px;

    color: variables.$color-petrol;
    font-size: 32px;

    height: var(--entry-height, 50%);
    opacity: 0;

    animation: topEntryGrow 420ms cubic-bezier(0.22, 1, 0.36, 1) var(--bar-delay) forwards;

    > span {
      opacity: 0;
      transform: translateY(8px);
      animation: topCopyIn 220ms ease-out forwards;
      animation-delay: calc(var(--bar-delay) + 280ms);
    }

    > span:last-of-type {
      animation-delay: calc(var(--bar-delay) + 330ms);
    }
  }

  .highscore-top-entry:nth-child(1) {
    order: 2;
    --bar-delay: 0ms;
  }

  .highscore-top-entry:nth-child(2) {
    order: 1;
    --bar-delay: 90ms;
  }

  .highscore-top-entry:nth-child(3) {
    order: 3;
    --bar-delay: 180ms;
  }
}

.highscore-list-wrap {
  position: relative;
  height: 40%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: variables.$color-petrol-light;
}

.highscore-list-wrap::before,
.highscore-list-wrap::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0px;
  height: 32px;
  pointer-events: none;
  z-index: 1;
  will-change: opacity;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

.highscore-list-wrap::before {
  top: -3px;
  background: linear-gradient(to bottom, #{variables.$color-petrol-light}, #{rgba(variables.$color-petrol-light, 0)});
}

.highscore-list-wrap::after {
  bottom: -1px;
  background: linear-gradient(to top, #{variables.$color-petrol-light}, #{rgba(variables.$color-petrol-light, 0)});
}

.highscore-list {
  margin: 0;
  // padding: 18px 0 18px 0;
  list-style: none;
  flex: 1;
  height: 100%;
  overflow-y: scroll;
  min-height: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.highscore-list::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.highscore-list li {
  --list-index: 0;

  display: flex;
  padding: 12px 16px;
  justify-content: space-between;
  align-items: center;

  color: variables.$color-off-white;
  font-size: 32px;

  border-radius: 8px;
  border: 1px solid rgba(variables.$color-off-white, 0.5);
  background-color: variables.$color-petrol-light;

  margin: 12px 0;

  opacity: 0;
  transform: translateY(12px);
  animation: listItemIn 260ms ease-out forwards;
  animation-delay: calc(620ms + var(--list-index) * 45ms);

  &:hover {
    border-color: variables.$color-off-white;
  }

  & > span:last-of-type {
    color: variables.$color-bright-green;
  }
}

.ranking{
  min-height: 100px;
  opacity: 0;
  animation: fadeIn 280ms ease-out forwards;
  animation-delay: 1050ms;
} 

.ranking-info,
.ranking-error-hint {
  @include fonts.font-secondary-regular;
  color: variables.$color-off-white;
  font-size: 32px;
  line-height: 1.1;
}

.local-badge {
  @include fonts.font-secondary-semibold;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: variables.$color-off-white;
  background: variables.$color-off-white;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.muted {
  margin: 0;
}

@keyframes topEntryGrow {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: var(--entry-height, 50%);
    opacity: 1;
  }
}

@keyframes topCopyIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes listItemIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .highscore-top-entry,
  .highscore-top-entry > span,
  .highscore-list li,
  .ranking {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .highscore-top-entry {
    height: var(--entry-height, 50%);
  }
}
</style>
