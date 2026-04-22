import { computed, onBeforeUnmount, onMounted } from "vue";
import { calculateLiveScore, clamp, getLabel, getStrokeCompletionMetrics, ERROR_LABEL_INVALID_FORM, ERROR_LABEL_CLOSURE, type Point, type RoundResult } from "./useCircleScoring";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useRoundLifecycle } from "./useRoundLifecycle";
import { useStrokeRenderer, type StrokePoint } from "./useStrokeRenderer";

const ROUND_TIMEOUT_MS = 8000;
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 42;
const GUIDE_RADIUS_FACTOR = 0.45;
const GUIDE_FADE_OUT_MS = 900;
const SCORE_WEIGHT_CLOSURE = 0.1;
const FINAL_CLOSURE_ERROR_THRESHOLD = 0.1;
const DIRECTION_MIN_SEGMENT = 1;
const DIRECTION_MIN_ANGLE_DELTA = 0.02;
const DIRECTION_MIN_ANGLE_DELTA_FLOOR = 0.0012;
const DIRECTION_MIN_ANGLE_DELTA_RATIO = 0.35;
const DIRECTION_MIN_CENTER_DISTANCE_FACTOR = 0.12;
const DIRECTION_OPPOSITE_STREAK_TO_ABORT = 1;
const ENABLE_SCORE_DEBUG = import.meta.dev;

export function useCircleGame() {
  const { drawStroke } = useStrokeRenderer();

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
    getPoints: () => points.value,
    getIsDrawing: () => isDrawing.value,
    getRoundStartAt: () => roundStartAt.value,
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

    if (!isDrawing.value) return "";

    const liveScore = calculateLiveScore(points.value, logicalSize.value, GUIDE_RADIUS_FACTOR, SCORE_WEIGHT_CLOSURE);
    if (liveScore === null) return "0%";
    return `${liveScore.toFixed(1)}%`;
  });

  function handleResize() {
    resetForResize();
    configureCanvas();
  }

  onMounted(() => {
    configureCanvas();
    window.addEventListener("resize", handleResize, { passive: true });
  });

  onBeforeUnmount(() => {
    clearRoundTimeout();
    clearRoundTick();
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
    result,
  };
}