import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown, Globe, Search } from "lucide-react";
import { useI18n } from "./I18n";
import { CountryRow } from "./fields/NationalityField";
import {
  countryByCode,
  countryFlag,
  searchCountries,
} from "../lib/countries";

/**
 * Ayarlar tipi ülke seçici: bayraklı tetikleyici + birim seçiciyle
 * aynı açılır panel (arama + liste). Değer ISO kodu taşınır.
 */
export function CountrySelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const { locale, direction, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const selected = countryByCode(value, locale);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = setTimeout(() => searchInputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  const matches = useMemo(() => searchCountries(q, 100, locale), [q, locale]);

  return (
    <div ref={rootRef} className="relative" lang={locale} dir={direction}>
      <button
        type="button"
        aria-label={t("country.trigger", { label, name: selected?.name ?? t("common.none") })}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[20px] border border-uni-border bg-uni-surface px-4 py-3 text-start outline-none transition-all duration-150 ease-out hover:bg-uni-hover active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl leading-none shadow-sm ring-1 ring-slate-200/70">
            {countryFlag(value) || <Globe size={18} className="text-slate-500" />}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-uni-muted">
              {label}
            </span>
            <span className="block truncate text-[1.125rem] font-medium leading-7 text-uni-ink">
              {selected ? _uiText("{value1}", {value1: String(selected.name)}) : t("country.select")}
            </span>
          </span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{
              duration: reducedMotion ? 0 : 0.15,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="absolute left-0 right-0 z-50 mt-2 origin-top"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 p-2">
                <div className="relative">
                  <Search
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={searchInputRef}
                    aria-label={t("country.search")}
                    placeholder={t("country.searchPlaceholder")}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm text-slate-800 outline-none transition-all duration-150 ease-out placeholder:text-slate-400 focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-300"
                  />
                </div>
              </div>
              <div
                role="listbox"
                aria-label={t("country.results")}
                className="max-h-72 overflow-y-auto p-1.5"
              >
                {matches.map((c) => (
                  <CountryRow
                    key={c.code}
                    country={c}
                    selected={c.code === value}
                    onPick={() => {
                      onChange(c.code);
                      setOpen(false);
                    }}
                  />
                ))}
                {matches.length === 0 && (
                  <p className="px-3 py-4 text-center text-[12px] text-slate-400">
                    {t("country.noResults")}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
