import {localized,type Floor} from '../lib/api';
import {useI18n} from './I18n';
import {FloorPresetPicker} from './FloorPresetPicker';
import {SettingsSection} from './SettingsSection';
import {TextField,StepperField,LocalizedTextFields} from './fields';
export function FloorDefinitionFields({draft,setDraft,preset,setPreset,floors,busy}:{draft:Floor;setDraft:React.Dispatch<React.SetStateAction<Floor>>;preset:string;setPreset:(value:string)=>void;floors:Floor[];busy:boolean}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const {locale}=useI18n();return <>
      <FloorPresetPicker value={preset} floors={floors.filter(f=>f.floor_id!==draft.floor_id)} disabled={busy} onChange={(id,values)=>{setPreset(id);if(values)setDraft(previous=>({...previous,...values}));}}/>
      {preset && preset !== "custom" && <div className="rounded-2xl bg-uni-surface p-4 text-sm text-uni-muted" role="status">
        {localized(draft.label,locale.toUpperCase())} {_uiText("· Kod:")} {draft.code} {_uiText("· Sıra:")} {draft.sort_order}
        <p className="mt-1 text-xs">{_uiText("Kat adı desteklenen tüm dillerde otomatik hazırlandı. Farklı ad veya kod için “Özel kat / Elle gir” seçin.")}</p>
      </div>}
      {preset === "custom" && <div className="grid gap-4">
      <TextField
        label={_uiText("Kat kodu")}
        required
        autoComplete="off"
        uppercase
        value={draft.code}
        onChange={(v) => setDraft({ ...draft, code: v })}
      />
      <LocalizedTextFields
        label={_uiText("Kat adı")}
        hint={_uiText("Özel kat adını girin. İhtiyaç duyduğunuz dillerde karşılık ekleyebilirsiniz.")}
        values={draft.label || {}}
        onChange={(label) => setDraft({ ...draft, label })}
      />
      <StepperField label={_uiText("Sıralama")} min={-Number.MAX_SAFE_INTEGER} max={Number.MAX_SAFE_INTEGER} stepSize={0.5} value={draft.sort_order} onChange={sort_order=>setDraft({...draft,sort_order})} disabled={busy}/>
      </div>}
      <SettingsSection title={_uiText("Kat planı ölçüleri")} description={_uiText("İsteğe bağlı, çizim alanının boyutları.")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StepperField label={_uiText("Plan genişliği")} min={400} max={10000} value={draft.width} onChange={width=>setDraft({...draft,width})} disabled={busy}/>
          <StepperField label={_uiText("Plan yüksekliği")} min={300} max={10000} value={draft.height} onChange={height=>setDraft({...draft,height})} disabled={busy}/>
        </div>
      </SettingsSection>
</>;
}
