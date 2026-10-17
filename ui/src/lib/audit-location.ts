import { unitKinds } from "./api";

type Location = { room_id: string; code: string; kind: string; branch_name: string; source: string };
export type AuditDetails = {
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  before_location?: Location;
  after_location?: Location;
  location?: Location;
};

export function auditLocationSummary(entity: string, details?: AuditDetails, translate: (source: string) => string = source => source) {
  const before = details?.before_location;
  const after = details?.after_location;
  const location = after ?? before ?? details?.location;
  const label = (value: Location) => `${translate(unitKinds[value.kind] || "Birim")} ${value.code}`;
  if (location) return {
    label: before && after && (before.room_id !== after.room_id || before.code !== after.code || before.kind !== after.kind) ? `${label(before)} → ${label(after)}` : label(location),
    branch: before && after && before.branch_name !== after.branch_name ? `${before.branch_name} → ${after.branch_name}` : location.branch_name,
    inferred: [before, after, location].some(value => value?.source === "current_record"),
  };
  const data = details?.after ?? details?.before;
  return {
    label: entity === "rooms" && data?.code ? `${translate(unitKinds[String(data.kind)] || "Birim")} ${data.code}` : ["rooms", "bookings", "beds"].includes(entity) ? translate("Oda bilgisi kaydedilmemiş") : "—",
    branch: "", inferred: false,
  };
}
