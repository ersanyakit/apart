import { PageHeader } from "./PageHeader";
import { usePreference } from "./UserPreferences";
import React, { useEffect, useState } from "react";
import { command, messageOf } from "../lib/api";
import { ErrorMessage, secondaryStyle } from "./FormKit";
import { DateField, InlineSelectField } from "./fields";
import { auditLocationSummary, type AuditDetails } from "../lib/audit-location";
import { auditActions as actions, auditEntities as entities, auditChanges, auditSummary } from "../lib/audit-presentation";
import { Pagination } from "./Pagination";
type Entry = {
  id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  command: string;
  created_at: string;
  request_id: string;
  details?: AuditDetails;
};
export function AuditView({ hotelId }: { hotelId: string }) {
  return <AuditLogList key={hotelId} hotelId={hotelId} />;
}
function AuditLogList({ hotelId }: { hotelId: string }) {
  const [rows, setRows] = useState<Entry[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = usePreference<number>("audit_page_size", 25),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [action, setAction] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    command<{ items: Entry[]; total: number; page: number; page_size: number }>("audit.list", {
      hotel_id: hotelId,
      page,
      page_size: pageSize,
      action,
      ...(from ? { from: new Date(from).toISOString() } : {}),
      ...(to ? { to: new Date(to).toISOString() } : {}),
    })
      .then((result) => {
        if (active) {
          setRows(result.items);
          setTotal(result.total);
          setPage(result.page);
        }
      })
      .catch((e) => {
        if (active) { setError(messageOf(e)); setRows([]); setTotal(0); }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [hotelId, page, pageSize, from, to, action, revision]);
  return (
    <div className="space-y-5">
      <ErrorMessage message={error} />
      <PageHeader pageId="logs">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-44 flex-1">
          <DateField
            label="Başlangıç"
            value={from}
            onChange={(v) => {
              setFrom(v);
              setPage(1);
            }}
          />
        </div>
        <div className="min-w-44 flex-1">
          <DateField
            label="Bitiş"
            value={to}
            onChange={(v) => {
              setTo(v);
              setPage(1);
            }}
          />
        </div>
        <div className="min-w-52 flex-1">
          <InlineSelectField
            label="İşlem"
            value={action}
            onChange={(value) => { setAction(value); setPage(1); }}
            options={[{ value: "", label: "Tüm işlemler" }, ...Object.entries(actions).map(([value, label]) => ({ value, label }))]}
          />
        </div>
        <button
          className={`uni-control ${secondaryStyle}`}
          disabled={busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Yenile
        </button>
      </div>
      </PageHeader>
      <div className="overflow-auto rounded-2xl bg-[var(--color-uni-surface)]" aria-busy={busy} tabIndex={0} role="region" aria-label="Sistem logları tablosu; yatay kaydırılabilir">
        <table className="w-full text-xs text-left">
          <thead className="bg-black/[0.025] text-slate-500">
            <tr>
              {[
                "Tarih / saat",
                "Kullanıcı",
                "İşlem",
                "Kayıt",
                "Oda / Birim",
                "İşlem detayı",
              ].map((h) => (
                <th className="p-4" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!busy && rows.map((r) => {
              const location = auditLocationSummary(r.entity, r.details);
              const changes = auditChanges(r);
              return (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-4 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("tr-TR")}
                </td>
                <td>{r.actor_name || "Sistem"}</td>
                <td>
                  {actions[r.action] || "İşlem"}
                </td>
                <td>{entities[r.entity] || "Kayıt"}</td>
                <td className="p-3 min-w-44">
                  <p className="font-semibold text-slate-900">{location.label}</p>
                  {location.branch && <p className="text-xs text-slate-500 mt-1">{location.branch}</p>}
                  {location.inferred && <p className="text-[10px] text-slate-400 mt-1">Oda bilgisi güncel kayıttan</p>}
                </td>
                <td className="max-w-sm p-3">
                  <p className="font-medium text-slate-800">{auditSummary(r)}</p>
                  {r.details?.reason && <p className="mt-1 text-slate-600">Gerekçe: {r.details.reason}</p>}
                  {changes.length > 0 ? <details className="mt-2 text-slate-500">
                    <summary className="cursor-pointer py-1">{changes.length} bilgi · Ayrıntıları göster</summary>
                    <dl className="mt-2 space-y-3 min-w-60">
                      {changes.map(c => <div key={c.key} className="rounded-xl bg-black/[0.025] p-3">
                        <dt className="text-xs font-semibold text-slate-700">{c.label}</dt>
                        <dd className="mt-1 break-words">
                          {r.action !== "create" && <p><span className="text-slate-400">Önce: </span>{c.before}</p>}
                          {r.action !== "delete" && <p className="mt-1 text-slate-800"><span className="text-slate-500">{r.action === "create" ? "Değer: " : "Sonra: "}</span>{c.after}</p>}
                          {r.action === "delete" && <p className="mt-1">Kayıt kaldırıldı.</p>}
                        </dd>
                      </div>)}
                    </dl>
                  </details> : <p className="mt-1 text-slate-400">Bu işlem için ek alan bilgisi kaydedilmemiş.</p>}
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
        {(busy || !rows.length) && (
          <p className="p-8 text-sm text-slate-400">
            {busy ? "Yükleniyor…" : "Bu filtrede işlem kaydı bulunamadı."}
          </p>
        )}
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} busy={busy}
        onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </div>
  );
}
