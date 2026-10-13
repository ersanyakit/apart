export const LOCALES = {
  "tr": {
    "label": "Türkçe",
    "direction": "ltr"
  },
  "en": {
    "label": "English",
    "direction": "ltr"
  },
  "de": {
    "label": "Deutsch",
    "direction": "ltr"
  },
  "fr": {
    "label": "Français",
    "direction": "ltr"
  },
  "ru": {
    "label": "Русский",
    "direction": "ltr"
  },
  "ar": {
    "label": "العربية",
    "direction": "rtl"
  },
  "ne": {
    "label": "नेपाली",
    "direction": "ltr"
  },
  "th": {
    "label": "ไทย",
    "direction": "ltr"
  },
  "zh-CN": {
    "label": "简体中文",
    "direction": "ltr"
  },
  "zh-TW": {
    "label": "繁體中文",
    "direction": "ltr"
  }
} as const;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_STORAGE_KEY = "interactiveotel.locale";

/** Accept API language codes and regional browser locales; reject unknown values. */
export function resolveLocale(value?: string | null): Locale {
  const tag = (value ?? "").trim().replaceAll("_", "-").toLowerCase();
  const exact = (Object.keys(LOCALES) as Locale[]).find((locale) => locale.toLowerCase() === tag);
  if (exact) return exact;
  if (tag === "zh" || tag.startsWith("zh-")) {
    return /(?:hant|tw|hk|mo)/.test(tag) ? "zh-TW" : "zh-CN";
  }
  const base = tag.split("-")[0];
  return (Object.keys(LOCALES) as Locale[]).find((locale) => locale === base) ?? DEFAULT_LOCALE;
}
