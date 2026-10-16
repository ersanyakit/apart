import { useId } from 'react';
import { DoorClosed, BedSingle } from 'lucide-react';
import { RoomBedsEditor, type RoomBedChoice } from './RoomBedsEditor';
import styles from './RoomRentalSetup.module.css';

export function RoomRentalSetup({ mode, onModeChange, beds, onBedsChange, roomId, branchId, disabled, showModeSelection = true, compact = false }: {
  mode: '' | 'room' | 'beds'; onModeChange: (mode: 'room' | 'beds') => void;
  beds: RoomBedChoice[]; onBedsChange: (beds: RoomBedChoice[]) => void;
  roomId?: string; branchId: string; disabled: boolean; showModeSelection?: boolean; compact?: boolean;
}) {
  const id = useId();
  return <section className={styles.setup} aria-label="Kiralama ve yatak düzeni">
    {showModeSelection && <fieldset disabled={disabled} className={styles.modes}>
      <legend>Bu oda nasıl kiralanacak?</legend>
      <p>Misafirlerin odayı birlikte mi, ayrı rezervasyonlarla mı kullanacağını seçin.</p>
      <div className={styles.options}>
        {([{key:'room',title:'Odanın tamamı',description:'Tek rezervasyonla kiralanır. İçindeki yataklar başka misafirlere ayrıca satılmaz.',Icon:DoorClosed},
          {key:'beds',title:'Yataklar ayrı ayrı',description:'Aynı odadaki yatak yerleri farklı misafirlere, ayrı rezervasyonlarla kiralanabilir.',Icon:BedSingle}] as const).map(option => <label key={option.key} className={styles.option} data-selected={mode===option.key}>
            <input type="radio" name={`${id}-rental`} value={option.key} checked={mode===option.key} onChange={()=>onModeChange(option.key)}/>
            <option.Icon size={22}/><span><strong>{option.title}</strong><small>{option.description}</small></span>
          </label>)}
      </div>
    </fieldset>}
    <RoomBedsEditor compact={compact} roomId={roomId} branchId={branchId} value={beds} onChange={onBedsChange} disabled={disabled} rentalMode={mode}/>
  </section>;
}
