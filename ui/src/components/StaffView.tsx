import { useI18n } from "./I18n";
import { StaffIdentityFields, roles, type Person } from "./StaffIdentityFields";
import { PageHeader } from "./PageHeader";
import { SettingsEditor } from "./SettingsEditor";
import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { command, messageOf, type Snapshot } from "../lib/api";
import {
  ErrorMessage,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
import { InlineSelectField, Switch, TextField } from "./fields";
import { confirmDialog } from "./ConfirmDialog";
export function StaffView({ snapshot: s }: { snapshot: Snapshot }) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [people, setPeople] = useState<Person[]>([]),
    [editing, setEditing] = useState<Person | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    command<Person[]>("staff.list", { hotel_id: s.hotel_id })
      .then((items) => {
        if (active) setPeople(items);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      });
    return () => {
      active = false;
    };
  }, [s.hotel_id, revision]);
  return (
    <div className="space-y-5">
      <div hidden={!!editing} className="space-y-5">
        <ErrorMessage message={error} />
        <PageHeader pageId="staff" actions={
        <button
          className={`uni-control ${buttonStyle}`}
          onClick={() =>
            setEditing({
              hotel_id: s.hotel_id,
              username: "",
              first_name: "",
              last_name: "",
              email: "",
              role: "reception",
              branch_ids: [s.branch_id],
              password: "",
            })
          }
        >
          <Plus size={14} />{_uiText("Personel Ekle")} </button>
        } />
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {people.map((p) => (
            <article
              key={p.user_id}
              className="uni-card rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
            >
              <User className="text-brand-blue-500" />
              <div>
                <h3 className="font-black">
                  {p.first_name} {p.last_name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {p.username} · {_uiText(roles[p.role] || p.role)}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {["management", "admin"].includes(p.role)
                  ? _uiText("Otelin tüm şubeleri")
                  : p.branch_ids
                      .map(
                        (id) =>
                          s.branches.find((b) => b.branch_id === id)?.name || id,
                      )
                      .join(", ")}
              </p>
              <div className="flex gap-2">
                <button
                  className={`uni-control ${secondaryStyle}`}
                  onClick={() => setEditing({ ...p, password: "" })}
                >
                  <Pencil size={13} />{_uiText("Düzenle")} </button>
                <button
                  className={`uni-control ${secondaryStyle}`}
                  disabled={p.user_id === s.user.user_id}
                  onClick={async () => {
                    if (
                      !(await confirmDialog(
                        _uiText("{value1} {value2} personel kaydı silinsin mi? Açık oturumları kapatılacak, işlem geçmişi korunacak.", {value1: String(p.first_name), value2: String(p.last_name)}),
                      ))
                    )
                      return;
                    try {
                      await command("staff.delete", {
                        hotel_id: s.hotel_id,
                        id: p.user_id,
                      });
                      setRevision((v) => v + 1);
                    } catch (e) {
                      setError(messageOf(e));
                    }
                  }}
                >
                  <Trash2 size={13} />{_uiText("Sil")} </button>
              </div>
            </article>
          ))}
        </div>
      </div>
      {editing && (
        <SettingsEditor
          title={editing.user_id ? _uiText("Personeli Düzenle") : _uiText("Yeni Personel")}
          onClose={() => setEditing(null)}
        >
          <StaffForm
            initial={editing}
            snapshot={s}
            onSaved={() => {
              setEditing(null);
              setRevision((v) => v + 1);
            }}
          />
        </SettingsEditor>
      )}
    </div>
  );
}
function StaffForm({
  initial,
  snapshot: s,
  onSaved,
}: {
  initial: Person;
  snapshot: Snapshot;
  onSaved: () => void;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [p, setP] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const patch = (v: Partial<Person>) => setP((old) => ({ ...old, ...v }));
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await command(p.user_id ? "staff.update" : "staff.create", p);
          if (p.user_id === s.user.user_id) {
            window.location.reload();
            return;
          }
          onSaved();
        } catch (e) {
          setError(messageOf(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorMessage message={error} />
      <StaffIdentityFields value={p} onChange={setP} allowAdmin={s.user.role==="admin"}/>
      <div className="rounded-[20px] bg-[#f9f9f9] p-4 space-y-1">
        <p className="font-uninav-book px-1 pb-2 text-[0.875rem] leading-5 text-slate-500">{_uiText("Şube erişimleri")} </p>
        {s.branches.map((b) => (
          <Switch
            key={b.branch_id}
            label={b.name}
            checked={!!b.branch_id && p.branch_ids.includes(b.branch_id)}
            disabled={["management", "admin"].includes(p.role)}
            onChange={(v) =>
              patch({
                branch_ids: v
                  ? [...p.branch_ids, b.branch_id!]
                  : p.branch_ids.filter((id) => id !== b.branch_id),
              })
            }
          />
        ))}
        {["management", "admin"].includes(p.role) && (
          <p className="px-1 pt-1 text-xs text-slate-400">{_uiText("Yönetim rolü otelin tüm şubelerine erişir.")} </p>
        )}
      </div>
      <p className="text-xs text-slate-400">{_uiText("Girişte yalnızca personelin adı gösterilir. Güncelleme sonrasında personelin yeniden giriş yapması gerekir.")} </p>
      <button className={`uni-control ${buttonStyle}`} disabled={busy}>{_uiText("Personeli Kaydet")} </button>
    </form>
  );
}
