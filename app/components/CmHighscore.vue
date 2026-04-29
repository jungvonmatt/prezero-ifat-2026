<template>
  <article class="highscore-article">
    <!-- 3 best scores -->
    <div class="highscore-top-3">
      <div
        v-for="(entry, index) in highscores.slice(0, 3)"
        :key="entry.createdAt + index"
        class="highscore-top-entry"
        :style="{ '--entry-height': getTopEntryHeight(entry.score) }">
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
    <p v-else class="muted">{{ t('highscores.noScores') }}</p>

    <!-- ranking info -->
    <div class="ranking">
      <p v-if="resultIsError" class="ranking-info">{{ t('highscores.noRanking') }}</p>
      <p v-else-if="currentRank && currentRank <= 3" class="ranking-info">
        {{ t('highscores.rankTop', { rank: currentRank }) }}
      </p>
      <p v-else-if="currentRank && currentRank > 3 && currentTopPercent !== null" class="ranking-info">
        {{ t('highscores.rankPercent', { rank: currentRank, percent: currentTopPercent }) }}
      </p>
      <p v-else class="ranking-info">{{ t('highscores.noRanking') }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useLocale } from '~/composables/useLocale';

const { t } = useLocale();

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
    return '50%';
  }

  const normalizedTopRange = (clampedScore - 50) / 50;
  const emphasizedTopRange = Math.pow(normalizedTopRange, TOP_ENTRY_HEIGHT_EXPONENT);
  const heightPercent = 50 + emphasizedTopRange * 50;
  return `${heightPercent}%`;
}
</script>

<style src="./CmHighscore.scss" scoped lang="scss" />
