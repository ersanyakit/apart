import { useI18n } from "./I18n";
import { BookingStatus as BookingState } from '../lib/statuses.generated';
import styles from "./GuestView.module.css";
import type { CustomerStay } from "./reports/CustomerDetail";
import { display } from "./reports/model";
import { ArrowLeft, ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, Star, History, RefreshCw, X } from "lucide-react";
import { TextField, DateField, InlineSelectField } from "./fields";
import { useGuestHistoryNavigation } from "./GuestHistoryNavigation";
import { NavigationIcon } from "./NavigationIcon";
import { Pagination } from "./Pagination";
import { GuestAssessment, CustomerComments, BlacklistNotice, type Reputation, type AssessmentTarget } from "./GuestAssessment";
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
  ErrorMessage,
  secondaryStyle,
} from "./FormKit";
type Stay = CustomerStay & { phone?: string };
const date = (v: string) => new Date(v).toLocaleString("tr-TR", {timeZone:"Europe/Istanbul", dateStyle:"medium", timeStyle:"short"});
function StayDate({value}:{value:string}) {
  const parsed=new Date(value);
  if(!Number.isFinite(parsed.getTime()))return <span className="guest-table-secondary">—</span>;
  return <time dateTime={value} className="guest-table-date"><span>{parsed.toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'short',year:'numeric'})}</span><span className="guest-table-secondary">{parsed.toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'})}</span></time>;
}
export function GuestView({
  snapshot: s,
  guestId,
  guestName,
  onBack,
}: {
  snapshot: Snapshot;
  guestId?: string;
  guestName?: string;
  onBack?: () => void;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [revision, setRevision] = useState(0);
  const [ratingPage, setRatingPage] = useState(1), [ratingSize, setRatingSize] = useState(25);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [ratingError, setRatingError] = useState(''), [ratingLoading, setRatingLoading] = useState(false);
  useEffect(()=>{
    if(!guestId)return;
    let active=true;const controller=new AbortController();setReputation(null);setRatingLoading(true);setRatingError('');
    command<Reputation>('guest.reputation',{hotel_id:s.hotel_id,branch_id:s.branch_id,guest_id:guestId,unique:true,page:ratingPage,page_size:ratingSize},undefined,controller.signal)
      .then(value=>{if(active)setReputation(value)})
      .catch(error=>{if(active&&!controller.signal.aborted)setRatingError(messageOf(error))})
      .finally(()=>{if(active)setRatingLoading(false)});
    return()=>{active=false;controller.abort()};
  },[s.hotel_id,s.branch_id,guestId,ratingPage,ratingSize,revision]);
  const openHistory = useGuestHistoryNavigation();
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
    [busy, setBusy] = useState(false);
  const query = {
    hotel_id: s.hotel_id,
    branch_id: s.branch_id,
    ...(guestId ? { guest_id: guestId, unique: true } : {}),
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
    revision,
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
  const tools = <div className="guest-history-filters">
    {!guestId && <TextField label={_uiText("Misafir arama")} placeholder={_uiText("Ad, kimlik veya telefon")} value={search} onChange={value=>{setSearch(value);setPage(1);}}/>}
    <DateField label={_uiText("Başlangıç")} value={from} onChange={value=>{setFrom(value);setPage(1);}}/>
    <DateField label={_uiText("Bitiş")} value={to} onChange={value=>{setTo(value);setPage(1);}}/>
    <InlineSelectField label={_uiText("Kayıtlar")} value={status} onChange={value=>{setStatus(value);setPage(1);}} options={[
      {value:'',label:_uiText("Tüm konaklamalar")}, {value:BookingState.CheckedIn,label:_uiText("Şu an konaklayanlar")},
      {value:BookingState.Completed,label:_uiText("Çıkış yapanlar")}, {value:BookingState.Confirmed,label:_uiText("Planlanan rezervasyonlar")}, {value:BookingState.Cancelled,label:_uiText("İptal edilenler")},
    ]}/>
  </div>;
  if(assessment)return <GuestAssessment snapshot={s} target={assessment} onClose={()=>{setAssessment(null);setRevision(value=>value+1);}}/>;
  return (
    <div className={`guest-history-page space-y-5 ${styles.page}`}>
      <ErrorMessage message={error} />
      {guestId && onBack && <button type="button" className={`${secondaryStyle} !rounded-full`} onClick={onBack}><ArrowLeft size={16}/>{_uiText("Misafir listesine dön")}</button>}
      {guestId && <header className="guest-history-heading"><span className="guest-history-avatar"><NavigationIcon name="guests" size={24}/></span><div><p>{_uiText("Misafir Konaklama Geçmişi")}</p><h2>{guestName || _uiText("Misafir")}</h2><span>{total} {_uiText("konaklama kaydı ·")} {s.branches.find(branch=>branch.branch_id===s.branch_id)?.name || _uiText("Seçili tesis")}</span></div></header>}
      {guestId ? tools : <PageHeader pageId="guests">{tools}</PageHeader>}
      <div className={styles.toolbar}>
        <div><h3>{guestId ? _uiText("Konaklama kayıtları") : _uiText("Misafir kayıtları")}<span className={styles.count}>{total}</span></h3><p>{_uiText("Konaklama bilgileri, geçmiş ücretler ve misafir değerlendirmeleri")}</p></div>
        <div className={`flex gap-2 ${styles.toolbarActions}`}>
          <button type="button" className={`uni-control ${secondaryStyle}`} disabled={busy} onClick={()=>setRevision(value=>value+1)}><RefreshCw size={15} aria-hidden="true"/>{_uiText("Yenile")}</button>
          {(search||from||to||status)&&<button type="button" className={`uni-control ${secondaryStyle}`} onClick={()=>{setSearch('');setFrom('');setTo('');setStatus('');setPage(1);}}><X size={15} aria-hidden="true"/>{_uiText("Filtreleri temizle")}</button>}
          <button
            className={`uni-control ${secondaryStyle}`}
            disabled={busy}
            onClick={() => download("xlsx")}
          >
            <Download size={15} aria-hidden="true"/> {_uiText("Excel İndir")} </button>
          <button
            className={`uni-control ${secondaryStyle}`}
            disabled={busy}
            onClick={() => download("pdf")}
          >
            <FileText size={15} aria-hidden="true"/> {_uiText("PDF İndir")} </button>
        </div>
      </div>
      <div className={`guest-history-table ${styles.grid}`} aria-busy={busy} tabIndex={0} role="region" aria-label={_uiText("Misafir konaklama tablosu; tüm sütunlar için yatay kaydırın")}>
        <table>
          <colgroup>{[220,130,116,116,185,180,130,180].map((width,index)=><col key={index} style={{width}}/>)}</colgroup>
          <thead className="bg-slate-50 text-slate-400">
            <tr>
              {[
                ["name", "Misafir"],
                ["room", "Oda / Tesis"],
                ["start", "Giriş"],
                ["end", "Çıkış"],
              ].map(([key, label]) => (
                <th key={key} scope="col" aria-sort={sort===key?(desc?"descending":"ascending"):"none"}>
                  <button type="button" className="uni-control guest-table-sort" onClick={() => sortBy(key)}><span>{label}</span>{sort===key?(desc?<ArrowDown size={14}/>:<ArrowUp size={14}/>):<ArrowUpDown size={14}/>}</button>
                </th>
              ))}
              <th scope="col" className="guest-table-amount">{_uiText("Konaklama bedeli")}</th><th scope="col">{_uiText("Birlikte kaldıkları")}</th>
              <th scope="col">{_uiText("Durum")}</th><th scope="col">{_uiText("İşlemler")}</th>
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
                    className="uni-control guest-table-person"
                    aria-label={r.name}
                    onClick={() =>
                      openHistory?.({ id: r.guest_id, name: r.name })
                    }
                  >
                    <span className={styles.avatar} aria-hidden="true">{r.name.trim().split(/\s+/).map(part=>part[0]).slice(0,2).join('').toLocaleUpperCase(_uiLocale)}</span>
                    <span className={styles.identity}><strong>{r.name}</strong><span className="guest-table-secondary">{r.phone || _uiText("Telefon kaydedilmemiş")}</span></span>
                  </button>
                </td>
                <td>
                  <strong className="guest-table-room">{r.room_code}</strong>
                  <p className="guest-table-secondary">{r.branch_name}</p>
                </td>
                <td><StayDate value={r.start}/></td>
                <td><StayDate value={r.end}/></td>
                <td className="guest-table-amount">{r.daily_price_minor>0?<><strong>{display(r.lodging_amount_minor,'money',r.currency||'TRY', _uiLocale)}</strong><p className="guest-table-secondary">{display(r.daily_price_minor,'money',r.currency||'TRY', _uiLocale)} {_uiText("/ gece ·")} {r.booking_nights} {_uiText("gece")}</p>{r.status===BookingState.Cancelled&&<p className="mt-1 text-xs text-uni-muted">{_uiText("İptal öncesi bedel")}</p>}</>:<span className="text-xs text-uni-muted">{_uiText("Fiyat girilmemiş")}</span>}</td>
                <td>
                  {!r.companions.length && <span className="guest-table-secondary">—</span>}
                  {r.companions.map((c) => (
                    <button
                      className="uni-control guest-table-person guest-table-companion"
                      key={c.guest_id}
                      onClick={() =>
                        openHistory?.({ id: c.guest_id, name: c.name })
                      }
                    >
                      {c.name}
                    </button>
                  ))}
                </td>
                <td className="p-4"><span className="guest-history-status" data-status={r.status}>{bookingStatuses[r.status]}</span></td><td className="p-4"><div className={styles.rowActions}>{openHistory && <button type="button" className="uni-control" aria-label={_uiText("{value1} konaklama geçmişi", {value1: String(r.name)})} onClick={()=>openHistory({id:r.guest_id,name:r.name})}><History size={15} aria-hidden="true"/>{_uiText("Konaklama geçmişi")}</button>}<button type="button" className={`${secondaryStyle} guest-table-assess !rounded-full`} onClick={()=>setAssessment(r)}><Star size={14} aria-hidden="true"/>{_uiText("Puan / Kara liste")}</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-8 text-slate-400 text-sm">
            {busy ? _uiText("Yükleniyor…") : _uiText("Bu sorguda kayıt bulunamadı.")}
          </p>
        )}
      </div>
      <p className="text-xs text-uni-muted">{_uiText("Bedel rezervasyonun tamamına aittir; oda değişikliği satırlarında tekrar görünebilir. Ek hizmetler ve tahsilatlar dahil değildir.")}</p>
      <Pagination label={_uiText("Misafir listesi sayfaları")} noun="kayıt" page={page} pageSize={pageSize} total={total} busy={busy} onPageChange={setPage} onPageSizeChange={v=>{setPageSize(v);setPage(1)}}/>
      {guestId && <>
        <section aria-label={_uiText("Misafir ve rezervasyon notları")} className="space-y-3 rounded-2xl border border-uni-border p-4">
          <h3 className="font-semibold">{_uiText("Misafir ve rezervasyon notları")}</h3>
          <p className="text-xs text-uni-muted">{_uiText("Listelenen konaklamaların notları. Önceki kayıtları görmek için konaklama sayfasını değiştirebilirsiniz.")}</p>
          {rows.filter((row,index,all)=>all.findIndex(other=>other.booking_id===row.booking_id)===index).filter(row=>row.guest_note||row.booking_notes||row.cancellation_reason).map(row=><article key={row.booking_id} className="space-y-3 rounded-xl bg-uni-surface p-4">
            <p className="text-xs text-uni-muted">{row.branch_name} · {row.room_code} · {date(row.start)}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">{[['Misafire özel not',row.guest_note],['Rezervasyon notu',row.booking_notes],['İptal gerekçesi',row.cancellation_reason]].filter(([,text])=>text).map(([label,text])=><div key={label}><dt className="text-xs font-medium text-uni-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{text}</dd></div>)}</dl>
          </article>)}
          {!busy&&!rows.some(row=>row.guest_note||row.booking_notes||row.cancellation_reason)&&<p className="text-sm text-uni-muted">{_uiText("Listelenen konaklamalara not eklenmemiş.")}</p>}
        </section>
        <section aria-label={_uiText("Misafir yorumları ve puanları")} className="space-y-4 rounded-2xl border border-uni-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{_uiText("Yorumlar ve puanlar")}</h3>{reputation&&<span className="rounded-full bg-brand-blue-50 px-3 py-2 text-xs text-brand-blue-700">{reputation.rating_count?_uiText("{value1} / 5 · {value2} değerlendirme", {value1: String(reputation.average.toFixed(1)), value2: String(reputation.rating_count)}):_uiText("Henüz değerlendirilmedi")}</span>}</div>
          <ErrorMessage message={ratingError}/>
          {ratingError&&<button type="button" className={secondaryStyle} onClick={()=>setRevision(value=>value+1)}>{_uiText("Tekrar dene")}</button>}
          {ratingLoading?<p role="status" className="text-sm text-uni-muted">{_uiText("Yorumlar yükleniyor…")}</p>:reputation&&<><CustomerComments data={reputation}/><BlacklistNotice items={reputation.blacklist}/></>}
          <Pagination label={_uiText("Misafir yorum sayfaları")} noun="yorum" page={ratingPage} pageSize={ratingSize} total={reputation?.rating_count??0} busy={ratingLoading||!reputation} onPageChange={setRatingPage} onPageSizeChange={size=>{setRatingSize(size);setRatingPage(1);}}/>
        </section>
      </>}


    </div>
  );
}
