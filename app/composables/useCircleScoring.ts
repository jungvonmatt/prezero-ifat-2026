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

let labelRotationIndex = 0;

export function incrementLabelRotation() {
  labelRotationIndex++;
}

export function getLabelRotationIndex() {
  return labelRotationIndex;
}

export function getLabel(score: number) {
  const variants = getLabelVariants(score);
  const index = labelRotationIndex % 3;
  return variants[index];
}

function getLabelVariants(score: number): string[] {
  if (score >= 100)
    return [
      '100 percent circular economy! You closed the circle perfectly. That is exactly our mission at PreZero.',
      'Perfection achieved! A seamless loop is the key to a world without resource loss.',
      'A true sustainability masterpiece. You have proven that the perfect circle is possible.',
    ];
  if (score >= 90)
    return [
      'An almost perfect loop! You are incredibly close to our vision of complete resource preservation.',
      'Outstanding! This is what circular economy looks like just before perfection. No gaps, only valuable raw materials kept in the cycle.',
      'Fantastic! You understood the mission. Together, we close the loop for a better tomorrow.',
    ];
  if (score >= 80)
    return [
      'Almost there! With this level of precision, you help preserve valuable raw materials for the future.',
      "Impressive! Only the world's most efficient recycling systems come this close to a closed loop today.",
      'Great job! Your circle is nearly seamless. A strong sign of true resource protection.',
    ];
  if (score >= 70)
    return [
      'Real expert level! With this result, you bring valuable materials safely back into the cycle.',
      'Outstanding! This kind of precision helps protect important resources from going to waste.',
      'Almost perfect! Today, only the most advanced sorting facilities worldwide achieve this level of quality.',
    ];
  if (score >= 60)
    return [
      'Excellent! You have really got the hang of it. This is exactly the kind of precision we need for the future.',
      'Superb! Just as steady as your curve, we want to keep valuable raw materials flowing in the loop.',
      'Really strong work. You are well on your way.',
    ];
  if (score >= 50)
    return [
      'Strong performance! You understood the principle of circular economy. Now it is all about the finer details.',
      'A solid result! Just like in your drawing, every detail matters in the sorting plant.',
      'Impressive! You are showing real finesse, and that is an essential requirement for high-quality recycling.',
    ];
  if (score >= 40)
    return [
      'You are getting closer to the right shape! Now it is getting exciting as you push toward expert level.',
      'The foundation is there. Now every detail counts to keep the material stream clean.',
      'The momentum is right. Now hold the curve and close the gap in the system.',
    ];
  if (score >= 30)
    return [
      'A good approach, but a significant share of resources is still being lost. Try again!',
      'You are on the right track. Just a little more precision and the loop will come together.',
      'The foundation is there. Now all you need is the right finishing touch.',
    ];
  if (score >= 20)
    return [
      'Not bad, but your loop still has a few leaks. Close them!',
      'You understood the basic idea. Now all that is missing is a bit more finesse.',
      'A decent start overall. After all, we want to close the circle completely. Give it another try!',
    ];
  if (score >= 10)
    return [
      'There is still plenty of room for improvement! Build up momentum and close the circle on your next attempt.',
      'The first step is done. Now stay focused and find the right curve.',
      'The direction is right, but the line is still a little shaky. Concentrate!',
    ];
  return [
    'Every beginning is difficult. Start again and give it more shape!',
    'Every cycle begins with the first movement. Try again right away.',
    'Do not lose heart. Every expert started small.',
  ];
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
  const coverageProgress = clamp(coverageDegrees / 360, 0, 1);
  const closureWeight = closureWeightBase * coverageProgress * coverageProgress;

  const liveError = clamp(radiusFitError * 0.62 + radialError * 0.3 + closureError * closureWeight, 0, 1);
  const liveScore = Math.pow(1 - liveError, 2.0) * 100;

  return clamp(liveScore, 0, 100);
}
