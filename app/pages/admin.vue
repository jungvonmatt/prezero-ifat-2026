<template>
  <section class="card admin-panel">
    <div class="admin-head">
      <div>
        <h1>Admin panel</h1>
      </div>
      <NuxtLink class="btn" to="/">Back to game</NuxtLink>
    </div>

    <div>
      <h2>Game settings</h2>
      <label class="mode-picker">
        <span>Stroke behavior</span>
        <select :value="selectedStrokeMode" @change="onModeChange">
          <option v-for="option in strokeModeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <div>
      <h2>Highscore entries</h2>
      <div class="admin-actions">
        <button class="btn secondary" type="button" :disabled="isBusy" @click="exportHighscores">Export backup</button>
        <button class="btn secondary" type="button" :disabled="isBusy" @click="openImportDialog">Import backup</button>
        <button class="btn danger" type="button" :disabled="isBusy" @click="resetHighscores">Reset highscores</button>
        <input ref="fileInputEl" class="hidden-input" type="file" accept="application/json" @change="importHighscores" />
      </div>
      <p v-if="statusMessage" class="status-text">{{ statusMessage }}</p>
      <ol v-if="highscores.length" class="highscore-list">
        <li v-for="(entry, index) in highscores" :key="entry.createdAt + index">
          <span>{{ index + 1 }}.</span>
          <strong>{{ entry.name }}</strong>
          <em>{{ entry.score.toFixed(2) }}%</em>
          <button class="delete-x" type="button" :disabled="isBusy" :aria-label="`Delete ${entry.name}`" @click="deleteEntry(entry)">X</button>
        </li>
      </ol>
      <p v-else class="muted">No highscores yet.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { type StrokeMode } from "../composables/useStrokeProfiles";

const { strokeMode: selectedStrokeMode, strokeModeOptions, setStrokeMode } = useGameSettings();

function onModeChange(e: Event) {
  setStrokeMode((e.target as HTMLSelectElement).value as StrokeMode);
}
interface HighscoreEntry {
  name: string;
  score: number;
  createdAt: string;
}

const highscores = ref<HighscoreEntry[]>([]);
const isBusy = ref(false);
const statusMessage = ref("");
const fileInputEl = ref<HTMLInputElement | null>(null);

async function loadHighscores() {
  highscores.value = await $fetch<HighscoreEntry[]>("/api/highscores");
}

function normalizeImportedEntries(input: unknown): HighscoreEntry[] {
  const sourceEntries = Array.isArray(input) ? input : typeof input === "object" && input !== null && "entries" in input && Array.isArray((input as { entries: unknown }).entries) ? (input as { entries: unknown[] }).entries : [];

  return sourceEntries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => {
      const safeName = typeof entry.name === "string" ? entry.name.trim().slice(0, 24) : "Anonymous";
      const rawScore = typeof entry.score === "number" ? entry.score : Number(entry.score);
      const safeCreatedAt = typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString();
      const score = Number.isFinite(rawScore) ? rawScore : 0;

      return {
        name: safeName || "Anonymous",
        score: Math.min(100, Math.max(0, score)),
        createdAt: safeCreatedAt,
      };
    });
}

async function resetHighscores() {
  if (!window.confirm("Reset all highscores on this device?")) {
    return;
  }

  isBusy.value = true;
  statusMessage.value = "";

  try {
    highscores.value = await $fetch<HighscoreEntry[]>("/api/highscores", {
      method: "DELETE",
    });
    statusMessage.value = "Highscores have been reset.";
  } finally {
    isBusy.value = false;
  }
}

async function deleteEntry(entry: HighscoreEntry) {
  isBusy.value = true;
  statusMessage.value = "";

  try {
    highscores.value = await $fetch<HighscoreEntry[]>("/api/highscores/item", {
      method: "DELETE",
      body: {
        createdAt: entry.createdAt,
      },
    });
    statusMessage.value = `Removed ${entry.name}.`;
  } finally {
    isBusy.value = false;
  }
}

function exportHighscores() {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    entries: highscores.value,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "perfect-circle-highscores.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);

  statusMessage.value = "Backup exported as JSON.";
}

function openImportDialog() {
  fileInputEl.value?.click();
}

async function importHighscores(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  isBusy.value = true;
  statusMessage.value = "";

  try {
    const text = await file.text();
    const raw = JSON.parse(text) as unknown;
    const entries = normalizeImportedEntries(raw);

    highscores.value = await $fetch<HighscoreEntry[]>("/api/highscores", {
      method: "PUT",
      body: {
        entries,
      },
    });

    statusMessage.value = "Backup imported successfully.";
  } catch {
    statusMessage.value = "Import failed. Please use a valid JSON backup file.";
  } finally {
    isBusy.value = false;
    input.value = "";
  }
}

onMounted(async () => {
  await loadHighscores();
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/colors" as variables;

h2 {
  margin-bottom: 12px;
}
.admin-panel {
  padding: clamp(18px, 3vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 48px;
  height: 100%;
  margin-bottom: 32px;
}

.admin-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 24px 0 24px;
}

.hidden-input {
  display: none;
}

.status-text {
  margin: 8px 0 16px;
  font-weight: 600;
}

.highscore-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.highscore-list li {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  border-top: 1px solid variables.$core-color-white-soft;
  padding: 10px 0;
}

.highscore-list li:first-child {
  border-top: 0;
  padding-top: 0;
}

.highscore-list em {
  font-style: normal;
  font-weight: 600;
}

.btn.danger {
  background: #8d1c1c;
}

.admin-settings {
  margin-bottom: 14px;
}

.mode-picker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.mode-picker select {
  border: 1px solid variables.$core-color-white-soft;
  border-radius: 4px;
  padding: 10px 40px 10px 12px;
  font: inherit;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' fill='none' stroke='%2300343d' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-size: 12px 8px;
  background-position: right 18px center;
  color: inherit;
}

.delete-x {
  border: 1px solid variables.$core-color-white-soft;
  background: #fff;
  color: #8d1c1c;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
}

.delete-x:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 780px) {
  .admin-head {
    flex-direction: column;
  }

  .highscore-list li {
    grid-template-columns: auto 1fr auto;
  }

  .delete-x {
    grid-column: 1 / -1;
    justify-self: start;
  }
}
</style>
