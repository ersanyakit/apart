import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { secondaryStyle } from "./FormKit";
import { InlineSelectField } from "./fields";

export function Pagination({ page, pageSize, total, busy, onPageChange, onPageSizeChange, label = "Sistem logları sayfaları", noun = "işlem", compact = false }: {
  compact?: boolean;
  label?: string;
  noun?: string;
  page: number;
  pageSize: number;
  total: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const visible = Array.from(new Set([1, page - 1, page, page + 1, pages]))
    .filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  return <div className={compact?"flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between":"flex flex-col gap-4 rounded-2xl bg-[var(--color-uni-surface)] p-4"}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500" role="status" aria-live="polite">
        {busy ? "Yükleniyor…" : `${total} ${noun} · ${start}–${end} arası · Sayfa ${page} / ${pages}`}
      </p>
      <div className={compact?"w-36":"w-full sm:w-44"}>
        <InlineSelectField label="Sayfa başına" value={String(pageSize)} disabled={busy}
          onChange={(v) => onPageSizeChange(Number(v))}
          options={[25, 50, 100].map((n) => ({ value: String(n), label: `${n} ${noun}` }))} />
      </div>
    </div>
    <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-1 sm:justify-end sm:gap-2">
      <button type="button" className={`uni-control ${secondaryStyle} min-h-11 min-w-11 !rounded-full !px-2 sm:!px-4`}
        disabled={busy || page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Önceki sayfa">
        <ChevronLeft size={18} aria-hidden="true" /><span className="hidden sm:inline">Önceki</span>
      </button>
      {visible.map((n, i) => <React.Fragment key={n}>
        {i > 0 && n > visible[i - 1] + 1 && <span className="px-1 text-slate-400" aria-hidden="true">…</span>}
        <button type="button" aria-label={`${n}. sayfa`} aria-current={n === page ? "page" : undefined}
          disabled={busy || n === page} onClick={() => onPageChange(n)}
          className={`uni-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${n === page ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50"}`}>
          {n}
        </button>
      </React.Fragment>)}
      <button type="button" className={`uni-control ${secondaryStyle} min-h-11 min-w-11 !rounded-full !px-2 sm:!px-4`}
        disabled={busy || page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Sonraki sayfa">
        <span className="hidden sm:inline">Sonraki</span><ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  </div>;
}
