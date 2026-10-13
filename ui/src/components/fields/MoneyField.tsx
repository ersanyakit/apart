import React, { useState } from "react";
import { FieldCard, FieldCaption } from "./FieldCard";
import {
  useCurrency,
  formatMoney,
  parseMoney,
  sanitizeMoneyInput,
  CURRENCIES,
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
 */
export function MoneyField({
  label,
  valueMinor,
  onChange,
  disabled,
  sub,
}: {
  label: string;
  valueMinor: number;
  onChange: (minor: number) => void;
  disabled?: boolean;
  sub?: string;
}) {
  const { currency, format } = useCurrency();
  const [text, setText] = useState(() =>
    valueMinor > 0 ? String(valueMinor / 100).replace(".", ",") : "",
  );
  const symbol =
    CURRENCIES.find((c) => c.id === currency)?.symbol ?? "₺";
  return (
    <FieldCard className="h-full">
      <label className="block min-w-0 cursor-text">
        <FieldCaption>{label}</FieldCaption>
        <span className="mt-1 flex h-10 items-center gap-2">
          <input
            aria-label={label}
            inputMode="decimal"
            autoComplete="off"
            placeholder={format === "tr" ? "0,00" : "0.00"}
            disabled={disabled}
            value={text}
            onChange={(e) => {
              const clean = sanitizeMoneyInput(e.target.value, format);
              setText(clean);
              const parsed = parseMoney(clean, format);
              onChange(parsed === null ? 0 : parsed);
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
      </label>
    </FieldCard>
  );
}
