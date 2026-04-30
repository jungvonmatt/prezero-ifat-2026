import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  calculateLiveScore,
  calculateScoreComponents,
  clamp,
  getLabel,
  ERROR_LABEL_INVALID_FORM,
  ERROR_LABEL_CLOSURE,
  ERROR_LABEL_DIRECTION,
  ERROR_LABEL_TIMEOUT,
  ERROR_LABEL_TOO_SMALL,
  incrementLabelRotation,
  type Point,
  type RoundResult,
} from './useCircleScoring';
import { useCanvasRenderer } from './useCanvasRenderer';
import { useRoundLifecycle } from './useRoundLifecycle';
import { useStrokeRenderer, type StrokePoint } from './useStrokeRenderer';

const ROUND_TIMEOUT_MS = 8000;
const GUIDE_RADIUS_FACTOR = 0.4;
const GUIDE_FADE_OUT_MS = 900;
const INTRO_PREVIEW_DRAW_MS = 2000;
const INTRO_PREVIEW_HOLD_MS = 3000;
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
const AUTO_COMPLETE_COVERAGE_DEGREES_THRESHOLD = 356;
const AUTO_COMPLETE_CLOSURE_ERROR_THRESHOLD = 0.2;
const HARD_STOP_COVERAGE_DEGREES = 365;
const MIN_CIRCLE_RADIUS_FACTOR = 0.2;
const ENABLE_SCORE_DEBUG = import.meta.dev;

interface IntroPreviewVariant {
  radiusScale: number;
  startAngle: number;
  radialProfile: number[];
}

const INTRO_PREVIEW_DEFAULT_VARIANT: IntroPreviewVariant = {
  radiusScale: 0.92,
  startAngle: -Math.PI / 2 - 0.4,
  // Gently drifts out on the right, slightly in on the bottom — one smooth wave
  radialProfile: [1, 1.06, 1.14, 1.2, 1.17, 1.09, 0.99, 0.87, 0.79, 0.77, 0.84, 0.93, 1],
};

