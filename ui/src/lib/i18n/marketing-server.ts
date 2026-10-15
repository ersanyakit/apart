import { cache } from 'react';
import { cookies } from 'next/headers';
import { resolveLocale } from './config';
import { loadMarketingDictionary, marketingText, MARKETING_LOCALE_COOKIE } from './marketing';

export const getMarketingTranslation = cache(async () => {
  const locale = resolveLocale((await cookies()).get(MARKETING_LOCALE_COOKIE)?.value);
  const dictionary = await loadMarketingDictionary(locale);
  return { locale, dictionary, m: (source: string) => marketingText(dictionary, source) };
});
