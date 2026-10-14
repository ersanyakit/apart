import { cache } from 'react';
import { cookies } from 'next/headers';
import { resolveLocale } from './config';
import { loadMarketingDictionary, marketingLoaders, marketingText, MARKETING_LOCALE_COOKIE } from './marketing';

export const getMarketingTranslation = cache(async () => {
  const requested = resolveLocale((await cookies()).get(MARKETING_LOCALE_COOKIE)?.value);
  const locale = marketingLoaders[requested] ? requested : 'tr';
  const dictionary = await loadMarketingDictionary(locale);
  return { locale, dictionary, m: (source: string) => marketingText(dictionary, source) };
});
