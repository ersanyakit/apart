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