const INTRO_PREVIEW_VARIANTS: IntroPreviewVariant[] = [
  INTRO_PREVIEW_DEFAULT_VARIANT,
  {
    radiusScale: 0.935,
    startAngle: -Math.PI / 2 + 0.8,
    // Slight inward drift on the left, fuller on the top-right
    radialProfile: [1, 1.07, 1.16, 1.2, 1.14, 1.03, 0.89, 0.77, 0.75, 0.82, 0.92, 1.0, 1],
  },
  {
    radiusScale: 0.91,
    startAngle: -Math.PI / 2 - 1.2,
    // Visible outward bulge on one side, pinch on the other
    radialProfile: [1, 1.05, 1.12, 1.19, 1.22, 1.15, 1.01, 0.85, 0.76, 0.74, 0.82, 0.93, 1],
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
      pressure: pressure ?? 0.5,
    };
  }

  function createRoundResult(currentPoints: StrokePoint[]): RoundResult {
    const scoreComponents = calculateScoreComponents(
      currentPoints,
      logicalSize.value,
      GUIDE_RADIUS_FACTOR,
      SCORE_WEIGHT_CLOSURE
    );

    if (!scoreComponents) {
      incrementLabelRotation();
      return {
        score: 0,
        label: ERROR_LABEL_INVALID_FORM(),
        radialError: 1,
        radiusFitError: 1,
        circularityError: 1,
        closureError: 1,
        directionChangeError: 0,
        timeoutError: 0,
        centerFailureError: 0,
        guideSizeFailureError: 0,
        coverageFailureError: 0,
        coverageDegrees: 0,
      };
    }

    const { score, closureError, coverageDegrees, radialError, radiusFitError, circularityError } = scoreComponents;

    const guideCenterX = logicalSize.value / 2;
    const guideCenterY = logicalSize.value / 2;
    const minRadius = logicalSize.value * MIN_CIRCLE_RADIUS_FACTOR;
    const avgRadius =
      currentPoints.reduce((sum, p) => sum + Math.hypot(p.x - guideCenterX, p.y - guideCenterY), 0) /
      currentPoints.length;
    if (avgRadius < minRadius) {
      incrementLabelRotation();
      return {
        score: 0,
        label: ERROR_LABEL_TOO_SMALL(),
        radialError: 1,
        radiusFitError: 1,
        circularityError: 1,
        closureError: 1,
        directionChangeError: 0,
        timeoutError: 0,
        centerFailureError: 0,
        guideSizeFailureError: 1,
        coverageFailureError: 0,
        coverageDegrees,
      };
    }

    if (closureError > FINAL_CLOSURE_ERROR_THRESHOLD) {
      incrementLabelRotation();
      return {
        score: 0,
        label: ERROR_LABEL_CLOSURE(),
        radialError: 1,
        radiusFitError: 1,
        circularityError: 1,
        closureError,
        directionChangeError: 0,
        timeoutError: 0,
        centerFailureError: 0,
        guideSizeFailureError: 0,
        coverageFailureError: 0,
        coverageDegrees,
      };
    }

    if (ENABLE_SCORE_DEBUG) {
      console.debug('circle-score-live-final', {
        score,
        radialError,
        radiusFitError,
        circularityError,
        closureError,
        coverageDegrees,
        note: 'final-score uses calculateScoreComponents()',
      });
    }

    incrementLabelRotation();

    return {
      score,
      label: getLabel(score),
      radialError,
      radiusFitError,
      circularityError,
      closureError,
      directionChangeError: 0,
      timeoutError: 0,
      centerFailureError: 0,
      guideSizeFailureError: 0,
      coverageFailureError: 0,
      coverageDegrees,
    };
  }

  const {
    canvasEl,
    logicalSize,
    setCanvasWrapEl,
    setCanvasEl,
    configureCanvas,
    redraw,
    scheduleRedraw,
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
    guideRadiusFactor: GUIDE_RADIUS_FACTOR,
    autoCompleteCoverageDegreesThreshold: AUTO_COMPLETE_COVERAGE_DEGREES_THRESHOLD,
    autoCompleteClosureErrorThreshold: AUTO_COMPLETE_CLOSURE_ERROR_THRESHOLD,
    hardStopCoverageDegrees: HARD_STOP_COVERAGE_DEGREES,
    minCircleRadiusFactor: MIN_CIRCLE_RADIUS_FACTOR,
    getLogicalSize: () => logicalSize.value,
    pointFromPointer,
    toStrokePoint,
    redraw,
    scheduleRedraw,
    evaluateRound: createRoundResult,
  });

  const hasResult = computed(() => Boolean(result.value));
  const isErrorResult = computed(() => {
    const label = result.value?.label;
    if (!label) return false;
    const errorLabels = new Set([
      ERROR_LABEL_INVALID_FORM(),
      ERROR_LABEL_CLOSURE(),
      ERROR_LABEL_DIRECTION(),
      ERROR_LABEL_TIMEOUT(),
      ERROR_LABEL_TOO_SMALL(),
    ]);
    return errorLabels.has(label);
  });
  const scoreDisplayText = computed(() => {
    if (result.value) {
      if (isErrorResult.value) return 'XX.X%';
      return `${result.value.score.toFixed(1)}%`;
    }

    if (!isDrawing.value) {
      return hasStarted.value ? '0%' : '';
    }

    const liveScore = calculateLiveScore(points.value, logicalSize.value, GUIDE_RADIUS_FACTOR, SCORE_WEIGHT_CLOSURE);
    if (liveScore === null) return '0%';
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

  function buildIntroPreviewPoints(
    size: number,
    progress: number,
    now: number,
    variant: IntroPreviewVariant
  ): StrokePoint[] {
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
    const canvasCenterX = size / 2;
    const canvasCenterY = size / 2;
    const baseRadius = size * GUIDE_RADIUS_FACTOR * variant.radiusScale;
    const startAngle = variant.startAngle;
    const sweep = Math.PI * 2;
    const segmentCount = INTRO_PREVIEW_TOTAL_POINTS;

    const rawPoints: { x: number; y: number }[] = [];
    for (let index = 0; index <= segmentCount; index++) {
      const ratio = index / segmentCount;
      const theta = startAngle + sweep * ratio;
      const radialScale = sampleRadialProfile(variant.radialProfile, ratio);
      const radius = baseRadius * radialScale;
      rawPoints.push({ x: Math.cos(theta) * radius, y: Math.sin(theta) * radius });
    }

    // Shift so the centroid of the distorted shape sits at the canvas center
    const centroidX = rawPoints.reduce((s, p) => s + p.x, 0) / rawPoints.length;
    const centroidY = rawPoints.reduce((s, p) => s + p.y, 0) / rawPoints.length;

    return rawPoints.map((p, index) => ({
      x: canvasCenterX + p.x - centroidX,
      y: canvasCenterY + p.y - centroidY,
      time: index * 9,
    }));
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
        Math.floor(loopPhase / INTRO_PREVIEW_VARIANT_MS)
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
    window.addEventListener('resize', handleResize, { passive: true });
  });

  watch(hasStarted, started => {
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
    window.removeEventListener('resize', handleResize);
  });

  return {
    setCanvasWrapEl,
    setCanvasEl,
    hasStarted,
    isDrawing,
    hasResult,
    isErrorResult,
    scoreDisplayText,
    startGame,
    startRound,
    moveRound,
    endRound,
    resetRound,
    resetToStartScreen,
    result,
  };
}
