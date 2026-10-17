import { useI18n } from "../I18n";
import React, { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Info, Search } from "lucide-react";
import { command, messageOf } from "../../lib/api";
import { FieldCard, FieldCaption } from "./FieldCard";
import { useGuestHistoryNavigation } from "../GuestHistoryNavigation";
import { countryFlag } from "../../lib/countries";

export type PastGuest = {
  id: string;
  address?: string;
  name: string;
  phone?: string;
  tcNo?: string;
  nationality?: string;
};

type GuestRow = {
  guest_id: string;
  name: string;
  national_id: string;
  phone: string;
  address: string;
  nationality: string;
  last_daily_price_minor: number;
};

const searchCircleClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(19,19,19,0.08)] text-slate-600 transition-all duration-150 ease-out hover:bg-[rgba(19,19,19,0.12)] hover:text-slate-900 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400";

/** A single editable field searches registered guests and fills the selection. */
export function GuestNameField({
  label,
  value,
  onChange,
  onPick,
  hotelId,
  branchId,
  guestId,
  placeholder,
  required,
  disabled,
  autoComplete,
  uppercase = false,
  tone = "surface",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Kayıtlı misafir seçildiğinde ek alanlar (telefon/kimlik) için. */
  onPick?: (guest: PastGuest) => void;
  hotelId: string;
  branchId: string;
  /** Varsa seçili kaydın kimliği (bilgi butonu ve detay için). */
  guestId?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  uppercase?: boolean;
  tone?: "surface" | "white";
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [error, setError] = useState("");
  const reducedMotion = useReducedMotion();
  const openHistory = useGuestHistoryNavigation();
  // Seçili kayıt: listeden seçimde atanır, elle yazınca düşer.
  // Bilgi butonu detayı bununla açar.
  const [selectedId, setSelectedId] = useState<string | null>(guestId ?? null);
  useEffect(() => {
    setSelectedId(guestId ?? null);
  }, [guestId ]);

  // Search profiles regardless of reservation/check-in status.
  useEffect(() => {
    if (!open || disabled) return;
    let active = true;
    setBusy(true);
    setRows([]);
    setError("");
    const t = setTimeout(() => {
      command<{ items: GuestRow[]; total: number }>("guest.search", {
        hotel_id: hotelId,
        branch_id: branchId,
        search: value,
        page: 1,
      })
        .then((r) => {
          if (!active) return;
          setRows(r.items);
          setTotal(r.total);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(messageOf(err));
          setRows([]);
          setTotal(0);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [open, value, hotelId, branchId, disabled]);

  // Esc ile kapatma (takvim kartındaki gibi; dışarı tıklama kapatmaz,
  // kardeş alanla etkileşimi kesmemesi için).
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

  const pick = (r: GuestRow) => {
    const nm = uppercase ? r.name.toLocaleUpperCase(_uiLocale) : r.name;
    onChange(nm);
    onPick?.({
      id: r.guest_id,
      address: r.address || "",
      name: nm,
      phone: r.phone || "",
      tcNo: r.national_id || "",
      nationality: (r.nationality || "").toUpperCase(),
    });
    setSelectedId(r.guest_id);
    setOpen(false);
  };

  const toggle = () => {
    const next = !open;
    inputRef.current?.focus();
    setOpen(next);
  };

  const write = (raw: string) => {
    onChange(uppercase ? raw.toLocaleUpperCase(_uiLocale) : raw);
    setSelectedId(null);
    setRows([]);
    setBusy(true);
    setOpen(true);
  };

  return (
    <FieldCard className={tone === "white" ? "h-full bg-white" : "h-full"}>
      <div className="flex items-center justify-between gap-3">
          <label className="block min-w-0 flex-1 cursor-text">
            <FieldCaption>{label}</FieldCaption>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={open && !disabled}
              aria-controls={listId}
              aria-autocomplete="list"
              required={required}
              disabled={disabled}
              aria-label={label}
              placeholder={placeholder}
              autoComplete={autoComplete}
              value={value}
              onChange={(e) => write(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
                if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); }
                if (e.key === "Enter" && open) {
                  e.preventDefault();
                  if (!busy && rows.length > 0) pick(rows[0]);
                }
              }}
              onFocus={() => {
                if (!disabled) setOpen(true);
              }}
              className="font-uninav-book mt-1 w-full min-w-0 bg-transparent text-[1.25rem] leading-8 text-slate-900 uppercase outline-none placeholder:text-slate-400 placeholder:normal-case disabled:opacity-60"
            />
          </label>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={_uiText("Kayıtlı misafir aramasını aç/kapat")}
              title={_uiText("Kayıtlı misafir aramasını aç/kapat")}
              aria-expanded={open}
              aria-haspopup="listbox"
              disabled={disabled}
              onClick={toggle}
              className={searchCircleClass}
            >
              <Search size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={
                selectedId
                  ? _uiText("Seçili misafirin geçmişi ve notları")
                  : _uiText("Detay için önce listeden bir kayıt seçin")
              }
              title={
                selectedId
                  ? _uiText("Geçmiş ve notlar")
                  : _uiText("Detay için önce listeden bir kayıt seçin")
              }
              disabled={disabled || !selectedId || !openHistory}
              onClick={(event) => {
                event.stopPropagation();
                if (!selectedId || !openHistory) return;
                // Geçmiş sekmesine geçerken arama listesini kapat.
                setOpen(false);
                openHistory({ id: selectedId, name: value });
              }}
              className={`${searchCircleClass} disabled:opacity-40 disabled:pointer-events-none`}
            >
              <Info size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
      </div>

      <AnimatePresence initial={false}>
        {open && !disabled && (
          <motion.div
            key="guest-search"
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
              <div
                id={listId}
                role="listbox"
                aria-busy={busy}
                aria-label={_uiText("Kayıtlı misafir sonuçları")}
                className="max-h-72 overflow-y-auto"
              >
                {rows.map((r) => {
                  const flag = countryFlag(r.nationality);
                  return (
                    <button
                      key={r.guest_id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(r)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left outline-none transition-colors duration-150 ease-out select-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-neutral-400"
                    >
                      <span
                        aria-hidden="true"
                        className="font-uninav-book flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue-50 text-[15px] text-brand-blue-700 uppercase"
                      >
                        {(r.name || "?").trim().charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-bold leading-5 text-slate-900">
                          {r.name}
                        </span>
                        <span className="block truncate text-xs leading-4 text-slate-500">
                          {[r.phone, r.national_id].filter(Boolean).join(" · ") ||
                            _uiText("iletişim yok")}
                        </span>
                      </span>
                      <span
                        className="flex shrink-0 items-center gap-1.5"
                        title={
                          r.nationality
                            ? _uiText("Uyruk: {value1}", {value1: String(r.nationality)})
                            : _uiText("Uyruk kayıtlı değil")
                        }
                      >
                        <span aria-hidden="true" className="text-xl leading-none">
                          {flag || "—"}
                        </span>
                        {r.nationality ? (
                          <span className="text-[11px] font-bold tracking-wider text-slate-400">
                            {r.nationality.toUpperCase()}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
                {!busy && !error && rows.length === 0 && (
                  <p className="font-uninav-book px-3 py-4 text-center text-[12px] leading-4 text-slate-400">
                    {value.trim()
                      ? _uiText("Aramaya uygun kayıtlı misafir yok")
                      : _uiText("Henüz kayıtlı misafir yok")}
                  </p>
                )}
                {busy && rows.length === 0 && (
                  <p className="font-uninav-book px-3 py-4 text-center text-[12px] leading-4 text-slate-400">{_uiText("Aranıyor…")} </p>
                )}
              </div>
              {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
              <p className="mt-2 border-t border-slate-200/70 px-1 pt-2 text-[11px] font-medium leading-4 text-slate-400">
                {total} {_uiText("kayıtlı misafir · seçim adı doldurur, kayıtlı telefon/kimlik boş alanlara işlenir")} </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </FieldCard>
  );
}
