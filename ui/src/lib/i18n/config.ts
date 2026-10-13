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
  },
  "hi": {
    "label": "हिन्दी",
    "direction": "ltr"
  },
  "km": {
    "label": "ខ្មែរ",
    "direction": "ltr"
  },
  "si": {
    "label": "සිංහල",
    "direction": "ltr"
  },
  "ta": {
    "label": "தமிழ்",
    "direction": "ltr"
  },
  "yue": {
    "label": "粵語",
    "direction": "ltr"
  },
  "ur": {
    "label": "اردو",
    "direction": "rtl"
  },
  "bn": {
    "label": "বাংলা",
    "direction": "ltr"
  },
  "dz": {
    "label": "རྫོང་ཁ",
    "direction": "ltr"
  },
  "es": {
    "label": "Español",
    "direction": "ltr"
  },
  "it": {
    "label": "Italiano",
    "direction": "ltr"
  },
  "pt": {
    "label": "Português",
    "direction": "ltr"
  },
  "nl": {
    "label": "Nederlands",
    "direction": "ltr"
  },
  "pl": {
    "label": "Polski",
    "direction": "ltr"
  },
  "cs": {
    "label": "Čeština",
    "direction": "ltr"
  },
  "hu": {
    "label": "Magyar",
    "direction": "ltr"
  },
  "ro": {
    "label": "Română",
    "direction": "ltr"
  },
  "el": {
    "label": "Ελληνικά",
    "direction": "ltr"
  },
  "uk": {
    "label": "Українська",
    "direction": "ltr"
  },
  "bg": {
    "label": "Български",
    "direction": "ltr"
  },
  "sr": {
    "label": "Српски",
    "direction": "ltr"
  },
  "hr": {
    "label": "Hrvatski",
    "direction": "ltr"
  },
  "sk": {
    "label": "Slovenčina",
    "direction": "ltr"
  },
  "sl": {
    "label": "Slovenščina",
    "direction": "ltr"
  },
  "fi": {
    "label": "Suomi",
    "direction": "ltr"
  },
  "sv": {
    "label": "Svenska",
    "direction": "ltr"
  },
  "da": {
    "label": "Dansk",
    "direction": "ltr"
  },
  "no": {
    "label": "Norsk",
    "direction": "ltr"
  },
  "ms": {
    "label": "Melayu",
    "direction": "ltr"
  },
  "id": {
    "label": "Indonesia",
    "direction": "ltr"
  },
  "vi": {
    "label": "Tiếng Việt",
    "direction": "ltr"
  },
  "ja": {
    "label": "日本語",
    "direction": "ltr"
  },
  "ko": {
    "label": "한국어",
    "direction": "ltr"
  },
  "fa": {
    "label": "فارسی",
    "direction": "rtl"
  },
  "he": {
    "label": "עברית",
    "direction": "rtl"
  },
  "sw": {
    "label": "Kiswahili",
    "direction": "ltr"
  },
  "am": {
    "label": "አማርኛ",
    "direction": "ltr"
  },
  "mr": {
    "label": "मराठी",
    "direction": "ltr"
  },
  "pa": {
    "label": "ਪੰਜਾਬੀ",
    "direction": "ltr"
  },
  "te": {
    "label": "తెలుగు",
    "direction": "ltr"
  },
  "my": {
    "label": "မြန်မာ",
    "direction": "ltr"
  },
  "lo": {
    "label": "ລາວ",
    "direction": "ltr"
  },
  "ka": {
    "label": "ქართული",
    "direction": "ltr"
  },
  "hy": {
    "label": "Հայերեն",
    "direction": "ltr"
  },
  "az": {
    "label": "Azərbaycanca",
    "direction": "ltr"
  },
  "kk": {
    "label": "Қазақша",
    "direction": "ltr"
  },
  "uz": {
    "label": "O'zbekcha",
    "direction": "ltr"
  },
  "ky": {
    "label": "Кыргызча",
    "direction": "ltr"
  },
  "mn": {
    "label": "Монгол",
    "direction": "ltr"
  },
  "ps": {
    "label": "پښتو",
    "direction": "rtl"
  },
  "ku": {
    "label": "Kurdî",
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
