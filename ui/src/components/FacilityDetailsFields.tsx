import type { Facility } from "../lib/api";
import { PhoneField } from "./fields/PhoneField";
import { TextField } from "./fields";
import { useCurrency } from "./Currency";
export function FacilityDetailsFields({kind,value,onChange,busy=false}:{kind:"hotel"|"branch";value:Facility;onChange:(value:Facility)=>void;busy?:boolean}) {
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
          <PhoneField key={key} label="Telefon" value={value.phone} defaultCountry={defaultCountry}
            disabled={busy} onChange={phone=>onChange({...value,phone})}/>
        ) : (
          <TextField
            key={key}
            label={
              [
                kind === "hotel" ? "Şirket unvanı" : "Otel / tesis adı",
                kind === "hotel" ? "Şirket adresi" : "Otel / tesis adresi",
                "Telefon",
                "E-posta",
                "Vergi numarası",
                "Vergi dairesi",
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
