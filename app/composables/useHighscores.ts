import { onMounted, ref, type Ref } from 'vue';
import type { RoundResult } from './useCircleScoring';

export interface HighscoreEntry {
  score: number;
  createdAt: string;
}

interface UseHighscoresOptions {
  result: Ref<RoundResult | null>;
}

const HIGHSCORES_STORAGE_KEY = 'circle-game-highscores';
const HIGHSCORE_LIMIT = 1000;

function normalizeEntries(entries: HighscoreEntry[]): HighscoreEntry[] {
  return entries
    .filter(entry => {
      return typeof entry?.score === 'number' && typeof entry?.createdAt === 'string';
    })
    .map(entry => {
      const safeScore = Math.min(100, Math.max(0, Number(entry.score)));
      return {
        score: Math.round(safeScore * 100) / 100,
        createdAt: entry.createdAt,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, HIGHSCORE_LIMIT);
}

export function useHighscores(options: UseHighscoresOptions) {
  const highscores = ref<HighscoreEntry[]>([]);
  const isSaving = ref(false);
  const latestSavedScore = ref<number | null>(null);

  function loadHighscores() {
    try {
      const stored = localStorage.getItem(HIGHSCORES_STORAGE_KEY);
      highscores.value = stored ? normalizeEntries(JSON.parse(stored)) : [];
    } catch {
      highscores.value = [];
    }
  }

  function saveHighscores(entries: HighscoreEntry[]) {
    try {
      const normalized = normalizeEntries(entries);
      localStorage.setItem(HIGHSCORES_STORAGE_KEY, JSON.stringify(normalized));
      highscores.value = normalized;
      return normalized;
    } catch {
      highscores.value = [];
      return [];
    }
  }

  function saveScore() {
    if (!options.result.value || isSaving.value) return;

    const scoreToSave = options.result.value.score;
    const alreadyExists = highscores.value.some(e => e.score === scoreToSave);
    if (alreadyExists) {
      latestSavedScore.value = scoreToSave;
      return;
    }

    isSaving.value = true;

    try {
      const nextEntry: HighscoreEntry = {
        score: Math.round(scoreToSave * 100) / 100,
        createdAt: new Date().toISOString(),
      };
      saveHighscores([...highscores.value, nextEntry]);
      latestSavedScore.value = scoreToSave;
    } finally {
      isSaving.value = false;
    }
  }

  onMounted(() => {
    loadHighscores();
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
