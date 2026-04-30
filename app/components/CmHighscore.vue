<template>
  <article class="highscore-article">
    <!-- 3 best scores -->
    <div class="highscore-top-3">
      <div
        v-for="(entry, index) in highscores.slice(0, 3)"
        :key="entry.createdAt + index"
        class="highscore-top-entry"
        :style="{ '--entry-height': getTopEntryHeight(index) }">
        <span>#{{ index + 1 }}</span>
        <span>{{ entry.score.toFixed(1) }}%</span>
      </div>
    </div>

    <!-- highscre-list -->
    <div v-if="highscores.length" class="highscore-list-wrap">
      <ol ref="highscoreListEl" class="highscore-list">
        <li
          v-for="(entry, index) in highscores"
          :key="entry.createdAt + index"
          :style="{ '--list-index': index }"
          :data-score-index="String(index)"
          :class="{ 'is-user-score': index === highlightedScoreIndex }">
          <span>#{{ index + 1 }}</span>
          <span>{{ entry.score.toFixed(1) }}%</span>
        </li>
      </ol>
    </div>
    <p v-else class="muted">No highscores yet.</p>

    <!-- ranking info -->
    <div class="ranking">
      <p v-if="resultIsError" class="ranking-info">No ranking.</p>
      <p v-else-if="currentRank && currentRank <= 3" class="ranking-info">
        You are in place {{ currentRank }} of all participants.
      </p>
      <p v-else-if="currentRank && currentRank > 3 && currentTopPercent !== null" class="ranking-info">
        You are in place {{ currentRank }} and thus among the best {{ currentTopPercent }}% of all participants!
      </p>
      <p v-else class="ranking-info">No ranking.</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

interface HighscoreEntry {
  score: number;
  createdAt: string;
}

const props = defineProps<{
  highscores: HighscoreEntry[];
  latestSavedScore: number | null;
  resultLabel?: string;
  resultIsError?: boolean;
}>();

const highscoreListEl = ref<HTMLOListElement | null>(null);

const highlightedScoreIndex = computed<number>(() => {
  if (props.latestSavedScore === null || props.resultIsError) return -1;

  const latestSavedScore = Number(props.latestSavedScore.toFixed(1));
  return props.highscores.findIndex(entry => Number(entry.score.toFixed(1)) === latestSavedScore);
});

watch(
  highlightedScoreIndex,
  async index => {
    if (index < 0) return;

    await nextTick();

    const listEl = highscoreListEl.value;
    if (!listEl) return;

    const targetRow = listEl.querySelector<HTMLLIElement>(`li[data-score-index="${index}"]`);
    if (!targetRow) return;

    targetRow.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  },
  { immediate: true }
);

const currentRank = computed<number | null>(() => {
  if (props.latestSavedScore === null || !props.highscores.length) return null;

  const latestScore = props.latestSavedScore;
  const higherScores = props.highscores.filter(entry => entry.score > latestScore).length;
  return higherScores + 1;
});

const currentTopPercent = computed<number | null>(() => {
  if (currentRank.value === null || !props.highscores.length) return null;

  const oneBasedRank = currentRank.value;
  return Math.max(1, Math.round((oneBasedRank / props.highscores.length) * 100));
});

function getTopEntryHeight(index: number): string {
  const podiumHeights = ['100%', '78%', '64%'];

  if (index >= 0 && index < podiumHeights.length) {
    return podiumHeights[index] as string;
  }

  return '64%';
}
</script>

<style src="./CmHighscore.scss" scoped lang="scss" />
