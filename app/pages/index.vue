<template>
  <div class="game-grid">
    <section class="playground">
      <div ref="canvasWrapEl" class="canvas-wrap">
        <canvas ref="canvasEl" class="circle-canvas" @pointerdown="startRound" @pointermove="moveRound" @pointerup="endRound" @pointercancel="endRound" />
        <Transition name="intro">
          <div v-if="!hasStarted" class="intro-copy">
            <span>Zeichne den<br />perfekten Kreis!</span>
            <button class="btn" @click="startGame">Los geht's!</button>
          </div>
        </Transition>
        <!-- <Transition name="timer">
          <div v-if="isDrawing && !result" class="timer-overlay" :class="{ warning: roundTimeLeftMs <= 3000 }">
            <svg class="timer-ring" viewBox="0 0 100 100" aria-hidden="true">
              <circle class="timer-ring-track" cx="50" cy="50" r="42" />
              <circle class="timer-ring-progress" cx="50" cy="50" r="42" :style="{ strokeDashoffset: timerDashoffset }" />
            </svg>
            <div class="timer-overlay-content">
              <strong class="timer-caption">{{ timerText }}</strong>
            </div>
          </div>
        </Transition> -->
        <strong v-if="isDrawing || result" class="score-display">{{ scoreDisplayText }}</strong>
        <div v-if="result" class="controls">
          <!-- <span class="controls-label">{{ result.label }}</span> -->
          <!-- <button class="btn" @click="resetRound">Neustart</button> -->
        </div>
      </div>
    </section>

    <aside class="sidebar">
      <!-- <section class="hero">
        <div class="stats">
          <strong>{{ scoreText }}%</strong>
          <span v-if="result">{{ result.label }}</span>
          <span v-else class="muted">Round not finished yet</span>
        </div>
      </section> -->

      <!-- <article>
        <h2>Save your score</h2>
        <form class="save-form" @submit.prevent="saveScore">
          <input v-model="playerName" placeholder="Your name" maxlength="24" :disabled="!result || isSaving" />
          <button class="btn secondary" :disabled="!result || isSaving">
            {{ isSaving ? "Saving..." : "Save score" }}
          </button>
        </form>
      </article> -->

      <article>
        <div class="highscore-header">
          <h2>Scores</h2>
          <span v-if="isLocalMode" class="local-badge">Lokal gespeichert</span>
        </div>
        <div v-if="highscores.length" class="highscore-list-wrap">
          <ol class="highscore-list">
            <li v-for="(entry, index) in highscores" :key="entry.createdAt + index">
              <span>#{{ index + 1 }}</span>
              <!-- <strong>{{ entry.name }}</strong> -->
              <span>{{ entry.score.toFixed(1) }}%</span>
            </li>
          </ol>
        </div>
        <p v-else class="muted">No highscores yet.</p>
      </article>

      <button v-if="result" class="btn restart" @click="resetRound">Neustart</button>
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
  radiusFitError: number;
  closureError: number;
  directionChangeError: number;
  timeoutError: number;
  centerFailureError: number;
  guideSizeFailureError: number;
  coverageFailureError: number;
  coverageDegrees: number;
}

interface HighscoreEntry {
  name: string;
  score: number;
  createdAt: string;
}

const { drawStroke } = useStrokeProfiles();
const { strokeMode: selectedStrokeMode } = useGameSettings();
const ROUND_TIMEOUT_MS = 8000;
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 42;
const GUIDE_RADIUS_FACTOR = 0.33;
const GUIDE_FADE_OUT_MS = 900;
const CENTER_ERROR_THRESHOLD = 0.9;
const CENTER_OUTSIDE_STROKE_MARGIN = 1.05;
const RADIUS_SIZE_PENALTY_RANGE = 0.55;
const RADIUS_SIZE_PENALTY_EXPONENT = 1.2;
const MIN_COVERAGE_DEGREES = 300;
const SCORE_WEIGHT_RADIUS_FIT = 0.45;
const SCORE_WEIGHT_RADIUS_SIZE = 0.25;
const SCORE_WEIGHT_RADIAL = 0.2;
const SCORE_WEIGHT_CLOSURE = 0.1;
const DIRECTION_MIN_SEGMENT = 1;
const DIRECTION_MIN_ANGLE_DELTA = 0.02;
const DIRECTION_MIN_ANGLE_DELTA_FLOOR = 0.0012;
const DIRECTION_MIN_ANGLE_DELTA_RATIO = 0.35;
const DIRECTION_MIN_CENTER_DISTANCE_FACTOR = 0.12;
const DIRECTION_OPPOSITE_STREAK_TO_ABORT = 1;
const ENABLE_SCORE_DEBUG = import.meta.dev;

const canvasWrapEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const points = ref<StrokePoint[]>([]);
const isDrawing = ref(false);
const activePointerId = ref<number | null>(null);
const result = ref<RoundResult | null>(null);
const highscores = ref<HighscoreEntry[]>([]);
const playerName = ref("");
const isSaving = ref(false);
const hasStarted = ref(false);
const rotationDirection = ref<-1 | 0 | 1>(0);
const oppositeTurnStreak = ref(0);
const roundTimeoutId = ref<number | null>(null);
const roundTickId = ref<number | null>(null);
const roundStartAt = ref<number | null>(null);
const roundTimeLeftMs = ref(ROUND_TIMEOUT_MS);
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
  return result.value.score.toFixed(1);
});
const timerProgress = computed(() => clamp(roundTimeLeftMs.value / ROUND_TIMEOUT_MS, 0, 1));
const timerDashoffset = computed(() => String(TIMER_RING_CIRCUMFERENCE * (1 - timerProgress.value)));
const timerText = computed(() => `${(roundTimeLeftMs.value / 1000).toFixed(1)}s`);
const scoreDisplayText = computed(() => {
  if (result.value) {
    return `${result.value.score.toFixed(1)}%`;
  }

  if (!isDrawing.value) return "";

  const liveScore = calculateLiveScore(points.value);
  if (liveScore === null) return "--";
  return `${liveScore.toFixed(1)}%`;
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

function normalizeAngleDelta(delta: number) {
  if (delta > Math.PI) return delta - Math.PI * 2;
  if (delta < -Math.PI) return delta + Math.PI * 2;
  return delta;
}

function clearRoundTimeout() {
  if (roundTimeoutId.value === null) return;
  window.clearTimeout(roundTimeoutId.value);
  roundTimeoutId.value = null;
}

function clearRoundTick() {
  if (roundTickId.value === null) return;
  window.clearInterval(roundTickId.value);
  roundTickId.value = null;
}

function resetRoundClock() {
  roundStartAt.value = null;
  roundTimeLeftMs.value = ROUND_TIMEOUT_MS;
}

function startRoundTick(pointerId: number) {
  clearRoundTick();
  roundStartAt.value = performance.now();
  roundTimeLeftMs.value = ROUND_TIMEOUT_MS;

  roundTickId.value = window.setInterval(() => {
    if (!isDrawing.value || activePointerId.value !== pointerId || roundStartAt.value === null) return;

    const elapsed = performance.now() - roundStartAt.value;
    roundTimeLeftMs.value = clamp(ROUND_TIMEOUT_MS - elapsed, 0, ROUND_TIMEOUT_MS);
    redraw();
  }, 50);
}

function startRoundTimeout(pointerId: number) {
  clearRoundTimeout();
  roundTimeoutId.value = window.setTimeout(() => {
    if (!isDrawing.value || activePointerId.value !== pointerId) return;
    abortRoundForTimeout(pointerId);
  }, ROUND_TIMEOUT_MS);
}

function abortRoundForDirectionChange(pointerId: number) {
  if (!canvasEl.value) return;

  clearRoundTimeout();
  clearRoundTick();
  resetRoundClock();
  isDrawing.value = false;
  activePointerId.value = null;
  rotationDirection.value = 0;
  oppositeTurnStreak.value = 0;

  if (canvasEl.value.hasPointerCapture(pointerId)) {
    canvasEl.value.releasePointerCapture(pointerId);
  }

  result.value = {
    score: 0,
    label: "Direction changed: keep one continuous direction",
    radialError: 1,
    radiusFitError: 1,
    closureError: 1,
    directionChangeError: 1,
    timeoutError: 0,
    centerFailureError: 0,
    guideSizeFailureError: 0,
    coverageFailureError: 0,
    coverageDegrees: 0,
  };
}

function abortRoundForTimeout(pointerId: number) {
  if (!canvasEl.value) return;

  clearRoundTimeout();
  clearRoundTick();
  roundTimeLeftMs.value = 0;
  isDrawing.value = false;
  activePointerId.value = null;
  rotationDirection.value = 0;
  oppositeTurnStreak.value = 0;

  if (canvasEl.value.hasPointerCapture(pointerId)) {
    canvasEl.value.releasePointerCapture(pointerId);
  }

  result.value = {
    score: 0,
    label: "Time exceeded: draw the circle faster",
    radialError: 1,
    radiusFitError: 1,
    closureError: 1,
    directionChangeError: 0,
    timeoutError: 1,
    centerFailureError: 0,
    guideSizeFailureError: 0,
    coverageFailureError: 0,
    coverageDegrees: 0,
  };
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
  clearRoundTimeout();
  clearRoundTick();
  resetRoundClock();
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

function calculateLiveScore(rawStrokePoints: StrokePoint[]): number | null {
  if (logicalSize <= 0) return null;

  const rawPoints = getScoringPoints(rawStrokePoints);
  if (rawPoints.length < 4) return null;

  const guideCenterX = logicalSize / 2;
  const guideCenterY = logicalSize / 2;
  const targetRadius = logicalSize * GUIDE_RADIUS_FACTOR;
  const distances = rawPoints.map((p) => Math.hypot(p.x - guideCenterX, p.y - guideCenterY));
  const avgRadius = distances.reduce((a, v) => a + v, 0) / distances.length;

  if (!Number.isFinite(avgRadius) || avgRadius <= 0) return null;

  const radiusFitError =
    distances.reduce((acc, r) => {
      return acc + Math.abs(r - targetRadius) / Math.max(targetRadius, 0.0001);
    }, 0) / distances.length;

  const variance =
    distances.reduce((acc, r) => {
      return acc + (r - avgRadius) ** 2;
    }, 0) / distances.length;
  const radialError = Math.sqrt(variance) / Math.max(targetRadius, 0.0001);

  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];
  if (!first || !last) return null;

  const closureGap = Math.hypot(last.x - first.x, last.y - first.y);
  const closureError = closureGap / Math.max(targetRadius, 0.0001);

  let signedCoverage = 0;
  for (let i = 1; i < rawPoints.length; i += 1) {
    const prev = rawPoints[i - 1];
    const current = rawPoints[i];
    if (!prev || !current) continue;

    const prevAngle = Math.atan2(prev.y - guideCenterY, prev.x - guideCenterX);
    const currentAngle = Math.atan2(current.y - guideCenterY, current.x - guideCenterX);
    signedCoverage += normalizeAngleDelta(currentAngle - prevAngle);
  }

  const coverageDegrees = Math.min(360, Math.abs((signedCoverage * 180) / Math.PI));
  const coverageProgress = clamp(coverageDegrees / 360, 0, 1);
  const closureWeight = SCORE_WEIGHT_CLOSURE * coverageProgress * coverageProgress;

  // Motivational live score: start high when trajectory is clean, then decay with deviations.
  const liveError = clamp(radiusFitError * 0.62 + radialError * 0.3 + closureError * closureWeight, 0, 1);
  const liveScore = Math.pow(1 - liveError, 0.72) * 100;

  return clamp(liveScore, 0, 100);
}

function redraw() {
  if (!ctx || !logicalSize) return;

  ctx.clearRect(0, 0, logicalSize, logicalSize);
  ctx.fillStyle = getCssVar("--core-color-bg", "#013c4a");
  ctx.fillRect(0, 0, logicalSize, logicalSize);

  const cx = logicalSize / 2;
  const cy = logicalSize / 2;
  const radius = logicalSize * GUIDE_RADIUS_FACTOR;
  const guideOpacity = isDrawing.value && roundStartAt.value !== null ? clamp(1 - (performance.now() - roundStartAt.value) / GUIDE_FADE_OUT_MS, 0, 1) : 1;

  ctx.strokeStyle = getCssVar("--core-color-stroke", "#a5c814");

  ctx.save();
  ctx.globalAlpha = guideOpacity;
  ctx.lineWidth = 1;
  ctx.setLineDash([22, 22]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

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

function startGame() {
  hasStarted.value = true;
  resetRound();
}

function startRound(event: PointerEvent) {
  if (!hasStarted.value) return;
  if (hasResult.value) return;
  const point = pointFromPointer(event);
  if (!point || !canvasEl.value) return;

  const strokePoint = toStrokePoint(point, event.pressure);

  isDrawing.value = true;
  activePointerId.value = event.pointerId;
  rotationDirection.value = 0;
  oppositeTurnStreak.value = 0;
  points.value = [strokePoint];
  canvasEl.value.setPointerCapture(event.pointerId);
  startRoundTick(event.pointerId);
  startRoundTimeout(event.pointerId);
  redraw();
}

function moveRound(event: PointerEvent) {
  if (!isDrawing.value || activePointerId.value !== event.pointerId) return;
  const point = pointFromPointer(event);
  if (!point) return;

  const pointCount = points.value.length;
  if (pointCount >= 1 && logicalSize > 0) {
    const prev = points.value[pointCount - 1];

    if (prev) {
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      const segmentLength = Math.hypot(dx, dy);

      if (segmentLength >= DIRECTION_MIN_SEGMENT) {
        const guideCenterX = logicalSize / 2;
        const guideCenterY = logicalSize / 2;
        const minCenterDistance = logicalSize * DIRECTION_MIN_CENTER_DISTANCE_FACTOR;
        const prevDistanceToCenter = Math.hypot(prev.x - guideCenterX, prev.y - guideCenterY);
        const currentDistanceToCenter = Math.hypot(point.x - guideCenterX, point.y - guideCenterY);

        // Ignore unstable angle deltas close to the center.
        if (prevDistanceToCenter >= minCenterDistance && currentDistanceToCenter >= minCenterDistance) {
          const prevAngle = Math.atan2(prev.y - guideCenterY, prev.x - guideCenterX);
          const currentAngle = Math.atan2(point.y - guideCenterY, point.x - guideCenterX);
          const angleDelta = normalizeAngleDelta(currentAngle - prevAngle);
          const averageDistanceToCenter = (prevDistanceToCenter + currentDistanceToCenter) / 2;

          // Angular movement around canvas center is approximately segmentLength / radius.
          const expectedAngleDelta = segmentLength / Math.max(averageDistanceToCenter, 0.0001);
          const adaptiveMinAngleDelta = expectedAngleDelta * DIRECTION_MIN_ANGLE_DELTA_RATIO;
          const minAngleDelta = clamp(adaptiveMinAngleDelta, DIRECTION_MIN_ANGLE_DELTA_FLOOR, DIRECTION_MIN_ANGLE_DELTA);

          if (Math.abs(angleDelta) >= minAngleDelta) {
            const nextDirection: -1 | 1 = angleDelta > 0 ? 1 : -1;

            if (rotationDirection.value === 0) {
              rotationDirection.value = nextDirection;
              oppositeTurnStreak.value = 0;
            } else if (rotationDirection.value !== nextDirection) {
              oppositeTurnStreak.value += 1;
              if (oppositeTurnStreak.value >= DIRECTION_OPPOSITE_STREAK_TO_ABORT) {
                abortRoundForDirectionChange(event.pointerId);
                return;
              }
            } else {
              oppositeTurnStreak.value = 0;
            }
          }
        }
      }
    }
  }

  const strokePoint = toStrokePoint(point, event.pressure);
  points.value.push(strokePoint);
  redraw();
}

function evaluateRound() {
  const score = calculateLiveScore(points.value);

  if (score === null) {
    result.value = {
      score: 0,
      label: "Draw a full circle for a score",
      radialError: 1,
      radiusFitError: 1,
      closureError: 1,
      directionChangeError: 0,
      timeoutError: 0,
      centerFailureError: 0,
      guideSizeFailureError: 0,
      coverageFailureError: 0,
      coverageDegrees: 0,
    };
    return;
  }

  if (ENABLE_SCORE_DEBUG) {
    console.debug("circle-score-live-final", {
      score,
      note: "final-score uses calculateLiveScore()",
    });
  }

  result.value = {
    score,
    label: getLabel(score),
    radialError: 0,
    radiusFitError: 0,
    closureError: 0,
    directionChangeError: 0,
    timeoutError: 0,
    centerFailureError: 0,
    guideSizeFailureError: 0,
    coverageFailureError: 0,
    coverageDegrees: 0,
  };
}

function endRound(event: PointerEvent) {
  if (!isDrawing.value || activePointerId.value !== event.pointerId || !canvasEl.value) return;

  clearRoundTimeout();
  clearRoundTick();
  resetRoundClock();
  isDrawing.value = false;
  activePointerId.value = null;
  rotationDirection.value = 0;
  oppositeTurnStreak.value = 0;
  canvasEl.value.releasePointerCapture(event.pointerId);
  evaluateRound();
}

function resetRound() {
  clearRoundTimeout();
  clearRoundTick();
  resetRoundClock();
  points.value = [];
  result.value = null;
  activePointerId.value = null;
  rotationDirection.value = 0;
  oppositeTurnStreak.value = 0;
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
  clearRoundTimeout();
  clearRoundTick();
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/colors" as variables;

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
  touch-action: none;
  background: #fff;
}

.controls {
  position: absolute;
  left: 50%;
  top: calc(50% + 64px);
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  z-index: 2;
  text-align: center;
}

.score-display {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  color: #a5c814;
  font-family: Goldman;
  font-size: 100px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

.controls-label {
  max-width: 240px;
  font-size: 0.85rem;
  line-height: 1.2;
  color: color-mix(in srgb, #ffffff 88%, #{variables.$core-color-tertiary-base});
}

.intro-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;

  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: variables.$core-color-white-soft;
  text-align: center;
  // font-family: "Roboto Condensed";
  font-size: 48px;
  font-style: normal;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 1px;
  z-index: 3;
}

.intro-enter-active,
.intro-leave-active {
  transition:
    opacity 260ms ease,
    transform 340ms cubic-bezier(0.22, 1, 0.36, 1);
}

.intro-enter-from,
.intro-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 14px)) scale(0.98);
}

.timer-overlay {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 110px;
  height: 110px;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, #ffffff 82%, transparent);
  backdrop-filter: blur(1.5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  z-index: 2;
}

.timer-enter-active,
.timer-leave-active {
  transition:
    opacity 260ms ease,
    transform 340ms cubic-bezier(0.22, 1, 0.36, 1);
}

.timer-enter-from,
.timer-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 14px)) scale(0.98);
}

