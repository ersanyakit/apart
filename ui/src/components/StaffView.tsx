import { SettingsEditor } from "./SettingsEditor";
import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { command, messageOf, type Snapshot } from "../lib/api";
import {
  ErrorMessage,
  Field,
  inputStyle,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
import { confirmDialog } from "./ConfirmDialog";
type Person = {
  user_id?: string;
  hotel_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  branch_ids: string[];
  password?: string;
};
const roles: Record<string, string> = {
  management: "Yönetim",
  reception: "Resepsiyon",
  accounting: "Muhasebe",
  housekeeping: "Kat hizmetleri",
  technical_service: "Teknik servis",
  maintenance: "Bakım",
  supervisor: "Sorumlu",
  admin: "Sistem yöneticisi",
};
export function StaffView({ snapshot: s }: { snapshot: Snapshot }) {
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
          <Plus size={14} />
          Personel Ekle
        </button>
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
                  {p.username} · {roles[p.role]}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {["management", "admin"].includes(p.role)
                  ? "Otelin tüm şubeleri"
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
                  <Pencil size={13} />
                  Düzenle
                </button>
                <button
                  className={`uni-control ${secondaryStyle}`}
                  disabled={p.user_id === s.user.user_id}
                  onClick={async () => {
                    if (
                      !(await confirmDialog(
                        `${p.first_name} ${p.last_name} personel kaydı silinsin mi? Açık oturumları kapatılacak, işlem geçmişi korunacak.`,
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
                  <Trash2 size={13} />
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
      {editing && (
        <SettingsEditor
          title={editing.user_id ? "Personeli Düzenle" : "Yeni Personel"}
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
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            ["first_name", "Ad"],
            ["last_name", "Soyad"],
            ["username", "Kullanıcı adı"],
            ["email", "E-posta"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              className={`uni-input ${inputStyle}`}
              required={key !== "email"}
              type={key === "email" ? "email" : "text"}
              autoComplete="off"
              value={p[key]}
              onChange={(e) => patch({ [key]: e.target.value })}
            />
          </Field>
        ))}
        <Field label="Rol">
          <select
            className={`uni-input ${inputStyle}`}
            value={p.role}
            onChange={(e) => patch({ role: e.target.value })}
          >
            {Object.entries(roles)
              .filter(([r]) => r !== "admin" || s.user.role === "admin")
              .map(([r, l]) => (
                <option key={r} value={r}>
                  {l}
                </option>
              ))}
          </select>
        </Field>
        <Field
          label={p.user_id ? "Yeni şifre (değiştirmek için)" : "Giriş şifresi"}
        >
          <input
            className={`uni-input ${inputStyle}`}
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required={!p.user_id}
            value={p.password || ""}
            onChange={(e) => patch({ password: e.target.value })}
          />
        </Field>
      </div>
      <fieldset className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <legend className="px-2 text-xs font-bold text-slate-500">
          Şube erişimleri
        </legend>
        {s.branches.map((b) => (
          <label key={b.branch_id} className="flex gap-3 text-sm">
            <input
              type="checkbox"
              checked={p.branch_ids.includes(b.branch_id!)}
              disabled={["management", "admin"].includes(p.role)}
              onChange={(e) =>
                patch({
                  branch_ids: e.target.checked
                    ? [...p.branch_ids, b.branch_id!]
                    : p.branch_ids.filter((id) => id !== b.branch_id),
                })
              }
            />
            {b.name}
          </label>
        ))}
        {["management", "admin"].includes(p.role) && (
          <p className="text-xs text-slate-400">
            Yönetim rolü otelin tüm şubelerine erişir.
          </p>
        )}
      </fieldset>
      <p className="text-xs text-slate-400">
        Girişte yalnızca personelin adı gösterilir. Güncelleme sonrasında
        personelin yeniden giriş yapması gerekir.
      </p>
      <button className={`uni-control ${buttonStyle}`} disabled={busy}>
        Personeli Kaydet
      </button>
    </form>
  );
}
