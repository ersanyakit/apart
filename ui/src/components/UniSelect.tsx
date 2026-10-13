import React, { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

export interface UniOption {
  value: string;
  label: string;
}

interface UniSelectProps {
  /** Micro caption shown above the value, e.g. "OTEL" / "TESİS" */
  caption: string;
  icon: React.ReactNode;
  value: string;
  options: UniOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

/**
 * Ortak menü, focus ve press tokenlarını kullanan klavye erişimli seçim.
 * Spec from interface-main:
 * - DropdownMenuSheetItem small: px-3 (12px) / py-2 (8px), gap-2 (8px),
 *   rounded-xl (12px), label buttonLabel3 14/20/535, hover surface.
 * - Menu container (NavDropdown): rounded-2xl (16px), 1px border, medium
 *   shadow, p-1.5, open animation scale 0.95-0.97 + opacity, fast (~150ms).
 * Renkler projenin kendi paletinden (brand-blue / slate).
 */
export const UniSelect: React.FC<UniSelectProps> = ({
  caption,
  icon,
  value,
  options,
  onChange,
  ariaLabel,
}) => {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const selected = rootRef.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]');
    (selected ?? rootRef.current?.querySelector<HTMLButtonElement>('[role="option"]'))?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const items = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`uni-control
          uni-select-trigger w-full flex items-center gap-2 min-h-11 px-3 py-2 rounded-xl
          border bg-white    cursor-pointer active:scale-[0.98]
          outline-none
          ${open ? "border-slate-300 bg-white" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 active:bg-slate-50/60"}
        `}
      >
        <span className="w-8 h-8 rounded-lg bg-brand-blue-50 text-brand-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="font-uninav-book block text-[10px] leading-3 tracking-[0.08em] uppercase text-slate-500">
            {caption}
          </span>
          <span className="uni-nav-sub-active block truncate text-slate-800 mt-0.5">
            {selected?.label ?? "—"}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
          className="shrink-0 flex items-center"
        >
          <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={2} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="absolute top-full left-0 right-0 mt-2 z-50 origin-top"
          >
            <div
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              className="uni-card bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/8 ring-1 ring-slate-900/5 p-1.5 max-h-64 overflow-y-auto"
            >
              <div className="space-y-0.5">
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                        triggerRef.current?.focus();
                      }}
                      className={`uni-control
                        uni-menu-item w-full flex items-center gap-2 px-3 py-2 min-h-10 rounded-xl
                           text-left select-none cursor-pointer active:scale-[0.98]
                        outline-none
                        ${isSelected ? "uni-nav-sub-active" : "uni-nav-sub"}
                        ${isSelected ? "bg-brand-blue-50/70 text-brand-blue-700" : "text-slate-600 hover:bg-slate-50 active:bg-slate-50 hover:text-slate-900"}
                      `}
                    >
                      <span className="flex-1 min-w-0 truncate">
                        {opt.label}
                      </span>
                      {isSelected ? (
                        <Check
                          className="w-4 h-4 shrink-0 text-brand-blue-600"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <span className="w-4 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
                {options.length === 0 && (
                  <p className="font-uninav-book px-3 py-4 text-center text-[12px] leading-4 text-slate-400">
                    Kayıt yok
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
