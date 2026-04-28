import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { calculateLiveScore, clamp, getLabel, getStrokeCompletionMetrics, ERROR_LABEL_INVALID_FORM, ERROR_LABEL_CLOSURE, incrementLabelRotation, type Point, type RoundResult } from "./useCircleScoring";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useRoundLifecycle } from "./useRoundLifecycle";
import { useStrokeRenderer, type StrokePoint } from "./useStrokeRenderer";

const ROUND_TIMEOUT_MS = 8000;
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 42;
const GUIDE_RADIUS_FACTOR = 0.45;
const GUIDE_FADE_OUT_MS = 900;
const INTRO_PREVIEW_DRAW_MS = 1750;
const INTRO_PREVIEW_HOLD_MS = 500;
const INTRO_PREVIEW_TOTAL_POINTS = 220;
const INTRO_PREVIEW_STROKE_WIDTH_SCALE = 1.45;
const SCORE_WEIGHT_CLOSURE = 0.1;
const FINAL_CLOSURE_ERROR_THRESHOLD = 0.1;
const DIRECTION_MIN_SEGMENT = 1;
const DIRECTION_MIN_ANGLE_DELTA = 0.02;
const DIRECTION_MIN_ANGLE_DELTA_FLOOR = 0.0012;
const DIRECTION_MIN_ANGLE_DELTA_RATIO = 0.35;
const DIRECTION_MIN_CENTER_DISTANCE_FACTOR = 0.12;
const DIRECTION_OPPOSITE_STREAK_TO_ABORT = 1;
const ENABLE_SCORE_DEBUG = import.meta.dev;

interface IntroPreviewVariant {
  radiusScale: number;
  startAngle: number;
  radialProfile: number[];
}

const INTRO_PREVIEW_DEFAULT_VARIANT: IntroPreviewVariant = {
  radiusScale: 1,
  startAngle: -Math.PI / 2 - 0.4,
  radialProfile: [1, 1.008, 0.995, 1.004, 1.011, 0.997, 0.992, 1.006, 1.003, 0.996, 1.009, 1],
};

const INTRO_PREVIEW_VARIANTS: IntroPreviewVariant[] = [
  INTRO_PREVIEW_DEFAULT_VARIANT,
  {
    radiusScale: 1.018,
    startAngle: -Math.PI / 2 + 0.8,
    radialProfile: [1, 1.018, 1.006, 0.992, 1.011, 1.004, 0.989, 1.016, 1.002, 0.994, 1.008, 1.014],
  },
  {
    radiusScale: 0.985,
    startAngle: -Math.PI / 2 - 1.2,
    radialProfile: [1, 0.994, 1.007, 1.013, 0.996, 0.989, 1.004, 1.011, 0.997, 0.992, 1.008, 1.003],
  },
];

const INTRO_PREVIEW_VARIANT_MS = INTRO_PREVIEW_DRAW_MS + INTRO_PREVIEW_HOLD_MS;
const INTRO_PREVIEW_TOTAL_MS = INTRO_PREVIEW_VARIANT_MS * INTRO_PREVIEW_VARIANTS.length;

