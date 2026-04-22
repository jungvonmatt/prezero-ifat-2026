import { onMounted, ref, type Ref } from "vue";
import type { RoundResult } from "./useCircleScoring";

export interface HighscoreEntry {

  score: number;
  createdAt: string;
}

interface UseHighscoresOptions {
  result: Ref<RoundResult | null>;
}

const LOCAL_STORAGE_KEY = "ifat_highscores";

export function useHighscores(options: UseHighscoresOptions) {
  const highscores = ref<HighscoreEntry[]>([]);
  const isSaving = ref(false);
  const isLocalMode = ref(false);
  const latestSavedScore = ref<number | null>(null);

  function getLocalHighscores(): HighscoreEntry[] {
    if (!import.meta.client) return [];

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveLocalHighscore(score: number): HighscoreEntry[] {
    const current = getLocalHighscores();
    const newEntry: HighscoreEntry = {
      score,
      createdAt: new Date().toISOString(),
    };

    const updated = [...current, newEntry].sort((a, b) => b.score - a.score);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  async function loadHighscores() {
    try {
      highscores.value = await $fetch<HighscoreEntry[]>("/api/highscores");
    } catch {
      isLocalMode.value = true;
      highscores.value = getLocalHighscores();
    }
  }

  async function saveScore() {
    if (!options.result.value || isSaving.value) return;

    const scoreToSave = options.result.value.score;
    const alreadyExists = highscores.value.some((e) => e.score === scoreToSave);
    if (alreadyExists) {
      latestSavedScore.value = scoreToSave;
      return;
    }

    isSaving.value = true;

    try {
      if (isLocalMode.value) {
        highscores.value = saveLocalHighscore(scoreToSave);
      } else {
        try {
          highscores.value = await $fetch<HighscoreEntry[]>("/api/highscores", {
            method: "POST",
            body: {
              score: scoreToSave,
            },
          });
        } catch {
          isLocalMode.value = true;
          highscores.value = saveLocalHighscore(scoreToSave);
        }
      }

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
    isLocalMode,
    latestSavedScore,
    loadHighscores,
    saveScore,
    resetLatestSavedScore: () => { latestSavedScore.value = null; },
  };
}