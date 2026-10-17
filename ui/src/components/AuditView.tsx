import { useI18n } from "./I18n";
import { RefreshCw, SlidersHorizontal, ChevronDown, UserRound } from "lucide-react";
import styles from "./AuditView.module.css";
import { PageHeader } from "./PageHeader";
import { usePreference } from "./UserPreferences";
import React, { useEffect, useState } from "react";
import { command, messageOf } from "../lib/api";
import { ErrorMessage, secondaryStyle } from "./FormKit";
import { DateField, InlineSelectField } from "./fields";
import { auditLocationSummary, type AuditDetails } from "../lib/audit-location";
import { auditActions as actions, auditEntities as entities, auditChanges, auditSummary, auditHeadline, auditSubject } from "../lib/audit-presentation";
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
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [rows, setRows] = useState<Entry[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = usePreference<number>("audit_page_size", 25),
    [showDates, setShowDates] = useState(false),
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
      ...(from ? { from: new Date(`${from}T00:00:00+03:00`).toISOString() } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59.999+03:00`).toISOString() } : {}),
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
      <PageHeader pageId="logs" actions={<button type="button" className={`uni-control ${secondaryStyle}`} disabled={busy} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/>{_uiText("Yenile")}</button>}/>
      <div className={styles.filters}>
        <div className={styles.actionFilter}><InlineSelectField label={_uiText("İşlem türü")} value={action} onChange={value=>{setAction(value);setPage(1);}} options={[{value:"",label:_uiText("Tüm işlemler")},...Object.entries(actions).map(([value,label])=>({value,label:_uiText(label)}))]}/></div>
        <button type="button" aria-expanded={showDates} className={`uni-control ${secondaryStyle}`} onClick={()=>setShowDates(v=>!v)}><SlidersHorizontal size={16}/>{_uiText("Tarih aralığı")}</button>
        {(from||to||action)&&<button type="button" className={`uni-control ${secondaryStyle}`} onClick={()=>{setFrom('');setTo('');setAction('');setShowDates(false);setPage(1);}}>{_uiText("Filtreleri temizle")}</button>}
        {showDates&&<div className={styles.dates}><DateField withTime={false} label={_uiText("Başlangıç tarihi")} value={from} onChange={v=>{setFrom(v);setPage(1);}}/><DateField withTime={false} label={_uiText("Bitiş tarihi")} value={to} onChange={v=>{setTo(v);setPage(1);}}/></div>}
      </div>
      <section className={styles.history} aria-label={_uiText("İşlem geçmişi")} aria-busy={busy}>
       <div className={styles.listHeader}><span>{_uiText("Yapılan işlem")}</span><span>{_uiText("İşlemi yapan")}</span><span>{_uiText("Tarih / saat")}</span></div>
       {!busy&&rows.map(r=>{
        const location=auditLocationSummary(r.entity,r.details),changes=auditChanges(r,_uiLocale,_uiText);
        const time=new Date(r.created_at);
        const highlight=changes.find(c=>c.key==='status');
        return <article className={styles.entry} key={r.id}>
         <div className={styles.row}>
          <div className={styles.operation}><span className={styles.category}>{_uiText(entities[r.entity]||"İşlem kaydı")}</span><h3>{auditHeadline(r,_uiText)}</h3>{auditSubject(r)&&<p>{auditSubject(r)}</p>}
           <p>{location.label!=='—'&&<strong>{location.label}</strong>}{location.branch&&<span>{location.branch}</span>}</p>
           {highlight&&<p className={styles.change}>{highlight.before!=='—'?<>{highlight.before} <span aria-label={_uiText("şu duruma değişti")}>→</span></>:<span>{_uiText("Durum:")}</span>} {highlight.after}</p>}
          </div>
          <div className={styles.actor}><span className={styles.avatar}><UserRound size={16}/></span><span>{r.actor_name||_uiText("Sistem")}</span></div>
          <time className={styles.time} dateTime={r.created_at}>{time.toLocaleDateString(_uiLocale,{timeZone:'Europe/Istanbul',day:'numeric',month:'short',year:'numeric'})}<span>{time.toLocaleTimeString(_uiLocale,{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'})}</span></time>
         </div>
         <details className={styles.details}><summary>{_uiText("İşlem ayrıntıları")}<ChevronDown size={15}/></summary>
          <p>{auditSummary(r,_uiText)}</p>
          {r.details?.reason&&<p><strong>{_uiText("Gerekçe:")}</strong> {r.details.reason}</p>}
          {location.inferred&&<p>{_uiText("Oda bilgisi güncel kayıttan alınmıştır.")}</p>}
          {!!changes.length&&<dl className={styles.changes}>{changes.map(c=><div key={c.key}><dt>{c.label}</dt><dd>{r.action!=='create'&&<p><span>{_uiText("Önce")}</span>{c.before}</p>}{r.action!=='delete'&&<p><span>{r.action==='create'?_uiText("Bilgi"):_uiText("Sonra")}</span>{c.after}</p>}</dd></div>)}</dl>}
          {!changes.length&&<p>{_uiText("Bu işlem için ek alan bilgisi kaydedilmemiş.")}</p>}
          <details className={styles.technical}><summary>{_uiText("Teknik kayıt bilgileri")}</summary><dl><dt>{_uiText("İşlem kodu")}</dt><dd>{r.command||'—'}</dd><dt>{_uiText("Kayıt kimliği")}</dt><dd>{r.entity_id}</dd><dt>{_uiText("İstek kimliği")}</dt><dd>{r.request_id||'—'}</dd></dl></details>
         </details>
        </article>;
       })}
       {(busy||!rows.length)&&<p className={styles.empty} role="status">{busy?_uiText("İşlem geçmişi yükleniyor…"):_uiText("Seçilen filtrelere uygun işlem bulunamadı.")}</p>}
      </section>
      <Pagination label={_uiText("İşlem geçmişi sayfaları")} compact page={page} pageSize={pageSize} total={total} busy={busy}
        onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </div>
  );
}
