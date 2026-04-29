export function getCssVar(name: string, fallback = '') {
  if (!import.meta.client) {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
