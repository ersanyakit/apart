import {housekeepingRoomStatuses} from "../lib/statuses";
import {RoomStatusDefinitions} from "../lib/statuses.generated";
import { RoomStatus as RoomState } from '../lib/statuses.generated';
import { STATUS_PALETTE, roomStatusKey } from "../lib/status-palette";
import { createPortal } from "react-dom";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { secondaryStyle } from "./FormKit";

const BASE_OPTIONS = housekeepingRoomStatuses;
const ADVANCED_OPTIONS = RoomStatusDefinitions.filter(d=>!d.housekeeping).map(d=>d.value);

/**
 * Oda durum düğmesi: mevcut durum (nokta + etiket), basınca
 * içerik menüsü diliyle küçük açılır liste. Kart ızgarasında
 * taşmayı önlemek için liste sabit konumlu açılır, kaydırmada kapanır.
 */
export function RoomStatusPicker({
  roomCode,
  status,
  canSetAdvanced,
  onPick,
}: {
  roomCode: string;
  status: string;
  /** Operatör yetkisi: Boş / Arızalı / Tadilat seçenekleri dahil. */
  canSetAdvanced: boolean;
  onPick: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const options = canSetAdvanced
    ? [...BASE_OPTIONS, ...ADVANCED_OPTIONS]
    : BASE_OPTIONS;
  const current = STATUS_PALETTE[roomStatusKey(status)];

  const place = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 176);
    setPos({
      // Alta sığmazsa yukarı açılır.
      top:
        r.bottom + 8 + 44 * options.length + 16 > window.innerHeight
          ? Math.max(8, r.top - 8 - (44 * options.length + 16))
          : r.bottom + 8,
      left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)),
      width,
    });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${roomCode} oda durumu: ${current.label}. Değiştirmek için açın.`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { if (!open) place(); setOpen((v) => !v); }}
        className={`uni-control ${secondaryStyle} gap-2`}
      >
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:STATUS_PALETTE[roomStatusKey(status)].accent}}
        />
        <span className="truncate">{current.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {typeof document !== "undefined" && createPortal(<AnimatePresence>
        {open && (
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-40 cursor-default"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
            />
            <motion.div
              key="room-status-list"
              role="listbox"
              aria-label={`${roomCode} oda durumu seçin`}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{
                duration: reducedMotion ? 0 : 0.15,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="fixed z-50 origin-top overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {options.map((v) => {
                const meta = STATUS_PALETTE[roomStatusKey(v)];
                const isActive = v === status;
                return (
                  <button
                    key={v}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setOpen(false);
                      if (v !== status || v === RoomState.Clean) onPick(v);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold outline-none transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                      isActive
                        ? "bg-brand-blue-50/70 text-brand-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:STATUS_PALETTE[roomStatusKey(v)].accent}}
                    />
                    <span className="flex-1">{meta.label}</span>
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
            </motion.div>
          </>
        )}
      </AnimatePresence>, document.body)}
    </>
  );
}
