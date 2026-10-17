import { useI18n } from "./I18n";
import type { Facility } from "../lib/api";
import { PhoneField } from "./fields/PhoneField";
import { TextField } from "./fields";
import { useCurrency } from "./Currency";
export function FacilityDetailsFields({kind,value,onChange,busy=false}:{kind:"hotel"|"branch";value:Facility;onChange:(value:Facility)=>void;busy?:boolean}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const {defaultCountry}=useCurrency();
 return (      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(
          [
            "name",
            "address",
            "phone",
            "email",
            "tax_number",
            "tax_office",
          ] as const
        ).map((key, i) => key === "phone" ? (
          <PhoneField key={key} label={_uiText("Telefon")} value={value.phone} defaultCountry={defaultCountry}
            disabled={busy} onChange={phone=>onChange({...value,phone})}/>
        ) : (
          <TextField
            key={key}
            label={
              [
                kind === "hotel" ? _uiText("Şirket unvanı") : _uiText("Otel / tesis adı"),
                kind === "hotel" ? _uiText("Şirket adresi") : _uiText("Otel / tesis adresi"),
                _uiText("Telefon"),
                _uiText("E-posta"),
                _uiText("Vergi numarası"),
                _uiText("Vergi dairesi"),
              ][i]
            }
            required={key === "name"}
            type={key === "email" ? "email" : "text"}
            autoComplete="off"
            value={value[key]}
            onChange={(v) => onChange({ ...value, [key]: v })}
          />
        ))}
      </div>
);
}
