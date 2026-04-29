import { onMounted, ref, type Ref } from 'vue';
import type { RoundResult } from './useCircleScoring';

export interface HistoryEntry {
  score: number;
  label: string;
  createdAt: string;
  imageDataUrl: string; // PNG data URL
}

interface UseGameHistoryOptions {
  result: Ref<RoundResult | null>;
  canvasEl: Ref<HTMLCanvasElement | null>;
}

const GAME_HISTORY_STORAGE_KEY = 'circle-game-history';
const HISTORY_LIMIT = 6;
const HISTORY_IMAGE_SIZE = 180;

function normalizeHistoryEntries(entries: HistoryEntry[]): HistoryEntry[] {
  return entries
    .filter(entry => {
      return (
        typeof entry?.score === 'number' &&
        typeof entry?.label === 'string' &&
        typeof entry?.createdAt === 'string' &&
        typeof entry?.imageDataUrl === 'string'
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, HISTORY_LIMIT);
}

function captureCanvasAsImage(sourceCanvas: HTMLCanvasElement): string {
  try {
    // Create an off-screen canvas at the desired size
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = HISTORY_IMAGE_SIZE;
    targetCanvas.height = HISTORY_IMAGE_SIZE;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return '';

    // Fill with off-white background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, HISTORY_IMAGE_SIZE, HISTORY_IMAGE_SIZE);

    // Draw the source canvas onto background
    ctx.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      0,
      0,
      HISTORY_IMAGE_SIZE,
      HISTORY_IMAGE_SIZE
    );

    // Get the image data
    const imageData = ctx.getImageData(0, 0, HISTORY_IMAGE_SIZE, HISTORY_IMAGE_SIZE);
    const data = imageData.data;

    // Replace the teal color (#79b992 = rgb(121, 185, 146)) with off-white
    // Use a tolerance to handle anti-aliasing
    const targetR = 121;
    const targetG = 185;
    const targetB = 146;
    const tolerance = 30;
    const offWhiteR = 240;
    const offWhiteG = 240;
    const offWhiteB = 240;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;

      // Check if pixel is close to teal color
      const rDiff = Math.abs(r - targetR);
      const gDiff = Math.abs(g - targetG);
      const bDiff = Math.abs(b - targetB);

      if (rDiff < tolerance && gDiff < tolerance && bDiff < tolerance) {
        // Replace with off-white
        data[i] = offWhiteR; // R
        data[i + 1] = offWhiteG; // G
        data[i + 2] = offWhiteB; // B
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Make strokes thicker by dilating (expanding) non-background pixels
    // This creates crisp, thick strokes without blur
    const dilateRadius = 2;
    const dilatedData = ctx.getImageData(0, 0, HISTORY_IMAGE_SIZE, HISTORY_IMAGE_SIZE);
    const dilatedPixels = dilatedData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const isNotBackground = !(r === offWhiteR && g === offWhiteG && b === offWhiteB);

      if (isNotBackground) {
        // For each non-background pixel, fill nearby pixels too
        const pixelIndex = i / 4;
        const x = pixelIndex % HISTORY_IMAGE_SIZE;
        const y = Math.floor(pixelIndex / HISTORY_IMAGE_SIZE);

        for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
          for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < HISTORY_IMAGE_SIZE && ny >= 0 && ny < HISTORY_IMAGE_SIZE) {
              const nIndex = (ny * HISTORY_IMAGE_SIZE + nx) * 4;
              // Only fill if it's currently background
              const nr = dilatedPixels[nIndex] ?? 0;
              const ng = dilatedPixels[nIndex + 1] ?? 0;
              const nb = dilatedPixels[nIndex + 2] ?? 0;
              if (nr === offWhiteR && ng === offWhiteG && nb === offWhiteB) {
                dilatedPixels[nIndex] = r;
                dilatedPixels[nIndex + 1] = g;
                dilatedPixels[nIndex + 2] = b;
              }
            }
          }
        }
      }
    }

    ctx.putImageData(dilatedData, 0, 0);

    // Return as PNG data URL
    return targetCanvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export function useGameHistory(options: UseGameHistoryOptions) {
  const history = ref<HistoryEntry[]>([]);

  function loadHistory() {
    try {
      const stored = localStorage.getItem(GAME_HISTORY_STORAGE_KEY);
      history.value = stored ? normalizeHistoryEntries(JSON.parse(stored)) : [];
    } catch {
      history.value = [];
    }
  }

  function saveHistoryEntries(entries: HistoryEntry[]) {
    try {
      const normalized = normalizeHistoryEntries(entries);
      localStorage.setItem(GAME_HISTORY_STORAGE_KEY, JSON.stringify(normalized));
      history.value = normalized;
      return normalized;
    } catch {
      history.value = [];
      return [];
    }
  }

  function addToHistory() {
    if (!options.result.value || !options.canvasEl.value) return;

    const resultData = options.result.value;
    const imageDataUrl = captureCanvasAsImage(options.canvasEl.value);

    if (!imageDataUrl) return;

    const newEntry: HistoryEntry = {
      score: Math.round(resultData.score * 100) / 100,
      label: resultData.label ?? '',
      createdAt: new Date().toISOString(),
      imageDataUrl,
    };

    saveHistoryEntries([newEntry, ...history.value]);
  }

  function clearHistory() {
    saveHistoryEntries([]);
  }

  onMounted(() => {
    loadHistory();
  });

  return {
    history,
    loadHistory,
    addToHistory,
    clearHistory,
  };
}
