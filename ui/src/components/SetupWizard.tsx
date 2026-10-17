'use client';
import { useI18n } from "./I18n";

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
  const {m: _uiText, locale: _uiLocale} = useI18n();

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
 const addGroup=()=>setGroups(old=>[...old,{id:crypto.randomUUID(),name:old.length?_uiText("{count}. oda tipi", {count:old.length+1}):profile==='hostel'?_uiText('Paylaşımlı oda'):['apart','daily'].includes(profile)?_uiText('Standart daire'):_uiText('Standart oda'),floorKey:'all',kind:profile==='hostel'?'dormitory':['apart','daily'].includes(profile)?'apartment':'room',mode:profile==='hostel'?'beds':'room',count:1,roomsPerApartment:2,prefix:old.length?`G${old.length+1}-`:'',start:1,beds:[],features:[]}]);
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
 if(result)return <section className={styles.page}><div className={styles.card}><Check size={32}/><h2 className="mt-4 text-2xl">{_uiText("Kurulum tamamlandı")}</h2><p className={styles.intro}>{_uiText("{facility} için katlar, konaklama birimleri, yataklar ve personel kaydedildi.", {facility:facility.name})} {clean?_uiText("Birimler temiz olarak işaretlendi."):_uiText("Birimler kirli durumda; girişten önce temizlik durumunu güncelleyin.")}</p><p className={styles.note}>{_uiText("Konaklama ücretini rezervasyon oluştururken belirleyebilirsiniz.")}</p><ErrorMessage message={error}/><Button className="mt-5" disabled={busy} onClick={()=>void openFacility()}>{busy?_uiText("Tesis açılıyor…"):_uiText("Tesise geç")}</Button></div></section>;
 return <section className={styles.page} aria-label={_uiText("Kurulum Sihirbazı")}>
  <header className={styles.header}><WandSparkles size={28}/><div><h2>{_uiText("Kurulum Sihirbazı")}</h2><p>{_uiText("İşletmeden ilk rezervasyona, adım adım.")}</p></div></header>
  <nav className={styles.steps} aria-label={_uiText("Kurulum adımları")}>{steps.map((label,i)=><button className="uni-control" key={label} type="button" disabled={busy||!!attempt||i>step} aria-current={i===step?"step":undefined} onClick={()=>{setError('');setStep(i);}}><span>{i<step?<Check size={14}/>:i+1}</span>{_uiText(label)}</button>)}</nav>
  <form className={styles.card} onSubmit={e=>{e.preventDefault();if(step===6){void finish();return;}try{validate(step);if(step===3&&!groups.length)addGroup();setError('');setStep(step+1);}catch(e){setError(messageOf(e));}}}>
   <h3 ref={heading} tabIndex={-1}>{_uiText(steps[step])}</h3><p className={styles.intro}>{_uiText(descriptions[step])}</p><ErrorMessage message={error}/>
   <fieldset disabled={busy||!!attempt} className={styles.body}>
    {step===0&&<>
     <div className={styles.profiles}>{profiles.map(([id,name,hint])=><button className="uni-control" key={id} type="button" aria-pressed={profile===id} onClick={()=>setProfile(id)}><img src={`/images/setup-icons-dott/${id}.avif`} width={72} height={72} alt="" aria-hidden="true" draggable={false} decoding="async" className={styles.profileIcon}/><span>{_uiText(name)}<small>{_uiText(hint)}</small></span></button>)}</div>
     <InlineSelectField label={_uiText("İşletme")} value={company.hotel_id||"new"} onChange={id=>{setCompany(id==='new'?emptyFacility():s.hotels.find(h=>h.hotel_id===id)!);setFacility(emptyFacility());}} options={[...s.hotels.map(h=>({value:h.hotel_id,label:h.name})),...(s.user.role==='admin'?[{value:'new',label:_uiText("Yeni işletme oluştur")}]:[])]}/>
     <FacilityDetailsFields kind="hotel" value={company} onChange={setCompany}/>
    </>}
    {step===1&&<>
     {canUseCurrent&&company.hotel_id===s.hotel_id&&<InlineSelectField label={_uiText("Kurulacak tesis")} value={facility.branch_id||"new"} onChange={id=>{setFacility(id==='new'?emptyFacility():s.branches.find(b=>b.branch_id===id)!);setFloors(id==='new'?setupFloors(1,true):s.floors.length?s.floors:setupFloors(1,true));}} options={[{value:'new',label:_uiText("Yeni tesis oluştur")},{value:s.branch_id,label:_uiText("Mevcut boş tesisi kur")}]}/>}
     {!canUseCurrent&&<p className={styles.note}>{_uiText("Yeni bir tesis kurulacak. Mevcut tesisinizin odaları ve rezervasyonları korunur.")}</p>}
     <FacilityDetailsFields kind="branch" value={facility} onChange={setFacility}/>
    </>}
    {step===2&&<FeatureFields definitions={s.feature_registry.definitions||[]} scope="property" value={facility.feature_assignments||[]} onChange={feature_assignments=>setFacility({...facility,feature_assignments})}/>}
    {step===3&&<>
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><StepperField label={_uiText("Kullanılacak kat sayısı")} min={1} max={20} value={Number(floorCount)} onChange={value=>setFloorCount(String(value))}/><Switch label={_uiText("Zemin kattan başla")} checked={ground} onChange={setGround}/></div>
     <Button variant="secondary" onClick={()=>{const n=Number(floorCount);if(!Number.isInteger(n)||n<1||n>20){setError(_uiText("1–20 arasında kat sayısı girin."));return;}setFloors(setupFloors(n,ground));setGroups(old=>old.map(g=>({...g,floorKey:'all'})));setError('');}}>{_uiText("Kat listesini hazırla")}</Button>
     <p className={styles.note}>{_uiText("Bu işlem aşağıdaki taslak kat listesini yeniler. Bodrum, asma veya çatı için ayrıca kat ekleyebilirsiniz.")}</p>
     {floors.map((f,i)=><SettingsSection key={f.floor_id} title={localized(f.label,_uiLocale.toUpperCase())||_uiText("Kat {value1}", {value1: String(i+1)})} description={_uiText("Kod: {value1} · Sıra: {value2}", {value1: String(f.code), value2: String(f.sort_order)})}><div className="space-y-4"><FloorDraftEditor value={f} floors={floors.filter(other=>other.floor_id!==f.floor_id)} onChange={next=>setFloors(old=>old.map(item=>item.floor_id===f.floor_id?next:item))}/><Button variant="secondary" onClick={()=>setFloors(old=>old.filter(item=>item.floor_id!==f.floor_id))}><Trash2 size={16}/>{_uiText("Taslak katı kaldır")}</Button></div></SettingsSection>)}
     <Button variant="secondary" onClick={()=>setFloors(old=>[...old,{...setupFloors(1,true)[0],code:'',label:{TR:''},sort_order:old.length+1}])}><Plus size={16}/>{_uiText("Başka kat ekle")}</Button>
    </>}
    {step===4&&<>
     {groups.map(g=><SettingsSection key={g.id} defaultOpen title={g.name} description={_uiText("{value1} kat · {value2} {value3}", {value1: String(g.floorKey==='all'?floors.length:1), value2: String((g.floorKey==='all'?floors.length:1)*g.count), value3: _uiText(g.kind.includes('apartment')?'Daire':'Oda')})}><div className="space-y-4">
      <SetupAccommodationFields value={g} onChange={patch=>patchGroup(g.id,patch)} floors={floors} definitions={s.feature_registry.definitions||[]} branchId={s.branch_id} disabled={busy}/>
      {groups.length>1&&<Button variant="secondary" onClick={()=>setGroups(old=>old.filter(item=>item.id!==g.id))}><Trash2 size={16}/>{_uiText("Bu oda tipini kaldır")}</Button>}
     </div></SettingsSection>)}
     <Button variant="secondary" onClick={addGroup}><Plus size={16}/>{_uiText("Farklı oda tipi ekle")}</Button>
     <p className={styles.note}>{_uiText("Katlarda farklı sayıda oda varsa her kat için ayrı oda tipi ekleyin. Örneğin 1. katta 5 çift kişilik oda, 2. katta 3 aile odası.")}</p>
     <Switch label={_uiText("Birimler temiz ve misafir girişine hazır")} checked={clean} onChange={setClean}/>
     <p className={styles.note}>{_uiText("Kapalıysa birimler kirli kaydedilir. İleri tarihli rezervasyon alınabilir; girişten önce temiz olarak güncellenmelidir.")}</p>
     {preview.length>0&&<p className={styles.note}>{preview.length} {_uiText("oda / daire,")} {preview.reduce((n,u)=>n+u.room.beds_to_add.length,0)} {_uiText("fiziksel yatak hazırlanacak.")}</p>}
    </>}
    {step===5&&<>
     {!people.length&&<Switch label={_uiText("Şimdilik tek başıma kullanacağım")} checked={solo} onChange={setSolo}/>}
     {people.map((p,i)=><SettingsSection key={i} defaultOpen title={_uiText("{value1} {value2}", {value1: String(p.first_name||_uiText('Yeni')), value2: String(p.last_name||_uiText('personel'))})} description={_uiText(roles[p.role])}><div className="space-y-4"><StaffIdentityFields value={p} onChange={next=>setPeople(old=>old.map((item,n)=>n===i?next:item))}/><p className={styles.note}>{_uiText("Bu personele kurulacak tesis için erişim verilecek.")}</p><Button variant="secondary" onClick={()=>setPeople(old=>old.filter((_,n)=>n!==i))}>{_uiText("Personeli kaldır")}</Button></div></SettingsSection>)}
     <Button variant="secondary" onClick={()=>{setSolo(false);setPeople(old=>[...old,{hotel_id:company.hotel_id,first_name:'',last_name:'',username:'',email:'',role:'reception',branch_ids:[],password:''}]);}}><Plus size={16}/>{_uiText("Personel ekle")}</Button>
     <p className={styles.note}>{_uiText("Şifreler yalnızca bu açık ekranda tutulur; tarayıcıya kaydedilmez. Personelleri daha sonra Personel Tanımları ekranından yönetebilirsiniz.")}</p>
    </>}
    {step===6&&<>
     <div className={styles.note}><strong>{company.name} → {facility.name}</strong><p>{facility.address}</p><p>{_uiText(profiles.find(p=>p[0]===profile)?.[1] || "")} · {clean?_uiText("Temiz ve girişe hazır"):_uiText("Giriş öncesi temizlik bekliyor")}</p></div>
     <div className={styles.metrics}><div><strong>{floors.length}</strong>{_uiText("kat")}</div><div><strong>{preview.length}</strong>{_uiText("oda / daire")}</div><div><strong>{people.length}</strong>{_uiText("yeni personel")}</div></div>
     {previewError&&<ErrorMessage message={previewError}/>}
     <SettingsSection title={_uiText("Birim kodlarını kontrol et / düzenle")} description={_uiText("{value1} birim", {value1: String(preview.length)})}><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{preview.map(u=><TextField key={u.key} label={_uiText("{value1} · {value2}", {value1: String(localized(floors.find(f=>f.floor_id===u.floor_key)?.label,_uiLocale.toUpperCase())), value2: String(u.room.type)})} value={codes[u.key]??u.room.code??''} onChange={v=>setCodes(old=>({...old,[u.key]:v}))}/>)}</div></SettingsSection>
     <p className={styles.note}>{_uiText("Kayıtlar tek işlemde oluşturulur. Bir doğrulama hatasında işlem tamamen geri alınır; yarım kurulum bırakılmaz. Mevcut şirket seçildiyse ticari bilgileri güncellenir.")}</p>
    </>}
   </fieldset>
   {attempt&&!busy&&<p className={styles.note}>{_uiText("İşlemin sonucu doğrulanamadı. Aynı kurulumu güvenle yeniden deneyebilirsiniz; ikinci bir kopya oluşturulmaz.")}</p>}
   <footer className={styles.footer}><Button variant="secondary" disabled={step===0||busy||!!attempt} onClick={()=>{setError('');setStep(step-1);}}><ArrowLeft size={16}/>{_uiText("Geri")}</Button><small>{step+1} / {steps.length}</small><Button type="submit" disabled={busy}>{busy?_uiText("Kurulum kaydediliyor…"):step===6?(attempt?_uiText("Yeniden dene"):_uiText("Kurulumu tamamla")):_uiText("İleri")}<ArrowRight size={16}/></Button></footer>
  </form>
 </section>;
}
