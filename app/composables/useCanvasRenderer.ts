import { ref, type ComponentPublicInstance } from "vue";
import { clamp } from "./useCircleScoring";
import { getCssVar } from "./getCssVar";
import type { Point } from "./useCircleScoring";
import type { DrawContext, StrokePoint } from "./useStrokeRenderer";

interface UseCanvasRendererOptions {
  getPoints: () => StrokePoint[];
  getIsDrawing: () => boolean;
  getRoundStartAt: () => number | null;
  getStrokeWidthScale?: () => number;
  guideRadiusFactor: number;
  guideFadeOutMs: number;
  drawStroke: (ctx: CanvasRenderingContext2D, points: StrokePoint[], drawContext: DrawContext) => void;
}

export function useCanvasRenderer(options: UseCanvasRendererOptions) {
  const canvasWrapEl = ref<HTMLDivElement | null>(null);
  const canvasEl = ref<HTMLCanvasElement | null>(null);
  const logicalSize = ref(0);
  let ctx: CanvasRenderingContext2D | null = null;
  let dpr = 1;

  function setCanvasWrapEl(value: Element | ComponentPublicInstance | null) {
    canvasWrapEl.value = value as HTMLDivElement | null;
  }

  function setCanvasEl(value: Element | ComponentPublicInstance | null) {
    canvasEl.value = value as HTMLCanvasElement | null;
  }

  function configureCanvas() {
    if (!canvasWrapEl.value || !canvasEl.value) return;

    // Use layout dimensions (pre-transform) so logical canvas size stays stable even when the whole app is scaled.
    const wrapWidth = canvasWrapEl.value.clientWidth;
    const wrapHeight = canvasWrapEl.value.clientHeight || wrapWidth;
    const nextLogicalSize = Math.floor(Math.min(wrapWidth, wrapHeight));
    if (nextLogicalSize <= 0) return;

    logicalSize.value = nextLogicalSize;
    dpr = window.devicePixelRatio || 1;

    canvasEl.value.style.width = `${logicalSize.value}px`;
    canvasEl.value.style.height = `${logicalSize.value}px`;

    canvasEl.value.width = Math.floor(logicalSize.value * dpr);
    canvasEl.value.height = Math.floor(logicalSize.value * dpr);

    ctx = canvasEl.value.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  let redrawRafId: number | null = null;

  function scheduleRedraw() {
    if (redrawRafId !== null) return;
    redrawRafId = requestAnimationFrame(() => {
      redrawRafId = null;
      redraw();
    });
  }

  function redraw() {
    if (!ctx || !logicalSize.value) return;

    ctx.clearRect(0, 0, logicalSize.value, logicalSize.value);
    ctx.fillStyle = getCssVar("--core-color-bg", "#013c4a");
    ctx.fillRect(0, 0, logicalSize.value, logicalSize.value);

    const centerX = logicalSize.value / 2;
    const centerY = logicalSize.value / 2;
    const targetRadius = logicalSize.value * options.guideRadiusFactor;
    const points = options.getPoints();
    const isDrawing = options.getIsDrawing();
    const roundStartAt = options.getRoundStartAt();
    const idleGuideVisible = !isDrawing && points.length === 0;
    const drawingGuideVisible = isDrawing && roundStartAt !== null;
    const guideOpacity = idleGuideVisible
      ? 1
      : drawingGuideVisible
        ? clamp(1 - (performance.now() - roundStartAt) / options.guideFadeOutMs, 0, 1)
        : 0;

    ctx.strokeStyle = getCssVar("--color-off-white", "#f0f0f0");

    ctx.save();
    ctx.globalAlpha = guideOpacity;
    ctx.lineWidth = 1;
    ctx.setLineDash([40, 40]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, targetRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (points.length > 1) {
      const drawContext: DrawContext = {
        centerX,
        centerY,
        targetRadius,
        strokeWidthScale: clamp(options.getStrokeWidthScale ? options.getStrokeWidthScale() : 1, 0.25, 4),
      };
      options.drawStroke(ctx, points, drawContext);
    }
  }

  function pointFromPointer(event: PointerEvent): Point | null {
    if (!canvasEl.value || !logicalSize.value) return null;

    const rect = canvasEl.value.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (logicalSize.value / rect.width);
    const y = (event.clientY - rect.top) * (logicalSize.value / rect.height);

    if (x < 0 || y < 0 || x > logicalSize.value || y > logicalSize.value) {
      return null;
    }

    return { x, y };
  }

  return {
    canvasWrapEl,
    canvasEl,
    logicalSize,
    setCanvasWrapEl,
    setCanvasEl,
    configureCanvas,
    redraw,
    scheduleRedraw,
    pointFromPointer,
  };
}