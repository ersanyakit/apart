import tr from './marketing/tr.json';
import { resolveLocale, type Locale } from './config';
export type MarketingDictionary = Record<string, string>;
export const marketingSource: MarketingDictionary = tr;
// Each dictionary is loaded separately, so visitors only download their language.
export const marketingLoaders: Partial<Record<Locale, () => Promise<{ default: MarketingDictionary }>>> = {
 tr: async () => ({ default: tr }),
 en: () => import("./marketing/en.json"),
 de: () => import("./marketing/de.json"),
 fr: () => import("./marketing/fr.json"),
 ar: () => import("./marketing/ar.json"),
 ky: () => import("./marketing/ky.json"),
 ku: () => import("./marketing/ku.json"),
 yue: () => import("./marketing/yue.json"),
 "ru": () => import("./marketing/ru.json"),
 "th": () => import("./marketing/th.json"),
 "zh-CN": () => import("./marketing/zh-CN.json"),
 "zh-TW": () => import("./marketing/zh-TW.json"),
 "hi": () => import("./marketing/hi.json"),
 "km": () => import("./marketing/km.json"),
 "ur": () => import("./marketing/ur.json"),
 "bn": () => import("./marketing/bn.json"),
 "ne": () => import("./marketing/ne.json"),
 "si": () => import("./marketing/si.json"),
 "ta": () => import("./marketing/ta.json"),
 "dz": () => import("./marketing/dz.json"),
 "te": () => import("./marketing/te.json"),
 "es": () => import("./marketing/es.json"),
 "it": () => import("./marketing/it.json"),
 "pt": () => import("./marketing/pt.json"),
 "nl": () => import("./marketing/nl.json"),
 "pl": () => import("./marketing/pl.json"),
 "cs": () => import("./marketing/cs.json"),
 "hu": () => import("./marketing/hu.json"),
 "ro": () => import("./marketing/ro.json"),
 "el": () => import("./marketing/el.json"),
 "uk": () => import("./marketing/uk.json"),
 "bg": () => import("./marketing/bg.json"),
 "sr": () => import("./marketing/sr.json"),
 "hr": () => import("./marketing/hr.json"),
 "sk": () => import("./marketing/sk.json"),
 "sl": () => import("./marketing/sl.json"),
 "fi": () => import("./marketing/fi.json"),
 "sv": () => import("./marketing/sv.json"),
 "da": () => import("./marketing/da.json"),
 "no": () => import("./marketing/no.json"),
 "id": () => import("./marketing/id.json"),
 "ms": () => import("./marketing/ms.json"),
 "vi": () => import("./marketing/vi.json"),
 "ja": () => import("./marketing/ja.json"),
 "ko": () => import("./marketing/ko.json"),
 "fa": () => import("./marketing/fa.json"),
 "he": () => import("./marketing/he.json"),
 "sw": () => import("./marketing/sw.json"),
};
export async function loadMarketingDictionary(value: string): Promise<MarketingDictionary> {
 const locale = resolveLocale(value);
 const loader = marketingLoaders[locale];
 if (!loader) throw new Error(`Marketing translation is unavailable: ${locale}`);
 return (await loader()).default;
}
export function marketingText(dictionary: MarketingDictionary, source: string, params: Record<string, string | number> = {}) {
 return (dictionary[source] ?? source).replace(/\{(\w+)\}/g, (match, key: string) => String(params[key] ?? match));
}
export const MARKETING_LOCALE_COOKIE = 'interactiveotel_locale';
