<template>
  <div class="game-grid">
    <section class="playground">
      <div ref="canvasWrapEl" class="canvas-wrap">
        <canvas ref="canvasEl" class="circle-canvas" @pointerdown="startRound" @pointermove="moveRound" @pointerup="endRound" @pointercancel="endRound" />
        <div v-if="result" class="controls">
          <button class="btn" @click="resetRound">Try again</button>
        </div>
      </div>
    </section>

    <aside class="sidebar">
      <section class="hero card">
        <div>
          <h1>Create The Perfect Circle</h1>
          <p class="muted">Draw one confident stroke around the guide. Release to get your precision score.</p>
        </div>
        <div class="stats">
          <p>Score</p>
          <strong>{{ scoreText }}%</strong>
          <span v-if="result">{{ result.label }}</span>
          <span v-else class="muted">Round not finished yet</span>
        </div>
      </section>

      <article class="card board">
        <h2>Save your score</h2>
        <form class="save-form" @submit.prevent="saveScore">
          <input v-model="playerName" placeholder="Your name" maxlength="24" :disabled="!result || isSaving" />
          <button class="btn secondary" :disabled="!result || isSaving">
            {{ isSaving ? "Saving..." : "Save score" }}
          </button>
        </form>
      </article>

      <article class="card board top-scores">
        <div class="top-scores-header">
          <h2>Top scores</h2>
          <span v-if="isLocalMode" class="local-badge">Lokal gespeichert</span>
        </div>
        <div v-if="highscores.length" class="highscore-list-wrap">
          <ol class="highscore-list">
            <li v-for="(entry, index) in highscores" :key="entry.createdAt + index">
              <span>{{ index + 1 }}.</span>
              <strong>{{ entry.name }}</strong>
              <em>{{ entry.score.toFixed(2) }}%</em>
            </li>
          </ol>
        </div>
        <p v-else class="muted">No highscores yet.</p>
      </article>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useStrokeProfiles, type StrokeMode, type StrokePoint, type DrawContext } from "../composables/useStrokeProfiles";

interface Point {
  x: number;
  y: number;
}

interface RoundResult {
  score: number;
  label: string;
  radialError: number;
  closureError: number;
}

interface HighscoreEntry {
  name: string;
  score: number;
  createdAt: string;
}

const { drawStroke } = useStrokeProfiles();
const { strokeMode: selectedStrokeMode } = useGameSettings();

const canvasWrapEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const points = ref<StrokePoint[]>([]);
const isDrawing = ref(false);
const activePointerId = ref<number | null>(null);
const result = ref<RoundResult | null>(null);
const highscores = ref<HighscoreEntry[]>([]);
const playerName = ref("");
const isSaving = ref(false);
let ctx: CanvasRenderingContext2D | null = null;
let logicalSize = 0;
let dpr = 1;

const isLocalMode = ref(false);
const LOCAL_STORAGE_KEY = "ifat_highscores";

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

const hasResult = computed(() => Boolean(result.value));
const scoreText = computed(() => {
  if (!result.value) {
    return "0";
  }
  return result.value.score.toFixed(2);
});

