import { ref, type ComponentPublicInstance, type Ref } from "vue";
import { clamp } from "./useCircleScoring";
import { getCssVar } from "./getCssVar";
import type { Point } from "./useCircleScoring";
import type { DrawContext, StrokeMode, StrokePoint } from "./useStrokeProfiles";

interface UseCanvasRendererOptions {
  getPoints: () => StrokePoint[];
  getIsDrawing: () => boolean;
  getRoundStartAt: () => number | null;
  selectedStrokeMode: Ref<StrokeMode>;
  guideRadiusFactor: number;
  guideFadeOutMs: number;
  drawStroke: (ctx: CanvasRenderingContext2D, points: StrokePoint[], mode: StrokeMode, drawContext: DrawContext) => void;
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

    const rectWrap = canvasWrapEl.value.getBoundingClientRect();
    const nextLogicalSize = Math.floor(Math.min(rectWrap.width, rectWrap.height || rectWrap.width));
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

  function redraw() {
    if (!ctx || !logicalSize.value) return;

    ctx.clearRect(0, 0, logicalSize.value, logicalSize.value);
    ctx.fillStyle = getCssVar("--core-color-bg", "#013c4a");
    ctx.fillRect(0, 0, logicalSize.value, logicalSize.value);

    const centerX = logicalSize.value / 2;
    const centerY = logicalSize.value / 2;
    const targetRadius = logicalSize.value * options.guideRadiusFactor;
    const roundStartAt = options.getRoundStartAt();
    const guideOpacity =
      options.getIsDrawing() && roundStartAt !== null
        ? clamp(1 - (performance.now() - roundStartAt) / options.guideFadeOutMs, 0, 1)
        : 1;

    ctx.strokeStyle = getCssVar("--core-color-stroke", "#a5c814");

    ctx.save();
    ctx.globalAlpha = guideOpacity;
    ctx.lineWidth = 1;
    ctx.setLineDash([22, 22]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, targetRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const points = options.getPoints();
    if (points.length > 1) {
      const drawContext: DrawContext = {
        centerX,
        centerY,
        targetRadius,
      };
      options.drawStroke(ctx, points, options.selectedStrokeMode.value, drawContext);
    }
  }

  function pointFromPointer(event: PointerEvent): Point | null {
    if (!canvasEl.value) return null;

    const rect = canvasEl.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
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
    pointFromPointer,
  };
}