export function useCircleGame() {
  const { drawStroke } = useStrokeRenderer();
  const introPreviewPoints = ref<StrokePoint[]>([]);
  const introPreviewRafId = ref<number | null>(null);
  const introPreviewStartAt = ref(0);

  function toStrokePoint(point: Point, pressure?: number): StrokePoint {
    return {
      x: point.x,
      y: point.y,
      time: performance.now(),
      pressure: pressure || 0.5,
    };
  }

  function createRoundResult(currentPoints: StrokePoint[]): RoundResult {
    const completionMetrics = getStrokeCompletionMetrics(currentPoints, logicalSize.value, GUIDE_RADIUS_FACTOR);
    const score = calculateLiveScore(currentPoints, logicalSize.value, GUIDE_RADIUS_FACTOR, SCORE_WEIGHT_CLOSURE);

    if (score === null || !completionMetrics) {
      incrementLabelRotation();
      return {
        score: 0,
        label: ERROR_LABEL_INVALID_FORM(),
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
    }

    if (completionMetrics.closureError > FINAL_CLOSURE_ERROR_THRESHOLD) {
      incrementLabelRotation();
      return {
        score: 0,
        label: ERROR_LABEL_CLOSURE(),
        radialError: 1,
        radiusFitError: 1,
        closureError: completionMetrics.closureError,
        directionChangeError: 0,
        timeoutError: 0,
        centerFailureError: 0,
        guideSizeFailureError: 0,
        coverageFailureError: 0,
        coverageDegrees: completionMetrics.coverageDegrees,
      };
    }

    if (ENABLE_SCORE_DEBUG) {
      console.debug("circle-score-live-final", {
        score,
        completionMetrics,
        note: "final-score uses calculateLiveScore()",
      });
    }

    incrementLabelRotation();

    return {
      score,
      label: getLabel(score),
      radialError: 0,
      radiusFitError: 0,
      closureError: completionMetrics.closureError,
      directionChangeError: 0,
      timeoutError: 0,
      centerFailureError: 0,
      guideSizeFailureError: 0,
      coverageFailureError: 0,
      coverageDegrees: completionMetrics.coverageDegrees,
    };
  }

  const {
    canvasEl,
    logicalSize,
    setCanvasWrapEl,
    setCanvasEl,
    configureCanvas,
    redraw,
    pointFromPointer,
  } = useCanvasRenderer({
    getPoints: () => {
      if (!hasStarted.value && !isDrawing.value && !result.value) {
        return introPreviewPoints.value;
      }

      return points.value;
    },
    getIsDrawing: () => isDrawing.value,
    getRoundStartAt: () => roundStartAt.value,
    getStrokeWidthScale: () => {
      if (!hasStarted.value && !isDrawing.value && !result.value) {
        return INTRO_PREVIEW_STROKE_WIDTH_SCALE;
      }

      return 1;
    },
    guideRadiusFactor: GUIDE_RADIUS_FACTOR,
    guideFadeOutMs: GUIDE_FADE_OUT_MS,
    drawStroke,
  });

  const {
    points,
    isDrawing,
    result,
    hasStarted,
    roundStartAt,
    roundTimeLeftMs,
    clearRoundTimeout,
    clearRoundTick,
    startGame,
    startRound,
    moveRound,
    endRound,
    resetRound,
    resetToStartScreen,
    resetForResize,
  } = useRoundLifecycle({
    canvasEl,
    roundTimeoutMs: ROUND_TIMEOUT_MS,
    directionMinSegment: DIRECTION_MIN_SEGMENT,
    directionMinAngleDelta: DIRECTION_MIN_ANGLE_DELTA,
    directionMinAngleDeltaFloor: DIRECTION_MIN_ANGLE_DELTA_FLOOR,
    directionMinAngleDeltaRatio: DIRECTION_MIN_ANGLE_DELTA_RATIO,
    directionMinCenterDistanceFactor: DIRECTION_MIN_CENTER_DISTANCE_FACTOR,
    directionOppositeStreakToAbort: DIRECTION_OPPOSITE_STREAK_TO_ABORT,
    getLogicalSize: () => logicalSize.value,
    pointFromPointer,
    toStrokePoint,
    redraw,
    evaluateRound: createRoundResult,
  });

  const hasResult = computed(() => Boolean(result.value));
  const timerProgress = computed(() => clamp(roundTimeLeftMs.value / ROUND_TIMEOUT_MS, 0, 1));
  const timerDashoffset = computed(() => String(TIMER_RING_CIRCUMFERENCE * (1 - timerProgress.value)));
  const timerText = computed(() => `${(roundTimeLeftMs.value / 1000).toFixed(1)}s`);
  const scoreDisplayText = computed(() => {
    if (result.value) {
      return `${result.value.score.toFixed(1)}%`;
    }

    if (!isDrawing.value) {
      return hasStarted.value ? "0%" : "";
    }

    const liveScore = calculateLiveScore(points.value, logicalSize.value, GUIDE_RADIUS_FACTOR, SCORE_WEIGHT_CLOSURE);
    if (liveScore === null) return "0%";
    return `${liveScore.toFixed(1)}%`;
  });

  function handleResize() {
    resetForResize();
    configureCanvas();
  }

  function lerp(from: number, to: number, amount: number) {
    return from + (to - from) * amount;
  }

  function sampleRadialProfile(profile: number[], ratio: number) {
    if (!profile.length) return 1;

    const wrapped = ((ratio % 1) + 1) % 1;
    const scaledIndex = wrapped * profile.length;
    const fromIndex = Math.floor(scaledIndex) % profile.length;
    const toIndex = (fromIndex + 1) % profile.length;
    const blend = scaledIndex - Math.floor(scaledIndex);

    const fromValue = profile[fromIndex] ?? 1;
    const toValue = profile[toIndex] ?? fromValue;

    return lerp(fromValue, toValue, blend);
  }

  function buildIntroPreviewPoints(size: number, progress: number, now: number, variant: IntroPreviewVariant): StrokePoint[] {
    const clampedProgress = clamp(progress, 0, 1);
    const templatePoints = buildIntroPreviewTemplatePoints(size, variant);
    const visiblePointCount = Math.max(2, Math.floor(templatePoints.length * clampedProgress));
    const visiblePoints = templatePoints.slice(0, visiblePointCount);

    return visiblePoints.map((point, index) => ({
      ...point,
      // Keep stable timing deltas so stroke width/color do not jitter between frames.
      time: now - (visiblePoints.length - index) * 9,
    }));
  }

  function buildIntroPreviewTemplatePoints(size: number, variant: IntroPreviewVariant): StrokePoint[] {
    const pointsOut: StrokePoint[] = [];

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * GUIDE_RADIUS_FACTOR * variant.radiusScale;
    const startAngle = variant.startAngle;
    const sweep = Math.PI * 2;
    const segmentCount = INTRO_PREVIEW_TOTAL_POINTS;

    for (let index = 0; index <= segmentCount; index++) {
      const ratio = index / segmentCount;
      const theta = startAngle + sweep * ratio;
      const radialScale = sampleRadialProfile(variant.radialProfile, ratio);
      const radius = baseRadius * radialScale;

      pointsOut.push({
        x: centerX + Math.cos(theta) * radius,
        y: centerY + Math.sin(theta) * radius,
        time: index * 9,
      });
    }

    return pointsOut;
  }

  function stopIntroPreviewLoop() {
    if (introPreviewRafId.value !== null) {
      cancelAnimationFrame(introPreviewRafId.value);
      introPreviewRafId.value = null;
    }
  }

  function runIntroPreviewLoop(now: number) {
    if (hasStarted.value) {
      introPreviewPoints.value = [];
      redraw();
      stopIntroPreviewLoop();
      return;
    }

    if (logicalSize.value > 0) {
      const elapsed = now - introPreviewStartAt.value;
      const loopPhase = ((elapsed % INTRO_PREVIEW_TOTAL_MS) + INTRO_PREVIEW_TOTAL_MS) % INTRO_PREVIEW_TOTAL_MS;
      const variantIndex = Math.min(
        INTRO_PREVIEW_VARIANTS.length - 1,
        Math.floor(loopPhase / INTRO_PREVIEW_VARIANT_MS),
      );
      const variantPhase = loopPhase - variantIndex * INTRO_PREVIEW_VARIANT_MS;
      const activeVariant = INTRO_PREVIEW_VARIANTS[variantIndex] ?? INTRO_PREVIEW_DEFAULT_VARIANT;

      if (variantPhase <= INTRO_PREVIEW_DRAW_MS) {
        const progress = variantPhase / INTRO_PREVIEW_DRAW_MS;
        introPreviewPoints.value = buildIntroPreviewPoints(logicalSize.value, progress, now, activeVariant);
      } else {
        introPreviewPoints.value = buildIntroPreviewPoints(logicalSize.value, 1, now, activeVariant);
      }

      redraw();
    }

    introPreviewRafId.value = requestAnimationFrame(runIntroPreviewLoop);
  }

  function startIntroPreviewLoop() {
    stopIntroPreviewLoop();
    introPreviewStartAt.value = performance.now();
    introPreviewRafId.value = requestAnimationFrame(runIntroPreviewLoop);
  }

  onMounted(() => {
    configureCanvas();
    startIntroPreviewLoop();
    window.addEventListener("resize", handleResize, { passive: true });
  });

  watch(hasStarted, (started) => {
    if (started) {
      stopIntroPreviewLoop();
      introPreviewPoints.value = [];
      return;
    }

    startIntroPreviewLoop();
  });

  onBeforeUnmount(() => {
    clearRoundTimeout();
    clearRoundTick();
    stopIntroPreviewLoop();
    window.removeEventListener("resize", handleResize);
  });

  return {
    setCanvasWrapEl,
    setCanvasEl,
    hasStarted,
    isDrawing,
    hasResult,
    scoreDisplayText,
    roundTimeLeftMs,
    timerText,
    timerDashoffset,
    startGame,
    startRound,
    moveRound,
    endRound,
    resetRound,
    resetToStartScreen,
    result,
  };
}