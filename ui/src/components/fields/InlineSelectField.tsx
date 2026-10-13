import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { FieldCard, FieldCaption } from "./FieldCard";

export interface InlineSelectOption {
  value: string;
  label: string;
}

/**
 * Satır-içi açılır seçim kartı: DateField ile aynı yüzey dili
 * (başlık + büyük değer + chevron), seçenekler kartın içinde
 * genişler; native select popup'u kullanılmaz. Pano filtreleri
 * gibi her yerde tek tip seçim için.
 */
export function InlineSelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: InlineSelectOption[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const selected = options.find((o) => o.value === value);

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

  return (
    <FieldCard className="h-full">
      <button
        type="button"
        aria-label={`${label}: ${selected?.label ?? "Seçin"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left outline-none transition-transform duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-xl"
      >
        <span className="min-w-0 flex-1">
          <FieldCaption>{label}</FieldCaption>
          <span className="font-uninav-book mt-1 block truncate text-[1.25rem] leading-8 text-slate-900">
            {selected?.label ?? "Seçin"}
          </span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && !disabled && (
          <motion.div
            key="inline-select-list"
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
              aria-label={label}
              className="mt-3 max-h-72 space-y-0.5 overflow-y-auto border-t border-slate-200/70 pt-3"
            >
              {options.map((o) => {
                const isActive = o.value === value;
                return (
                  <button
                    key={o.value || "(all)"}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setOpen(false);
                      if (o.value !== value) onChange(o.value);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.9375rem] font-bold outline-none transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                      isActive
                        ? "bg-brand-blue-50/70 text-brand-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {isActive && (
                      <Check
                        size={15}
                        strokeWidth={2.5}
                        aria-hidden="true"
                        className="shrink-0 text-brand-blue-600"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FieldCard>
  );
}
