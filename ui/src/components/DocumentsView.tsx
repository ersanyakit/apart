import { PageHeader } from "./PageHeader";
import { useNotifications } from "./Toast";
import React, { useEffect, useState } from "react";
import {
  command,
  downloadCommand,
  messageOf,
  type Snapshot,
  type Booking,
  type LocalizedString,
} from "../lib/api";
import {
  ErrorMessage,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
import {
  DateField,
  InlineSelectField,
  LocalizedTextFields,
  MoneyField,
  TextField,
} from "./fields";
import { CURRENCIES } from "./Currency";
import { confirmDialog } from "./ConfirmDialog";
import { localDate } from "./BookingForm";
export const documentKinds: Record<string, string> = {
  rental_contract: "Kira Sözleşmesi",
  sale_contract: "Satış Sözleşmesi",
  reservation_receipt: "Rezervasyon Dekontu",
  sale_receipt: "Satış / Tahsilat Dekontu",
  cancellation_receipt: "İptal Belgesi",
};
type Template = {
  template_id?: string;
  hotel_id: string;
  kind: string;
  title: LocalizedString;
  body: LocalizedString;
};
type Document = {
  document_id: string;
  kind: string;
  language: string;
  title: string;
  body: string;
  created_at: string;
};
const placeholders = [
  "hotel_name",
  "branch_name",
  "room_code",
  "guest_name",
  "guest_names",
  "id_numbers",
  "phones",
  "relationships",
  "check_in",
  "check_out",
  "inventory",
  "amount",
  "currency",
  "payment_method",
  "payment_reference",
  "paid_at",
  "booking_id",
];
export function DocumentTemplates({ snapshot: s }: { snapshot: Snapshot }) {
  const notify = useNotifications();
  const [templates, setTemplates] = useState<Template[]>([]),
    [defaults, setDefaults] = useState<Template[]>([]),
    [kind, setKind] = useState("rental_contract"),
    [draft, setDraft] = useState<Template>({
      hotel_id: s.hotel_id,
      kind: "rental_contract",
      title: {},
      body: {},
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      command<Template[]>("document.templates", { hotel_id: s.hotel_id }),
      command<Template[]>("document.template.defaults"),
    ])
      .then(([rows, defs]) => {
        if (active) {
          setTemplates(rows);
          setDefaults(defs);
        }
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      });
    return () => {
      active = false;
    };
  }, [s.hotel_id]);
  useEffect(() => {
    setDraft(
      templates.find((t) => t.kind === kind) || {
        hotel_id: s.hotel_id,
        kind,
        title: {},
        body: {},
      },
    );
  }, [kind, templates, s.hotel_id]);
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const saved = await command<Template>(
            "document.template.save",
            draft,
          );
          setTemplates((rows) => [
            ...rows.filter((t) => t.kind !== kind),
            saved,
          ]);
          notify(
            "Şablon kaydedildi. Daha önce oluşturulan belgeler değişmedi.",
          );
        } catch (e) {
          setError(messageOf(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorMessage message={error} />
      <PageHeader pageId="templates">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        <InlineSelectField
          label="Belge türü"
          value={kind}
          onChange={setKind}
          options={Object.entries(documentKinds).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <div className="flex items-end">
          <button
            type="button"
            className={`uni-control ${secondaryStyle} w-full`}
            onClick={async () => {
              const example = defaults.find((t) => t.kind === kind);
              if (!example) return;
              const fillable = (current: LocalizedString, sample?: LocalizedString) => {
                const next = { ...current };
                let overwrites = false;
                for (const [lang, text] of Object.entries(sample || {})) {
                  if (!text) continue;
                  if ((next[lang] || "").trim()) {
                    if (next[lang] !== text) overwrites = true;
                    continue;
                  }
                  next[lang] = text;
                }
                return { next, overwrites };
              };
              const title = fillable(draft.title, example.title);
              const body = fillable(draft.body, example.body);
              if (
                (title.overwrites || body.overwrites) &&
                !(await confirmDialog(
                  "Dolu alanlardaki metin örnek şablonla değiştirilsin mi?",
                ))
              )
                return;
              if (title.overwrites) {
                for (const [lang, text] of Object.entries(example.title || {})) {
                  if (text) title.next[lang] = text;
                }
              }
              if (body.overwrites) {
                for (const [lang, text] of Object.entries(example.body || {})) {
                  if (text) body.next[lang] = text;
                }
              }
              setDraft({ ...draft, title: title.next, body: body.next });
            }}
          >
            Örnek Metni Yükle
          </button>
        </div>
      </div>
      </PageHeader>
      <LocalizedTextFields
        label="Belge başlığı"
        hint="Her dil için ayrı başlık ekleyin."
        values={draft.title}
        onChange={(title) => setDraft({ ...draft, title })}
      />
      <LocalizedTextFields
        label="Belge metni"
        hint="Her dil için ayrı metin ekleyin."
        values={draft.body}
        onChange={(body) => setDraft({ ...draft, body })}
        multiline
        rows={12}
        mono
      />
      <div className="rounded-[20px] bg-[#f9f9f9] p-4 space-y-3">
        <p className="text-xs text-slate-500">
          Konaklama bilgilerinden doldurulacak alanlar. İşletme unvanı, belge
          numarası ve koşulları metinde düzenleyebilirsiniz.
        </p>
        <div className="flex flex-wrap gap-2">
          {placeholders.map((p) => (
            <button
              type="button"
              className="uni-control text-[10px] bg-white border rounded-lg px-2 py-1 font-mono"
              key={p}
              onClick={() => {
                const target =
                  draft.body.TR !== undefined
                    ? "TR"
                    : (Object.keys(draft.body)[0] ?? "TR");
                setDraft({
                  ...draft,
                  body: {
                    ...draft.body,
                    [target]: (draft.body[target] || "") + `{{${p}}}`,
                  },
                });
              }}
            >{`{{${p}}}`}</button>
          ))}
        </div>
      </div>
      <button className={`uni-control ${buttonStyle}`} disabled={busy}>
        Şablonu Kaydet
      </button>
    </form>
  );
}
export function BookingDocuments({
  snapshot: s,
  booking: b,
  initialKind = "reservation_receipt",
}: {
  snapshot: Snapshot;
  booking: Booking;
  initialKind?: string;
}) {
  const [kind, setKind] = useState(initialKind),
    [language, setLanguage] = useState("TR"),
    [amountMinor, setAmountMinor] = useState(0),
    [currency, setCurrency] = useState("TRY"),
    [method, setMethod] = useState("cash"),
    [reference, setReference] = useState(""),
    [paidAt, setPaidAt] = useState(localDate(new Date().toISOString())),
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
  const prepare = async (save: boolean) => {
    setBusy(true);
    setError("");
    try {
      const d = await command<Document>(
        save ? "document.issue" : "document.preview",
        {
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
      <p className="text-sm font-black">
        {b.guest_name} · {s.rooms.find((r) => r.room_id === b.room_id)?.code}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InlineSelectField
          label="Belge türü"
          value={kind}
          onChange={(v) => {
            setKind(v);
            setPreview(null);
          }}
          options={Object.entries(documentKinds).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <InlineSelectField
          label="Dil"
          value={language}
          onChange={(v) => {
            setLanguage(v);
            setPreview(null);
          }}
          options={s.languages.map((l) => ({ value: l, label: l }))}
        />
        {["sale_receipt", "sale_contract"].includes(kind) && (
          <>
            <MoneyField
              label={
                kind === "sale_receipt"
                  ? "Tahsil edilen tutar"
                  : "Sözleşme bedeli"
              }
              valueMinor={amountMinor}
              onChange={setAmountMinor}
            />
            <InlineSelectField
              label="Para birimi"
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
              label="Ödeme yöntemi"
              value={method}
              onChange={setMethod}
              options={
                channels.length > 0
                  ? channels.map((c) => ({
                      value: c.code,
                      label: c.labels.TR || c.code,
                    }))
                  : [
                      { value: "cash", label: "Nakit" },
                      { value: "card", label: "Kart" },
                      { value: "bank_transfer", label: "Banka transferi" },
                    ]
              }
            />
            <DateField
              label="Ödeme tarihi"
              value={paidAt}
              onChange={setPaidAt}
            />
            <div className="sm:col-span-2">
              <TextField
                label="İşlem referansı"
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
        >
          Önizle
        </button>
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
        >
          Belgeyi Oluştur ve İndir
        </button>
      </div>
      {preview && (
        <article
          lang={language.toLowerCase()}
          dir={language === "AR" ? "rtl" : "ltr"}
          className="uni-card rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="font-uninav-book mb-4 text-xl leading-7 text-slate-900">{preview.title}</h3>
          <pre className="font-sans text-sm whitespace-pre-wrap leading-7">
            {preview.body}
          </pre>
        </article>
      )}
      <h3 className="font-uninav-book text-xs font-bold uppercase tracking-wider text-slate-500">Kayıtlı belgeler</h3>
      {documents.map((d) => (
        <div
          className="flex justify-between gap-3 items-center rounded-[20px] bg-[#f9f9f9] p-4"
          key={d.document_id}
        >
          <div className="min-w-0">
            <strong className="block truncate text-sm text-slate-900">{d.title}</strong>
            <p className="text-xs text-slate-400">
              {d.language} · {new Date(d.created_at).toLocaleString("tr-TR")}
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
          >
            PDF İndir
          </button>
        </div>
      ))}
    </div>
  );
}
