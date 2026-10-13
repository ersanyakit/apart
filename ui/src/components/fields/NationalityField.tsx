import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../I18n";
import { FieldCard, FieldCaption } from "./FieldCard";
import {
  countryByCode,
  countryFlag,
  searchCountries,
  normalizeCountrySearch,
  type Country,
} from "../../lib/countries";

export function CountryRow({
  country,
  selected,
  onPick,
}: {
  country: Country;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      // Fareyle seçimde input blur'ü seçimi yutmaması için.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-start outline-none transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
        selected
          ? "bg-brand-blue-50/70 text-brand-blue-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span aria-hidden="true" className="text-xl leading-none">
        {countryFlag(country.code)}
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold leading-5 text-slate-900">
        {country.name}
      </span>
      <span className="shrink-0 text-[11px] font-bold tracking-wider text-slate-400">
        {country.code}
      </span>
    </button>
  );
}

/**
 * Uyruk kartı: TextField ile aynı yüzey dili (başlık + çerçevesiz
 * büyük değer), solda seçili ülkenin bayrak rozeti. Yazıldıkça
 * ülke listesi süzülür; seçim ISO kodu olarak taşınır.
 */
export function NationalityField({
  label,
  value,
  onChange,
  required,
  disabled,
  tone = "surface",
  placeholder,
}: {
  label: string;
  /** ISO 3166-1 alpha-2 ülke kodu (örn. "TR"), boş olabilir. */
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  disabled?: boolean;
  tone?: "surface" | "white";
  placeholder?: string;
}) {
  const { locale, direction, t } = useI18n();
  const selected = countryByCode(value, locale);
  const [text, setText] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  // External selections and language changes must update the displayed name.
  useEffect(() => {
    setText(countryByCode(value, locale)?.name ?? "");
  }, [value, locale]);

  const matches = useMemo(() => searchCountries(text, 40, locale), [text, locale]);

  // Esc ile kapatma (takvim kartındaki gibi; dışarı tıklama kapatmaz,
  // form içi etkileşimi kesmemesi için).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  const commit = () => {
    // Birebir eşleşme varsa kodu al, yoksa seçimi koru/temizle.
    const exact = matches.find(
      (c) => normalizeCountrySearch(c.name, locale) === normalizeCountrySearch(text, locale) || c.code.toLowerCase() === text.trim().toLowerCase(),
    );
    if (exact) {
      if (exact.code !== value) onChange(exact.code);
      setText(exact.name);
    } else if (!text.trim()) {
      if (value) onChange("");
      setText("");
    } else {
      setText(selected?.name ?? "");
    }
    setOpen(false);
  };

  const pick = (c: Country) => {
    if (c.code !== value) onChange(c.code);
    setText(c.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  const flag = countryFlag(value);

  return (
    <div className="h-full" lang={locale} dir={direction}>
    <FieldCard className={tone === "white" ? "h-full bg-white" : "h-full"}>
      <div className="flex items-center justify-between gap-3">
        <span
          aria-hidden="true"
          title={selected?.name}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(19,19,19,0.08)] text-xl leading-none"
        >
          {flag || "🌍"}
        </span>
        <label className="block min-w-0 flex-1 cursor-text">
          <FieldCaption>{label}</FieldCaption>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-autocomplete="list"
            required={required}
            disabled={disabled}
            placeholder={placeholder ?? t("country.searchPlaceholder")}
            autoComplete="off"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches.length > 0) {
                e.preventDefault();
                pick(matches[0]);
              }
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
              }
            }}
            className="font-uninav-book mt-1 w-full min-w-0 bg-transparent text-[1.25rem] leading-8 text-slate-900 outline-none placeholder:text-slate-400 placeholder:normal-case placeholder:text-base disabled:opacity-60"
          />
        </label>
        <ChevronDown
          size={16}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </div>

      <AnimatePresence initial={false}>
        {open && !disabled && (
          <motion.div
            key="country-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.18,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="select-none overflow-hidden"
          >
            <div
              role="listbox"
              aria-label={t("country.results")}
              className="mt-3 max-h-72 overflow-y-auto border-t border-slate-200/70 pt-3"
            >
              {matches.map((c) => (
                <CountryRow
                  key={c.code}
                  country={c}
                  selected={c.code === value}
                  onPick={() => pick(c)}
                />
              ))}
              {matches.length === 0 && (
                <p className="font-uninav-book px-3 py-4 text-center text-[12px] leading-4 text-slate-400">
                  {t("country.noResults")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FieldCard>
    </div>
  );
}
