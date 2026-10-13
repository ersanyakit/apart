import React from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Apple-çizgisi anahtar (switch): etiket + açıklama solu, sağda
 * yaylı topuzlu iz. Açık/kapalı durum net renkle belli olur;
 * klavye ve ekran okuyucu desteği yerleşik (role="switch").
 */
export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
  hideLabel = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="uni-control flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 py-1 text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={hideLabel ? "sr-only" : "min-w-0 flex-1"}>
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs leading-5 text-slate-400">{hint}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-150 ease-out ${
          checked ? "justify-end bg-brand-blue-500" : "justify-start bg-slate-200"
        }`}
      >
        <motion.span
          initial={false}
          animate={{ scale: checked ? 1 : 0.9 }}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 32 }}
          className="block h-5 w-5 rounded-full bg-white shadow"
        />
      </span>
    </button>
  );
}
