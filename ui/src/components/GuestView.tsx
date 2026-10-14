import { Pagination } from "./Pagination";
import { GuestAssessment, type AssessmentTarget } from "./GuestAssessment";
import { PageHeader } from "./PageHeader";
import React, { useEffect, useState } from "react";
import {
  command,
  downloadCommand,
  messageOf,
  bookingStatuses,
  type Snapshot,
} from "../lib/api";
import {
  Drawer,
  ErrorMessage,
  Field,
  inputStyle,
  secondaryStyle,
} from "./FormKit";
type Stay = {
  guest_id: string;
  name: string;
  tc_no: string;
  phone: string;
  booking_id: string;
  branch_id: string;
  branch_name: string;
  room_id: string;
  room_code: string;
  start: string;
  end: string;
  status: string;
  companions: { guest_id: string; name: string }[];
};
const date = (v: string) => new Date(v).toLocaleString("tr-TR");
export function GuestView({
  snapshot: s,
  guestId,
  guestName,
}: {
  snapshot: Snapshot;
  guestId?: string;
  guestName?: string;
}) {
  const [search, setSearch] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("start"),
    [desc, setDesc] = useState(true),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(25),
    [assessment,setAssessment] = useState<AssessmentTarget|null>(null),
    [rows, setRows] = useState<Stay[]>([]),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<{ id: string; name: string } | null>(
      null,
    );
  const query = {
    hotel_id: s.hotel_id,
    branch_id: s.branch_id,
    ...(guestId ? { guest_id: guestId } : {}),
    search,
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
    status,
    sort,
    desc,
    page,
    page_size:pageSize,
  };
  useEffect(() => {
    let active = true;
    setBusy(true);
    const timer = setTimeout(() => {
      command<{ items: Stay[]; total: number }>("guest.stays", query)
        .then((result) => {
          if (active) {
            setRows(result.items);
            setTotal(result.total);
            const last=Math.max(1,Math.ceil(result.total/pageSize));if(page>last)setPage(last);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(messageOf(e));
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    s.hotel_id,
    s.branch_id,
    guestId,
    search,
    from,
    to,
    status,
    sort,
    desc,
    page,
    pageSize,
  ]);
  const sortBy = (key: string) => {
    if (sort === key) setDesc((v) => !v);
    else {
      setSort(key);
      setDesc(false);
    }
    setPage(1);
  };
  const download = async (format: string) => {
    setBusy(true);
    try {
      await downloadCommand(
        "guest.export",
        { ...query, format },
        `konaklamalar.${format}`,
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const tools = (
      <div className="flex flex-wrap gap-3 items-end">
        {!guestId && (
          <Field label="Misafir arama">
            <input
              className={`uni-input ${inputStyle}`}
              placeholder="Ad, kimlik veya telefon"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        )}
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
        <Field label="Kayıtlar">
          <select
            className={`uni-input ${inputStyle}`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tüm konaklamalar</option>
            <option value="checked_in">Şu an konaklayanlar</option>
            <option value="completed">Çıkış yapanlar</option>
            <option value="confirmed">Planlanan rezervasyonlar</option>
            <option value="cancelled">İptal edilenler</option>
          </select>
        </Field>
      </div>
  );
  if(assessment)return <GuestAssessment snapshot={s} target={assessment} onClose={()=>setAssessment(null)}/>;
  return (
    <div className="space-y-5">
      <ErrorMessage message={error} />
      {guestName && <h3 className="text-xl font-black">{guestName}</h3>}
      {guestId ? tools : <PageHeader pageId="guests">{tools}</PageHeader>}
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">
          {total} kayıt · Sıralamak için sütun başlığına tıklayın
        </span>
        <div className="flex gap-2">
          <button
            className={`uni-control ${secondaryStyle}`}
            disabled={busy}
            onClick={() => download("xlsx")}
          >
            Excel İndir
          </button>
          <button
            className={`uni-control ${secondaryStyle}`}
            disabled={busy}
            onClick={() => download("pdf")}
          >
            PDF İndir
          </button>
        </div>
      </div>
      <div className="overflow-auto rounded-3xl bg-[var(--color-uni-surface)]">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-400">
            <tr>
              {[
                ["name", "Misafir"],
                ["room", "Oda / Tesis"],
                ["start", "Giriş"],
                ["end", "Çıkış"],
              ].map(([key, label]) => (
                <th key={key} className="p-4">
                  <button className="uni-control" onClick={() => sortBy(key)}>
                    {label} {sort === key ? (desc ? "↓" : "↑") : "↕"}
                  </button>
                </th>
              ))}
              <th>Birlikte kaldıkları</th>
              <th className="p-4">Durum</th><th className="p-4">Misafir değerlendirmesi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.booking_id}-${r.guest_id}-${r.start}-${i}`}
                className="border-t border-slate-100"
              >
                <td className="p-4">
                  <button
                    className="uni-control  text-brand-blue-700 hover:underline"
                    onClick={() =>
                      setSelected({ id: r.guest_id, name: r.name })
                    }
                  >
                    {r.name}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1">{r.phone}</p>
                </td>
                <td>
                  {r.room_code}
                  <p className="text-[10px] text-slate-400">{r.branch_name}</p>
                </td>
                <td className="p-3 whitespace-nowrap">{date(r.start)}</td>
                <td className="p-3 whitespace-nowrap">{date(r.end)}</td>
                <td>
                  {r.companions.map((c) => (
                    <button
                      className="uni-control block text-brand-blue-600 hover:underline py-1"
                      key={c.guest_id}
                      onClick={() =>
                        setSelected({ id: c.guest_id, name: c.name })
                      }
                    >
                      {c.name}
                    </button>
                  ))}
                </td>
                <td className="p-4">{bookingStatuses[r.status]}</td><td className="p-4"><button type="button" className={`${secondaryStyle} !rounded-full whitespace-nowrap`} onClick={()=>setAssessment(r)}>Puan / Kara liste</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-8 text-slate-400 text-sm">
            {busy ? "Yükleniyor…" : "Bu sorguda kayıt bulunamadı."}
          </p>
        )}
      </div>
      <Pagination label="Misafir listesi sayfaları" noun="kayıt" page={page} pageSize={pageSize} total={total} busy={busy} onPageChange={setPage} onPageSizeChange={v=>{setPageSize(v);setPage(1)}}/>
      {selected && (
        <Drawer
          title="Misafir Konaklama Geçmişi"
          onClose={() => setSelected(null)}
        >
          <GuestView
            snapshot={s}
            guestId={selected.id}
            guestName={selected.name}
          />
        </Drawer>
      )}
    </div>
  );
}
