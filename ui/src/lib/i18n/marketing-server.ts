import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { resolveRequestLocale } from './config';
import { loadMarketingDictionary, marketingText, MARKETING_LOCALE_COOKIE } from './marketing';

export const getMarketingTranslation = cache(async () => {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = resolveRequestLocale(cookieStore.get(MARKETING_LOCALE_COOKIE)?.value, requestHeaders.get('accept-language'));
  const dictionary = await loadMarketingDictionary(locale);
  return { locale, dictionary, m: (source: string) => marketingText(dictionary, source) };
});
