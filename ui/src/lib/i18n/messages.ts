import { DEFAULT_LOCALE, resolveLocale, type Locale } from "./config";

const tr = {
  "language.title": "Dil",
  "language.description": "Ülke adlarının ve ülke seçim alanlarının dilini seç.",
  "country.label": "Ülke",
  "country.defaultTitle": "Varsayılan ülke",
  "country.defaultDescription": "Yeni misafirlerin uyruğu bu ülkeyle başlar. Ülkenin para birimi varsayılan para birimi olur.",
  "country.select": "Ülke seçin",
  "country.search": "Ülke ara",
  "country.searchPlaceholder": "Ülke adı veya kodu yazın…",
  "country.results": "Ülkeler",
  "country.noResults": "Bu aramaya uygun ülke yok",
  "country.trigger": "{label} seçin. Seçili: {name}",
  "common.none": "yok",
  "common.select": "Seçin",
  "guest.nationality": "Uyruk",
  "guest.numberNationality": "{number}. Misafir Uyruk"
};

export type MessageKey = keyof typeof tr;
type Dictionary = Record<MessageKey, string>;

/**
 * Çevirisi olmayan dillerde eksik anahtarlar varsayılan dile düşer
 * (bkz. translate). Bu yüzden yeni diller boş sözlükle başlayabilir;
 * arayüz dili seçimi içerik dillerinden bağımsız çalışır.
 */
