export type StrokeMode = "fixed" | "deviation" | "cinematic";

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
}

interface StrokeModeOption {
  value: StrokeMode;
  label: string;
  description: string;
}

const STROKE_COLOR = "--core-color-secondary-darkest";
const FIXED_WIDTH = 5;
const MIN_CINEMATIC_WIDTH = 2.5;
const MAX_CINEMATIC_WIDTH = 9.5;
const MAX_SPEED = 1.5;
const CINEMATIC_WIDTH_ALPHA_SLOW = 0.16;
const CINEMATIC_WIDTH_ALPHA_FAST = 0.05;
const CINEMATIC_COLOR_ALPHA_SLOW = 0.14;
const CINEMATIC_COLOR_ALPHA_FAST = 0.04;
const CINEMATIC_POINT_ALPHA_SLOW = 0.32;
const CINEMATIC_POINT_ALPHA_FAST = 0.1;
const CINEMATIC_START_COLOR = "#a5c814";
const CINEMATIC_START_HSB = { hue: 72, saturation: 90, brightness: 78 };
const CINEMATIC_END_COLOR = "#ff0000"; // not used directly, but defined for clarity
const CINEMATIC_END_HSB = { hue: 0, saturation: 100, brightness: 100 };

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

const CINEMATIC_START_HSL = hsbToHsl(CINEMATIC_START_HSB.hue, CINEMATIC_START_HSB.saturation, CINEMATIC_START_HSB.brightness);
const CINEMATIC_END_HSL = hsbToHsl(CINEMATIC_END_HSB.hue, CINEMATIC_END_HSB.saturation, CINEMATIC_END_HSB.brightness);

function getFixedWidth() {
  return FIXED_WIDTH;
}

function getSpeedRatio(from: StrokePoint, to: StrokePoint) {
  const duration = Math.max(to.time - from.time, 12);
  const speed = getDistance(from, to) / duration;
  return clamp(speed / MAX_SPEED, 0, 1);
}

function getCinematicWidth(from: StrokePoint, to: StrokePoint, pressure: number = 0.5) {
  const slowRatio = 1 - getSpeedRatio(from, to);
  const normalizedPressure = clamp(pressure, 0, 1);
  const pressureInfluence = (0.5 - normalizedPressure) * 0.18;
  const totalSlowness = clamp(slowRatio + pressureInfluence, 0, 1);
  const easedRatio = totalSlowness ** 1.1;

  return MIN_CINEMATIC_WIDTH + easedRatio * (MAX_CINEMATIC_WIDTH - MIN_CINEMATIC_WIDTH);
}

