import { getCssVar } from './getCssVar';

export interface StrokePoint {
  x: number;
  y: number;
  time: number;
  pressure?: number;
}

export interface DrawContext {
  centerX: number;
  centerY: number;
  targetRadius: number;
  strokeWidthScale?: number;
}

const MIN_STROKE_WIDTH = 2.5;
const MAX_STROKE_WIDTH = 9.5;
const MAX_SPEED = 1.5;
const STROKE_WIDTH_ALPHA_SLOW = 0.16;
const STROKE_WIDTH_ALPHA_FAST = 0.05;
const STROKE_COLOR_ALPHA_SLOW = 0.14;
const STROKE_COLOR_ALPHA_FAST = 0.04;
const STROKE_START_COLOR = getCssVar('--core-color-green', '#a5c814');
const STROKE_START_HSB = { hue: 72, saturation: 90, brightness: 78 };
const STROKE_END_HSB = { hue: 72, saturation: 90, brightness: 78 }; // We keep the same HSB values - no matter how fast a user is drawing

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(from: StrokePoint, to: StrokePoint) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function hsbToHsl(hue: number, saturation: number, brightness: number) {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp(saturation / 100, 0, 1);
  const b = clamp(brightness / 100, 0, 1);
  const lightness = b * (1 - s / 2);

  let hslSaturation = 0;
  if (lightness > 0 && lightness < 1) {
    hslSaturation = (b - lightness) / Math.min(lightness, 1 - lightness);
  }

  return {
    hue: h,
    saturation: clamp(hslSaturation * 100, 0, 100),
    lightness: clamp(lightness * 100, 0, 100),
  };
}

const STROKE_START_HSL = hsbToHsl(STROKE_START_HSB.hue, STROKE_START_HSB.saturation, STROKE_START_HSB.brightness);
const STROKE_END_HSL = hsbToHsl(STROKE_END_HSB.hue, STROKE_END_HSB.saturation, STROKE_END_HSB.brightness);

function getSpeedRatio(from: StrokePoint, to: StrokePoint) {
  const duration = Math.max(to.time - from.time, 12);
  const speed = getDistance(from, to) / duration;
  return clamp(speed / MAX_SPEED, 0, 1);
}

function getDynamicStrokeWidth(from: StrokePoint, to: StrokePoint, pressure: number = 0.5) {
  const slowRatio = 1 - getSpeedRatio(from, to);
  const normalizedPressure = clamp(pressure, 0, 1);
  const pressureInfluence = (0.5 - normalizedPressure) * 0.18;
  const totalSlowness = clamp(slowRatio + pressureInfluence, 0, 1);
  const easedRatio = totalSlowness ** 1.1;

  return MIN_STROKE_WIDTH + easedRatio * (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH);
}

function getDynamicStrokeColorFromRatio(speedRatio: number) {
  const normalizedRatio = clamp(speedRatio, 0, 1);
  const boostedRatio = clamp(normalizedRatio * 1.35, 0, 1);

  if (boostedRatio <= 0.001) {
    return STROKE_START_COLOR;
  }

  const hue = lerp(STROKE_START_HSL.hue, STROKE_END_HSL.hue, boostedRatio);
  const saturation = lerp(STROKE_START_HSL.saturation, STROKE_END_HSL.saturation, boostedRatio);
  const lightness = lerp(STROKE_START_HSL.lightness, STROKE_END_HSL.lightness, boostedRatio);

  return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
}

function getSegmentWidth(from: StrokePoint, to: StrokePoint) {
  const pressure = to.pressure ?? 0.5;
  return getDynamicStrokeWidth(from, to, pressure);
}

function getSegmentColor(from: StrokePoint, to: StrokePoint) {
  return getDynamicStrokeColorFromRatio(getSpeedRatio(from, to));
}

export function useStrokeRenderer() {
  function drawStroke(ctx: CanvasRenderingContext2D, points: StrokePoint[], _context?: DrawContext) {
    if (points.length < 2) {
      return;
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const strokeWidthScale = clamp(_context?.strokeWidthScale ?? 1, 0.25, 4);

    let previousWidth = getSegmentWidth(points[0]!, points[1]!);
    let previousColor = getSegmentColor(points[0]!, points[1]!);
    let smoothedSpeedRatio = getSpeedRatio(points[0]!, points[1]!);

    for (let index = 1; index < points.length; index++) {
      const from = points[index - 1];
      const to = points[index];

      if (!from || !to) {
        continue;
      }

      const targetSpeedRatio = getSpeedRatio(from, to);
      const currentWidth = getSegmentWidth(from, to);
      const width = lerp(
        previousWidth,
        currentWidth,
        lerp(STROKE_WIDTH_ALPHA_SLOW, STROKE_WIDTH_ALPHA_FAST, targetSpeedRatio)
      );
      previousWidth = width;

      const colorAlpha = lerp(STROKE_COLOR_ALPHA_SLOW, STROKE_COLOR_ALPHA_FAST, targetSpeedRatio);
      smoothedSpeedRatio = lerp(smoothedSpeedRatio, targetSpeedRatio, colorAlpha);
      const currentColor = getDynamicStrokeColorFromRatio(smoothedSpeedRatio);

      // Sanfter Farbübergang pro Segment statt harter Farbsprünge.
      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, previousColor);
      gradient.addColorStop(1, currentColor);
      ctx.strokeStyle = gradient;

      // Normale Linie
      ctx.lineWidth = width * strokeWidthScale;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      previousColor = currentColor;
    }
  }

  return {
    drawStroke,
  };
}
