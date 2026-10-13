import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Building2, Check, ChevronDown, Search } from "lucide-react";
import { occupancy, unitKinds, type APIRoom, type Snapshot } from "../../lib/api";
import { FieldCard, FieldCaption } from "./FieldCard";

/**
 * Birim seçim kartı: tetikleyici kart + zengin oda satırları
 * (durum noktası, kod, tip/kapasite, arama, klavye gezintisi).
 * Doluluk, giriş anına göre hesaplanır; düzenlenen kayıt hariç tutulur.
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  const q = query.toLocaleLowerCase("tr");
  const filtered = rooms.filter((r) => {
    if (!q) return true;
    const hay = `${r.code} ${unitKinds[r.kind]} ${r.effective_capacity || r.capacity}`
      .toLocaleLowerCase("tr");
    return hay.includes(q);
  });

  useEffect(() => {
    if (!open) return;
    setActiveIdx(() => {
      const i = filtered.findIndex((r) => r.room_id === value);
      return i >= 0 ? i : 0;
    });
    menuRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div ref={rootRef} className="relative h-full">
      <FieldCard className="h-full">
        <button
          type="button"
          aria-label={`${label} seçin. Seçili: ${selected ? `${selected.code} ${unitKinds[selected.kind]}` : "yok"}`}
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
          className="flex w-full cursor-pointer items-center justify-between gap-3 text-left outline-none transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-xl"
        >
          <span className="min-w-0 flex-1">
            <FieldCaption>{label}</FieldCaption>
            <span className="mt-1 flex h-10 min-w-0 items-center">
              <span
                className={`font-uninav-book block truncate text-[1.25rem] leading-8 ${
                  selected ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {selected
                  ? `${selected.code} · ${unitKinds[selected.kind]}`
                  : "Birim seçin"}
              </span>
            </span>
            <span className="mt-1 block truncate text-[0.875rem] leading-5 text-slate-500">
              {selected
                ? `${selected.effective_capacity || selected.capacity} kişi · ${selectedBusy ? "Dolu" : "Müsait"}`
                : "kod · tip · kapasite"}
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
      </FieldCard>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="absolute left-0 right-0 z-50 mt-2 origin-top"
          >
            <div
              ref={menuRef}
              tabIndex={-1}
              role="listbox"
              aria-label={label}
              onKeyDown={onMenuKeyDown}
              className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 outline-none"
            >
              <div className="sticky top-0 bg-white pb-1.5">
                <div className="relative">
                  <Search
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    aria-label="Birim ara"
                    placeholder="Oda kodu veya tip ara…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIdx(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
                        e.preventDefault();
                        menuRef.current?.focus({ preventScroll: true });
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-all duration-150 ease-out placeholder:text-slate-400 focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-300"
                  />
                </div>
              </div>
              <div className="space-y-0.5" role="presentation">
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
                      className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left outline-none transition-colors duration-150 ease-out select-none ${
                        isSelected
                          ? "uni-nav-sub-active bg-brand-blue-50/70 text-brand-blue-700"
                          : "uni-nav-sub text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      } ${isActive && !isSelected ? "bg-slate-100" : ""}`}
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
                          {unitKinds[r.kind]} · {r.effective_capacity || r.capacity} kişi
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
                          {busy ? "Dolu" : "Müsait"}
                        </span>
                      )}
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="font-uninav-book px-3 py-4 text-center text-[12px] leading-4 text-slate-400">
                    Uygun birim yok
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
