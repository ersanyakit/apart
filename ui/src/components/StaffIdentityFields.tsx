import { useI18n } from "./I18n";
import { InlineSelectField, TextField } from "./fields";
export type Person = {
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
export const roles: Record<string, string> = {
  management: "Yönetim",
  reception: "Resepsiyon",
  accounting: "Muhasebe",
  housekeeping: "Kat hizmetleri",
  technical_service: "Teknik servis",
  maintenance: "Bakım",
  supervisor: "Sorumlu",
  admin: "Sistem yöneticisi",
};
export function StaffIdentityFields({value:p,onChange,allowAdmin=false}:{value:Person;onChange:(value:Person)=>void;allowAdmin?:boolean}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const patch=(value:Partial<Person>)=>onChange({...p,...value});
 return (      <div className="grid grid-cols-1 items-start sm:grid-cols-2 gap-4">
        <TextField
          label={_uiText("Ad")}
          required
          autoComplete="off"
          value={p.first_name}
          onChange={(v) => patch({ first_name: v })}
        />
        <TextField
          label={_uiText("Soyad")}
          required
          autoComplete="off"
          value={p.last_name}
          onChange={(v) => patch({ last_name: v })}
        />
        <TextField
          label={_uiText("Kullanıcı adı")}
          required
          autoComplete="off"
          value={p.username}
          onChange={(v) => patch({ username: v })}
        />
        <TextField
          label={_uiText("E-posta")}
          type="email"
          autoComplete="off"
          value={p.email}
          onChange={(v) => patch({ email: v })}
        />
        <InlineSelectField
          label={_uiText("Rol")}
          value={p.role}
          onChange={(v) => patch({ role: v })}
          options={Object.entries(roles)
            .filter(([r]) => r !== "admin" || allowAdmin)
            .map(([value, label]) => ({ value, label: _uiText(label) }))}
        />
        <TextField
          label={p.user_id ? _uiText("Yeni şifre (değiştirmek için)") : _uiText("Giriş şifresi")}
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={72}
          required={!p.user_id}
          value={p.password || ""}
          onChange={(v) => patch({ password: v })}
        />
      </div>
);
}
