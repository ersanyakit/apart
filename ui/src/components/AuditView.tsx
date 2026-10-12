import React, { useEffect, useState } from "react";
import { command, messageOf } from "../lib/api";
import { ErrorMessage, Field, inputStyle, secondaryStyle } from "./FormKit";
type Entry = {
  id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  command: string;
  created_at: string;
  request_id: string;
};
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
        <Field label="İşlem">
          <select
            className={`uni-input ${inputStyle}`}
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tüm işlemler</option>
            <option value="create">Oluşturma</option>
            <option value="update">Güncelleme</option>
            <option value="delete">Silme</option>
          </select>
        </Field>
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
                "Komut",
                "Kayıt kimliği",
              ].map((h) => (
                <th className="p-4" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-4 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("tr-TR")}
                </td>
                <td>{r.actor_name}</td>
                <td>
                  {{
                    create: "Oluşturuldu",
                    update: "Güncellendi",
                    delete: "Silindi",
                  }[r.action] || r.action}
                </td>
                <td>{r.entity}</td>
                <td>{r.command || "Sistem / seed"}</td>
                <td className="font-mono text-[10px] pr-4">{r.entity_id}</td>
              </tr>
            ))}
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
