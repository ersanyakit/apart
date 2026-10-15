import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[2];folder=root/'ui/src/lib/i18n/marketing'
locales=[c.lower().replace('zh-cn','zh-CN').replace('zh-tw','zh-TW') for c in json.loads((root/'ui/src/lib/contracts.generated.json').read_text())['languages']]
assert set(locales)=={p.stem for p in folder.glob('*.json')},'Finish every supported language before finalizing'
p=folder.parent/'marketing.ts';s=p.read_text()
lines=['export const marketingLoaders: Record<Locale, () => Promise<{ default: MarketingDictionary }>> = {']
for c in locales:
 lines.append(' tr: async () => ({ default: tr }),' if c=='tr' else f' "{c}": () => import("./marketing/{c}.json"),')
lines.append('};');s=re.sub(r'export const marketingLoaders: .*?\n};','\n'.join(lines),s,count=1,flags=re.S)
s=s.replace(' const loader = marketingLoaders[locale];\n if (!loader) throw new Error(`Marketing translation is unavailable: ${locale}`);\n return (await loader()).default;',' return (await marketingLoaders[locale]()).default;');p.write_text(s)
p=root/'ui/src/components/landing/LanguageSelect.tsx';s=p.read_text();s=s.replace("import { marketingLoaders } from '../../lib/i18n/marketing';\n",'').replace('Object.entries(LOCALES).filter(([code]) => marketingLoaders[code as Locale]).map','Object.entries(LOCALES).map').replace('  const enabled = matches.filter(item => marketingLoaders[item.code]);\n','').replace('enabled','matches').replace(' disabled={!marketingLoaders[item.code]}','');p.write_text(s)
p=folder.parent/'marketing-server.ts';s=p.read_text().replace('loadMarketingDictionary, marketingLoaders, marketingText','loadMarketingDictionary, marketingText').replace('  const requested = resolveLocale','  const locale = resolveLocale').replace("  const locale = marketingLoaders[requested] ? requested : 'tr';\n",'');p.write_text(s)
print('All',len(locales),'locales registered with compile-time coverage; no availability filter or silent fallback.')
