import { onMounted, ref, type Ref } from "vue";
import type { RoundResult } from "./useCircleScoring";

export interface HighscoreEntry {
  name: string;
  score: number;
  createdAt: string;
}

interface UseHighscoresOptions {
  result: Ref<RoundResult | null>;
}

const LOCAL_STORAGE_KEY = "ifat_highscores";

export function useHighscores(options: UseHighscoresOptions) {
  const highscores = ref<HighscoreEntry[]>([]);
  const playerName = ref("");
  const isSaving = ref(false);
  const isLocalMode = ref(false);

  function getLocalHighscores(): HighscoreEntry[] {
    if (!import.meta.client) return [];

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveLocalHighscore(entry: { name: string; score: number }): HighscoreEntry[] {
    const current = getLocalHighscores();
    const newEntry: HighscoreEntry = {
      name: entry.name || "Anonymous",
      score: entry.score,
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
    if (!options.result.value) return;
    isSaving.value = true;

    try {
      if (isLocalMode.value) {
        highscores.value = saveLocalHighscore({
          name: playerName.value,
          score: options.result.value.score,
        });
      } else {
        try {
          highscores.value = await $fetch<HighscoreEntry[]>("/api/highscores", {
            method: "POST",
            body: {
              name: playerName.value,
              score: options.result.value.score,
            },
          });
        } catch {
          isLocalMode.value = true;
          highscores.value = saveLocalHighscore({
            name: playerName.value,
            score: options.result.value.score,
          });
        }
      }
    } finally {
      isSaving.value = false;
    }
  }

  onMounted(async () => {
    await loadHighscores();
  });

  return {
    highscores,
    playerName,
    isSaving,
    isLocalMode,
    loadHighscores,
    saveScore,
  };
}