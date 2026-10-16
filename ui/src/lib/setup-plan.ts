import { contracts, type Facility, type Floor, type FeatureAssignment, type APIRoom } from './api';
import { RoomStatus } from './statuses.generated';
import { roomBedsPayload, type RoomBedChoice } from './room-beds';
export type SetupGroup = {
 id:string; name:string; floorKey:string; kind:'room'|'dormitory'|'apartment'|'apartment_rooms';
 mode:''|'room'|'beds'; count:number; roomsPerApartment:number; prefix:string; start:number;
 beds:RoomBedChoice[]; features:FeatureAssignment[];
};
export type SetupUnit = {key:string;floor_key:string;parent_key:string;room:Partial<APIRoom>&{beds_to_add:ReturnType<typeof roomBedsPayload>}};
export function setupFloors(count:number,ground:boolean):Floor[]{
 return Array.from({length:count},(_,i)=>{
  const preset=contracts.floor_presets.find(p=>p.id===(ground&&i===0?'ground':`floor${ground?i:i+1}`))!;
  return {floor_id:crypto.randomUUID(),branch_id:'',code:preset.code,label:preset.label,sort_order:preset.sort_order,width:2400,height:2400};
 });
}
export function buildSetupUnits(floors:Floor[],groups:SetupGroup[],clean:boolean,codeOverrides:Record<string,string>={}):SetupUnit[]{
 const units:SetupUnit[]=[];
 const positions=new Map<string,number>();
 const add=(group:SetupGroup,floor:Floor,key:string,code:string,kind:string,parent='',container=false)=>{
  const columns=Math.max(1,Math.floor((floor.width-20)/180));
  const n=positions.get(floor.floor_id)||0;positions.set(floor.floor_id,n+1);
  const finalCode=codeOverrides[key]??code;
  units.push({key,floor_key:floor.floor_id,parent_key:parent,room:{code:finalCode,kind,type:group.name,name:'',status:clean?RoomStatus.Clean:RoomStatus.Dirty,
   rentable:!container&&(kind==='apartment'||group.mode==='room'),rental_mode:kind==='room'||kind==='dormitory'?group.mode:'',
   capacity:0,effective_capacity:0,bed_group:'',bed_level:0,description:{},assets:[],features:[],inventory_ids:[],guests:[],check_in:'',check_out:'',
   position:{x:20+(n%columns)*180,y:20+Math.floor(n/columns)*140,width:160,height:120},feature_assignments:container?[]:group.features,
   beds_to_add:container?[]:roomBedsPayload(group.beds,finalCode,'')}});
 };
 for(const group of groups){
  if(!Number.isInteger(group.count)||group.count<1||group.count>100)throw new Error('Her grup için 1–100 birim seçin.');
  if(!Number.isInteger(group.start)||group.start<1)throw new Error('Başlangıç numarası pozitif tam sayı olmalı.');
  if(group.kind==='apartment_rooms'&&(!Number.isInteger(group.roomsPerApartment)||group.roomsPerApartment<1||group.roomsPerApartment>20))throw new Error('Daire içi oda sayısı 1–20 olmalı.');
  const target=group.floorKey==='all'?floors:floors.filter(f=>f.floor_id===group.floorKey);
  if(!target.length)throw new Error('Birim grubu için bir kat seçin.');
  if(group.kind!=='apartment'&&!group.mode)throw new Error('Her grubun kiralama şeklini seçin.');
  if(!group.beds.length)throw new Error('Her birim grubu için yatak ekleyin.');
  for(const floor of target)for(let i=0;i<group.count;i++){
   const key=`${group.id}-${floor.floor_id}-${i}`;
   const code=`${group.prefix}${floor.code}${String(group.start+i).padStart(2,'0')}`;
   if(group.kind==='apartment_rooms'){
    add(group,floor,key,code,'apartment','',true);
    for(let j=0;j<group.roomsPerApartment;j++)add(group,floor,`${key}-room${j}`,`${code}-${j+1}`,'room',key);
   }else add(group,floor,key,code,group.kind);
  }
 }
 if(units.length>500)throw new Error('Bir kurulumda en fazla 500 oda / daire oluşturabilirsiniz.');
 const codes=new Set<string>();
 for(const u of units){if(u.room.position!.y+u.room.position!.height>10000)throw new Error('Bu kata çok fazla birim yerleşiyor; kat sayısını veya plan genişliğini artırın.');const code=u.room.code?.trim()||'';if(!code||code.length>24||codes.has(code))throw new Error('Birim kodları benzersiz ve en fazla 24 karakter olmalı.');codes.add(code);}
 return units;
}
export const emptyFacility=():Facility=>({hotel_id:'',name:'',address:'',phone:'',email:'',tax_number:'',tax_office:'',description:{},logo_url:'',cover_url:'',assets:[],feature_assignments:[]});
