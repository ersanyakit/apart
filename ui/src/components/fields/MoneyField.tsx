import React, { useEffect, useRef, useState } from "react";
import { FieldCard, FieldCaption } from "./FieldCard";
import {
  useCurrency,
  formatMoney,
  parseMoney,
  sanitizeMoneyInput,
  canonicalMoneyText,
  currencySymbolClass,
  CURRENCIES,
  type CurrencyId,
} from "../Currency";

/**
 * Salt biçimli tutar metni (bağlamsız kullanım: tablo, detay).
 * Değer her zaman Ayarlar → Para Birimi seçimine göre biçimlenir.
 */
export function MoneyText({ minor }: { minor: number }) {
  const { currency, format } = useCurrency();
  return <>{formatMoney(minor, currency, format)}</>;
}

/**
 * Para giriş kartı: başlık + büyük şeffaf tutar + para birimi rozeti +
 * canlı formatlı alt bilgi. Değer kuruş (minor) taşınır; harf/sembol
 * girişi engellenir, alta her zaman formatlı karşılığı yazılır.
 *
 * Fiyat/tutar girilen TEK bileşendir: yazarken ikinci ayraç ve 2
 * basamaktan fazla kuruş kabul edilmez ("123.,231" yazılamaz),
 * yapıştırılan binlikli metin ("1.234,56") kurallı biçime döner,
 * geçersiz metin ("...") kırmızı uyarıyla gösterilir ve 0 taşınır.
 */
export function MoneyField({
  label,
  valueMinor,
  onChange,
  disabled,
  sub,
  currency: currencyOverride,
}: {
  label: string;
  valueMinor: number;
  onChange: (minor: number) => void;
  disabled?: boolean;
  sub?: string;
  /** Verilmezse Ayarlar'daki para birimi kullanılır (kayıt ekranları kendi birimini verir). */
  currency?: CurrencyId;
}) {
  const { currency: preferredCurrency, format } = useCurrency();
  const currency = currencyOverride ?? preferredCurrency;
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() =>
    valueMinor > 0 ? canonicalMoneyText(valueMinor, format) : "",
  );
  // Dışarıdan değişen değer (kalan borç ön-doldurma, kayıttan sonra
  // sıfırlama) yazılmakta olan metni ezmez; odaktan çıkınca eşitlenir.
  useEffect(() => {
    if (text === "" || document.activeElement === inputRef.current) return;
    const parsed = parseMoney(text, format);
    if (parsed !== null && parsed !== valueMinor) {
      setText(valueMinor > 0 ? canonicalMoneyText(valueMinor, format) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueMinor]);
  const invalid = text !== "" && parseMoney(text, format) === null;
  const apply = (next: string) => {
    const clean = sanitizeMoneyInput(next, format);
    setText(clean);
    const parsed = parseMoney(clean, format);
    onChange(parsed === null ? 0 : parsed);
  };
  const example = `250${format === "tr" ? "," : "."}25`;
  const symbol =
    CURRENCIES.find((c) => c.id === currency)?.symbol ?? "₺";
  return (
    <FieldCard className="h-full">
      <label className="block min-w-0 cursor-text">
        <FieldCaption>{label}</FieldCaption>
        <span className="mt-1 flex h-10 items-center gap-2">
          <input
            ref={inputRef}
            aria-label={label}
            aria-invalid={invalid || undefined}
            inputMode="decimal"
            autoComplete="off"
            placeholder={format === "tr" ? "0,00" : "0.00"}
            disabled={disabled}
            value={text}
            onChange={(e) => apply(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData?.getData("text") ?? "";
              if (!pasted) return;
              e.preventDefault();
              const parsed = parseMoney(pasted, format);
              if (parsed === null) return;
              const clean = canonicalMoneyText(parsed, format);
              setText(clean);
              onChange(parsed);
            }}
            className="font-uninav-book min-w-0 flex-1 bg-transparent text-[1.25rem] leading-8 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
          />
          <span
            aria-hidden="true"
            className={`font-uninav-book flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(19,19,19,0.08)] text-slate-600 ${currencySymbolClass(symbol)}`}
          >
            {symbol}
          </span>
        </span>
        <span className="mt-1 block truncate text-[0.875rem] leading-5 text-slate-500">
          {sub ?? `${formatMoney(valueMinor, currency, format)} / gece`}
        </span>
        {invalid && (
          <span role="alert" className="mt-1 block text-[0.875rem] leading-5 text-red-600">
            Geçerli tutar yazın (örn. {example})
          </span>
        )}
      </label>
    </FieldCard>
  );
}
