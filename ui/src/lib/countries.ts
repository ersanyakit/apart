/**
 * Ülke verisi: ISO 3166-1 alpha-2 kodu, Türkçe ad ve (uygulamada
 * tanımlıysa) para birimi. Bayraklar koddan bölgesel gösterge
 * simgesiyle üretilir; ek bağımlılık ve ağ isteği gerekmez.
 */
export interface Country {
  /** ISO 3166-1 alpha-2, örn. "TR". */
  code: string;
  /** Türkçe ad, örn. "Türkiye". */
  name: string;
  /**
   * Para birimi (uygulamanın para birimi listesindeki karşılık).
   * Liste dışı para birimlerinde null → mevcut para birimi korunur.
   */
  currency: string | null;
}

export const DEFAULT_COUNTRY = "TR";

export const COUNTRIES: Country[] = [
  { code: "TR", name: "Türkiye", currency: "TRY" },
  { code: "US", name: "Amerika Birleşik Devletleri", currency: "USD" },
  { code: "DE", name: "Almanya", currency: "EUR" },
  { code: "FR", name: "Fransa", currency: "EUR" },
  { code: "GB", name: "Birleşik Krallık", currency: "GBP" },
  { code: "IT", name: "İtalya", currency: "EUR" },
  { code: "ES", name: "İspanya", currency: "EUR" },
  { code: "NL", name: "Hollanda", currency: "EUR" },
  { code: "BE", name: "Belçika", currency: "EUR" },
  { code: "AT", name: "Avusturya", currency: "EUR" },
  { code: "CH", name: "İsviçre", currency: "CHF" },
  { code: "SE", name: "İsveç", currency: "SEK" },
  { code: "NO", name: "Norveç", currency: "NOK" },
  { code: "DK", name: "Danimarka", currency: "DKK" },
  { code: "FI", name: "Finlandiya", currency: "EUR" },
  { code: "PL", name: "Polonya", currency: "PLN" },
  { code: "CZ", name: "Çekya", currency: "CZK" },
  { code: "SK", name: "Slovakya", currency: "EUR" },
  { code: "HU", name: "Macaristan", currency: "HUF" },
  { code: "RO", name: "Romanya", currency: "RON" },
  { code: "BG", name: "Bulgaristan", currency: "EUR" },
  { code: "GR", name: "Yunanistan", currency: "EUR" },
  { code: "PT", name: "Portekiz", currency: "EUR" },
  { code: "IE", name: "İrlanda", currency: "EUR" },
  { code: "HR", name: "Hırvatistan", currency: "EUR" },
  { code: "SI", name: "Slovenya", currency: "EUR" },
  { code: "EE", name: "Estonya", currency: "EUR" },
  { code: "LV", name: "Letonya", currency: "EUR" },
  { code: "LT", name: "Litvanya", currency: "EUR" },
  { code: "MT", name: "Malta", currency: "EUR" },
  { code: "CY", name: "Kıbrıs", currency: "EUR" },
  { code: "LU", name: "Lüksemburg", currency: "EUR" },
  { code: "IS", name: "İzlanda", currency: null },
  { code: "AL", name: "Arnavutluk", currency: null },
  { code: "AD", name: "Andorra", currency: "EUR" },
  { code: "BA", name: "Bosna-Hersek", currency: null },
  { code: "ME", name: "Karadağ", currency: "EUR" },
  { code: "MK", name: "Kuzey Makedonya", currency: null },
  { code: "RS", name: "Sırbistan", currency: null },
  { code: "XK", name: "Kosova", currency: "EUR" },
  { code: "MD", name: "Moldova", currency: null },
  { code: "UA", name: "Ukrayna", currency: "UAH" },
  { code: "RU", name: "Rusya", currency: "RUB" },
  { code: "BY", name: "Belarus", currency: null },
  { code: "GE", name: "Gürcistan", currency: null },
  { code: "AM", name: "Ermenistan", currency: null },
  { code: "AZ", name: "Azerbaycan", currency: "AZN" },
  { code: "KZ", name: "Kazakistan", currency: null },
  { code: "UZ", name: "Özbekistan", currency: null },
  { code: "TM", name: "Türkmenistan", currency: null },
  { code: "KG", name: "Kırgızistan", currency: null },
  { code: "TJ", name: "Tacikistan", currency: null },
  { code: "LI", name: "Lihtenştayn", currency: "CHF" },
  { code: "MC", name: "Monako", currency: "EUR" },
  { code: "SM", name: "San Marino", currency: "EUR" },
  { code: "VA", name: "Vatikan", currency: "EUR" },
  { code: "FO", name: "Faroe Adaları", currency: null },
  { code: "GL", name: "Grönland", currency: "DKK" },
  { code: "GI", name: "Cebelitarık", currency: null },
  { code: "IM", name: "Man Adası", currency: null },
  { code: "JE", name: "Jersey", currency: null },
  { code: "GG", name: "Guernsey", currency: null },
  { code: "AX", name: "Åland Adaları", currency: "EUR" },
  { code: "SJ", name: "Svalbard ve Jan Mayen", currency: null },
  { code: "AE", name: "Birleşik Arap Emirlikleri", currency: "AED" },
  { code: "SA", name: "Suudi Arabistan", currency: null },
  { code: "QA", name: "Katar", currency: null },
  { code: "KW", name: "Kuveyt", currency: null },
  { code: "BH", name: "Bahreyn", currency: null },
  { code: "OM", name: "Umman", currency: null },
  { code: "YE", name: "Yemen", currency: null },
  { code: "IQ", name: "Irak", currency: null },
  { code: "IR", name: "İran", currency: null },
  { code: "SY", name: "Suriye", currency: null },
  { code: "LB", name: "Lübnan", currency: null },
  { code: "JO", name: "Ürdün", currency: null },
  { code: "IL", name: "İsrail", currency: "ILS" },
  { code: "PS", name: "Filistin", currency: null },
  { code: "EG", name: "Mısır", currency: null },
  { code: "LY", name: "Libya", currency: null },
  { code: "TN", name: "Tunus", currency: null },
  { code: "DZ", name: "Cezayir", currency: null },
  { code: "MA", name: "Fas", currency: null },
  { code: "MR", name: "Moritanya", currency: null },
  { code: "SD", name: "Sudan", currency: null },
  { code: "SS", name: "Güney Sudan", currency: null },
  { code: "ET", name: "Etiyopya", currency: null },
  { code: "SO", name: "Somali", currency: null },
  { code: "DJ", name: "Cibuti", currency: null },
  { code: "ER", name: "Eritre", currency: null },
  { code: "KE", name: "Kenya", currency: null },
  { code: "TZ", name: "Tanzanya", currency: null },
  { code: "UG", name: "Uganda", currency: null },
  { code: "RW", name: "Ruanda", currency: null },
  { code: "BI", name: "Burundi", currency: null },
  { code: "NG", name: "Nijerya", currency: null },
  { code: "GH", name: "Gana", currency: null },
  { code: "SN", name: "Senegal", currency: null },
  { code: "CI", name: "Fildişi Sahili", currency: null },
  { code: "CM", name: "Kamerun", currency: null },
  { code: "CF", name: "Orta Afrika Cumhuriyeti", currency: null },
  { code: "TD", name: "Çad", currency: null },
  { code: "NE", name: "Nijer", currency: null },
  { code: "ML", name: "Mali", currency: null },
  { code: "BF", name: "Burkina Faso", currency: null },
  { code: "GW", name: "Gine-Bissau", currency: null },
  { code: "GN", name: "Gine", currency: null },
  { code: "SL", name: "Sierra Leone", currency: null },
  { code: "LR", name: "Liberya", currency: null },
  { code: "TG", name: "Togo", currency: null },
  { code: "BJ", name: "Benin", currency: null },
  { code: "GA", name: "Gabon", currency: null },
  { code: "CG", name: "Kongo Cumhuriyeti", currency: null },
  { code: "CD", name: "Kongo Demokratik Cumhuriyeti", currency: null },
  { code: "AO", name: "Angola", currency: null },
  { code: "GQ", name: "Ekvator Ginesi", currency: null },
  { code: "ST", name: "São Tomé ve Príncipe", currency: null },
  { code: "CV", name: "Yeşil Burun Adaları", currency: null },
  { code: "ZA", name: "Güney Afrika", currency: "ZAR" },
  { code: "ZW", name: "Zimbabve", currency: null },
  { code: "ZM", name: "Zambiya", currency: null },
  { code: "BW", name: "Botsvana", currency: null },
  { code: "NA", name: "Namibya", currency: null },
  { code: "SZ", name: "Esvatini", currency: null },
  { code: "LS", name: "Lesoto", currency: null },
  { code: "MZ", name: "Mozambik", currency: null },
  { code: "MW", name: "Malavi", currency: null },
  { code: "MG", name: "Madagaskar", currency: null },
  { code: "MU", name: "Mauritius", currency: null },
  { code: "SC", name: "Seyşeller", currency: null },
  { code: "KM", name: "Komorlar", currency: null },
  { code: "RE", name: "Réunion", currency: "EUR" },
  { code: "YT", name: "Mayotte", currency: "EUR" },
  { code: "SH", name: "Saint Helena", currency: null },
  { code: "CN", name: "Çin", currency: "CNY" },
  { code: "JP", name: "Japonya", currency: "JPY" },
  { code: "KR", name: "Güney Kore", currency: "KRW" },
  { code: "KP", name: "Kuzey Kore", currency: null },
  { code: "TW", name: "Tayvan", currency: "TWD" },
  { code: "HK", name: "Hong Kong", currency: "HKD" },
  { code: "MO", name: "Makao", currency: null },
  { code: "MN", name: "Moğolistan", currency: null },
  { code: "SG", name: "Singapur", currency: "SGD" },
  { code: "MY", name: "Malezya", currency: "MYR" },
  { code: "TH", name: "Tayland", currency: "THB" },
  { code: "ID", name: "Endonezya", currency: "IDR" },
  { code: "PH", name: "Filipinler", currency: null },
  { code: "VN", name: "Vietnam", currency: null },
  { code: "KH", name: "Kamboçya", currency: null },
  { code: "LA", name: "Laos", currency: null },
  { code: "MM", name: "Myanmar", currency: null },
  { code: "BD", name: "Bangladeş", currency: null },
  { code: "IN", name: "Hindistan", currency: "INR" },
  { code: "PK", name: "Pakistan", currency: "PKR" },
  { code: "NP", name: "Nepal", currency: "NPR" },
  { code: "LK", name: "Sri Lanka", currency: null },
  { code: "MV", name: "Maldivler", currency: null },
  { code: "BT", name: "Butan", currency: null },
  { code: "AF", name: "Afganistan", currency: null },
  { code: "TL", name: "Doğu Timor", currency: null },
  { code: "BN", name: "Brunei", currency: null },
  { code: "CA", name: "Kanada", currency: "CAD" },
  { code: "MX", name: "Meksika", currency: "MXN" },
  { code: "BR", name: "Brezilya", currency: "BRL" },
  { code: "AR", name: "Arjantin", currency: null },
  { code: "CL", name: "Şili", currency: null },
  { code: "CO", name: "Kolombiya", currency: null },
  { code: "PE", name: "Peru", currency: null },
  { code: "VE", name: "Venezuela", currency: null },
  { code: "UY", name: "Uruguay", currency: null },
  { code: "PY", name: "Paraguay", currency: null },
  { code: "BO", name: "Bolivya", currency: null },
  { code: "EC", name: "Ekvador", currency: "USD" },
  { code: "GY", name: "Guyana", currency: null },
  { code: "SR", name: "Surinam", currency: null },
  { code: "GF", name: "Fransız Guyanası", currency: "EUR" },
  { code: "PA", name: "Panama", currency: "USD" },
  { code: "CR", name: "Kosta Rika", currency: null },
  { code: "NI", name: "Nikaragua", currency: null },
  { code: "HN", name: "Honduras", currency: null },
  { code: "SV", name: "El Salvador", currency: "USD" },
  { code: "GT", name: "Guatemala", currency: null },
  { code: "BZ", name: "Belize", currency: null },
  { code: "CU", name: "Küba", currency: null },
  { code: "JM", name: "Jamaika", currency: null },
  { code: "HT", name: "Haiti", currency: null },
  { code: "DO", name: "Dominik Cumhuriyeti", currency: null },
  { code: "PR", name: "Porto Riko", currency: "USD" },
  { code: "BS", name: "Bahamalar", currency: null },
  { code: "BB", name: "Barbados", currency: null },
  { code: "TT", name: "Trinidad ve Tobago", currency: null },
  { code: "GD", name: "Grenada", currency: null },
  { code: "LC", name: "Saint Lucia", currency: null },
  { code: "VC", name: "Saint Vincent ve Grenadinler", currency: null },
  { code: "DM", name: "Dominika", currency: null },
  { code: "AG", name: "Antigua ve Barbuda", currency: null },
  { code: "KN", name: "Saint Kitts ve Nevis", currency: null },
  { code: "KY", name: "Cayman Adaları", currency: null },
  { code: "VG", name: "Britanya Virgin Adaları", currency: null },
  { code: "VI", name: "ABD Virgin Adaları", currency: "USD" },
  { code: "TC", name: "Turks ve Caicos Adaları", currency: null },
  { code: "MS", name: "Montserrat", currency: null },
  { code: "AI", name: "Anguilla", currency: null },
  { code: "BM", name: "Bermuda", currency: null },
  { code: "AW", name: "Aruba", currency: null },
  { code: "CW", name: "Curaçao", currency: null },
  { code: "SX", name: "Sint Maarten", currency: null },
  { code: "BQ", name: "Karayip Hollandası", currency: "USD" },
  { code: "GP", name: "Guadeloupe", currency: "EUR" },
  { code: "MQ", name: "Martinik", currency: "EUR" },
  { code: "BL", name: "Saint-Barthélemy", currency: "EUR" },
  { code: "MF", name: "Saint Martin", currency: "EUR" },
  { code: "PM", name: "Saint Pierre ve Miquelon", currency: "EUR" },
  { code: "FK", name: "Falkland Adaları", currency: null },
  { code: "AU", name: "Avustralya", currency: "AUD" },
  { code: "NZ", name: "Yeni Zelanda", currency: "NZD" },
  { code: "FJ", name: "Fiji", currency: null },
  { code: "PG", name: "Papua Yeni Gine", currency: null },
  { code: "SB", name: "Solomon Adaları", currency: null },
  { code: "VU", name: "Vanuatu", currency: null },
  { code: "NC", name: "Yeni Kaledonya", currency: null },
  { code: "PF", name: "Fransız Polinezyası", currency: null },
  { code: "WF", name: "Wallis ve Futuna", currency: null },
  { code: "WS", name: "Samoa", currency: null },
  { code: "TO", name: "Tonga", currency: null },
  { code: "TV", name: "Tuvalu", currency: "AUD" },
  { code: "NR", name: "Nauru", currency: "AUD" },
  { code: "PW", name: "Palau", currency: null },
  { code: "MH", name: "Marshall Adaları", currency: "USD" },
  { code: "FM", name: "Mikronezya", currency: null },
  { code: "KI", name: "Kiribati", currency: "AUD" },
  { code: "CK", name: "Cook Adaları", currency: "NZD" },
  { code: "NU", name: "Niue", currency: "NZD" },
  { code: "TK", name: "Tokelau", currency: "NZD" },
  { code: "GU", name: "Guam", currency: "USD" },
  { code: "MP", name: "Kuzey Mariana Adaları", currency: "USD" },
  { code: "AS", name: "Amerikan Samoası", currency: "USD" },
  { code: "NF", name: "Norfolk Adası", currency: "AUD" },
  { code: "CC", name: "Cocos Adaları", currency: null },
  { code: "CX", name: "Christmas Adası", currency: null },
  { code: "PN", name: "Pitcairn Adaları", currency: null },
  { code: "AQ", name: "Antarktika", currency: null },
  { code: "BV", name: "Bouvet Adası", currency: null },
  { code: "GS", name: "Güney Georgia", currency: null },
  { code: "HM", name: "Heard ve McDonald Adaları", currency: null },
  { code: "IO", name: "Britanya Hint Okyanusu Toprakları", currency: null },
  { code: "TF", name: "Fransız Güney Toprakları", currency: null },
  { code: "UM", name: "ABD Küçük Dış Adaları", currency: null },
  { code: "EH", name: "Batı Sahra", currency: null },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryByCode(code: string | undefined | null): Country | undefined {
  if (!code) return undefined;
  return byCode.get(code.trim().toUpperCase());
}

/** ISO koddan bayrak simgesi (bölgesel gösterge harfleri). */
export function countryFlag(code: string | undefined | null): string {
  const c = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "";
  return String.fromCodePoint(
    ...[...c].map((ch) => 127397 + ch.charCodeAt(0)),
  );
}

const trLower = (s: string) => s.toLocaleLowerCase("tr-TR");

/**
 * Yazdıkça ülke bulma: önce adın başından eşleşenler, sonra
 * içinde geçenler; kodla da eşleşir ("tr" → Türkiye).
 */
export function searchCountries(query: string, limit = 50): Country[] {
  const q = trLower(query.trim());
  if (!q) return COUNTRIES.slice(0, limit);
  const starts: Country[] = [];
  const contains: Country[] = [];
  for (const c of COUNTRIES) {
    const name = trLower(c.name);
    if (name.startsWith(q) || c.code.toLowerCase() === q) {
      starts.push(c);
    } else if (name.includes(q)) {
      contains.push(c);
    }
    if (starts.length + contains.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Ülkenin para birimi (listede yoksa null → mevcut korunur). */
export function currencyForCountry(code: string | undefined | null): string | null {
  return countryByCode(code)?.currency ?? null;
}
