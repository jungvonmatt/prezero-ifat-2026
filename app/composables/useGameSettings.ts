import { type StrokeMode } from "./useStrokeProfiles";

const STORAGE_KEY = "ifat2026_strokeMode";

export function useGameSettings() {
  const config = useRuntimeConfig();
  const { strokeModeOptions } = useStrokeProfiles();
  const allowedModes = new Set<StrokeMode>(strokeModeOptions.map((o) => o.value));

  const runtimeMode = config.public.strokeMode as StrokeMode;
  const strokeMode = useState<StrokeMode>("strokeMode", () => (allowedModes.has(runtimeMode) ? runtimeMode : "cinematic"));

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as StrokeMode | null;
    if (stored && allowedModes.has(stored)) {
      strokeMode.value = stored;
    }
  });

  function setStrokeMode(mode: StrokeMode) {
    strokeMode.value = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }

  return { strokeMode, strokeModeOptions, setStrokeMode };
}
