import { useI18n } from "../I18n";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Building2, Check, ChevronDown, Search } from "lucide-react";
import { occupancy, unitKinds, type APIRoom, type Snapshot } from "../../lib/api";
import { FieldCard, FieldCaption } from "./FieldCard";

/**
 * Birim seçim kartı: tetikleyici + kartın içinde genişleyen liste
 * (takvim kartı standardı: arama, durum noktası, kod/tip/kapasite,
 * klavye gezintisi). Doluluk, giriş anına göre hesaplanır;
 * düzenlenen kayıt hariç tutulur.
 */
export function RoomSelectField({
  label,
  value,
  onChange,
  snapshot,
  checkInISO,
  excludeBookingId,
  rooms: roomsOverride,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (roomId: string) => void;
  snapshot: Snapshot;
  /** Giriş anı (ISO). Doluluk buna göre hesaplanır. */
  checkInISO: string;
  /** Düzenlenen rezervasyon (kendi birimini dolu göstermez). */
  excludeBookingId?: string;
  /** Verilirse müsaitlik filtresi sonucu kullanılır. */
  rooms?: APIRoom[];
  disabled?: boolean;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  const rooms = useMemo(
    () => roomsOverride ?? snapshot.rooms.filter((r) => r.rentable),
    [roomsOverride, snapshot.rooms],
  );
  const selected = rooms.find((r) => r.room_id === value);

  const busyByRoom = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const r of rooms) {
      const stays = occupancy(snapshot.rooms, snapshot.bookings, r, checkInISO);
      map.set(
        r.room_id,
        stays.some((b) => b.booking_id !== excludeBookingId),
      );
    }
    return map;
  }, [rooms, snapshot.rooms, snapshot.bookings, checkInISO, excludeBookingId]);

  const q = query.toLocaleLowerCase(_uiLocale);
  const filtered = rooms.filter((r) => {
    if (!q) return true;
    const hay = `${r.code} ${unitKinds[r.kind]} ${r.effective_capacity || r.capacity}`
      .toLocaleLowerCase(_uiLocale);
    return hay.includes(q);
  });

  useEffect(() => {
    if (!open) return;
    setActiveIdx(() => {
      const i = filtered.findIndex((r) => r.room_id === value);
      return i >= 0 ? i : 0;
    });
    const t = setTimeout(() => searchRef.current?.focus(), 40);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

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

  useEffect(() => {
    menuRef.current
      ?.querySelector(`[data-idx="${activeIdx}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open ]);

  const pick = (roomId: string) => {
    onChange(roomId);
    setOpen(false);
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = filtered[activeIdx];
      if (r) pick(r.room_id);
    }
  };

  const selectedBusy = selected ? busyByRoom.get(selected.room_id) : false;

  return (
    <div className="h-full">
      <FieldCard className="h-full">
        <button
          type="button"
          aria-label={_uiText("{value1} seçin. Seçili: {value2}", {value1: String(label), value2: String(selected ? `${selected.code} ${unitKinds[selected.kind]}` : "yok")})}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className="flex w-full cursor-pointer items-center justify-between gap-3 text-left outline-none transition-all duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-xl"
        >
          <span className="min-w-0 flex-1">
            <FieldCaption>{label}</FieldCaption>
            <span className="mt-1 flex h-10 min-w-0 items-center">
              <span
                className={`font-uninav-book block truncate text-[1.25rem] leading-8 ${selected ? "text-slate-900" : "text-slate-400"}`}
              >
                {selected
                  ? _uiText("{value1} · {value2}", {value1: String(selected.code), value2: String(unitKinds[selected.kind])})
                  : _uiText("Birim seçin")}
              </span>
            </span>
            <span className="mt-1 block truncate text-[0.875rem] leading-5 text-slate-500">
              {selected
                ? _uiText("{value1}{value2}", {value1: String(selected.kind === "bed" ? `${selected.capacity} kişi · ` : ""), value2: String(selectedBusy ? "Dolu" : "Müsait")})
                : _uiText("kod · tip · müsaitlik")}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(19,19,19,0.08)] text-slate-600">
              <Building2 size={18} strokeWidth={2} aria-hidden="true" />
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
              key="room-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.18,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="select-none overflow-hidden"
            >
              <div className="mt-3 border-t border-slate-200/70 pt-3">
                <div className="relative">
                  <Search
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={searchRef}
                    aria-label={_uiText("Birim ara")}
                    placeholder={_uiText("Oda kodu veya tip ara…")}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIdx(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
                        e.preventDefault();
                        if (e.key === "Enter") {
                          const r = filtered[activeIdx];
                          if (r) pick(r.room_id);
                        } else {
                          setActiveIdx((i) =>
                            e.key === "ArrowDown"
                              ? Math.min(i + 1, filtered.length - 1)
                              : Math.max(i - 1, 0),
                          );
                        }
                      }
                      if (e.key === "Escape") setOpen(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-all duration-150 ease-out placeholder:text-slate-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-300"
                  />
                </div>
                <div
                  ref={menuRef}
                  role="listbox"
                  aria-label={label}
                  onKeyDown={onMenuKeyDown}
                  className="mt-2 max-h-72 space-y-0.5 overflow-y-auto overscroll-contain"
                >
                  {filtered.map((r, i) => {
                    const isSelected = r.room_id === value;
                    const busy = busyByRoom.get(r.room_id);
                    const isActive = i === activeIdx;
                    return (
                      <button
                        key={r.room_id}
                        type="button"
                        role="option"
                        data-idx={i}
                        aria-selected={isSelected}
                        onClick={() => pick(r.room_id)}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left outline-none transition-colors duration-150 ease-out select-none ${isSelected
                            ? "uni-nav-sub-active bg-brand-blue-50/70 text-brand-blue-700"
                            : "uni-nav-sub text-slate-600 hover:bg-slate-100 hover:text-slate-900"} ${isActive && !isSelected ? "bg-slate-100" : ""}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${busy ? "bg-red-500" : "bg-green-500"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] font-bold leading-5 text-slate-900">
                            {r.code}
                          </span>
                          <span className="block truncate text-xs leading-4 text-slate-500">
                            {unitKinds[r.kind]}{r.kind === "bed" ? _uiText(" · {value1} kişi", {value1: String(r.capacity)}) : ""}
                          </span>
                        </span>
                        {isSelected ? (
                          <Check
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-brand-blue-600"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <span
                            className={`shrink-0 text-[11px] font-bold uppercase tracking-wider ${busy ? "text-red-500" : "text-green-600"}`}
                          >
                            {busy ? _uiText("Dolu") : _uiText("Müsait")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="font-uninav-book px-3 py-4 text-center text-[12px] leading-4 text-slate-400">{_uiText("Uygun birim yok")} </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </FieldCard>
    </div>
  );
}
