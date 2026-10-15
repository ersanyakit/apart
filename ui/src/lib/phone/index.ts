import data from './plans.json';

export interface PhonePlan {
  callingCode: string; internationalPrefix: string; lengths: number[]; pattern: string;
  prefix: string; prefixPattern: string; prefixTransform: string;
  formats: { pattern: string; replacement: string; leading: string[] }[];
  example: string;
}
export const phonePlans: Record<string, PhonePlan> = data;
const full = (pattern: string, value: string) => new RegExp(`^(?:${pattern})$`).test(value);
export const phoneCountry = (country?: string) => phonePlans[country?.toUpperCase() || ''] ? country!.toUpperCase() : 'TR';
const validNational = (number: string, plan: PhonePlan) => plan.lengths.includes(number.length) && full(plan.pattern, number);

/** Convert common keyboard digit sets without discarding meaningful input. */
export function phoneDigits(value: string): string {
  return value.normalize('NFKC').replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0));
}

/** Pure country-aware parsing shared by fields and submit handlers. No network or runtime dependency. */
export function parsePhone(value: string, defaultCountry = 'TR') {
  let country = phoneCountry(defaultCountry);
  let plan = phonePlans[country];
  const text = phoneDigits(value).trim();
  let number = text.replace(/[\s().\-]/g, '');
  if (!text) return { country, national: '', e164: '', valid: true, empty: true, error: '' };
  if (!/^\+?\d+$/.test(number)) return { country, national: number, e164: '', valid: false, empty: false, error: 'Yalnızca tek bir telefon numarası girin.' };
  // Accept pasted +, 00 and the selected country's international access prefix (e.g. US 011).
  const access = number.match(new RegExp(`^(?:${plan.internationalPrefix})`));
  if (number.startsWith('00')) number = '+' + number.slice(2);
  else if (access && number.length > access[0].length) number = '+' + number.slice(access[0].length);
  if (number.startsWith('+')) {
    const international = number.slice(1);
    const candidates = Object.keys(phonePlans).filter(c => international.startsWith(phonePlans[c].callingCode));
    if (!candidates.length) return { country, national: number, e164: '', valid: false, empty: false, error: 'Geçerli bir ülke kodu girin.' };
    const matching = candidates.filter(c => validNational(international.slice(phonePlans[c].callingCode.length), phonePlans[c]));
    country = matching.includes(country) ? country : matching[0] || (candidates.includes(country) ? country : candidates[0]);
    plan = phonePlans[country];
    number = international.slice(plan.callingCode.length);
  }
  // Preserve significant zeroes (Italy), and don't strip a valid leading digit (US/Russia).
  if (plan.prefixPattern && !validNational(number, plan)) {
    const prefix = new RegExp(`^(?:${plan.prefixPattern})`);
    const stripped = number.replace(prefix, plan.prefixTransform);
    if (stripped !== number && (validNational(stripped, plan) || (!plan.prefixTransform && stripped.length >= Math.min(...plan.lengths)))) number = stripped;
  }
  const e164 = '+' + plan.callingCode + number;
  const valid = e164.length <= 16 && validNational(number, plan);
  const shortest = Math.min(...plan.lengths);
  const longest = Math.min(Math.max(...plan.lengths), 15 - plan.callingCode.length);
  const error = valid ? '' : number.length < shortest ? `Numara eksik. Ülke kodu hariç en az ${shortest} rakam girin.` : number.length > longest ? `Numara çok uzun. Ülke kodu hariç en fazla ${longest} rakam girin.` : 'Bu ülke için geçerli bir telefon numarası girin.';
  return { country, national: number, e164, valid, empty: false, error };
}

/** Apply a complete country format; incomplete input uses its matching digit groups. */
export function formatNationalPhone(number: string, country: string): string {
  const plan = phonePlans[phoneCountry(country)];
  if (!/^\d+$/.test(number)) return number;
  const formats = plan.formats.filter(f => !f.leading.length || new RegExp(`^(?:${f.leading[f.leading.length - 1]})`).test(number));
  const exact = formats.find(f => full(f.pattern, number));
  if (exact) return number.replace(new RegExp(`^${exact.pattern}$`), exact.replacement);
  const candidate = formats.find(f => {
    const groups = [...f.pattern.matchAll(/\\d\{(\d+)(?:,(\d+))?\}/g)];
    return groups.reduce((sum, g) => sum + Number(g[2] || g[1]), 0) >= number.length;
  });
  if (!candidate) return number;
  const sizes = [...candidate.pattern.matchAll(/\\d(?:\{(\d+)(?:,(\d+))?\})?/g)].map(g => Number(g[2] || g[1] || 1));
  let offset = 0;
  const groups = sizes.map(size => { const part = number.slice(offset, offset + size); offset += size; return part; }).filter(Boolean);
  if (offset < number.length) groups.push(number.slice(offset));
  return groups.join(' ');
}

export function normalizeGuestPhones<T extends { name: string; phone?: string; nationality?: string }>(guests: T[], defaultCountry = 'TR'): T[] {
  return guests.map(guest => {
    const phone = parsePhone(guest.phone || '', guest.nationality || defaultCountry);
    if (!phone.valid) throw new Error(`${guest.name || 'Misafir'}: ${phone.error}`);
    return { ...guest, phone: phone.e164 };
  });
}