.timer-overlay strong {
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.timer-caption {
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  opacity: 0.9;
}

.timer-overlay-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.timer-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.timer-ring-track,
.timer-ring-progress {
  fill: none;
  stroke-width: 6;
}

.timer-ring-track {
  stroke: color-mix(in srgb, #{variables.$line} 78%, transparent);
}

.timer-ring-progress {
  stroke: variables.$core-color-secondary-base;
  stroke-linecap: round;
  stroke-dasharray: 263.89378290154264;
  transition: stroke 0.2s ease;
}

.timer-overlay.warning .timer-ring-progress {
  stroke: #e05b3f;
}

.sidebar {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
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
  color: variables.$muted;
}

.stats strong {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

.save-form {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.save-form input {
  flex: 1;
  border: 1px solid variables.$line;
  border-radius: 4px;
  padding: 10px 12px;
  font: inherit;
}

.highscore-header {
  margin-top: -40px;
  margin-bottom: 8px;;
}

.highscore-list-wrap {
  position: relative;
  height: 25dvh;
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
  background: linear-gradient(to bottom, #{variables.$core-color-bg}, transparent);
}

.highscore-list-wrap::after {
  bottom: 0;
  background: linear-gradient(to top, #{variables.$core-color-bg}, transparent);
}

.highscore-list {
  margin: 0;
  padding: 18px 18px 18px 0;
  list-style: none;
  flex: 1;
  height: 100%;
  overflow-y: scroll;
  min-height: 0;
  // Vorherige Variante (sichtbare Scrollbar):
  // scrollbar-gutter: stable;
  // scrollbar-width: thin;
  // scrollbar-color: variables.$line transparent;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.highscore-list::-webkit-scrollbar {
  // Vorherige Variante (sichtbare Scrollbar):
  // width: 6px;
  width: 0;
  height: 0;
}

// .highscore-list::-webkit-scrollbar-track {
//   background: transparent;
// }

// .highscore-list::-webkit-scrollbar-thumb {
//   background: variables.$line;
//   border-radius: 999px;
// }

// .highscore-list::-webkit-scrollbar-thumb:hover {
//   background: variables.$muted;
// }

.highscore-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  color: #fff;
  font-family: Goldman;
  font-size: 40px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

.highscore-list li:first-child {
  border-top: 0;
  padding-top: 0;
}

.restart {
  position: absolute;
  bottom: 48px;
}

.local-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: variables.$muted;
  background: variables.$line;
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
    position: relative;
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
