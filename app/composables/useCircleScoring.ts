import type { StrokePoint } from './useStrokeRenderer';

export interface Point {
  x: number;
  y: number;
}

export interface RoundResult {
  score: number;
  label: string | undefined;
  radialError: number;
  radiusFitError: number;
  circularityError: number;
  closureError: number;
  directionChangeError: number;
  timeoutError: number;
  centerFailureError: number;
  guideSizeFailureError: number;
  coverageFailureError: number;
  coverageDegrees: number;
}

export interface StrokeCompletionMetrics {
  closureError: number;
  coverageDegrees: number;
  rawCoverageDegrees: number;
}

export interface ScoreComponents {
  score: number;
  radialError: number;
  radiusFitError: number;
  circularityError: number;
  closureError: number;
  coverageDegrees: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAngleDelta(delta: number) {
  if (delta > Math.PI) return delta - Math.PI * 2;
  if (delta < -Math.PI) return delta + Math.PI * 2;
  return delta;
}

export const ERROR_LABEL_INVALID_FORM = () => 'Draw a circle to get a score.';
export const ERROR_LABEL_CLOSURE = () => 'Close the circle!';
export const ERROR_LABEL_DIRECTION = () => 'Avoid direction changes!';
export const ERROR_LABEL_TIMEOUT = () => 'Draw faster!';
export const ERROR_LABEL_TOO_SMALL = () => 'Draw a bigger circle!';

const SCORE_WEIGHT_RADIUS_FIT = 0.42;
const SCORE_WEIGHT_RADIAL = 0.22;
const SCORE_WEIGHT_CIRCULARITY = 0.28;

let labelRotationIndex = 0;

export function incrementLabelRotation() {
  labelRotationIndex++;
}

export function getLabelRotationIndex() {
  return labelRotationIndex;
}

export function getLabel(score: number): string {
  if (score >= 100)
    return 'A flawless loop! You’ve demonstrated the excellence required for true resource circularity.';
  if (score >= 90) return 'Excellent! Almost there! This level of accuracy is key to maximizing resource efficiency.';
  if (score >= 80) return 'Impressive! High-precision sorting is essential for sustainable resource management.';
  if (score >= 70) return 'Great job! A solid foundation for keeping valuable materials within the loop.';
  return 'Great start! Every successful loop depends on the right momentum.';
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

  if (
    lastPoint &&
    (!previousFilteredPoint || previousFilteredPoint.x !== lastPoint.x || previousFilteredPoint.y !== lastPoint.y)
  ) {
    filteredPoints.push({ x: lastPoint.x, y: lastPoint.y });
  }

  return filteredPoints;
}

function calculateCircularityError(points: Point[]): number | null {
  if (points.length < 4) return null;

  let twiceArea = 0;
  let perimeter = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    if (!current || !next) continue;

    twiceArea += current.x * next.y - next.x * current.y;
    perimeter += Math.hypot(next.x - current.x, next.y - current.y);
  }

  if (!Number.isFinite(perimeter) || perimeter <= 0.0001) return null;

  const area = Math.abs(twiceArea) / 2;
  const circularity = clamp((4 * Math.PI * area) / (perimeter * perimeter), 0, 1);
  return clamp(1 - circularity, 0, 1);
}

export function getStrokeCompletionMetrics(
  rawStrokePoints: StrokePoint[],
  logicalSize: number,
  guideRadiusFactor: number
): StrokeCompletionMetrics | null {
  if (logicalSize <= 0) return null;

  const rawPoints = getScoringPoints(rawStrokePoints);
  if (rawPoints.length < 4) return null;

  const guideCenterX = logicalSize / 2;
  const guideCenterY = logicalSize / 2;
  const targetRadius = logicalSize * guideRadiusFactor;
  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];

  if (!first || !last || targetRadius <= 0) return null;

  const closureGap = Math.hypot(last.x - first.x, last.y - first.y);
  const closureError = closureGap / Math.max(targetRadius, 0.0001);

  let signedCoverage = 0;
  for (let index = 1; index < rawPoints.length; index += 1) {
    const prev = rawPoints[index - 1];
    const current = rawPoints[index];
    if (!prev || !current) continue;

    const prevAngle = Math.atan2(prev.y - guideCenterY, prev.x - guideCenterX);
    const currentAngle = Math.atan2(current.y - guideCenterY, current.x - guideCenterX);
    signedCoverage += normalizeAngleDelta(currentAngle - prevAngle);
  }

  const rawCoverageDegrees = Math.abs((signedCoverage * 180) / Math.PI);
  const coverageDegrees = Math.min(360, rawCoverageDegrees);

  return {
    closureError,
    coverageDegrees,
    rawCoverageDegrees,
  };
}

export function calculateLiveScore(
  rawStrokePoints: StrokePoint[],
  logicalSize: number,
  guideRadiusFactor: number,
  closureWeightBase = 0.1
): number | null {
  const scoreComponents = calculateScoreComponents(rawStrokePoints, logicalSize, guideRadiusFactor, closureWeightBase);
  return scoreComponents?.score ?? null;
}

export function calculateScoreComponents(
  rawStrokePoints: StrokePoint[],
  logicalSize: number,
  guideRadiusFactor: number,
  closureWeightBase = 0.1
): ScoreComponents | null {
  if (logicalSize <= 0) return null;

  const rawPoints = getScoringPoints(rawStrokePoints);
  if (rawPoints.length < 4) return null;

  const guideCenterX = logicalSize / 2;
  const guideCenterY = logicalSize / 2;
  const targetRadius = logicalSize * guideRadiusFactor;
  const distances = rawPoints.map(point => Math.hypot(point.x - guideCenterX, point.y - guideCenterY));
  const avgRadius = distances.reduce((sum, value) => sum + value, 0) / distances.length;

  if (!Number.isFinite(avgRadius) || avgRadius <= 0) return null;

  const radiusFitError =
    distances.reduce((accumulator, radius) => {
      return accumulator + Math.abs(radius - targetRadius) / Math.max(targetRadius, 0.0001);
    }, 0) / distances.length;

  const variance =
    distances.reduce((accumulator, radius) => {
      return accumulator + (radius - avgRadius) ** 2;
    }, 0) / distances.length;
  const radialError = Math.sqrt(variance) / Math.max(targetRadius, 0.0001);

  const completionMetrics = getStrokeCompletionMetrics(rawStrokePoints, logicalSize, guideRadiusFactor);
  if (!completionMetrics) return null;

  const { closureError, coverageDegrees } = completionMetrics;
  const circularityError = calculateCircularityError(rawPoints);
  if (circularityError === null) return null;

  const coverageProgress = clamp(coverageDegrees / 360, 0, 1);
  const closureWeight = closureWeightBase * coverageProgress * coverageProgress;
  const circularityWeight = SCORE_WEIGHT_CIRCULARITY * coverageProgress;
  const liveError = clamp(
    radiusFitError * SCORE_WEIGHT_RADIUS_FIT +
      radialError * SCORE_WEIGHT_RADIAL +
      circularityError * circularityWeight +
      closureError * closureWeight,
    0,
    1
  );
  const score = clamp(Math.pow(1 - liveError, 2.0) * 100, 0, 100);

  return {
    score,
    radialError,
    radiusFitError,
    circularityError,
    closureError,
    coverageDegrees,
  };
}
