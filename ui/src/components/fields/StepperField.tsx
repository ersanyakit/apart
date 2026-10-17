import { useI18n } from "../I18n";
import React from "react";
import { Minus, Plus } from "lucide-react";
import { FieldCard, FieldCaption } from "./FieldCard";

/** Basılı tutunca otomatik tekrarlayan adım (referans hold-to-step deseni). */
export function useHoldStep(step: () => void, disabled?: boolean) {
  const timers = React.useRef<{
    delay?: ReturnType<typeof setTimeout>;
    repeat?: ReturnType<typeof setInterval>;
  }>({});
  const clear = React.useCallback(() => {
    if (timers.current.delay) clearTimeout(timers.current.delay);
    if (timers.current.repeat) clearInterval(timers.current.repeat);
    timers.current = {};
  }, []);
  React.useEffect(() => clear, [clear]);
  return {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* yakalama desteklenmiyorsa yoksay */
      }
      step();
      timers.current.delay = setTimeout(() => {
        timers.current.repeat = setInterval(step, 70);
      }, 350);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!disabled) step();
      }
    },
  };
}

const stepperButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(19,19,19,0.08)] text-slate-600 transition-all duration-150 ease-out hover:bg-[rgba(19,19,19,0.12)] hover:text-slate-900 active:scale-[0.98] cursor-pointer touch-manipulation disabled:opacity-40 disabled:pointer-events-none select-none outline-none focus-visible:ring-2 focus-visible:ring-neutral-400";

/**
 * Miktar stepper kartı: solda başlık + büyük düzenlenebilir değer + alt bilgi,
 * sağda üst üste artı/eksi daire butonlar (referans Min/Max price kartı birebir).
 */
export function StepperField({
  label,
  value,
  min = 1,
  max = 100000,
  stepSize = 1,
  onChange,
  sub,
  disabled,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  stepSize?: number;
  onChange: (value: number) => void;
  sub?: string;
  disabled?: boolean;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const clamp = (v: number) => Math.min(max, Math.max(min, (stepSize === 1 ? Math.floor(v) : Number(v.toFixed(6)))));
  // Basılı-tut tekrarı bayat değerle çalışmasın diye güncel değer ref'te tutulur.
  const valueRef = React.useRef(value);
  valueRef.current = value;
  // Elle yazmayı serbest bırakmak için taslak metin tutulur:
  // boş silme + çok haneli yazma engellenmez, geçerli sayı anında
  // üst bileşene de yansıtılır (kaydet'e basılsa bile güncel kalır).
  const [draft, setDraft] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Odak dışındayken dışarıdan gelen değerle senkronize ol (yazarken bölme).
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(null);
  }, [value]);
  const commitDraft = React.useCallback(() => {
    if (draft === null) return;
    const t = draft.trim();
    if (t === "") {
      setDraft(null);
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n)) {
      setDraft(null);
      return;
    }
    const c = clamp(n);
    setDraft(null);
    if (c !== valueRef.current) onChange(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, min, max, stepSize, onChange]);
  const step = React.useCallback(
    (delta: number) => {
      setDraft(null);
      onChange(clamp(valueRef.current + delta));
    },
    [min, max, stepSize, onChange],
  );
  const holdUp = useHoldStep(() => step(stepSize), disabled || value >= max);
  const holdDown = useHoldStep(() => step(-stepSize), disabled || value <= min);

  return (
    <FieldCard>
      <div
        role="group"
        aria-label={_uiText("{value1} seçimi", {value1: String(label)})}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button,input")) return;
          inputRef.current?.focus();
        }}
        className="flex cursor-text items-center justify-between gap-4"
      >
        <div className="min-w-0 flex-1">
          <FieldCaption>{label}</FieldCaption>
          <input
            ref={inputRef}
            type="number"
            step={stepSize === 1 ? 1 : "any"}
            min={min}
            max={max}
            required
            disabled={disabled}
            aria-label={label}
            value={draft ?? value}
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              // Boşken bekle (silip yeniden yazmaya izin ver).
              if (raw.trim() === "") return;
              const n = Number(raw);
              if (!Number.isFinite(n)) return;
              const c = clamp(n);
              if (c !== valueRef.current) onChange(c);
            }}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDraft();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            className="font-uninav-book mt-1 w-full min-w-0 bg-transparent text-[1.5rem] leading-[1.75rem] text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {sub && (
            <p className="mt-1 truncate text-[0.875rem] leading-5 text-slate-500">
              {sub}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-[10px]">
          <button
            type="button"
            aria-label={_uiText("{value1} artır", {value1: String(label)})}
            disabled={disabled || value >= max}
            {...holdUp}
            className={stepperButtonClass}
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={_uiText("{value1} azalt", {value1: String(label)})}
            disabled={disabled || value <= min}
            {...holdDown}
            className={stepperButtonClass}
          >
            <Minus size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </FieldCard>
  );
}
