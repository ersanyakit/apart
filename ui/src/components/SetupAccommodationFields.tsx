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
 const apartment=g.kind.includes('apartment');
 const noun=apartment?'daire':g.kind==='dormitory'?'paylaşımlı oda':'oda';
 const floorCount=g.floorKey==='all'?floors.length:1;
 return <div className="space-y-5">
  <section className="space-y-3" aria-label="Konaklama tercihi">
   <h4 className="text-sm font-semibold">1. Misafire ne kiralayacaksınız?</h4>
   <InlineSelectField label="Ne kiralanacak?" value={g.kind} disabled={disabled} options={[
    {value:'room',label:'Odanın tamamı'},
    {value:'dormitory',label:'Paylaşımlı odada ayrı yataklar'},
    {value:'apartment',label:'Dairenin tamamı'},
    {value:'apartment_rooms',label:'Daire içindeki odalar ayrı ayrı'},
   ]} onChange={kind=>onChange({kind:kind as SetupGroup['kind'],mode:kind==='dormitory'?'beds':'room'})}/>
   <p className="text-xs leading-5 text-uni-muted">{g.kind==='dormitory'?'Her yatak yeri ayrı rezervasyon alır. Bir ranzanın her katı ayrı yatak yeridir.':g.kind==='apartment_rooms'?'Daireler oluşturulur; içlerindeki odalar ayrı rezervasyon alır. Dairenin tamamı ayrıca satışa açılmaz.':`Her ${noun} tek rezervasyonla kiralanır; içindeki yataklar ayrı satılmaz.`}</p>
  </section>
  <section className="space-y-3" aria-label="Oda sayısı ve katlar">
   <h4 className="text-sm font-semibold">2. Nerede, kaç tane var?</h4>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <InlineSelectField label="Hangi katlarda?" value={g.floorKey} disabled={disabled} options={[{value:'all',label:`Tüm katlarda (${floors.length} kat)`},...floors.map(f=>({value:f.floor_id,label:localized(f.label)||f.code}))]} onChange={floorKey=>onChange({floorKey})}/>
    <StepperField label={apartment?'Her katta kaç daire var?':'Her katta kaç oda var?'} min={1} max={100} value={g.count} disabled={disabled} onChange={count=>onChange({count})}/>
    {g.kind==='apartment_rooms'&&<StepperField label="Her dairede kaç oda var?" min={1} max={20} value={g.roomsPerApartment} disabled={disabled} onChange={roomsPerApartment=>onChange({roomsPerApartment})}/>}
   </div>
   <p className="rounded-xl bg-uni-surface px-4 py-3 text-sm" role="status">{floorCount} kat × {g.count} {noun} = <strong>{floorCount*g.count} {noun}</strong>{g.kind==='apartment_rooms'&&` · ${floorCount*g.count*g.roomsPerApartment} ayrı kiralanan oda`}</p>
  </section>
  <section className="space-y-3">
   <h4 className="text-sm font-semibold">3. Bir {g.kind==='apartment_rooms'?'odanın':apartment?'dairenin':'odanın'} yataklarını seçin</h4>
   <p className="text-xs leading-5 text-uni-muted">Yalnızca birinin yataklarını ekleyin. Aynı düzen bu listedeki tüm {g.kind==='apartment'?'dairelere':'odalara'} uygulanır. Farklı yatak düzeni olanlar için aşağıdan başka bir oda tipi ekleyebilirsiniz.</p>
   <UnitSleepingFields compact showRentableToggle={false} showModeSelection={false} kind={g.kind==='apartment_rooms'?'room':g.kind} rentable mode={g.mode} onModeChange={mode=>onChange({mode})} onRentableChange={()=>{}} beds={g.beds} onBedsChange={beds=>onChange({beds})} branchId={branchId} disabled={disabled}/>
  </section>
  <SettingsSection title="Oda adı ve numaralandırma" description="İsteğe bağlı. Numaralar otomatik hazırlanır; son adımda tek tek düzenleyebilirsiniz.">
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <TextField label="Oda tipi adı" value={g.name} disabled={disabled} onChange={name=>onChange({name})}/>
    <StepperField label="Başlangıç numarası" min={1} max={Number.MAX_SAFE_INTEGER} value={g.start} disabled={disabled} onChange={start=>onChange({start})}/>
    <TextField label="Kod öneki (isteğe bağlı)" value={g.prefix} disabled={disabled} onChange={prefix=>onChange({prefix})}/>
   </div>
  </SettingsSection>
  <SettingsSection title="Bu odaların olanakları" description="İsteğe bağlı. Bu oda tipindeki tüm odalara uygulanır."><FeatureFields definitions={definitions} scope="room" value={g.features} onChange={features=>onChange({features})}/></SettingsSection>
 </div>;
}