function getLabel(score: number) {
  if (score >= 98) return "Almost machine-perfect";
  if (score >= 92) return "Exceptionally round";
  if (score >= 82) return "Very solid circle";
  if (score >= 70) return "Pretty good";
  if (score >= 55) return "Getting there";
  return "Needs more practice";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function configureCanvas() {
  if (!canvasWrapEl.value) return;
  if (!canvasEl.value) return;

  const rectWrap = canvasWrapEl.value?.getBoundingClientRect();
  const nextLogicalSize = Math.floor(Math.min(rectWrap.width, rectWrap.height || rectWrap.width));
  if (nextLogicalSize <= 0) return;

  logicalSize = nextLogicalSize;
  dpr = window.devicePixelRatio || 1;

  // Keep display box strictly square to avoid intermediate breakpoint distortion.
  canvasEl.value.style.width = `${logicalSize}px`;
  canvasEl.value.style.height = `${logicalSize}px`;

  canvasEl.value.width = Math.floor(logicalSize * dpr);
  canvasEl.value.height = Math.floor(logicalSize * dpr);

  ctx = canvasEl.value.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw();
}

function handleResize() {
  isDrawing.value = false;
  activePointerId.value = null;
  points.value = [];
  result.value = null;
  configureCanvas();
}

function toStrokePoint(point: Point, pressure?: number): StrokePoint {
  return {
    x: point.x,
    y: point.y,
    time: performance.now(),
    pressure: pressure || 0.5,
  };
}

function getScoringPoints(rawPoints: StrokePoint[]): Point[] {
  if (rawPoints.length === 0) {
    return [];
  }

  const filteredPoints: Point[] = [];
  let previousPoint: StrokePoint | null = null;

  for (const point of rawPoints) {
    if (!previousPoint || Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y) >= 1.25) {
      filteredPoints.push({ x: point.x, y: point.y });
      previousPoint = point;
    }
  }

  const lastPoint = rawPoints[rawPoints.length - 1];
  const previousFilteredPoint = filteredPoints[filteredPoints.length - 1];

  if (lastPoint && (!previousFilteredPoint || previousFilteredPoint.x !== lastPoint.x || previousFilteredPoint.y !== lastPoint.y)) {
    filteredPoints.push({ x: lastPoint.x, y: lastPoint.y });
  }

  return filteredPoints;
}

function redraw() {
  if (!ctx || !logicalSize) return;

  ctx.clearRect(0, 0, logicalSize, logicalSize);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, logicalSize, logicalSize);

  const cx = logicalSize / 2;
  const cy = logicalSize / 2;
  const radius = logicalSize * 0.33;

  ctx.strokeStyle = getCssVar("--core-color-secondary-base", "#a5c814");

  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (points.value.length > 1) {
    const drawContext: DrawContext = {
      centerX: cx,
      centerY: cy,
      targetRadius: radius,
    };
    drawStroke(ctx, points.value, selectedStrokeMode.value, drawContext);
  }
}

function pointFromPointer(event: PointerEvent): Point | null {
  if (!canvasEl.value) return null;
  const rect = canvasEl.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    return null;
  }

  return { x, y };
}

function startRound(event: PointerEvent) {
  if (hasResult.value) return;
  const point = pointFromPointer(event);
  if (!point || !canvasEl.value) return;

  const strokePoint = toStrokePoint(point, event.pressure);

  isDrawing.value = true;
  activePointerId.value = event.pointerId;
  points.value = [strokePoint];
  canvasEl.value.setPointerCapture(event.pointerId);
  redraw();
}

function moveRound(event: PointerEvent) {
  if (!isDrawing.value || activePointerId.value !== event.pointerId) return;
  const point = pointFromPointer(event);
  if (!point) return;

  const strokePoint = toStrokePoint(point, event.pressure);
  points.value.push(strokePoint);
  redraw();
}

function evaluateRound() {
  const rawPoints = getScoringPoints(points.value);

  if (rawPoints.length < 25) {
    result.value = {
      score: 0,
      label: "Draw a full circle for a score",
      radialError: 1,
      closureError: 1,
    };
    return;
  }

  const center = rawPoints.reduce((acc, p) => ({ x: acc.x + p.x / rawPoints.length, y: acc.y + p.y / rawPoints.length }), { x: 0, y: 0 });

  const distances = rawPoints.map((p) => Math.hypot(p.x - center.x, p.y - center.y));
  const avgRadius = distances.reduce((a, v) => a + v, 0) / distances.length;

  const variance =
    distances.reduce((acc, r) => {
      return acc + (r - avgRadius) ** 2;
    }, 0) / distances.length;

  const radialError = Math.sqrt(variance) / Math.max(avgRadius, 0.0001);
  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];

  if (!first || !last) {
    result.value = {
      score: 0,
      label: "Draw a full circle for a score",
      radialError: 1,
      closureError: 1,
    };
    return;
  }

  const closureGap = Math.hypot(last.x - first.x, last.y - first.y);
  const closureError = closureGap / Math.max(avgRadius * 0.75, 0.0001);

  const combinedError = clamp(radialError * 2.8 + closureError * 0.35, 0, 1);
  const score = clamp((1 - combinedError) * 100, 0, 100);

  result.value = {
    score,
    label: getLabel(score),
    radialError,
    closureError,
  };
}

