import { PageHeader } from "./PageHeader";
import { usePreference } from "./UserPreferences";
import React, { useEffect, useState } from "react";
import { bookingStatuses, command, messageOf } from "../lib/api";
import { ErrorMessage, secondaryStyle } from "./FormKit";
import { DateField, InlineSelectField } from "./fields";
import { auditLocationSummary, type AuditDetails } from "../lib/audit-location";
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
const actions: Record<string, string> = {
  create: "Oluşturma", update: "Güncelleme", delete: "Silme",
  check_in: "Misafir girişi", check_out: "Misafir çıkışı", cancel: "Rezervasyon iptali",
  move: "Oda değişikliği", swap: "Oda takası", login: "Oturum açma", logout: "Oturum kapatma",
  assign: "Özellik atama",
};
const entities: Record<string, string> = {
  report_records: "Rapor işlem kaydı", bookings: "Rezervasyon", rooms: "Birim", branches: "Tesis", hotels: "Otel",
  users: "Personel", guest_profiles: "Misafir", beds: "Yatak", floors: "Kat",
  assets: "Medya", feature_categories: "Özellik kategorisi", feature_definitions: "Özellik",
  document_templates: "Belge şablonu", documents: "Belge",
};
function description(entry: Entry) {
  const before = entry.details?.before;
  const after = entry.details?.after;
  const data = after ?? before;
  const parts = [data?.guest_name ?? data?.name ?? data?.display_name ?? data?.code];
  if (before?.status && after?.status && before.status !== after.status) {
    parts.push(`${bookingStatuses[String(before.status)] ?? before.status} → ${bookingStatuses[String(after.status)] ?? after.status}`);
  }
  if (data?.check_in && data?.check_out) {
    parts.push(`${new Date(String(data.check_in)).toLocaleDateString("tr-TR")} – ${new Date(String(data.check_out)).toLocaleDateString("tr-TR")}`);
  }
  if (data?.guest_count) parts.push(`${data.guest_count} kişi`);
  return parts.filter(Boolean).join(" · ");
}
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
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white" aria-busy={busy}>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-400">
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
              return (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-4 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("tr-TR")}
                </td>
                <td>{r.actor_name}</td>
                <td>
                  {actions[r.action] || r.action}
                </td>
                <td>{entities[r.entity] || r.entity}</td>
                <td className="p-3 min-w-44">
                  <p className="font-semibold text-slate-900">{location.label}</p>
                  {location.branch && <p className="text-xs text-slate-500 mt-1">{location.branch}</p>}
                  {location.inferred && <p className="text-[10px] text-slate-400 mt-1">Oda bilgisi güncel kayıttan</p>}
                </td>
                <td className="max-w-sm p-3">
                  <p>{description(r) || "—"}</p>
                  <details className="mt-1 text-slate-500">
                    <summary className="cursor-pointer">İşlem kaydı</summary>
                    <p className="mt-2 break-all">{r.command || "Sistem / seed"} · {r.request_id}</p>
                    <p className="mt-1 break-all font-mono text-[10px]">Kayıt kimliği: {r.entity_id}</p>
                    {r.details && <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px]">{JSON.stringify(r.details, null, 2)}</pre>}
                  </details>
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
