import { onMounted, ref, type Ref } from 'vue';
import type { RoundResult } from './useCircleScoring';

export interface HighscoreEntry {
  score: number;
  createdAt: string;
}

interface UseHighscoresOptions {
  result: Ref<RoundResult | null>;
}

export function useHighscores(options: UseHighscoresOptions) {
  const highscores = ref<HighscoreEntry[]>([]);
  const isSaving = ref(false);
  const latestSavedScore = ref<number | null>(null);

  async function loadHighscores() {
    try {
      highscores.value = await $fetch<HighscoreEntry[]>('/api/highscores');
    } catch {
      highscores.value = [];
    }
  }

  async function saveScore() {
    if (!options.result.value || isSaving.value) return;

    const scoreToSave = options.result.value.score;
    const alreadyExists = highscores.value.some(e => e.score === scoreToSave);
    if (alreadyExists) {
      latestSavedScore.value = scoreToSave;
      return;
    }

    isSaving.value = true;

    try {
      highscores.value = await $fetch<HighscoreEntry[]>('/api/highscores', {
        method: 'POST',
        body: {
          score: scoreToSave,
        },
      });
      latestSavedScore.value = scoreToSave;
    } finally {
      isSaving.value = false;
    }
  }

  onMounted(async () => {
    await loadHighscores();
  });

  return {
    highscores,
    isSaving,
    latestSavedScore,
    loadHighscores,
    saveScore,
    resetLatestSavedScore: () => {
      latestSavedScore.value = null;
    },
  };
}
