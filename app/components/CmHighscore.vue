<template>
  <article>
    <div class="highscore-header">
      <h2>Scores</h2>
      <span v-if="isLocalMode" class="local-badge">Lokal gespeichert</span>
    </div>
    <div v-if="highscores.length" class="highscore-list-wrap">
      <ol class="highscore-list">
        <li v-for="(entry, index) in highscores" :key="entry.createdAt + index">
          <span>#{{ index + 1 }}</span>
          <!-- <p>{{ entry.name }}</p> -->
          <span>{{ entry.score.toFixed(1) }}%</span>
        </li>
      </ol>
    </div>
    <p v-else class="muted">No highscores yet.</p>
  </article>
</template>

<script setup lang="ts">
interface HighscoreEntry {
  name: string;
  score: number;
  createdAt: string;
}

defineProps<{
  highscores: HighscoreEntry[];
  isLocalMode: boolean;
}>();
</script>

<style scoped lang="scss">
@use "~/assets/styles/colors" as variables;

.highscore-list-wrap {
  position: relative;
  height: 50dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.highscore-list-wrap::before,
.highscore-list-wrap::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0px;
  height: 18px;
  pointer-events: none;
  z-index: 1;
}

.highscore-list-wrap::before {
  top: 0;
  background: linear-gradient(to bottom, #{variables.$core-color-bg}, transparent);
}

.highscore-list-wrap::after {
  bottom: 0;
  background: linear-gradient(to top, #{variables.$core-color-bg}, transparent);
}

.highscore-list {
  margin: 0;
  padding: 18px 0 18px 0;
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
  display: flex;
  padding: 12px 16px;
  justify-content: space-between;
  align-items: center;

  color: #fff;
  font-size: 40px;

  border-radius: 10px 0 10px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background-color: variables.$core-color-bg;

  margin: 12px 0;

  &:hover {
    border-color: rgba(255, 255, 255, 1);
  }

  & > span:first-of-type {
    color: variables.$core-color-green;
  }
}

.local-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: variables.$muted;
  background: variables.$core-color-white-soft;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.muted {
  margin: 0;
}
</style>
