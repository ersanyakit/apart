import { useI18n } from "./I18n";
import { bookingStatusKey, statusStyle as semanticStatusStyle } from "../lib/status-palette";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { BedDouble, StickyNote, Users, Wallet, X } from "lucide-react";
import { bookingStatuses, command } from "../lib/api";
import { formatMoney, useCurrency } from "./Currency";
import { countryFlag } from "../lib/countries";

export interface GuestStayDetail {
  guest_id: string;
  name: string;
  tc_no: string;
  phone: string;
  nationality: string;
  booking_id: string;
  branch_id: string;
  branch_name: string;
  room_id: string;
  room_code: string;
  start: string;
  end: string;
  status: string;
  daily_price_minor: number;
  booking_notes: string;
  guest_note: string;
  companions: { guest_id: string; name: string }[];
}

export interface GuestProfileDetail {
  guest_id: string;
  name: string;
  national_id: string;
  phone: string;
  address: string;
  nationality: string;
}

const dayFmt = (v: string) => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortDay = (v: string) => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};

/** Takvim günü farkından gece sayısı (en az 1). */
function nightsOf(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  const sDay = new Date(s);
  sDay.setHours(0, 0, 0, 0);
  const eDay = new Date(e);
  eDay.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((eDay.getTime() - sDay.getTime()) / 86400000));
}

/**
 * Genel misafir geçmişi modalı: kimlik başlığı, özet (konaklama /
 * gece / harcama), kişi ve rezervasyon notları, detaylı konaklama
 * listesi. Misafir araması, konaklayan listesi gibi her yerden
 * `guestId` ile açılabilir.
 */
