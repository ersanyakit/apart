'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Plus,Trash2,WandSparkles} from 'lucide-react';
import {APIError,command,contracts,localized,messageOf,type Snapshot,type Floor,type Selection} from '../lib/api';
import {buildSetupUnits,emptyFacility,setupFloors,type SetupGroup} from '../lib/setup-plan';
import {FacilityDetailsFields} from './FacilityDetailsFields';
import {FloorDefinitionFields} from './FloorDefinitionFields';
import {StaffIdentityFields,roles,type Person} from './StaffIdentityFields';
import {SetupAccommodationFields} from './SetupAccommodationFields';
import {FeatureFields} from './FeatureFields';
import {Button} from './Button';
import {TextField,StepperField,InlineSelectField,Switch} from './fields';
import {SettingsSection} from './SettingsSection';
import {ErrorMessage} from './FormKit';
import {parsePhone} from '../lib/phone';
import {useCurrency} from './Currency';
import styles from './SetupWizard.module.css';
const steps=['İşletme','Tesis','Olanaklar','Katlar','Odalar','Personel','Kontrol'];
const descriptions=[
 'İşletme türünüzü seçin ve ticari bilgileri girin. Sonraki adımlarda farklı konaklama türlerini aynı tesiste birleştirebilirsiniz.',
 'Misafirlerin konaklayacağı otelin veya tesisin bilgileri. Şirket birden fazla tesis yönetebilir.',
 'Tesisin ortak alanlarında sunulan olanakları seçin. Odalara özel olanakları konaklama adımında belirleyebilirsiniz.',
 'Kaç kat kullanıyorsunuz? Hazır kat adları tüm dillerde doldurulur. Katları tek tek düzenleyebilir, bodrum veya çatı ekleyebilirsiniz.',
 'Bir odanın özelliklerini seçin; aynı odalardan istediğiniz kadar hazırlayalım. Her oda için yeniden bilgi girmeniz gerekmez.',
 'Personeli ve görevlerini ekleyin. Her personel kendi kullanıcı adı ve şifresiyle giriş yapar.',
 'Oluşturulacak kayıtları kontrol edin. Kurulumu tamamlayana kadar hiçbir kayıt değiştirilmez.',
];
const profiles=[['hotel','Otel','Özel odalar'],['apart','Apart otel','Daireler ve odalar'],['daily','Günlük kiralık daire','Dairenin tamamı'],['hostel','Hostel','Paylaşımlı ve özel odalar'],['pension','Pansiyon','Özel odalar'],['mixed','Karma tesis','Birden fazla konaklama türü']];
function FloorDraftEditor({value,floors,onChange}:{value:Floor;floors:Floor[];onChange:(v:Floor)=>void}){
 const [preset,setPreset]=useState(contracts.floor_presets.find(p=>p.code===value.code)?.id||'custom');
 return <FloorDefinitionFields draft={value} setDraft={v=>onChange(typeof v==='function'?v(value):v)} preset={preset} setPreset={setPreset} floors={floors} busy={false}/>;
}
export function SetupWizard({snapshot:s,onComplete}:{snapshot:Snapshot;onComplete:(selection:Selection)=>Promise<unknown>}){
 const {defaultCountry}=useCurrency();
 const [step,setStep]=useState(0),[profile,setProfile]=useState('hotel');
 const [company,setCompany]=useState(s.hotels.find(h=>h.hotel_id===s.hotel_id)||emptyFacility());
 const canUseCurrent=s.branch_id&&!s.rooms.length;
 const [facility,setFacility]=useState(canUseCurrent?s.branches.find(b=>b.branch_id===s.branch_id)||emptyFacility():emptyFacility());
 const [floors,setFloors]=useState<Floor[]>(()=>canUseCurrent&&s.floors.length?s.floors:setupFloors(1,true));
 const [floorCount,setFloorCount]=useState(String(floors.length)),[ground,setGround]=useState(true);
 const [groups,setGroups]=useState<SetupGroup[]>([]),[people,setPeople]=useState<Person[]>([]),[solo,setSolo]=useState(false);
 const [clean,setClean]=useState(false),[codes,setCodes]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Selection|null>(null);
 const [attempt,setAttempt]=useState<Record<string,unknown>|null>(null);
 const requestID=useRef(crypto.randomUUID()),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start'});},[step]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(!result&&(groups.length||busy)){e.preventDefault();}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[result,groups.length,busy]);
 const patchGroup=(id:string,patch:Partial<SetupGroup>)=>setGroups(old=>old.map(g=>g.id===id?{...g,...patch}:g));
 const addGroup=()=>setGroups(old=>[...old,{id:crypto.randomUUID(),name:old.length?`${old.length+1}. oda tipi`:profile==='hostel'?'Paylaşımlı oda':['apart','daily'].includes(profile)?'Standart daire':'Standart oda',floorKey:'all',kind:profile==='hostel'?'dormitory':['apart','daily'].includes(profile)?'apartment':'room',mode:profile==='hostel'?'beds':'room',count:1,roomsPerApartment:2,prefix:old.length?`G${old.length+1}-`:'',start:1,beds:[],features:[]}]);
 const validate=(n:number)=>{
  if(n===0){if(!company.name.trim())throw new Error('İşletme unvanını girin.');const p=parsePhone(company.phone,defaultCountry);if(!p.valid)throw new Error(p.error);}
  if(n===1){if(!facility.name.trim())throw new Error('Tesis adını girin.');const p=parsePhone(facility.phone,defaultCountry);if(!p.valid)throw new Error(p.error);}
  if(n===3){if(!floors.length)throw new Error('En az bir kat ekleyin.');if(new Set(floors.map(f=>f.code.trim())).size!==floors.length||floors.some(f=>!f.code.trim()||!Object.values(f.label).some(Boolean)))throw new Error('Her kata benzersiz bir kod ve ad verin.');}
  if(n===4){if(!groups.length)throw new Error('En az bir konaklama grubu ekleyin.');buildSetupUnits(floors,groups,clean,codes);}
  if(n===5){if(!solo&&!people.length)throw new Error('Personel ekleyin veya tek başınıza kullanacağınızı belirtin.');const names=new Set<string>();for(const p of people){if(!p.first_name.trim()||!p.last_name.trim()||!/^[a-z0-9][a-z0-9._-]{2,99}$/.test(p.username)||new TextEncoder().encode(p.password||'').length<12||new TextEncoder().encode(p.password||'').length>72)throw new Error('Personelin adını, soyadını, geçerli kullanıcı adını ve 12–72 baytlık şifresini kontrol edin.');if(names.has(p.username.toLowerCase()))throw new Error('Personel kullanıcı adları benzersiz olmalı.');names.add(p.username.toLowerCase());}}
 };
 let preview:ReturnType<typeof buildSetupUnits>=[];let previewError='';
 try{if(groups.length)preview=buildSetupUnits(floors,groups,clean,codes);}catch(e){previewError=messageOf(e);try{preview=buildSetupUnits(floors,groups,clean);}catch{}}
 const finish=async()=>{
  setBusy(true);setError('');
  try{
   let payload=attempt;
   if(!payload){for(let n=0;n<6;n++)validate(n);payload={request_id:requestID.current,company:{...company,phone:parsePhone(company.phone,defaultCountry).e164,hotel_id:company.hotel_id||undefined},facility:{...facility,phone:parsePhone(facility.phone,defaultCountry).e164,hotel_id:undefined,branch_id:facility.branch_id||undefined},floors:floors.map(f=>({key:f.floor_id,floor:{...f,floor_id:undefined,branch_id:undefined,height:Math.max(f.height,...preview.filter(u=>u.floor_key===f.floor_id).map(u=>u.room.position!.y+u.room.position!.height+20))}})),units:preview.map(u=>({...u,room:{...u.room,beds_to_add:u.room.beds_to_add.map(b=>({...b,branch_id:undefined}))}})),staff:people.map(p=>({...p,hotel_id:undefined,branch_ids:[]}))};setAttempt(payload);}
   const saved=await command<Selection>('setup.complete',payload);setResult({hotel_id:saved.hotel_id,branch_id:saved.branch_id});setPeople([]);setAttempt(null);
  }catch(e){setError(messageOf(e));if(e instanceof APIError&&e.status>=400&&e.status<500)setAttempt(null);}
  finally{setBusy(false);}
 };
 const openFacility=async()=>{
  if(!result||busy)return;
  setBusy(true);setError('');
  try{await onComplete(result);}catch(e){setError(messageOf(e));}finally{setBusy(false);}
 };
 if(result)return <section className={styles.page}><div className={styles.card}><Check size={32}/><h2 className="mt-4 text-2xl">Kurulum tamamlandı</h2><p className={styles.intro}>{facility.name} için katlar, konaklama birimleri, yataklar ve personel kaydedildi. {clean?'Birimler temiz olarak işaretlendi.':'Birimler kirli durumda; girişten önce temizlik durumunu güncelleyin.'}</p><p className={styles.note}>Konaklama ücretini rezervasyon oluştururken belirleyebilirsiniz.</p><ErrorMessage message={error}/><Button className="mt-5" disabled={busy} onClick={()=>void openFacility()}>{busy?'Tesis açılıyor…':'Tesise geç'}</Button></div></section>;
 return <section className={styles.page} aria-label="Kurulum Sihirbazı">
  <header className={styles.header}><WandSparkles size={28}/><div><h2>Kurulum Sihirbazı</h2><p>İşletmeden ilk rezervasyona, adım adım.</p></div></header>
  <nav className={styles.steps} aria-label="Kurulum adımları">{steps.map((label,i)=><button className="uni-control" key={label} type="button" disabled={busy||!!attempt||i>step} aria-current={i===step?'step':undefined} onClick={()=>{setError('');setStep(i);}}><span>{i<step?<Check size={14}/>:i+1}</span>{label}</button>)}</nav>
  <form className={styles.card} onSubmit={e=>{e.preventDefault();if(step===6){void finish();return;}try{validate(step);if(step===3&&!groups.length)addGroup();setError('');setStep(step+1);}catch(e){setError(messageOf(e));}}}>
   <h3 ref={heading} tabIndex={-1}>{steps[step]}</h3><p className={styles.intro}>{descriptions[step]}</p><ErrorMessage message={error}/>
   <fieldset disabled={busy||!!attempt} className={styles.body}>
    {step===0&&<>
     <div className={styles.profiles}>{profiles.map(([id,name,hint])=><button className="uni-control" key={id} type="button" aria-pressed={profile===id} onClick={()=>setProfile(id)}><img src={`/images/setup-icons-dott/${id}.avif`} width={72} height={72} alt="" aria-hidden="true" draggable={false} decoding="async" className={styles.profileIcon}/><span>{name}<small>{hint}</small></span></button>)}</div>
     <InlineSelectField label="İşletme" value={company.hotel_id||'new'} onChange={id=>{setCompany(id==='new'?emptyFacility():s.hotels.find(h=>h.hotel_id===id)!);setFacility(emptyFacility());}} options={[...s.hotels.map(h=>({value:h.hotel_id,label:h.name})),...(s.user.role==='admin'?[{value:'new',label:'Yeni işletme oluştur'}]:[])]}/>
     <FacilityDetailsFields kind="hotel" value={company} onChange={setCompany}/>
    </>}
    {step===1&&<>
     {canUseCurrent&&company.hotel_id===s.hotel_id&&<InlineSelectField label="Kurulacak tesis" value={facility.branch_id||'new'} onChange={id=>{setFacility(id==='new'?emptyFacility():s.branches.find(b=>b.branch_id===id)!);setFloors(id==='new'?setupFloors(1,true):s.floors.length?s.floors:setupFloors(1,true));}} options={[{value:'new',label:'Yeni tesis oluştur'},{value:s.branch_id,label:'Mevcut boş tesisi kur'}]}/>}
     {!canUseCurrent&&<p className={styles.note}>Yeni bir tesis kurulacak. Mevcut tesisinizin odaları ve rezervasyonları korunur.</p>}
     <FacilityDetailsFields kind="branch" value={facility} onChange={setFacility}/>
    </>}
    {step===2&&<FeatureFields definitions={s.feature_registry.definitions||[]} scope="property" value={facility.feature_assignments||[]} onChange={feature_assignments=>setFacility({...facility,feature_assignments})}/>}
    {step===3&&<>
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><StepperField label="Kullanılacak kat sayısı" min={1} max={20} value={Number(floorCount)} onChange={value=>setFloorCount(String(value))}/><Switch label="Zemin kattan başla" checked={ground} onChange={setGround}/></div>
     <Button variant="secondary" onClick={()=>{const n=Number(floorCount);if(!Number.isInteger(n)||n<1||n>20){setError('1–20 arasında kat sayısı girin.');return;}setFloors(setupFloors(n,ground));setGroups(old=>old.map(g=>({...g,floorKey:'all'})));setError('');}}>Kat listesini hazırla</Button>
     <p className={styles.note}>Bu işlem aşağıdaki taslak kat listesini yeniler. Bodrum, asma veya çatı için ayrıca kat ekleyebilirsiniz.</p>
     {floors.map((f,i)=><SettingsSection key={f.floor_id} title={localized(f.label)||`Kat ${i+1}`} description={`Kod: ${f.code} · Sıra: ${f.sort_order}`}><div className="space-y-4"><FloorDraftEditor value={f} floors={floors.filter(other=>other.floor_id!==f.floor_id)} onChange={next=>setFloors(old=>old.map(item=>item.floor_id===f.floor_id?next:item))}/><Button variant="secondary" onClick={()=>setFloors(old=>old.filter(item=>item.floor_id!==f.floor_id))}><Trash2 size={16}/>Taslak katı kaldır</Button></div></SettingsSection>)}
     <Button variant="secondary" onClick={()=>setFloors(old=>[...old,{...setupFloors(1,true)[0],code:'',label:{TR:''},sort_order:old.length+1}])}><Plus size={16}/>Başka kat ekle</Button>
    </>}
    {step===4&&<>
     {groups.map(g=><SettingsSection key={g.id} defaultOpen title={g.name} description={`${g.floorKey==='all'?floors.length:1} kat · ${(g.floorKey==='all'?floors.length:1)*g.count} ${g.kind.includes('apartment')?'daire':'oda'}`}><div className="space-y-4">
      <SetupAccommodationFields value={g} onChange={patch=>patchGroup(g.id,patch)} floors={floors} definitions={s.feature_registry.definitions||[]} branchId={s.branch_id} disabled={busy}/>
      {groups.length>1&&<Button variant="secondary" onClick={()=>setGroups(old=>old.filter(item=>item.id!==g.id))}><Trash2 size={16}/>Bu oda tipini kaldır</Button>}
     </div></SettingsSection>)}
     <Button variant="secondary" onClick={addGroup}><Plus size={16}/>Farklı oda tipi ekle</Button>
     <p className={styles.note}>Katlarda farklı sayıda oda varsa her kat için ayrı oda tipi ekleyin. Örneğin 1. katta 5 çift kişilik oda, 2. katta 3 aile odası.</p>
     <Switch label="Birimler temiz ve misafir girişine hazır" checked={clean} onChange={setClean}/>
     <p className={styles.note}>Kapalıysa birimler kirli kaydedilir. İleri tarihli rezervasyon alınabilir; girişten önce temiz olarak güncellenmelidir.</p>
     {preview.length>0&&<p className={styles.note}>{preview.length} oda / daire, {preview.reduce((n,u)=>n+u.room.beds_to_add.length,0)} fiziksel yatak hazırlanacak.</p>}
    </>}
    {step===5&&<>
     {!people.length&&<Switch label="Şimdilik tek başıma kullanacağım" checked={solo} onChange={setSolo}/>}
     {people.map((p,i)=><SettingsSection key={i} defaultOpen title={`${p.first_name||'Yeni'} ${p.last_name||'personel'}`} description={roles[p.role]}><div className="space-y-4"><StaffIdentityFields value={p} onChange={next=>setPeople(old=>old.map((item,n)=>n===i?next:item))}/><p className={styles.note}>Bu personele kurulacak tesis için erişim verilecek.</p><Button variant="secondary" onClick={()=>setPeople(old=>old.filter((_,n)=>n!==i))}>Personeli kaldır</Button></div></SettingsSection>)}
     <Button variant="secondary" onClick={()=>{setSolo(false);setPeople(old=>[...old,{hotel_id:company.hotel_id,first_name:'',last_name:'',username:'',email:'',role:'reception',branch_ids:[],password:''}]);}}><Plus size={16}/>Personel ekle</Button>
     <p className={styles.note}>Şifreler yalnızca bu açık ekranda tutulur; tarayıcıya kaydedilmez. Personelleri daha sonra Personel Tanımları ekranından yönetebilirsiniz.</p>
    </>}
    {step===6&&<>
     <div className={styles.note}><strong>{company.name} → {facility.name}</strong><p>{facility.address}</p><p>{profiles.find(p=>p[0]===profile)?.[1]} · {clean?'Temiz ve girişe hazır':'Giriş öncesi temizlik bekliyor'}</p></div>
     <div className={styles.metrics}><div><strong>{floors.length}</strong>kat</div><div><strong>{preview.length}</strong>oda / daire</div><div><strong>{people.length}</strong>yeni personel</div></div>
     {previewError&&<ErrorMessage message={previewError}/>}
     <SettingsSection title="Birim kodlarını kontrol et / düzenle" description={`${preview.length} birim`}><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{preview.map(u=><TextField key={u.key} label={`${localized(floors.find(f=>f.floor_id===u.floor_key)?.label)} · ${u.room.type}`} value={codes[u.key]??u.room.code??''} onChange={v=>setCodes(old=>({...old,[u.key]:v}))}/>)}</div></SettingsSection>
     <p className={styles.note}>Kayıtlar tek işlemde oluşturulur. Bir doğrulama hatasında işlem tamamen geri alınır; yarım kurulum bırakılmaz. Mevcut şirket seçildiyse ticari bilgileri güncellenir.</p>
    </>}
   </fieldset>
   {attempt&&!busy&&<p className={styles.note}>İşlemin sonucu doğrulanamadı. Aynı kurulumu güvenle yeniden deneyebilirsiniz; ikinci bir kopya oluşturulmaz.</p>}
   <footer className={styles.footer}><Button variant="secondary" disabled={step===0||busy||!!attempt} onClick={()=>{setError('');setStep(step-1);}}><ArrowLeft size={16}/>Geri</Button><small>{step+1} / {steps.length}</small><Button type="submit" disabled={busy}>{busy?'Kurulum kaydediliyor…':step===6?(attempt?'Yeniden dene':'Kurulumu tamamla'):'İleri'}<ArrowRight size={16}/></Button></footer>
  </form>
 </section>;
}
