"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

import { countryByCode, currencyForCountry, DEFAULT_COUNTRY } from "../lib/countries";

export type CurrencyId =
  | "TRY" | "USD" | "EUR" | "GBP"
  | "CHF" | "SEK" | "NOK" | "DKK"
  | "PLN" | "CZK" | "HUF" | "RON"
  | "RUB" | "UAH" | "AZN" | "ILS" | "AED"
  | "CNY" | "JPY" | "KRW" | "TWD" | "HKD" | "SGD" | "THB" | "MYR" | "IDR"
  | "INR" | "PKR" | "NPR"
  | "BRL" | "CAD" | "AUD" | "NZD" | "MXN"
  | "ZAR";
export type MoneyFormatId = "tr" | "en";

export interface CurrencyOption {
  id: CurrencyId;
  symbol: string;
  label: string;
}

export interface MoneyFormatOption {
  id: MoneyFormatId;
  label: string;
  hint: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { id: "TRY", symbol: "₺", label: "Türk Lirası" },
  { id: "USD", symbol: "$", label: "ABD Doları" },
  { id: "EUR", symbol: "€", label: "Euro" },
  { id: "GBP", symbol: "£", label: "İngiliz Sterlini" },
  { id: "CHF", symbol: "CHF", label: "İsviçre Frangı" },
  { id: "SEK", symbol: "kr", label: "İsveç Kronu" },
  { id: "NOK", symbol: "kr", label: "Norveç Kronu" },
  { id: "DKK", symbol: "kr", label: "Danimarka Kronu" },
  { id: "PLN", symbol: "zł", label: "Polonya Zlotisi" },
  { id: "CZK", symbol: "Kč", label: "Çek Korunası" },
  { id: "HUF", symbol: "Ft", label: "Macar Forinti" },
  { id: "RON", symbol: "lei", label: "Rumen Leyi" },
  { id: "RUB", symbol: "₽", label: "Rus Rublesi" },
  { id: "UAH", symbol: "₴", label: "Ukrayna Grivnası" },
  { id: "AZN", symbol: "₼", label: "Azerbaycan Manatı" },
  { id: "ILS", symbol: "₪", label: "İsrail Şekeli" },
  { id: "AED", symbol: "د.إ", label: "BAE Dirhemi" },
  { id: "CNY", symbol: "¥", label: "Çin Yuanı" },
  { id: "JPY", symbol: "¥", label: "Japon Yeni" },
  { id: "KRW", symbol: "₩", label: "Güney Kore Wonu" },
  { id: "TWD", symbol: "NT$", label: "Yeni Tayvan Doları" },
  { id: "HKD", symbol: "HK$", label: "Hong Kong Doları" },
  { id: "SGD", symbol: "S$", label: "Singapur Doları" },
  { id: "THB", symbol: "฿", label: "Tayland Bahtı" },
  { id: "MYR", symbol: "RM", label: "Malezya Ringgiti" },
  { id: "IDR", symbol: "Rp", label: "Endonezya Rupisi" },
  { id: "INR", symbol: "₹", label: "Hindistan Rupisi" },
  { id: "PKR", symbol: "₨", label: "Pakistan Rupisi" },
  { id: "NPR", symbol: "₨", label: "Nepal Rupisi" },
  { id: "BRL", symbol: "R$", label: "Brezilya Reali" },
  { id: "CAD", symbol: "CA$", label: "Kanada Doları" },
  { id: "AUD", symbol: "A$", label: "Avustralya Doları" },
  { id: "NZD", symbol: "NZ$", label: "Yeni Zelanda Doları" },
  { id: "MXN", symbol: "MX$", label: "Meksika Pezosu" },
  { id: "ZAR", symbol: "R", label: "Güney Afrika Randı" },
];

/** Sembol dairede taşmayacak yazı boyutu (uzun semboller küçülür). */
export function currencySymbolClass(symbol: string): string {
  if (symbol.length <= 1) return "text-base";
  if (symbol.length === 2) return "text-xs";
  return "text-[10px]";
}

export const MONEY_FORMATS: MoneyFormatOption[] = [
  { id: "tr", label: "1.234,56", hint: "Türkçe" },
  { id: "en", label: "1,234.56", hint: "İngilizce" },
];

const CURRENCY_KEY = "interactiveotel-currency";
const FORMAT_KEY = "interactiveotel-money-format";
const COUNTRY_KEY = "interactiveotel-default-country";
const CURRENCY_EXPLICIT_KEY = "interactiveotel-currency-explicit";

const CurrencyContext = createContext<{
  currency: CurrencyId;
  setCurrency: (c: CurrencyId) => void;
  format: MoneyFormatId;
  setFormat: (f: MoneyFormatId) => void;
  /** Varsayılan ülke (ISO kodu). Yeni misafir uyrukları buradan başlar. */
  defaultCountry: string;
  setDefaultCountry: (code: string) => void;
  /** Elle para birimi seçilmediyse true: ülke değişince para birimi otomatik uyar. */
  currencyAuto: boolean;
  /** Para birimini varsayılan ülkenin para birimine döndürür. */
  resetCurrencyAuto: () => void;
}>({
  currency: "TRY",
  setCurrency: () => {},
  format: "tr",
  setFormat: () => {},
  defaultCountry: DEFAULT_COUNTRY,
  setDefaultCountry: () => {},
  currencyAuto: true,
  resetCurrencyAuto: () => {},
});

export const useCurrency = () => useContext(CurrencyContext);

const localeOf = (format: MoneyFormatId) =>
  format === "tr" ? "tr-TR" : "en-US";

