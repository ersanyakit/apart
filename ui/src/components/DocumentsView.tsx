import { useI18n } from "./I18n";
import { NavigationIcon } from "./NavigationIcon";
import React, { useEffect, useState } from "react";
import {
  command,
  downloadCommand,
  messageOf,
  type Snapshot,
  type Booking,
} from "../lib/api";
import {
  ErrorMessage,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
import {
  DateField,
  InlineSelectField,
  MoneyField,
  TextField,
} from "./fields";
import { CURRENCIES } from "./Currency";
import { confirmDialog } from "./ConfirmDialog";
import { localDate } from "./BookingForm";
export { documentKinds } from './document-editor/markup';
export { TemplateSettings as DocumentTemplates } from './document-editor/TemplateSettings';
import { documentKinds, plainHTML } from './document-editor/markup';
import { DocumentEditor, DocumentPreview } from './document-editor/DocumentEditor';
type Document = { document_id:string;kind:string;language:string;title:string;body:string;format?:string;created_at:string };
export function BookingDocuments({
  snapshot: s,
  booking: b,
  initialKind = "reservation_receipt",
  onFolio,
}: {
  snapshot: Snapshot;
  booking: Booking;
  initialKind?: string;
  onFolio?:()=>void;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [kind, setKind] = useState(initialKind),
    [language, setLanguage] = useState("TR"),
    [amountMinor, setAmountMinor] = useState(0),
    [currency, setCurrency] = useState("TRY"),
    [method, setMethod] = useState("cash"),
    [reference, setReference] = useState(""),
    [paidAt, setPaidAt] = useState(localDate(new Date().toISOString())),
    [customBody,setCustomBody] = useState<string|null>(null),
    [preview, setPreview] = useState<Document | null>(null),
    [documents, setDocuments] = useState<Document[]>([]),
    [channels, setChannels] = useState<
      { code: string; labels: Record<string, string>; active: boolean }[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    command<
      { code: string; labels: Record<string, string>; active: boolean }[]
    >("payment_channel.list", { hotel_id: s.hotel_id })
      .then((rows) => {
        const active = rows.filter((r) => r.active);
        setChannels(active.length ? active : rows);
      })
      .catch(() => {});
  }, [s.hotel_id]);
  useEffect(() => {
    if (
      channels.length > 0 &&
      !channels.some((c) => c.code === method)
    ) {
      setMethod(channels[0].code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels ]);
  const reload = async () =>
    setDocuments(
      await command<Document[]>("document.list", {
        hotel_id: s.hotel_id,
        branch_id: b.branch_id,
        booking_id: b.booking_id,
      }),
    );
  useEffect(() => {
    void reload().catch((e) => setError(messageOf(e)));
  }, [b.booking_id]);
  useEffect(() => { setPreview(null); setCustomBody(null); }, [kind,language,amountMinor,currency,method,reference,paidAt,b.booking_id]);
  const prepare = async (save: boolean) => {
    setBusy(true);
    setError("");
    try {
      const d = await command<Document>(
        save ? "document.issue" : "document.preview",
        {
          ...(save && customBody !== null ? {body_override:customBody} : {}),
          hotel_id: s.hotel_id,
          branch_id: b.branch_id,
          booking_id: b.booking_id,
          kind,
          language,
          amount_minor: amountMinor,
          currency,
          payment_method: method,
          reference,
          paid_at: paidAt ? new Date(paidAt).toISOString() : null,
        },
      );
      setPreview(d);
      setCustomBody(null);
      if (save) {
        await reload();
        await downloadCommand(
          "document.download",
          { id: d.document_id },
          `${kind}-${b.booking_id}.pdf`,
        );
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <ErrorMessage message={error} />
      {onFolio&&<button type="button" className={secondaryStyle} onClick={onFolio}><NavigationIcon name="folio" size={18}/>{_uiText("Oda folyosu / Hizmet ekle")}</button>}
      <p className="text-sm font-black">
        {b.guest_name} · {s.rooms.find((r) => r.room_id === b.room_id)?.code}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InlineSelectField
          label={_uiText("Belge türü")}
          value={kind}
          onChange={(v) => {
            setKind(v);
            setPreview(null);
            setCustomBody(null);
          }}
          options={Object.entries(documentKinds).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <InlineSelectField
          label={_uiText("Dil")}
          value={language}
          onChange={(v) => {
            setLanguage(v);
            setPreview(null);
            setCustomBody(null);
          }}
          options={s.languages.map((l) => ({ value: l, label: l }))}
        />
        {["sale_receipt", "sale_contract"].includes(kind) && (
          <>
            <MoneyField
              label={
                kind === "sale_receipt"
                  ? _uiText("Tahsil edilen tutar")
                  : _uiText("Sözleşme bedeli")
              }
              valueMinor={amountMinor}
              onChange={setAmountMinor}
            />
            <InlineSelectField
              label={_uiText("Para birimi")}
              value={currency}
              onChange={setCurrency}
              options={CURRENCIES.map((c) => ({
                value: c.id,
                label: `${c.id} · ${c.label}`,
              }))}
            />
          </>
        )}
        {kind === "sale_receipt" && (
          <>
            <InlineSelectField
              label={_uiText("Ödeme yöntemi")}
              value={method}
              onChange={setMethod}
              options={
                channels.length > 0
                  ? channels.map((c) => ({
                      value: c.code,
                      label: c.labels.TR || c.code,
                    }))
                  : [
                      { value: "cash", label: _uiText("Nakit") },
                      { value: "card", label: _uiText("Kart") },
                      { value: "bank_transfer", label: _uiText("Banka transferi") },
                    ]
              }
            />
            <DateField
              label={_uiText("Ödeme tarihi")}
              value={paidAt}
              onChange={setPaidAt}
            />
            <div className="sm:col-span-2">
              <TextField
                label={_uiText("İşlem referansı")}
                autoComplete="off"
                value={reference}
                onChange={setReference}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex gap-3">
        <button
          className={`uni-control ${secondaryStyle}`}
          disabled={busy}
          onClick={() => prepare(false)}
        >{_uiText("Önizle")} </button>
        <button
          className={`uni-control ${buttonStyle}`}
          disabled={busy}
          onClick={async () => {
            if (
              await confirmDialog(
                "Belge seçilen dilde kaydedilsin ve PDF olarak indirilsin mi? Kayıtlı belgenin metni sonradan değişmez.",
              )
            )
              await prepare(true);
          }}
        >{_uiText("Belgeyi Oluştur ve İndir")} </button>
      </div>
      {preview && (
        <article
          lang={language.toLowerCase()}
          dir={language === "AR" ? "rtl" : "ltr"}
          className="rounded-[20px] bg-[var(--color-uni-surface)] p-5"
        >
          <h3 className="font-uninav-book mb-4 text-xl leading-7 text-slate-900">{preview.title}</h3>
          {customBody !== null ? <DocumentEditor value={customBody} onChange={setCustomBody} language={language} disabled={busy}/> : <DocumentPreview body={preview.body} format={preview.format} language={language}/>}
          <div className="flex gap-3 mt-4"><button type="button" disabled={busy} className={secondaryStyle} onClick={() => setCustomBody(customBody===null ? (preview.format==='html'?preview.body:plainHTML(preview.body)) : null)}>{customBody===null?_uiText("Bu belgenin metnini düzenle"):_uiText("Şablon metnine dön")}</button><p className="text-xs text-uni-muted self-center">{_uiText("Düzenleme yalnızca oluşturacağınız belgeye uygulanır.")}</p></div>
        </article>
      )}
      <h3 className="font-uninav-book text-xs font-bold uppercase tracking-wider text-slate-500">{_uiText("Kayıtlı belgeler")}</h3>
      {documents.map((d) => (
        <div
          className="flex justify-between gap-3 items-center rounded-[20px] bg-[#f9f9f9] p-4"
          key={d.document_id}
        >
          <div className="min-w-0">
            <strong className="block truncate text-sm text-slate-900">{d.title}</strong>
            <p className="text-xs text-slate-400">
              {d.language} · {new Date(d.created_at).toLocaleString(_uiLocale)}
            </p>
          </div>
          <button
            className={`uni-control ${secondaryStyle}`}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await downloadCommand(
                  "document.download",
                  { id: d.document_id },
                  `belge-${d.document_id}.pdf`,
                );
              } catch (e) {
                setError(messageOf(e));
              } finally {
                setBusy(false);
              }
            }}
          >{_uiText("PDF İndir")} </button>
        </div>
      ))}
    </div>
  );
}
