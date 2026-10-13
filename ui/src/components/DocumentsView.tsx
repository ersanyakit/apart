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
  Field,
  inputStyle,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
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
    [language, setLanguage] = useState("TR"),
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
      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Belge türü">
          <select
            className={`uni-input ${inputStyle}`}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {Object.entries(documentKinds).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dil">
          <select
            className={`uni-input ${inputStyle}`}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {s.languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          className={`uni-control ${secondaryStyle}`}
          onClick={async () => {
            const example = defaults.find((t) => t.kind === kind);
            if (!example) return;
            if (
              (draft.title[language] || draft.body[language]) &&
              !(await confirmDialog(
                "Seçilen dildeki metin örnek şablonla değiştirilsin mi?",
              ))
            )
              return;
            setDraft({
              ...draft,
              title: {
                ...draft.title,
                [language]: example.title[language] || "",
              },
              body: { ...draft.body, [language]: example.body[language] || "" },
            });
          }}
        >
          Örnek Metni Yükle
        </button>
      </div>
      <Field label="Belge başlığı">
        <input
          className={`uni-input ${inputStyle}`}
          required
          value={draft.title[language] || ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              title: { ...draft.title, [language]: e.target.value },
            })
          }
        />
      </Field>
      <Field label="Belge metni">
        <textarea
          className={`uni-input ${inputStyle + " min-h-[480px] font-mono text-xs leading-6"}`}
          required
          maxLength={16000}
          value={draft.body[language] || ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              body: { ...draft.body, [language]: e.target.value },
            })
          }
        />
      </Field>
      <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
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
              onClick={() =>
                setDraft({
                  ...draft,
                  body: {
                    ...draft.body,
                    [language]: (draft.body[language] || "") + `{{${p}}}`,
                  },
                })
              }
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
    [amount, setAmount] = useState(""),
    [currency, setCurrency] = useState("TRY"),
    [method, setMethod] = useState("cash"),
    [reference, setReference] = useState(""),
    [paidAt, setPaidAt] = useState(localDate(new Date().toISOString())),
    [preview, setPreview] = useState<Document | null>(null),
    [documents, setDocuments] = useState<Document[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
          amount_minor: Math.round(Number(amount || 0) * 100),
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Belge türü">
          <select
            className={`uni-input ${inputStyle}`}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPreview(null);
            }}
          >
            {Object.entries(documentKinds).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dil">
          <select
            className={`uni-input ${inputStyle}`}
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setPreview(null);
            }}
          >
            {s.languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        {["sale_receipt", "sale_contract"].includes(kind) && (
          <>
            <Field
              label={
                kind === "sale_receipt"
                  ? "Tahsil edilen tutar"
                  : "Sözleşme bedeli"
              }
            >
              <input
                className={`uni-input ${inputStyle}`}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Para birimi">
              <select
                className={`uni-input ${inputStyle}`}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {["TRY", "EUR", "USD", "GBP"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {kind === "sale_receipt" && (
          <>
            <Field label="Ödeme yöntemi">
              <select
                className={`uni-input ${inputStyle}`}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="cash">Nakit</option>
                <option value="card">Kart</option>
                <option value="bank_transfer">Banka transferi</option>
              </select>
            </Field>
            <Field label="Ödeme tarihi">
              <input
                className={`uni-input ${inputStyle}`}
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </Field>
            <Field label="İşlem referansı">
              <input
                className={`uni-input ${inputStyle}`}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
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
          className="uni-card border border-slate-200 rounded-xl bg-white p-7 shadow-sm"
        >
          <h3 className="font-black text-xl mb-5">{preview.title}</h3>
          <pre className="font-sans text-sm whitespace-pre-wrap leading-7">
            {preview.body}
          </pre>
        </article>
      )}
      <h3 className="text-xs font-black text-slate-500">KAYITLI BELGELER</h3>
      {documents.map((d) => (
        <div
          className="flex justify-between gap-3 items-center p-4 border border-slate-200 rounded-xl"
          key={d.document_id}
        >
          <div>
            <strong className="text-sm">{d.title}</strong>
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
