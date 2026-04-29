<!-- eslint-disable vuejs-accessibility/form-control-has-label -->
<template>
  <section class="admin-panel">
    <div>
      <h2>Highscore entries</h2>
      <div class="admin-actions">
        <button class="btn secondary" type="button" :disabled="isBusy" @click="exportHighscores">Export backup</button>
        <button class="btn secondary" type="button" :disabled="isBusy" @click="openImportDialog">Import backup</button>
        <button class="btn danger" type="button" :disabled="isBusy" @click="resetHighscores">Reset highscores</button>
        <p v-if="statusMessage" class="status-text">{{ statusMessage }}</p>
        <input
          ref="fileInputEl"
          class="hidden-input"
          type="file"
          accept="application/json"
          @change="importHighscores" />
      </div>

      <div v-if="highscores.length" class="highscore-list-wrap">
        <ol class="highscore-list">
          <li v-for="(entry, index) in highscores" :key="entry.createdAt + index">
            <span class="rank">#{{ index + 1 }}</span>
            <em>{{ entry.score.toFixed(2) }}%</em>
            <button
              class="delete-x"
              type="button"
              :disabled="isBusy"
              :aria-label="`Delete entry ${index + 1}`"
              @click="deleteEntry(entry)">
              X
            </button>
          </li>
        </ol>
      </div>
      <p v-else class="muted">No highscores yet.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

interface HighscoreEntry {
  score: number;
  createdAt: string;
}

const highscores = ref<HighscoreEntry[]>([]);
const isBusy = ref(false);
const statusMessage = ref('');
const fileInputEl = ref<HTMLInputElement | null>(null);

async function loadHighscores() {
  highscores.value = await $fetch<HighscoreEntry[]>('/api/highscores');
}

function normalizeImportedEntries(input: unknown): HighscoreEntry[] {
  const sourceEntries = Array.isArray(input)
    ? input
    : typeof input === 'object' && input !== null && 'entries' in input && Array.isArray(input.entries)
      ? (input as { entries: unknown[] }).entries
      : [];

  return sourceEntries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map(entry => {
      const rawScore = typeof entry.score === 'number' ? entry.score : Number(entry.score);
      const safeCreatedAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
      const score = Number.isFinite(rawScore) ? rawScore : 0;

      return {
        score: Math.min(100, Math.max(0, score)),
        createdAt: safeCreatedAt,
      };
    });
}

async function resetHighscores() {
  if (!window.confirm('Reset all highscores on this device?')) {
    return;
  }

  isBusy.value = true;
  statusMessage.value = '';

  try {
    highscores.value = await $fetch<HighscoreEntry[]>('/api/highscores', {
      method: 'DELETE',
    });
    statusMessage.value = 'Highscores have been reset.';
  } finally {
    isBusy.value = false;
  }
}

async function deleteEntry(entry: HighscoreEntry) {
  isBusy.value = true;
  statusMessage.value = '';

  try {
    highscores.value = await $fetch<HighscoreEntry[]>('/api/highscores/item', {
      method: 'DELETE',
      body: {
        createdAt: entry.createdAt,
      },
    });
    statusMessage.value = `Entry removed.`;
  } finally {
    isBusy.value = false;
  }
}

function exportHighscores() {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    entries: highscores.value,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'perfect-circle-highscores.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);

  statusMessage.value = 'Backup exported as JSON.';
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
  statusMessage.value = '';

  try {
    const text = await file.text();
    const raw = JSON.parse(text) as unknown;
    const entries = normalizeImportedEntries(raw);

    highscores.value = await $fetch<HighscoreEntry[]>('/api/highscores', {
      method: 'PUT',
      body: {
        entries,
      },
    });

    statusMessage.value = 'Backup imported successfully.';
  } catch {
    statusMessage.value = 'Import failed. Please use a valid JSON backup file.';
  } finally {
    isBusy.value = false;
    input.value = '';
  }
}

onMounted(async () => {
  await loadHighscores();
});
</script>

<style scoped lang="scss">
@use '~/assets/styles/colors' as variables;

.admin-panel {
  width: fit-content;
  height: 100%;
  margin: 20dvh auto 0;
}

.admin-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 48px 0 40px;
}

.hidden-input {
  display: none;
}

.status-text {
  margin: 16px 25px;
}

.highscore-list-wrap {
  position: relative;
  height: 50dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: variables.$color-petrol;
}

.highscore-list-wrap::before,
.highscore-list-wrap::after {
  content: '';
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
  background: linear-gradient(to bottom, #{variables.$color-petrol}, #{rgba(variables.$color-petrol, 0)});
}

.highscore-list-wrap::after {
  bottom: -1px;
  background: linear-gradient(to top, #{variables.$color-petrol}, #{rgba(variables.$color-petrol, 0)});
}

.highscore-list {
  margin: 0;
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
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 56px;
  padding: 12px 16px;

  color: variables.$color-off-white;
  font-size: 32px;

  border-radius: 8px;
  border: 1px solid rgba(variables.$color-off-white, 0.5);
  background-color: variables.$color-petrol;

  margin: 12px 0;

  &:hover {
    border-color: variables.$color-off-white;
  }
}

.highscore-list .rank {
  color: variables.$color-off-white;
  width: 60px;
}

.highscore-list em {
  color: variables.$color-bright-green;
  font-style: normal;
}

.btn.danger {
  background: #8d1c1c;
  color: variables.$color-off-white;
}

.delete-x {
  justify-self: end;
  border: 1px solid variables.$color-off-white;
  background: transparent;
  color: #fff;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.delete-x:hover:not(:disabled) {
  border-color: #fff;
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
    font-size: 26px;
    grid-template-columns: auto 1fr auto;
  }

  .delete-x {
    grid-column: 1 / -1;
    justify-self: start;
  }
}
</style>