function endRound(event: PointerEvent) {
  if (!isDrawing.value || activePointerId.value !== event.pointerId || !canvasEl.value) return;

  isDrawing.value = false;
  canvasEl.value.releasePointerCapture(event.pointerId);
  evaluateRound();
}

function resetRound() {
  points.value = [];
  result.value = null;
  activePointerId.value = null;
  playerName.value = "";
  redraw();
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
  if (!result.value) return;
  isSaving.value = true;

  try {
    if (isLocalMode.value) {
      highscores.value = saveLocalHighscore({
        name: playerName.value,
        score: result.value.score,
      });
    } else {
      try {
        highscores.value = await $fetch<HighscoreEntry[]>("/api/highscores", {
          method: "POST",
          body: {
            name: playerName.value,
            score: result.value.score,
          },
        });
      } catch {
        isLocalMode.value = true;
        highscores.value = saveLocalHighscore({
          name: playerName.value,
          score: result.value.score,
        });
      }
    }
  } finally {
    isSaving.value = false;
  }
}

onMounted(async () => {
  configureCanvas();

  window.addEventListener("resize", handleResize, { passive: true });

  await loadHighscores();
});

watch(selectedStrokeMode, () => {
  redraw();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.game-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.playground {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.canvas-wrap {
  height: 100%;
  width: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-canvas {
  height: 100%;
  width: auto;
  max-width: 100%;
  aspect-ratio: 1;
  display: block;
  /* border-radius: 4px; */
  /* border: 1px solid var(--line); */
  touch-action: none;
  background: #fff;
}

.controls {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  z-index: 2;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  padding: 0;
}

.hero {
  padding: clamp(14px, 2vw, 22px);
  flex-shrink: 0;
}

.stats {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}

.stats p {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.stats strong {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

.board {
  padding: 18px;
  flex-shrink: 0;
}

.save-form {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.save-form input {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 10px 12px;
  font: inherit;
}

.top-scores {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-right: 6px;
}

.highscore-list-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.highscore-list-wrap::before,
.highscore-list-wrap::after {
  content: "";
  position: absolute;
  left: 0;
  right: 18px;
  height: 18px;
  pointer-events: none;
  z-index: 1;
}

.highscore-list-wrap::before {
  top: 0;
  background: linear-gradient(to bottom, var(--surface), transparent);
}

.highscore-list-wrap::after {
  bottom: 0;
  background: linear-gradient(to top, var(--surface), transparent);
}

.highscore-list {
  margin: 0;
  padding: 18px 18px 18px 0;
  list-style: none;
  flex: 1;
  height: 100%;
  overflow-y: scroll;
  min-height: 0;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--line) transparent;
}

.highscore-list::-webkit-scrollbar {
  width: 6px;
}

.highscore-list::-webkit-scrollbar-track {
  background: transparent;
}

.highscore-list::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: 999px;
}

.highscore-list::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}

.highscore-list li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--line);
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

.top-scores-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.local-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  background: var(--line);
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.admin-link {
  margin-top: 14px;
  display: inline-flex;
}

@media (max-width: 860px) {
  .game-grid {
    grid-template-columns: 1fr;
    overflow-y: auto;
    flex: none;
    padding-bottom: 32px;
  }

  .canvas-wrap {
    height: min(80vw, 480px);
    flex: none;
  }

  .save-form {
    flex-direction: column;
  }
}
</style>
