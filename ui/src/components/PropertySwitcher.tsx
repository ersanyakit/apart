import { useI18n } from "./I18n";
import type { Selection, Snapshot } from '../lib/api';
import { FieldCard } from './fields/FieldCard';
import { NavigationIcon } from './NavigationIcon';
import { UniSelect } from './UniSelect';

/** One compact card for the current hotel and its facility. */
export function PropertySwitcher({ snapshot, onSelection }: {
  snapshot: Snapshot;
  onSelection: (selection: Selection) => void;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  return <section aria-label={_uiText("Şirket ve otel seçimi")}>
    <FieldCard className="sidebar-menu-group property-switcher-card">
      <UniSelect grouped variant="field" caption={_uiText("Şirket")} ariaLabel={_uiText("Şirket seçimi")}
        icon={<NavigationIcon name="facility" />} value={snapshot.hotel_id}
        options={snapshot.hotels.map(hotel => ({ value: hotel.hotel_id, label: hotel.name }))}
        onChange={hotel_id => onSelection({ hotel_id })} />
      <div className="mx-3 border-t border-uni-border" />
      <UniSelect key={snapshot.hotel_id} grouped variant="field" caption={_uiText("Otel / Tesis")} ariaLabel={_uiText("Otel / tesis seçimi")}
        icon={<NavigationIcon name="hotel" />} value={snapshot.branch_id}
        options={snapshot.branches.map(branch => ({ value: branch.branch_id ?? '', label: branch.name }))}
        onChange={branch_id => onSelection({ hotel_id: snapshot.hotel_id, branch_id })} />
    </FieldCard>
  </section>;
}
