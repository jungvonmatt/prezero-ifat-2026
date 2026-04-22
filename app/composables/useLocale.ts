import { ref, computed } from "vue";
import de from "~/locales/de";
import en from "~/locales/en";
import type { LocaleMessages } from "~/locales/types";

export type Locale = "de" | "en";

const locales: Record<Locale, LocaleMessages> = { de, en };

const currentLocale = ref<Locale>("de");

export function useLocale() {
  const messages = computed(() => locales[currentLocale.value]);

  function setLocale(locale: Locale) {
    currentLocale.value = locale;
  }

  function t(path: string, params?: Record<string, string | number>): string {
    const keys = path.split(".");
    let value: any = messages.value;
    for (const key of keys) {
      value = value?.[key];
    }
    if (typeof value !== "string") return path;
    if (!params) return value;
    return value.replace(/{(\w+)}/g, (_: string, key: string) => String(params[key] ?? `{${key}}`));
  }

  return {
    locale: currentLocale,
    messages,
    setLocale,
    t,
  };
}
