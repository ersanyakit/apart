import React, { useEffect, useState } from "react";
import { bookingStatuses, command, messageOf } from "../lib/api";
import { History } from "lucide-react";
import { UniSelect } from "./UniSelect";
import { ErrorMessage, Field, inputStyle, secondaryStyle } from "./FormKit";
import { auditLocationSummary, type AuditDetails } from "../lib/audit-location";
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
  bookings: "Rezervasyon", rooms: "Birim", branches: "Tesis", hotels: "Otel",
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
  const [rows, setRows] = useState<Entry[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
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
    command<{ items: Entry[]; total: number }>("audit.list", {
      hotel_id: hotelId,
      page,
      action,
      ...(from ? { from: new Date(from).toISOString() } : {}),
      ...(to ? { to: new Date(to).toISOString() } : {}),
    })
      .then((result) => {
        if (active) {
          setRows(result.items);
          setTotal(result.total);
        }
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [hotelId, page, from, to, action, revision]);
  return (
    <div className="space-y-5">
      <ErrorMessage message={error} />
      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Başlangıç">
          <input
            className={`uni-input ${inputStyle}`}
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Bitiş">
          <input
            className={`uni-input ${inputStyle}`}
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <div className="min-w-52">
          <UniSelect caption="İşlem" ariaLabel="Log işlem filtresi" icon={<History size={18} />}
            value={action} options={[{ value: "", label: "Tüm işlemler" }, ...Object.entries(actions).map(([value, label]) => ({ value, label }))]}
            onChange={(value) => { setAction(value); setPage(1); }} />
        </div>
        <button
          className={`uni-control ${secondaryStyle}`}
          onClick={() => setRevision((v) => v + 1)}
        >
          Yenile
        </button>
      </div>
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
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
            {rows.map((r) => {
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
        {!rows.length && (
          <p className="p-8 text-sm text-slate-400">
            {busy ? "Yükleniyor…" : "Bu filtrede işlem kaydı bulunamadı."}
          </p>
        )}
      </div>
      <div className="flex justify-between items-center text-xs text-slate-500">
        <span>
          {total} işlem · Sayfa {page}
        </span>
        <div className="flex gap-2">
          <button
            className={`uni-control ${secondaryStyle}`}
            disabled={page === 1 || busy}
            onClick={() => setPage((v) => v - 1)}
          >
            Önceki
          </button>
          <button
            className={`uni-control ${secondaryStyle}`}
            disabled={page * 100 >= total || busy}
            onClick={() => setPage((v) => v + 1)}
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