/** Kuruş → biçimli para metni ("₺4.500,00" / "$4,500.00"). */
export function formatMoney(
  minor: number,
  currency: CurrencyId,
  format: MoneyFormatId,
): string {
  try {
    return new Intl.NumberFormat(localeOf(format), {
      style: "currency",
      currency,
    }).format((minor || 0) / 100);
  } catch {
    return `${minor || 0}`;
  }
}

/**
 * Ham girişi kuruşa çevirir. Biçime göre ayraçları yorumlar
 * (tr: "4.500,00", en: "4,500.00"). Boş/geçersiz → null.
 */
export function parseMoney(raw: string, format: MoneyFormatId): number | null {
  let s = raw.replace(/[\s₺$€£]|TL|TRY|USD|EUR|GBP/gi, "").trim();
  if (!s) return null;
  if (format === "tr") {
    s = s.replace(/\./g, "#").replace(/,/g, ".").replace(/#/g, "");
  } else {
    s = s.replace(/,/g, "");
  }
  const parts = s.split(".");
  const norm =
    parts.length > 2
      ? parts.slice(0, -1).join("") + "." + parts[parts.length - 1]
      : s;
  // eslint-disable-next-line no-self-compare
  const f = Number(norm);
  if (!Number.isFinite(f) || f < 0 || f > 9999999999) return null;
  return Math.round(f * 100);
}

/**
 * Yazarken harf/sembol girişini engeller: sadece rakam ve ilgili
 * biçimin ayraçlarına izin verir, ondalık ayracı tekilleştirir.
 */
export function sanitizeMoneyInput(raw: string, format: MoneyFormatId): string {
  let s = raw.replace(/[^0-9.,]/g, "");
  const dec = format === "tr" ? "," : ".";
  const parts = s.split(dec);
  if (parts.length > 2) {
    s = parts[0] + dec + parts.slice(1).join("");
  }
  return s;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyId>("TRY");
  const [format, setFormatState] = useState<MoneyFormatId>("tr");
  const [defaultCountry, setDefaultCountryState] = useState<string>(DEFAULT_COUNTRY);
  // Elle para birimi seçimi (otomatik takibi kapatır).
  const [explicit, setExplicit] = useState(false);
  const explicitRef = React.useRef(false);
  explicitRef.current = explicit;

  useEffect(() => {
    try {
      const storedCountry = localStorage.getItem(COUNTRY_KEY);
      const country = countryByCode(storedCountry)?.code ?? DEFAULT_COUNTRY;
      const storedCurrency = localStorage.getItem(CURRENCY_KEY) as CurrencyId | null;
      const validStored =
        storedCurrency && CURRENCIES.some((o) => o.id === storedCurrency)
          ? storedCurrency
          : null;
      const auto = currencyForCountry(country);
      const wasExplicit =
        localStorage.getItem(CURRENCY_EXPLICIT_KEY) === "1" ||
        (validStored !== null &&
          auto !== null &&
          validStored !== (CURRENCIES.some((o) => o.id === auto) ? auto : null));
      setDefaultCountryState(country);
      if (validStored && wasExplicit) {
        explicitRef.current = true;
        setExplicit(true);
        setCurrencyState(validStored);
      } else if (validStored && !wasExplicit && auto === null) {
        // Ülkenin eşleşen para birimi yoksa kayıtlı değeri koru.
        setCurrencyState(validStored);
      } else if (auto && CURRENCIES.some((o) => o.id === auto)) {
        setCurrencyState(auto as CurrencyId);
      }
      const f = localStorage.getItem(FORMAT_KEY) as MoneyFormatId | null;
      if (f && MONEY_FORMATS.some((o) => o.id === f)) setFormatState(f);
    } catch {
      /* depolama yoksa varsayılanlar */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_KEY, currency);
      localStorage.setItem(CURRENCY_EXPLICIT_KEY, explicit ? "1" : "0");
    } catch {
      /* yoksay */
    }
  }, [currency, explicit]);

  useEffect(() => {
    try {
      localStorage.setItem(COUNTRY_KEY, defaultCountry);
    } catch {
      /* yoksay */
    }
  }, [defaultCountry]);

  useEffect(() => {
    try {
      localStorage.setItem(FORMAT_KEY, format);
    } catch {
      /* yoksay */
    }
  }, [format]);

  const setCurrency = React.useCallback((c: CurrencyId) => {
    explicitRef.current = true;
    setExplicit(true);
    setCurrencyState(c);
  }, []);

  const applyCountryCurrency = React.useCallback((countryCode: string) => {
    const mapped = currencyForCountry(countryCode);
    if (mapped && CURRENCIES.some((o) => o.id === mapped)) {
      setCurrencyState(mapped as CurrencyId);
    }
  }, []);

  const setDefaultCountry = React.useCallback(
    (code: string) => {
      const valid = countryByCode(code)?.code ?? DEFAULT_COUNTRY;
      setDefaultCountryState(valid);
      // Otomatik takipteyse para birimi ülkenin para birimine uyar.
      if (!explicitRef.current) applyCountryCurrency(valid);
    },
    [applyCountryCurrency],
  );

  const resetCurrencyAuto = React.useCallback(() => {
    explicitRef.current = false;
    setExplicit(false);
    setDefaultCountryState((country) => {
      applyCountryCurrency(country);
      return country;
    });
  }, [applyCountryCurrency]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        format,
        setFormat: setFormatState,
        defaultCountry,
        setDefaultCountry,
        currencyAuto: !explicit,
        resetCurrencyAuto,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
