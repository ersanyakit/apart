import { useI18n } from "./I18n";
import {localized,type Floor,type FeatureDefinition} from '../lib/api';
import type {SetupGroup} from '../lib/setup-plan';
import {UnitSleepingFields} from './UnitSleepingFields';
import {FeatureFields} from './FeatureFields';
import {SettingsSection} from './SettingsSection';
import {TextField,StepperField,InlineSelectField} from './fields';

/** One accommodation template, shared by every group in the setup flow. */
export function SetupAccommodationFields({value:g,onChange,floors,definitions,branchId,disabled}:{
 value:SetupGroup;onChange:(patch:Partial<SetupGroup>)=>void;floors:Floor[];
 definitions:FeatureDefinition[];branchId:string;disabled:boolean;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const apartment=g.kind.includes('apartment');
 const noun=apartment?_uiText('daire'):g.kind==='dormitory'?_uiText('paylaşımlı oda'):_uiText('oda');
 const floorCount=g.floorKey==='all'?floors.length:1;
 return <div className="space-y-5">
  <section className="space-y-3" aria-label={_uiText("Konaklama tercihi")}>
   <h4 className="text-sm font-semibold">{_uiText("1. Misafire ne kiralayacaksınız?")}</h4>
   <InlineSelectField label={_uiText("Ne kiralanacak?")} value={g.kind} disabled={disabled} options={[
    {value:'room',label:_uiText("Odanın tamamı")},
    {value:'dormitory',label:_uiText("Paylaşımlı odada ayrı yataklar")},
    {value:'apartment',label:_uiText("Dairenin tamamı")},
    {value:'apartment_rooms',label:_uiText("Daire içindeki odalar ayrı ayrı")},
   ]} onChange={kind=>onChange({kind:kind as SetupGroup['kind'],mode:kind==='dormitory'?'beds':'room'})}/>
   <p className="text-xs leading-5 text-uni-muted">{g.kind==='dormitory'?_uiText("Her yatak yeri ayrı rezervasyon alır. Bir ranzanın her katı ayrı yatak yeridir."):g.kind==='apartment_rooms'?_uiText("Daireler oluşturulur; içlerindeki odalar ayrı rezervasyon alır. Dairenin tamamı ayrıca satışa açılmaz."):_uiText("Her {value1} tek rezervasyonla kiralanır; içindeki yataklar ayrı satılmaz.", {value1: String(noun)})}</p>
  </section>
  <section className="space-y-3" aria-label={_uiText("Oda sayısı ve katlar")}>
   <h4 className="text-sm font-semibold">{_uiText("2. Nerede, kaç tane var?")}</h4>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <InlineSelectField label={_uiText("Hangi katlarda?")} value={g.floorKey} disabled={disabled} options={[{value:'all',label:_uiText("Tüm katlarda ({count} kat)", {count:floors.length})},...floors.map(f=>({value:f.floor_id,label:localized(f.label,_uiLocale.toUpperCase())||f.code}))]} onChange={floorKey=>onChange({floorKey})}/>
    <StepperField label={apartment?_uiText("Her katta kaç daire var?"):_uiText("Her katta kaç oda var?")} min={1} max={100} value={g.count} disabled={disabled} onChange={count=>onChange({count})}/>
    {g.kind==='apartment_rooms'&&<StepperField label={_uiText("Her dairede kaç oda var?")} min={1} max={20} value={g.roomsPerApartment} disabled={disabled} onChange={roomsPerApartment=>onChange({roomsPerApartment})}/>}
   </div>
   <p className="rounded-xl bg-uni-surface px-4 py-3 text-sm" role="status">{_uiText("{floors} kat × {units} {kind} = {total} {kind}", {floors:floorCount,units:g.count,kind:noun,total:floorCount*g.count})}{g.kind==='apartment_rooms'&&_uiText(" · {value1} ayrı kiralanan oda", {value1: String(floorCount*g.count*g.roomsPerApartment)})}</p>
  </section>
  <section className="space-y-3">
   <h4 className="text-sm font-semibold">{apartment && g.kind!=='apartment_rooms' ? _uiText("3. Bir dairenin yataklarını seçin") : _uiText("3. Bir odanın yataklarını seçin")}</h4>
   <p className="text-xs leading-5 text-uni-muted">{g.kind==='apartment' ? _uiText("Bir dairenin yataklarını ekleyin. Aynı düzen bu tipteki tüm dairelere uygulanır. Farklı bir düzen için başka bir oda tipi ekleyin.") : _uiText("Bir odanın yataklarını ekleyin. Aynı düzen bu tipteki tüm odalara uygulanır. Farklı bir düzen için başka bir oda tipi ekleyin.")}</p>
   <UnitSleepingFields compact showRentableToggle={false} showModeSelection={false} kind={g.kind==='apartment_rooms'?"room":g.kind} rentable mode={g.mode} onModeChange={mode=>onChange({mode})} onRentableChange={()=>{}} beds={g.beds} onBedsChange={beds=>onChange({beds})} branchId={branchId} disabled={disabled}/>
  </section>
  <SettingsSection title={_uiText("Oda adı ve numaralandırma")} description={_uiText("İsteğe bağlı. Numaralar otomatik hazırlanır; son adımda tek tek düzenleyebilirsiniz.")}>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <TextField label={_uiText("Oda tipi adı")} value={g.name} disabled={disabled} onChange={name=>onChange({name})}/>
    <StepperField label={_uiText("Başlangıç numarası")} min={1} max={Number.MAX_SAFE_INTEGER} value={g.start} disabled={disabled} onChange={start=>onChange({start})}/>
    <TextField label={_uiText("Kod öneki (isteğe bağlı)")} value={g.prefix} disabled={disabled} onChange={prefix=>onChange({prefix})}/>
   </div>
  </SettingsSection>
  <SettingsSection title={_uiText("Bu odaların olanakları")} description={_uiText("İsteğe bağlı. Bu oda tipindeki tüm odalara uygulanır.")}><FeatureFields definitions={definitions} scope="room" value={g.features} onChange={features=>onChange({features})}/></SettingsSection>
 </div>;
}
