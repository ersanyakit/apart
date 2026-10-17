import core from './application-core.json';
import { applicationLoaders } from './application-loaders';
import plurals from './application-plurals.json';
import { DEFAULT_LOCALE, resolveLocale } from './config';
import { loadMarketingDictionary, type MarketingDictionary } from './marketing';
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule,string>> & {other:string};
export type ApplicationDictionary = Record<string, string | PluralMessage>;
export type MessageParams = Record<string, string | number>;
const fold = (source: string) => source.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('tr');
const folded = new WeakMap<ApplicationDictionary, Map<string,string | PluralMessage>>();
const coreCache=new Map<string,ApplicationDictionary>();
export function coreDictionary(locale: string): ApplicationDictionary {
  const language=resolveLocale(locale);
  let dictionary=coreCache.get(language);
  if(!dictionary){dictionary={...core[language],...plurals[language]};coreCache.set(language,dictionary);}
  return dictionary;
}
export async function loadApplicationDictionary(locale: string): Promise<ApplicationDictionary> {
  const language=resolveLocale(locale);
  const [marketing,resource]=await Promise.all([loadMarketingDictionary(language),applicationLoaders[language]()]);
  return {...marketing,...resource.default,...coreDictionary(language)};
}
/** Only call for developer-authored interface messages, never arbitrary guest data. */
export function applicationText(dictionary: ApplicationDictionary, source: string, params: MessageParams = {}, locale = DEFAULT_LOCALE as string): string {
  let template: string | PluralMessage | undefined=dictionary[source];
  if (template===undefined) {
    let index=folded.get(dictionary);
    if (!index) {index=new Map(Object.entries(dictionary).map(([key,value])=>[fold(key),value]));folded.set(dictionary,index);}
    template=index.get(fold(source));
    if(template===undefined){
      const parts=source.match(/^([^\p{L}\p{N}{]*)(.*?)([^\p{L}\p{N}}]*)$/us);
      const text=parts&&index.get(fold(parts[2]));
      template=parts&&typeof text==='string'?parts[1]+text+parts[3]:source;
    }
  }
  if(typeof template!=='string')template=template[new Intl.PluralRules(locale).select(Number(params.count ?? 0))] ?? template.other;
  return template.replace(/\{(\w+)\}/g,(token,key:string)=>{
    const value=params[key];
    return value===undefined ? token : typeof value==='number' ? new Intl.NumberFormat(locale,{useGrouping:false}).format(value) : value;
  });
}
export const defaultApplicationDictionary=coreDictionary(DEFAULT_LOCALE);
