import { useI18n } from "./I18n";
import {RoomRentalSetup} from './RoomRentalSetup';
import {RoomBedsEditor,type RoomBedChoice} from './RoomBedsEditor';
import {Switch} from './fields';
export function UnitSleepingFields({kind,rentable,onRentableChange,mode,onModeChange,beds,onBedsChange,roomId,branchId,disabled,showRentableToggle=true,showModeSelection=true,compact=false}:{
 kind:string;rentable:boolean;onRentableChange:(v:boolean)=>void;mode:''|'room'|'beds';onModeChange:(v:'room'|'beds')=>void;
 beds:RoomBedChoice[];onBedsChange:(v:RoomBedChoice[])=>void;roomId?:string;branchId:string;disabled:boolean;showRentableToggle?:boolean;showModeSelection?:boolean;compact?:boolean;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 if(kind==='room'||kind==='dormitory')return <RoomRentalSetup compact={compact} showModeSelection={showModeSelection} mode={mode} onModeChange={onModeChange} beds={beds} onBedsChange={onBedsChange} roomId={roomId} branchId={branchId} disabled={disabled}/>;
 if(kind==='bed')return <p className="text-sm text-uni-muted">{_uiText("Fiziksel yapı ve kapasiteyi Yataklar bölümünden düzenleyebilirsiniz.")}</p>;
 return <div className="space-y-4">{showRentableToggle&&<Switch label={_uiText("Bu birim doğrudan kiralanabilir")} checked={rentable} disabled={disabled} onChange={onRentableChange}/>}<RoomBedsEditor compact={compact} roomId={roomId} branchId={branchId} value={beds} onChange={onBedsChange} disabled={disabled} rentalMode={rentable?"room":''}/></div>;
}
