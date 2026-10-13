import React from "react";
import { X } from "lucide-react";
import { FieldCard, FieldCaption } from "./FieldCard";
import { InlineSelectField } from "./InlineSelectField";
import { LOCALES, type Locale } from "../../lib/i18n/config";

export type LocalizedValues = Record<string, string>;

/**
 * Merkezi dil listesindeki (Ayarlar → Dil ile aynı kaynak) adıyla
 * içerik dilini gösterir. Kayıtlar `{ TR: "..." }` biçiminde taşınır.
 */
function languageName(code: string): string {
  const entry = (LOCALES as Record<string, { label: string }>)[
    code.toLowerCase()
  ];
  return entry?.label ?? code;
}

/** Merkezi listedeki sırayla içerik kodları (büyük harf). */
function centralCodes(): string[] {
  return (Object.keys(LOCALES) as Locale[]).map((l) => l.toUpperCase());
}

/**
 * Çok dilli metin alanı: aynı metnin (isim, açıklama…) her dildeki
 * karşılığı alt alta kartlarda durur, dil eklenip çıkarılabilir.
 * Olanak adları, kategori adları gibi her yerde tek tip kullanılır.
 */
export function LocalizedTextFields({
  label,
  hint,
  values,
  onChange,
  requiredLang = "TR",
  multiline = false,
  rows = 2,
  mono = false,
  compact = false,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: LocalizedValues;
  onChange: (values: LocalizedValues) => void;
  /** Boş bırakılamayacak dil (yerel zorunluluk için). */
  requiredLang?: string;
  multiline?: boolean;
  rows?: number;
  /** Kod/metin şablonları için tek aralıklı yazı. */
  mono?: boolean;
  /** Başlıksız gömülü kullanım (kart içi satırlar). */
  compact?: boolean;
  placeholder?: string;
}) {
  const entered = centralCodes().filter(
    (code) => values[code] !== undefined,
  );
  const ordered = [
    ...entered.filter((c) => c === requiredLang),
    ...entered.filter((c) => c !== requiredLang),
  ];
  const remaining = centralCodes()
    .filter((code) => values[code] === undefined)
    .map((code) => ({ value: code, label: `${languageName(code)} (${code})` }));

  const setLang = (code: string, text: string) =>
    onChange({ ...values, [code]: text });
  const dropLang = (code: string) => {
    const next = { ...values };
    delete next[code];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="min-w-0">
          <h3 className="font-uninav-book text-[1.125rem] leading-6 text-slate-900">
            {label}
            {requiredLang && (
              <span aria-hidden="true" className="text-red-500"> *</span>
            )}
          </h3>
          {hint && (
            <p className="mt-1 text-[0.875rem] leading-5 text-slate-500">{hint}</p>
          )}
        </div>
      )}
      {ordered.map((code) => (
        <FieldCard key={code}>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              title={languageName(code)}
              className="font-uninav-book flex h-10 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(19,19,19,0.08)] text-[13px] text-slate-600"
            >
              {code}
            </span>
            <label className="block min-w-0 flex-1 cursor-text">
              <FieldCaption>{`${languageName(code)} ${label.toLocaleLowerCase("tr-TR")}`}</FieldCaption>
              {multiline ? (
                <textarea
                  rows={rows}
                  required={code === requiredLang}
                  aria-label={`${languageName(code)} ${label}`}
                  placeholder={placeholder}
                  value={values[code] ?? ""}
                  onChange={(e) => setLang(code, e.target.value)}
                  className={`mt-1 w-full min-w-0 resize-y bg-transparent outline-none placeholder:text-slate-400 placeholder:text-base disabled:opacity-60 ${
                    mono
                      ? "font-mono text-xs leading-6 text-slate-800"
                      : "font-uninav-book text-[1.125rem] leading-7 text-slate-900"
                  }`}
                />
              ) : (
                <input
                  type="text"
                  required={code === requiredLang}
                  aria-label={`${languageName(code)} ${label}`}
                  placeholder={placeholder}
                  autoComplete="off"
                  value={values[code] ?? ""}
                  onChange={(e) => setLang(code, e.target.value)}
                  className="font-uninav-book mt-1 w-full min-w-0 bg-transparent text-[1.25rem] leading-8 text-slate-900 outline-none placeholder:text-slate-400 placeholder:normal-case placeholder:text-base disabled:opacity-60"
                />
              )}
            </label>
            <button
              type="button"
              aria-label={`${languageName(code)} çevirisini kaldır`}
              title="Çeviriyi kaldır"
              disabled={ordered.length <= 1}
              onClick={() => dropLang(code)}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 outline-none transition-all duration-150 ease-out hover:bg-red-50 hover:text-red-500 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-30"
            >
              <X size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </FieldCard>
      ))}
      {remaining.length > 0 && (
        <InlineSelectField
          label="Dil ekle"
          value=""
          onChange={(code) => {
            if (code) setLang(code, "");
          }}
          options={[{ value: "", label: "Seçin" }, ...remaining]}
        />
      )}
    </div>
  );
}
