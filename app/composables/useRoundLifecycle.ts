import { ref, type Ref } from "vue";
import type { Point, RoundResult } from "./useCircleScoring";
import { clamp, normalizeAngleDelta, ERROR_LABEL_DIRECTION, ERROR_LABEL_TIMEOUT, incrementLabelRotation } from "./useCircleScoring";
import type { StrokePoint } from "./useStrokeRenderer";

interface UseRoundLifecycleOptions {
  canvasEl: Ref<HTMLCanvasElement | null>;
  roundTimeoutMs: number;
  directionMinSegment: number;
  directionMinAngleDelta: number;
  directionMinAngleDeltaFloor: number;
  directionMinAngleDeltaRatio: number;
  directionMinCenterDistanceFactor: number;
  directionOppositeStreakToAbort: number;
  getLogicalSize: () => number;
  pointFromPointer: (event: PointerEvent) => Point | null;
  toStrokePoint: (point: Point, pressure?: number) => StrokePoint;
  redraw: () => void;
  evaluateRound: (points: StrokePoint[]) => RoundResult;
}

export function useRoundLifecycle(options: UseRoundLifecycleOptions) {
  const points = ref<StrokePoint[]>([]);
  const isDrawing = ref(false);
  const activePointerId = ref<number | null>(null);
  const result = ref<RoundResult | null>(null);
  const hasStarted = ref(false);
  const rotationDirection = ref<-1 | 0 | 1>(0);
  const oppositeTurnStreak = ref(0);
  const roundTimeoutId = ref<number | null>(null);
  const roundTickId = ref<number | null>(null);
  const roundStartAt = ref<number | null>(null);
  const roundTimeLeftMs = ref(options.roundTimeoutMs);

  function releasePointerCapture(pointerId: number) {
    const canvas = options.canvasEl.value;
    if (!canvas || !canvas.hasPointerCapture(pointerId)) return;
    canvas.releasePointerCapture(pointerId);
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
    roundTimeLeftMs.value = options.roundTimeoutMs;
  }

  function startRoundTick(pointerId: number) {
    clearRoundTick();
    roundStartAt.value = performance.now();
    roundTimeLeftMs.value = options.roundTimeoutMs;

    roundTickId.value = window.setInterval(() => {
      if (!isDrawing.value || activePointerId.value !== pointerId || roundStartAt.value === null) return;

      const elapsed = performance.now() - roundStartAt.value;
      roundTimeLeftMs.value = clamp(options.roundTimeoutMs - elapsed, 0, options.roundTimeoutMs);
      options.redraw();
    }, 50);
  }

  function resetTransientState() {
    isDrawing.value = false;
    activePointerId.value = null;
    rotationDirection.value = 0;
    oppositeTurnStreak.value = 0;
  }

  function abortRoundForDirectionChange(pointerId: number) {
    if (!options.canvasEl.value) return;

    clearRoundTimeout();
    clearRoundTick();
    resetRoundClock();
    resetTransientState();
    releasePointerCapture(pointerId);
    incrementLabelRotation();

    result.value = {
      score: 0,
      label: ERROR_LABEL_DIRECTION(),
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
    if (!options.canvasEl.value) return;

    clearRoundTimeout();
    clearRoundTick();
    roundTimeLeftMs.value = 0;
    resetTransientState();
    releasePointerCapture(pointerId);
    incrementLabelRotation();

    result.value = {
      score: 0,
      label: ERROR_LABEL_TIMEOUT(),
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

  function startRoundTimeout(pointerId: number) {
    clearRoundTimeout();
    roundTimeoutId.value = window.setTimeout(() => {
      if (!isDrawing.value || activePointerId.value !== pointerId) return;
      abortRoundForTimeout(pointerId);
    }, options.roundTimeoutMs);
  }

  function startGame() {
    hasStarted.value = true;
    resetRound();
  }

  function startRound(event: PointerEvent) {
    if (!hasStarted.value || result.value) return;

    const point = options.pointFromPointer(event);
    const canvas = options.canvasEl.value;
    if (!point || !canvas) return;

    const strokePoint = options.toStrokePoint(point, event.pressure);

    isDrawing.value = true;
    activePointerId.value = event.pointerId;
    rotationDirection.value = 0;
    oppositeTurnStreak.value = 0;
    points.value = [strokePoint];
    canvas.setPointerCapture(event.pointerId);
    startRoundTick(event.pointerId);
    startRoundTimeout(event.pointerId);
    options.redraw();
  }

  function processMovePoint(pointerEvent: PointerEvent): boolean {
    const point = options.pointFromPointer(pointerEvent);
    if (!point) return true;

    const logicalSize = options.getLogicalSize();
    const pointCount = points.value.length;
    if (pointCount >= 1 && logicalSize > 0) {
      const prev = points.value[pointCount - 1];

      if (prev) {
        const dx = point.x - prev.x;
        const dy = point.y - prev.y;
        const segmentLength = Math.hypot(dx, dy);

        if (segmentLength >= options.directionMinSegment) {
          const guideCenterX = logicalSize / 2;
          const guideCenterY = logicalSize / 2;
          const minCenterDistance = logicalSize * options.directionMinCenterDistanceFactor;
          const prevDistanceToCenter = Math.hypot(prev.x - guideCenterX, prev.y - guideCenterY);
          const currentDistanceToCenter = Math.hypot(point.x - guideCenterX, point.y - guideCenterY);

          if (prevDistanceToCenter >= minCenterDistance && currentDistanceToCenter >= minCenterDistance) {
            const prevAngle = Math.atan2(prev.y - guideCenterY, prev.x - guideCenterX);
            const currentAngle = Math.atan2(point.y - guideCenterY, point.x - guideCenterX);
            const angleDelta = normalizeAngleDelta(currentAngle - prevAngle);
            const averageDistanceToCenter = (prevDistanceToCenter + currentDistanceToCenter) / 2;
            const expectedAngleDelta = segmentLength / Math.max(averageDistanceToCenter, 0.0001);
            const adaptiveMinAngleDelta = expectedAngleDelta * options.directionMinAngleDeltaRatio;
            const minAngleDelta = clamp(adaptiveMinAngleDelta, options.directionMinAngleDeltaFloor, options.directionMinAngleDelta);

            if (Math.abs(angleDelta) >= minAngleDelta) {
              const nextDirection: -1 | 1 = angleDelta > 0 ? 1 : -1;

              if (rotationDirection.value === 0) {
                rotationDirection.value = nextDirection;
                oppositeTurnStreak.value = 0;
              } else if (rotationDirection.value !== nextDirection) {
                oppositeTurnStreak.value += 1;
                if (oppositeTurnStreak.value >= options.directionOppositeStreakToAbort) {
                  abortRoundForDirectionChange(pointerEvent.pointerId);
                  return false;
                }
              } else {
                oppositeTurnStreak.value = 0;
              }
            }
          }
        }
      }
    }

    const strokePoint = options.toStrokePoint(point, pointerEvent.pressure);
    points.value.push(strokePoint);
    return true;
  }

  function moveRound(event: PointerEvent) {
    if (!isDrawing.value || activePointerId.value !== event.pointerId) return;

    const coalescedEvents = event.getCoalescedEvents?.() ?? [event];
    for (const coalescedEvent of coalescedEvents) {
      if (!processMovePoint(coalescedEvent)) return;
    }
    options.redraw();
  }

  function endRound(event: PointerEvent) {
    if (!isDrawing.value || activePointerId.value !== event.pointerId || !options.canvasEl.value) return;

    clearRoundTimeout();
    clearRoundTick();
    resetRoundClock();
    resetTransientState();
    releasePointerCapture(event.pointerId);
    result.value = options.evaluateRound(points.value);
  }

  function resetRound() {
    clearRoundTimeout();
    clearRoundTick();
    resetRoundClock();
    points.value = [];
    result.value = null;
    resetTransientState();
    options.redraw();
  }

  function resetToStartScreen() {
    hasStarted.value = false;
    resetRound();
  }

  function resetForResize() {
    clearRoundTimeout();
    clearRoundTick();
    resetRoundClock();
    points.value = [];
    result.value = null;
    hasStarted.value = false;
    resetTransientState();
  }

  return {
    points,
    isDrawing,
    activePointerId,
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
  };
}