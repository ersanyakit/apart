import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { FieldCaption } from "./FieldCard";
import { useHoldStep } from "./StepperField";

const displayFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const subFmt = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  year: "numeric",
});
const monthFmt = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
});
const monthShortFmt = new Intl.DateTimeFormat("tr-TR", { month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });
// Bilinen bir Pazartesi'den 7 gün etiketi (Pzt … Paz).
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  weekdayFmt.format(new Date(2024, 0, 1 + i)),
);
const MONTHS_SHORT = Array.from({ length: 12 }, (_, m) =>
  monthShortFmt.format(new Date(2024, m, 1)),
);

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};
const sameYMD = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const parseLocal = (v: string): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const circleMiniClass =
  "flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(19,19,19,0.08)] text-slate-600 transition-all duration-150 ease-out hover:bg-[rgba(19,19,19,0.12)] hover:text-slate-900 active:scale-[0.98] cursor-pointer touch-manipulation disabled:opacity-40 disabled:pointer-events-none select-none outline-none focus-visible:ring-2 focus-visible:ring-neutral-400";
const navChevronClass =
  "flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400";
const ghostButtonClass =
  "flex-1 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-500 transition-all duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400";

function TimeStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const holdDown = useHoldStep(() => onChange(clamp(value - 1)), value <= min);
  const holdUp = useHoldStep(() => onChange(clamp(value + 1)), value >= max);
  return (
    <div className="flex-1">
      <p className="font-uninav-book text-[11px] leading-4 tracking-[0.06em] text-slate-400 uppercase">
        {label}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <button type="button" aria-label={`${label} azalt`} disabled={value <= min} {...holdDown} className={circleMiniClass}>
          <Minus size={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <span aria-live="polite" className="font-uninav-book min-w-0 flex-1 text-center text-[1.125rem] leading-7 text-slate-900 tabular-nums">
          {pad(value)}
        </span>
        <button type="button" aria-label={`${label} artır`} disabled={value >= max} {...holdUp} className={circleMiniClass}>
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const PRESETS = [
  { label: "Bugün", offset: 0 },
  { label: "Yarın", offset: 1 },
  { label: "Öbür Gün", offset: 2 },
] as const;

/**
 * Tarih-saat seçim kartı: stepper ile aynı dilde yüzey kartı, büyük
 * formatlı değer, sağda takvim dairesi. Tıklayınca sete özel takvim
 * popover'ı açılır (native popup kullanılmaz):
 * hazır presetler (Bugün/Yarın/Öbür Gün), ay-yıl seçici, gün ızgarası,
 * saat/dakika stepperları.
 * Değer "YYYY-MM-DDTHH:mm" yerel biçiminde taşınır.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
  sub,
  open: controlledOpen,
  onOpenChange,
}: {
  label: string;
  /** Yerel "YYYY-MM-DDTHH:mm" biçiminde değer. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  sub?: string;
  /** Verilirse açık/kapalı durum dışarıdan yönetilir (örn. iki alan birlikte). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : innerOpen;
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(open) : v;
    if (isControlled) onOpenChange?.(next);
    else setInnerOpen(next);
  };
  const [mode, setMode] = useState<"day" | "monthyear">("day");
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const parsed = parseLocal(value);
  const valid = parsed !== null;

  const minDay = min ? startOfDay(parseLocal(min) ?? new Date(0)) : null;
  const maxDay = max ? startOfDay(parseLocal(max) ?? new Date(8640000000000000)) : null;

  const anchor = valid && parsed ? parsed : new Date();
  const [viewY, setViewY] = useState(anchor.getFullYear());
  const [viewM, setViewM] = useState(anchor.getMonth());

  // Her açılışta takvim seçili değere (yoksa bugüne) ve gün görünümüne döner.
  useEffect(() => {
    if (!open) return;
    const a = parseLocal(value) ?? new Date();
    setViewY(a.getFullYear());
    setViewM(a.getMonth());
    setMode("day");
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      // Kontrollü kipte (paylaşımlı açık durumu) dışarı-tıklama ile kapatma
      // YOKTUR: kardeş alanın dinleyicisi bu alanın içindeki tıklamayı
      // "dışarı" sanıp seçimi anında kapatıyordu. Kapatma Tamam / başlık /
      // Esc ile olur.
      if (isControlled) return;
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
  }, [open, isControlled]);

  const moveMonth = (delta: number) => {
    const d = new Date(viewY, viewM + delta, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  };

  const commit = (d: Date) => {
    const lo = min ? parseLocal(min) : null;
    const hi = max ? parseLocal(max) : null;
    let c = new Date(d);
    if (lo && c < lo) c = lo;
    if (hi && c > hi) c = hi;
    onChange(toLocalValue(c));
  };

  const timeOf = (fallbackH: number, fallbackMi: number) => {
    if (valid && parsed && value) return { h: parsed.getHours(), mi: parsed.getMinutes() };
    return { h: fallbackH, mi: fallbackMi };
  };

  const pickDay = (day: number) => {
    const base = valid && parsed ? new Date(parsed) : new Date();
    if (!valid || !value) {
      base.setHours(12, 0, 0, 0);
    }
    base.setFullYear(viewY, viewM, day);
    commit(base);
  };

  const pickPreset = (offset: number) => {
    const base = new Date();
    base.setDate(base.getDate() + offset);
    const { h, mi } = timeOf(12, 0);
    base.setHours(h, mi, 0, 0);
    commit(base);
    setViewY(base.getFullYear());
    setViewM(base.getMonth());
  };

  const pickMonthYear = (m: number, y: number) => {
    if (valid && parsed) {
      const days = new Date(y, m + 1, 0).getDate();
      const base = new Date(parsed);
      base.setFullYear(y, m, Math.min(parsed.getDate(), days));
      commit(base);
    }
    setViewY(y);
    setViewM(m);
    setMode("day");
  };

  const setTime = (h: number, mi: number) => {
    const base = valid && parsed ? new Date(parsed) : new Date();
    if (!valid || !value) {
      const now = new Date();
      base.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    }
    base.setHours(h, mi, 0, 0);
    commit(base);
  };

  const firstOffset = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const today = new Date();
  const selY = valid && parsed ? parsed.getFullYear() : -1;
  const selM = valid && parsed ? parsed.getMonth() : -1;
  const selD = valid && parsed ? parsed.getDate() : -1;
  const curH = valid && parsed ? parsed.getHours() : 12;
  const curMi = valid && parsed ? parsed.getMinutes() : 0;
  const isPresetDay = (offset: number) => {
    if (!valid || !parsed) return false;
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return sameYMD(parsed, d);
  };

  return (
    <div ref={rootRef} className={`rounded-[20px] bg-[#f9f9f9] p-4 transition-colors duration-150 ease-out ${open ? "" : "hover:bg-[#efefef]"}`}>
      <button
        type="button"
        aria-label={`${label} seçin. Seçili: ${valid && parsed ? displayFmt.format(parsed) : "yok"}`}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl text-left outline-none transition-transform duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <span className="min-w-0 flex-1">
          <FieldCaption>{label}</FieldCaption>
            <span
              className={`font-uninav-book mt-1 block truncate text-[1.5rem] leading-[1.75rem] ${
                valid ? "text-slate-900" : "text-slate-400"
              }`}
            >
            {valid && parsed ? displayFmt.format(parsed) : "Tarih seçin"}
          </span>
          <span className="mt-1 block truncate text-[0.875rem] leading-5 text-slate-500">
            {sub ?? (valid && parsed ? subFmt.format(parsed) : "gün • saat")}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(19,19,19,0.08)] text-slate-600 transition-colors duration-150 ease-out group-hover:bg-[rgba(19,19,19,0.12)]">
            <CalendarDays size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2.5}
            aria-hidden="true"
            className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="cal-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="select-none overflow-hidden"
          >
            <div className="mt-3 border-t border-slate-200/70 pt-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label={mode === "day" ? "Önceki ay" : "Önceki yıl"}
                onClick={() => (mode === "day" ? moveMonth(-1) : setViewY((y) => y - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all duration-150 ease-out hover:bg-white hover:text-slate-900 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <ChevronLeft size={16} strokeWidth={2.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={mode === "day" ? "Ay ve yıl seç" : "Gün görünümüne dön"}
                aria-expanded={mode === "monthyear"}
                onClick={() => setMode((m) => (m === "day" ? "monthyear" : "day"))}
                className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 outline-none transition-colors duration-150 ease-out hover:bg-slate-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <span aria-live="polite" className="font-uninav-book text-[0.9375rem] leading-5 text-slate-900 capitalize">
                  {mode === "day"
                    ? monthFmt.format(new Date(viewY, viewM, 1))
                    : `${viewY}`}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2.5}
                  aria-hidden="true"
                  className={`text-slate-400 transition-transform duration-150 ${mode === "monthyear" ? "rotate-180" : ""}`}
                />
              </button>
              <button
                type="button"
                aria-label={mode === "day" ? "Sonraki ay" : "Sonraki yıl"}
                onClick={() => (mode === "day" ? moveMonth(1) : setViewY((y) => y + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all duration-150 ease-out hover:bg-white hover:text-slate-900 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>

            {mode === "day" ? (
              <>
                <div aria-label="Hızlı tarihler" className="mt-3 flex gap-2">
                  {PRESETS.map((p) => {
                    const active = isPresetDay(p.offset);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => pickPreset(p.offset)}
                      className={`flex-1 cursor-pointer rounded-full border px-2 py-1.5 text-xs font-bold outline-none transition-all duration-150 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                        active
                          ? "border-brand-blue-300 bg-brand-blue-50 text-brand-blue-700"
                          : "border-slate-300/80 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div aria-hidden="true" className="mt-3 grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((d) => (
                    <span key={d} className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstOffset }).map((_, i) => (
                    <span key={`b-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const cell = new Date(viewY, viewM, day);
                    const cellDay = startOfDay(cell);
                    const out =
                      (minDay && cellDay < minDay) || (maxDay && cellDay > maxDay);
                    const isSel = viewY === selY && viewM === selM && day === selD;
                    const isToday =
                      viewY === today.getFullYear() &&
                      viewM === today.getMonth() &&
                      day === today.getDate();
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={out || disabled}
                        aria-label={`${day} ${monthFmt.format(new Date(viewY, viewM, 1))}`}
                        aria-pressed={isSel}
                        onClick={() => pickDay(day)}
                        className={`flex aspect-square w-full items-center justify-center rounded-full text-[0.9375rem] tabular-nums outline-none transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                          isSel
                            ? "bg-brand-blue-600 font-bold text-white shadow-md active:scale-[0.98] cursor-pointer"
                            : out
                              ? "cursor-not-allowed text-slate-300"
                              : "text-slate-700 hover:bg-slate-100 active:scale-[0.98] cursor-pointer"
                        } ${!isSel && isToday ? "ring-1 ring-inset ring-slate-400" : ""}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <TimeStepper label="Saat" value={curH} min={0} max={23} onChange={(h) => setTime(h, curMi)} />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <TimeStepper label="Dakika" value={curMi} min={0} max={59} onChange={(mi) => setTime(curH, mi)} />
              </div>
            </div>
              </>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {MONTHS_SHORT.map((name, m) => {
                  const isCur =
                    viewY === today.getFullYear() && m === today.getMonth();
                  const isSel = m === viewM;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={isSel}
                      onClick={() => pickMonthYear(m, viewY)}
                      className={`rounded-xl px-1 py-2.5 text-[13px] font-bold outline-none transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-neutral-400 active:scale-[0.98] cursor-pointer ${
                        isSel
                          ? "bg-brand-blue-600 text-white shadow-md"
                          : "text-slate-600 hover:bg-white hover:text-slate-900"
                      } ${!isSel && isCur ? "ring-1 ring-inset ring-slate-300" : ""}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="flex-1 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-500 transition-all duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-[2] rounded-xl bg-brand-blue-600 px-3 py-2 text-[13px] font-bold text-white transition-all duration-150 ease-out hover:bg-brand-blue-700 active:bg-brand-blue-700 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/40"
              >
                Tamam
              </button>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