export function GuestHistoryModal({
  hotelId,
  branchId,
  guestId,
  guestName,
  onClose,
}: {
  hotelId: string;
  branchId: string;
  guestId: string;
  guestName?: string;
  onClose: () => void;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [profile, setProfile] = useState<GuestProfileDetail | null>(null);
  const [stays, setStays] = useState<GuestStayDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reducedMotion = useReducedMotion();
  const { currency, format } = useCurrency();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    Promise.all([
      command<{ items: GuestProfileDetail[]; total: number }>("guest.search", {
        hotel_id: hotelId,
        branch_id: branchId,
        guest_id: guestId,
        page: 1,
      }),
      command<{ items: GuestStayDetail[]; total: number }>("guest.stays", {
        hotel_id: hotelId,
        branch_id: branchId,
        guest_id: guestId,
        sort: "start",
        desc: true,
        page: 1,
      }),
    ])
      .then(([p, s]) => {
        if (!active) return;
        setProfile(p.items[0] ?? null);
        setStays(s.items);
        setTotal(s.total);
      })
      .catch(() => {
        if (!active) return;
        setError(_uiText("Geçmiş yüklenemedi. Tekrar deneyin."));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [hotelId, branchId, guestId ]);

  // Form kartının transform/scale etkisinden bağımsız, tek bir modal katmanı.
  // Native dialog arka planı inert yapar ve odağı pencerenin içinde tutar.
  useEffect(() => {
    if (!mounted) return;
    const dialog = dialogRef.current!;
    const prev = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const name = profile?.name || stays[0]?.name || guestName || "Misafir";
  const contact = [profile?.phone || stays[0]?.phone, profile?.national_id || stays[0]?.tc_no]
    .filter(Boolean)
    .join(" · ");
  const flag = countryFlag(profile?.nationality || stays[0]?.nationality);

  const nights = stays.reduce((sum, s) => sum + nightsOf(s.start, s.end), 0);
  const spent = stays.reduce(
    (sum, s) => sum + (s.daily_price_minor || 0) * nightsOf(s.start, s.end),
    0,
  );

  type NoteRow = { text: string; kind: "guest" | "booking"; context: string };
  const notes: NoteRow[] = [];
  for (const s of stays) {
    const context = `${s.room_code} · ${shortDay(s.start)}`;
    if (s.guest_note?.trim()) {
      notes.push({ text: s.guest_note.trim(), kind: "guest", context });
    }
    if (s.booking_notes?.trim()) {
      notes.push({ text: s.booking_notes.trim(), kind: "booking", context });
    }
  }

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-slate-800 backdrop:bg-transparent open:flex items-end justify-center sm:items-center sm:p-4"
      aria-modal="true"
      aria-label={_uiText("{value1} konaklama geçmişi", {value1: String(name)})}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => event.stopPropagation()}
    >
      <motion.div
        key="guest-history-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.18 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        key="guest-history-panel"
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 340, damping: 36 }
        }
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span
            aria-hidden="true"
            className="font-uninav-book flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-blue-50 text-xl text-brand-blue-700 uppercase"
          >
            {(name || "?").trim().charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              {flag && (
                <span aria-hidden="true" className="text-base leading-none">
                  {flag}
                </span>
              )}
              <span className="truncate text-lg font-black tracking-tight text-slate-900">
                {name}
              </span>
            </span>
            <span className="block truncate text-xs font-medium text-slate-500">
              {contact || _uiText("iletişim yok")}
              {profile?.address ? _uiText(" · {value1}", {value1: String(profile.address)}) : ""}
            </span>
          </span>
          <button
            type="button"
            autoFocus
            aria-label={_uiText("Kapat")}
            onClick={onClose}
            className="uni-control flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 outline-none transition-all duration-150 ease-out hover:bg-slate-200 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {busy ? (
            <p className="py-10 text-center text-sm text-slate-400">{_uiText("Yükleniyor…")}</p>
          ) : error ? (
            <p role="alert" className="py-10 text-center text-sm text-red-600">
              {error}
            </p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    icon: <BedDouble size={15} aria-hidden="true" />,
                    value: String(total || stays.length),
                    label: _uiText("Konaklama"),
                  },
                  {
                    icon: <Users size={15} aria-hidden="true" />,
                    value: String(nights),
                    label: _uiText("Gece"),
                  },
                  {
                    icon: <Wallet size={15} aria-hidden="true" />,
                    value:
                      spent > 0
                        ? formatMoney(spent, currency, format)
                        : "—",
                    label: _uiText("Harcama"),
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl bg-[#f9f9f9] px-3 py-3 text-center"
                  >
                    <span className="mx-auto flex w-fit items-center gap-1.5 text-slate-400">
                      {s.icon}
                    </span>
                    <p className="font-uninav-book mt-1 truncate text-[1.125rem] leading-6 text-slate-900">
                      {s.value}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {notes.length > 0 && (
                <section aria-label={_uiText("Misafir notları")} className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                    <StickyNote size={14} aria-hidden="true" />{_uiText("Notlar ·")} {notes.length}
                  </h3>
                  {notes.map((n, i) => (
                    <div
                      key={`${n.kind}-${n.context}-${i}`}
                      className={`rounded-2xl border px-4 py-3 ${n.kind === "guest"
                          ? "border-amber-200/70 bg-amber-50/60"
                          : "border-slate-200/70 bg-slate-50/70"}`}
                    >
                      <p className="text-sm leading-6 text-slate-800">{n.text}</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        {n.kind === "guest" ? _uiText("Kişi notu") : _uiText("Rezervasyon notu")} ·{" "}
                        {n.context}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              <section aria-label={_uiText("Konaklamalar")} className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                  <BedDouble size={14} aria-hidden="true" />{_uiText("Konaklamalar ·")} {total || stays.length}
                </h3>
                {stays.length === 0 && (
                  <p className="rounded-2xl bg-[#f9f9f9] px-4 py-6 text-center text-sm text-slate-400">{_uiText("Bu misafire ait konaklama kaydı yok.")} </p>
                )}
                {stays.map((s) => {
                  const n = nightsOf(s.start, s.end);
                  return (
                    <div
                      key={`${s.booking_id}-${s.guest_id}-${s.start}`}
                      className="rounded-2xl bg-[#f9f9f9] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-[0.9375rem] font-bold text-slate-900">
                          {s.room_code}
                          <span className="ml-2 text-xs font-medium text-slate-500">
                            {s.branch_name}
                          </span>
                        </p>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                          style={semanticStatusStyle(bookingStatusKey(s.status))}
                        >
                          {bookingStatuses[s.status] ?? s.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium tabular-nums text-slate-500">
                        {dayFmt(s.start)} → {dayFmt(s.end)} · {n} {_uiText("gece")} </p>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-xs text-slate-500">
                          {s.companions.length > 0
                            ? _uiText("Birlikte: {value1}", {value1: String(s.companions.map((c) => c.name).join(", "))})
                            : _uiText("Tek konaklama")}
                        </p>
                        <p className="shrink-0 text-[13px] font-black text-brand-blue-700">
                          {s.daily_price_minor > 0
                            ? _uiText("{value1} /gece", {value1: String(formatMoney(s.daily_price_minor, currency, format))})
                            : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>
          )}
        </div>
      </motion.div>
    </dialog>,
    document.body,
  );
}
