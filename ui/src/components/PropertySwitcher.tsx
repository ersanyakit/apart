import type { Selection, Snapshot } from '../lib/api';
import { FieldCard } from './fields/FieldCard';
import { NavigationIcon } from './NavigationIcon';
import { UniSelect } from './UniSelect';

/** One compact card for the current hotel and its facility. */
export function PropertySwitcher({ snapshot, onSelection }: {
  snapshot: Snapshot;
  onSelection: (selection: Selection) => void;
}) {
  return <section aria-label="Otel ve tesis seçimi">
    <FieldCard className="property-switcher-card">
      <UniSelect grouped variant="field" caption="Otel" ariaLabel="Otel seçimi"
        icon={<NavigationIcon name="facility" />} value={snapshot.hotel_id}
        options={snapshot.hotels.map(hotel => ({ value: hotel.hotel_id, label: hotel.name }))}
        onChange={hotel_id => onSelection({ hotel_id })} />
      <div className="mx-3 border-t border-uni-border" />
      <UniSelect key={snapshot.hotel_id} grouped variant="field" caption="Tesis" ariaLabel="Tesis seçimi"
        icon={<NavigationIcon name="map" />} value={snapshot.branch_id}
        options={snapshot.branches.map(branch => ({ value: branch.branch_id ?? '', label: branch.name }))}
        onChange={branch_id => onSelection({ hotel_id: snapshot.hotel_id, branch_id })} />
    </FieldCard>
  </section>;
}
