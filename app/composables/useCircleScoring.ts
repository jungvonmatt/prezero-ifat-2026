import type { StrokePoint } from "./useStrokeRenderer";
import { useLocale } from "./useLocale";

const { t } = useLocale();

export interface Point {
  x: number;
  y: number;
}

export interface RoundResult {
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

export interface StrokeCompletionMetrics {
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

export const ERROR_LABEL_INVALID_FORM = () => t("errors.invalidForm");
export const ERROR_LABEL_CLOSURE = () => t("errors.closure");
export const ERROR_LABEL_DIRECTION = () => t("errors.direction");
export const ERROR_LABEL_TIMEOUT = () => t("errors.timeout");

export function getLabel(score: number) {
  if (score >= 98) return t("score.label98");
  if (score >= 92) return t("score.label92");
  if (score >= 82) return t("score.label82");
  if (score >= 70) return t("score.label70");
  if (score >= 55) return t("score.label55");
  return t("score.label0");
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

export function getStrokeCompletionMetrics(rawStrokePoints: StrokePoint[], logicalSize: number, guideRadiusFactor: number): StrokeCompletionMetrics | null {
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

  const coverageDegrees = Math.min(360, Math.abs((signedCoverage * 180) / Math.PI));

  return {
    closureError,
    coverageDegrees,
  };
}

export function calculateLiveScore(rawStrokePoints: StrokePoint[], logicalSize: number, guideRadiusFactor: number, closureWeightBase = 0.1): number | null {
  if (logicalSize <= 0) return null;

  const rawPoints = getScoringPoints(rawStrokePoints);
  if (rawPoints.length < 4) return null;

  const guideCenterX = logicalSize / 2;
  const guideCenterY = logicalSize / 2;
  const targetRadius = logicalSize * guideRadiusFactor;
  const distances = rawPoints.map((point) => Math.hypot(point.x - guideCenterX, point.y - guideCenterY));
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
  const coverageProgress = clamp(coverageDegrees / 360, 0, 1);
  const closureWeight = closureWeightBase * coverageProgress * coverageProgress;

  const liveError = clamp(radiusFitError * 0.62 + radialError * 0.3 + closureError * closureWeight, 0, 1);
  const liveScore = Math.pow(1 - liveError, 0.72) * 100;

  return clamp(liveScore, 0, 100);
}