function getDeviationColor(point: StrokePoint, context: DrawContext) {
  const { centerX, centerY, targetRadius } = context;
  const distance = Math.hypot(point.x - centerX, point.y - centerY);
  const deviation = Math.abs(distance - targetRadius);
  const maxDeviation = targetRadius * 0.4;
  const deviationRatio = clamp(deviation / maxDeviation, 0, 1);

  // Grün (120°) → Rot (0°)
  const hue = Math.max(0, 120 - deviationRatio * 120);
  const saturation = clamp(50 + deviationRatio * 50, 50, 100);
  const lightness = 50;

  return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${lightness}%)`;
}

function getCinematicColorFromRatio(speedRatio: number) {
  const normalizedRatio = clamp(speedRatio, 0, 1);
  const boostedRatio = clamp(normalizedRatio * 1.35, 0, 1);

  if (boostedRatio <= 0.001) {
    return CINEMATIC_START_COLOR;
  }

  const hue = lerp(CINEMATIC_START_HSL.hue, CINEMATIC_END_HSL.hue, boostedRatio);
  const saturation = lerp(CINEMATIC_START_HSL.saturation, CINEMATIC_END_HSL.saturation, boostedRatio);
  const lightness = lerp(CINEMATIC_START_HSL.lightness, CINEMATIC_END_HSL.lightness, boostedRatio);

  return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
}

function getSegmentWidth(mode: StrokeMode, from: StrokePoint, to: StrokePoint) {
  if (mode === "cinematic") {
    const pressure = to.pressure || 0.5;
    return getCinematicWidth(from, to, pressure);
  }

  return getFixedWidth();
}

function getSegmentColor(mode: StrokeMode, from: StrokePoint, to: StrokePoint, context?: DrawContext) {
  if (mode === "deviation" && context) {
    return getDeviationColor(to, context);
  }

  if (mode === "cinematic") {
    return getCinematicColorFromRatio(getSpeedRatio(from, to));
  }

  return getCssVar(STROKE_COLOR, "#1f6f5d");
}

export function useStrokeProfiles() {
  const strokeModeOptions: StrokeModeOption[] = [
    {
      value: "fixed",
      label: "fix width & fix color",
      description: "Constant stroke width throughout the drawing.",
    },
    {
      value: "deviation",
      label: "fix width & deviation color",
      description: "Real-time visual feedback: green (perfect) → red (off-circle)",
    },
    {
      value: "cinematic",
      label: "natural width & speed color",
      description: "Natural speed+pressure rendering with smooth, realistic color transitions.",
    },
  ];

  function drawStroke(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    mode: StrokeMode,
    context?: DrawContext,
  ) {
    if (points.length < 2) {
      return;
    }

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    let previousWidth = getSegmentWidth(mode, points[0]!, points[1]!);
    let previousColor = getSegmentColor(mode, points[0]!, points[1]!, context);
    let smoothedSpeedRatio = getSpeedRatio(points[0]!, points[1]!);
    let renderX = points[0]!.x;
    let renderY = points[0]!.y;

    for (let index = 1; index < points.length; index++) {
      const from = points[index - 1];
      const to = points[index];

      if (!from || !to) {
        continue;
      }

      const targetSpeedRatio = getSpeedRatio(from, to);
      const currentWidth = getSegmentWidth(mode, from, to);
      const width =
        mode === "cinematic"
          ? lerp(previousWidth, currentWidth, lerp(CINEMATIC_WIDTH_ALPHA_SLOW, CINEMATIC_WIDTH_ALPHA_FAST, targetSpeedRatio))
          : (previousWidth + currentWidth) / 2;
      previousWidth = width;

      const currentColor =
        mode === "cinematic"
          ? (() => {
              const colorAlpha = lerp(CINEMATIC_COLOR_ALPHA_SLOW, CINEMATIC_COLOR_ALPHA_FAST, targetSpeedRatio);
              smoothedSpeedRatio = lerp(smoothedSpeedRatio, targetSpeedRatio, colorAlpha);
              return getCinematicColorFromRatio(smoothedSpeedRatio);
            })()
          : getSegmentColor(mode, from, to, context);

      const smoothedTo =
        mode === "cinematic"
          ? (() => {
              const pointAlpha = lerp(CINEMATIC_POINT_ALPHA_SLOW, CINEMATIC_POINT_ALPHA_FAST, targetSpeedRatio);
              return {
                x: lerp(renderX, to.x, pointAlpha),
                y: lerp(renderY, to.y, pointAlpha),
              };
            })()
          : { x: to.x, y: to.y };

      const distance = Math.hypot(smoothedTo.x - renderX, smoothedTo.y - renderY);

      if (distance < 0.35) {
        previousColor = currentColor;
        renderX = smoothedTo.x;
        renderY = smoothedTo.y;
        continue;
      }

      // Sanfter Farbübergang pro Segment statt harter Farbsprünge.
      const gradient = ctx.createLinearGradient(renderX, renderY, smoothedTo.x, smoothedTo.y);
      gradient.addColorStop(0, previousColor);
      gradient.addColorStop(1, currentColor);
      ctx.strokeStyle = gradient;

      // Normale Linie
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(renderX, renderY);
      ctx.lineTo(smoothedTo.x, smoothedTo.y);
      ctx.stroke();

      previousColor = currentColor;
      renderX = smoothedTo.x;
      renderY = smoothedTo.y;
    }
  }

  return {
    drawStroke,
    strokeModeOptions,
  };
}