export const messages: Partial<Record<Locale, Dictionary>> = {
  tr,
  "en": {
  "language.title": "Language",
  "language.description": "Choose the language for country names and country selectors.",
  "country.label": "Country",
  "country.defaultTitle": "Default country",
  "country.defaultDescription": "New guests start with this nationality. The country’s currency becomes the default currency.",
  "country.select": "Select a country",
  "country.search": "Search countries",
  "country.searchPlaceholder": "Enter a country name or code…",
  "country.results": "Countries",
  "country.noResults": "No countries match your search",
  "country.trigger": "Select {label}. Selected: {name}",
  "common.none": "none",
  "common.select": "Select",
  "guest.nationality": "Nationality",
  "guest.numberNationality": "Guest {number} nationality"
},
  "de": {
  "language.title": "Sprache",
  "language.description": "Wähle die Sprache für Ländernamen und die Länderauswahl.",
  "country.label": "Land",
  "country.defaultTitle": "Standardland",
  "country.defaultDescription": "Neue Gäste erhalten zunächst diese Nationalität. Die Landeswährung wird zur Standardwährung.",
  "country.select": "Land auswählen",
  "country.search": "Länder suchen",
  "country.searchPlaceholder": "Ländernamen oder Code eingeben…",
  "country.results": "Länder",
  "country.noResults": "Keine passenden Länder gefunden",
  "country.trigger": "{label} auswählen. Ausgewählt: {name}",
  "common.none": "keine",
  "common.select": "Auswählen",
  "guest.nationality": "Nationalität",
  "guest.numberNationality": "Nationalität von Gast {number}"
},
  "fr": {
  "language.title": "Langue",
  "language.description": "Choisissez la langue des noms de pays et des sélecteurs de pays.",
  "country.label": "Pays",
  "country.defaultTitle": "Pays par défaut",
  "country.defaultDescription": "Les nouveaux clients ont cette nationalité par défaut. La devise du pays devient la devise par défaut.",
  "country.select": "Sélectionner un pays",
  "country.search": "Rechercher un pays",
  "country.searchPlaceholder": "Saisissez un nom ou un code de pays…",
  "country.results": "Pays",
  "country.noResults": "Aucun pays ne correspond à votre recherche",
  "country.trigger": "Sélectionner {label}. Sélection : {name}",
  "common.none": "aucun",
  "common.select": "Sélectionner",
  "guest.nationality": "Nationalité",
  "guest.numberNationality": "Nationalité du client {number}"
},
  "ru": {
  "language.title": "Язык",
  "language.description": "Выберите язык названий стран и полей выбора страны.",
  "country.label": "Страна",
  "country.defaultTitle": "Страна по умолчанию",
  "country.defaultDescription": "Для новых гостей используется это гражданство. Валюта страны становится валютой по умолчанию.",
  "country.select": "Выберите страну",
  "country.search": "Поиск страны",
  "country.searchPlaceholder": "Введите название или код страны…",
  "country.results": "Страны",
  "country.noResults": "Страны не найдены",
  "country.trigger": "Выберите: {label}. Выбрано: {name}",
  "common.none": "нет",
  "common.select": "Выбрать",
  "guest.nationality": "Гражданство",
  "guest.numberNationality": "Гражданство гостя {number}"
},
  "ar": {
  "language.title": "اللغة",
  "language.description": "اختر لغة أسماء البلدان وحقول اختيار البلد.",
  "country.label": "البلد",
  "country.defaultTitle": "البلد الافتراضي",
  "country.defaultDescription": "تُستخدم هذه الجنسية للضيوف الجدد. تصبح عملة البلد هي العملة الافتراضية.",
  "country.select": "اختر بلدًا",
  "country.search": "البحث عن بلد",
  "country.searchPlaceholder": "أدخل اسم البلد أو رمزه…",
  "country.results": "البلدان",
  "country.noResults": "لا توجد بلدان تطابق بحثك",
  "country.trigger": "اختر {label}. المحدد: {name}",
  "common.none": "لا يوجد",
  "common.select": "اختر",
  "guest.nationality": "الجنسية",
  "guest.numberNationality": "جنسية الضيف {number}"
},
  "ne": {
  "language.title": "भाषा",
  "language.description": "देशका नाम र देश चयन गर्ने क्षेत्रहरूको भाषा छान्नुहोस्।",
  "country.label": "देश",
  "country.defaultTitle": "पूर्वनिर्धारित देश",
  "country.defaultDescription": "नयाँ अतिथिहरूको राष्ट्रियता यस देशबाट सुरु हुन्छ। देशको मुद्रा पूर्वनिर्धारित मुद्रा बन्छ।",
  "country.select": "देश छान्नुहोस्",
  "country.search": "देश खोज्नुहोस्",
  "country.searchPlaceholder": "देशको नाम वा कोड लेख्नुहोस्…",
  "country.results": "देशहरू",
  "country.noResults": "खोजसँग मिल्ने देश भेटिएन",
  "country.trigger": "{label} छान्नुहोस्। चयन गरिएको: {name}",
  "common.none": "छैन",
  "common.select": "छान्नुहोस्",
  "guest.nationality": "राष्ट्रियता",
  "guest.numberNationality": "अतिथि {number} को राष्ट्रियता"
},
  "th": {
  "language.title": "ภาษา",
  "language.description": "เลือกภาษาสำหรับชื่อประเทศและช่องเลือกประเทศ",
  "country.label": "ประเทศ",
  "country.defaultTitle": "ประเทศเริ่มต้น",
  "country.defaultDescription": "ผู้เข้าพักใหม่จะใช้สัญชาตินี้ และใช้สกุลเงินของประเทศเป็นสกุลเงินเริ่มต้น",
  "country.select": "เลือกประเทศ",
  "country.search": "ค้นหาประเทศ",
  "country.searchPlaceholder": "ป้อนชื่อหรือรหัสประเทศ…",
  "country.results": "ประเทศ",
  "country.noResults": "ไม่พบประเทศที่ตรงกับการค้นหา",
  "country.trigger": "เลือก{label} ที่เลือก: {name}",
  "common.none": "ไม่มี",
  "common.select": "เลือก",
  "guest.nationality": "สัญชาติ",
  "guest.numberNationality": "สัญชาติของผู้เข้าพัก {number}"
},
  "zh-CN": {
  "language.title": "语言",
  "language.description": "选择国家名称和国家选择器的语言。",
  "country.label": "国家",
  "country.defaultTitle": "默认国家",
  "country.defaultDescription": "新客人的国籍默认为该国家，该国货币将成为默认货币。",
  "country.select": "选择国家",
  "country.search": "搜索国家",
  "country.searchPlaceholder": "输入国家名称或代码…",
  "country.results": "国家列表",
  "country.noResults": "未找到匹配的国家",
  "country.trigger": "选择{label}。已选：{name}",
  "common.none": "无",
  "common.select": "选择",
  "guest.nationality": "国籍",
  "guest.numberNationality": "客人 {number} 的国籍"
},
  "zh-TW": {
  "language.title": "語言",
  "language.description": "選擇國家名稱和國家選擇器的語言。",
  "country.label": "國家",
  "country.defaultTitle": "預設國家",
  "country.defaultDescription": "新住客的國籍預設為該國家，該國貨幣將成為預設貨幣。",
  "country.select": "選擇國家",
  "country.search": "搜尋國家",
  "country.searchPlaceholder": "輸入國家名稱或代碼…",
  "country.results": "國家清單",
  "country.noResults": "找不到符合的國家",
  "country.trigger": "選擇{label}。已選：{name}",
  "common.none": "無",
  "common.select": "選擇",
  "guest.nationality": "國籍",
  "guest.numberNationality": "住客 {number} 的國籍"
},
};

export function translate(locale: string, key: MessageKey, params: Record<string, string | number> = {}): string {
  const template =
    messages[resolveLocale(locale)]?.[key] ??
    messages[DEFAULT_LOCALE]?.[key] ??
    key;
  return template.replace(/\{(\w+)\}/g, (token, name: string) => String(params[name] ?? token));
}
