import { BookingStatus as BookingState } from './statuses.generated';
import type { BookingStatus, RoomStatus } from "./statuses.generated";
export { bookingStatuses } from "./statuses";
import contracts from "./contracts.generated.json";
export { contracts };
export type Language = string;
export type LocalizedString = Record<string, string>;
export type MediaAsset = {
  media_id?: string;
  hotel_id?: string;
  url: string;
  kind: "image" | "video";
  title: LocalizedString;
  description: LocalizedString;
  alt_text: LocalizedString;
  sort_order: number;
  mime_type?: string;
  size?: number;
  original_name?: string;
  created_at?: string;
  updated_at?: string;
};
export type FeatureValue = boolean | number | string | string[];
export type FeatureAssignment = {
  owner_type?: "property" | "room";
  owner_id?: string;
  code: string;
  value: FeatureValue;
};
export type FeatureDefinition = {
	  catalog_kind?: "amenity" | "inventory" | "consumable";
	  icon_key?: string;
	  category_label?: LocalizedString;
	  group_key?: string;
	  group_label?: LocalizedString;
	  sort_order?: number;
  feature_id?: string;
  hotel_id: string;
  category_id: string;
  code: string;
  label: LocalizedString;
  description: LocalizedString;
  category?: string;
  scopes: ("property" | "room")[];
  value_type:
    "boolean" | "integer" | "decimal" | "string" | "enum" | "multi_enum";
  options: string[];
  option_labels?: Record<string, LocalizedString>;
  filterable: boolean;
  min: number | null;
  max: number | null;
  unit: string;
  required: boolean;
  assets: MediaAsset[];
};
export type FeatureCategory = {
  category_id: string;
  hotel_id: string;
  code: string;
  label: LocalizedString;
  sort_order: number;
};
export type FeatureRegistry = {
  categories: FeatureCategory[];
  definitions: FeatureDefinition[];
};
export type Facility = {
  hotel_id: string;
  branch_id?: string;
  name: string;
  description: LocalizedString;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  tax_office: string;
  logo_url: string;
  cover_url: string;
  assets: MediaAsset[];
  inventory?: { id: string; name: string }[];
  feature_assignments?: FeatureAssignment[];
};
export type APIRoom = {
  rental_mode?: "" | "room" | "beds";
  status_reason?:string;
  last_cleaning?: {cleaner_id:string;cleaner:string;note:string;completed_at:string;recorded_by:string;recorded_by_name:string};
  inactive?: boolean;
  bed_layout?: string;
  floor_id: string | null;
  parent_id: string | null;
  kind: string;
  capacity: number;
  effective_capacity: number;
  rentable: boolean;
  bed_group: string;
  bed_level: number;
  position: Position;
  room_id: string;
  branch_id: string;
  code: string;
  name: string;
  status: string;
  type: string;
  description: LocalizedString;
  assets: MediaAsset[];
  features: string[];
  inventory_ids: string[];
  check_in: string;
  check_out: string;
  guests: import("../types").Guest[];
  feature_assignments: FeatureAssignment[];
};
export type Snapshot = {
  floors: Floor[];
  bookings: Booking[];
  application: string;
  user: {
	preferences?: Record<string, string | number | boolean>;
    user_id: string;
    hotel_id: string;
    username: string;
    displayname: string;
    role: string;
  };
  languages: Language[];
  hotels: Facility[];
  branches: Facility[];
  rooms: APIRoom[];
  hotel_id: string;
  branch_id: string;
  server_time: string;
  feature_registry: FeatureRegistry;
};
export type Selection = { hotel_id?: string; branch_id?: string };
export type Command = keyof typeof contracts.commands;
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : contracts.errors.internal_error;
export const localized = (value?: LocalizedString, language = "TR") =>
  value?.[language] ||
  value?.TR ||
  value?.EN ||
  Object.values(value || {}).find(Boolean) ||
  "";
export async function command<T>(
  code: Command,
  payload: unknown = {},
  files?: File[],
  signal?: AbortSignal,
): Promise<T> {
  const method = contracts.commands[code];
  let url = "/action";
  const headers: Record<string, string> = {
    "X-Requested-With": "INTERACTIVEOTEL",
  };
  let body: BodyInit | undefined;
  if (method === "GET") {
    url +=
      "?" +
      new URLSearchParams({
        version: contracts.version,
        code,
        payload: JSON.stringify(payload),
      });
  } else if (files) {
    const form = new FormData();
    form.set("version", contracts.version);
    form.set("code", code);
    form.set("payload", JSON.stringify(payload));
    files.forEach((file) => form.append("files", file));
    body = form;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ version: contracts.version, code, payload });
  }
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      method,
      headers,
      body,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new APIError("internal_error", contracts.errors.internal_error, 0);
  }
  const envelope = await response.json().catch(() => null);
  if (!response.ok || envelope?.error) {
    throw new APIError(
      envelope?.error?.code || "internal_error",
      envelope?.error?.message || contracts.errors.internal_error,
      response.status,
    );
  }
  return envelope.data as T;
}
export type Position = { x: number; y: number; width: number; height: number };
export type Floor = {
  floor_id: string;
  branch_id: string;
  code: string;
  label: LocalizedString;
  sort_order: number;
  width: number;
  height: number;
};
export type Allocation = {
  allocation_id: string;
  booking_id: string;
  branch_id: string;
  room_id: string;
  start: string;
  end: string;
};
export type Booking = {
  source?: string;
  external_property_id?: string;
  external_reservation_id?: string;
  cancellation_reason?:string;
  cancelled_at?:string;
  created_by_name?: string;
  checked_in_by_name?: string;
  checked_in_by_id?: string;
  cancelled_by_name?: string;
  cancelled_by_id?: string;
  checked_out_by_name?: string;
  checked_out_by_id?: string;
  booking_id: string;
  branch_id: string;
  room_id: string;
  user_id?: string;
  guest_name: string;
  guest_count: number;
  daily_price_minor: number;
  currency?: string;
  guests: import("../types").Guest[];
  notes: string;
  check_in: string;
  check_out: string;
  actual_check_in?: string | null;
  actual_check_out?: string | null;
  status: BookingStatus;
  allocations: Allocation[];
  created_at?: string;
  updated_at?: string;
};
export type FloorPlan = { floor: Floor; rooms: APIRoom[]; capacity: number };
export const unitKinds: Record<string, string> = {
  apartment: "Daire",
  room: "Oda",
  dormitory: "Koğuş",
  bed: "Yatak",
};
export function related(rooms: APIRoom[], id: string): Set<string> {
  const out = new Set([id]);
  let current = rooms.find((r) => r.room_id === id);
  while (current?.parent_id && !out.has(current.parent_id)) {
    out.add(current.parent_id);
    current = rooms.find((r) => r.room_id === current!.parent_id);
  }
  const descendants = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rooms) {
      if (
        r.parent_id &&
        descendants.has(r.parent_id) &&
        !descendants.has(r.room_id)
      ) {
        out.add(r.room_id);
        descendants.add(r.room_id);
        changed = true;
      }
    }
  }
  return out;
}
export function occupancy(
  rooms: APIRoom[],
  bookings: Booking[],
  room: APIRoom,
  at: string,
  now = at,
) {
  const ids = related(rooms, room.room_id);
  const instant = Date.parse(at);
  return bookings.filter(
    (b) =>
      b.branch_id === room.branch_id &&
      [BookingState.Confirmed, BookingState.CheckedIn].some(status=>status===b.status) &&
      bookingIntervals(b, now).some(
        (a) => ids.has(a.roomId) && a.start <= instant && a.end > instant,
      ),
  ).sort((a, b) => Number(b.status === BookingState.CheckedIn) - Number(a.status === BookingState.CheckedIn) || Date.parse(a.check_in) - Date.parse(b.check_in));
}

/** Compare instants, never ISO strings: offsets and precision may differ. */
export function bookingIntervals(booking: Booking, now: string) {
  const segments = booking.allocations?.length ? booking.allocations : [{ room_id: booking.room_id, start: booking.check_in, end: booking.check_out }];
  const firstStart = Math.min(...segments.map(segment => Date.parse(segment.start)).filter(Number.isFinite));
  return segments.map(segment => {
    let start = Date.parse(segment.start), end = Date.parse(segment.end);
    if (booking.actual_check_in) {
      const actualStart = Date.parse(booking.actual_check_in);
      // Early check-in occupies the first assigned unit immediately; later moves keep their own start.
      start = start === firstStart ? actualStart : Math.max(start, actualStart);
    }
    if (booking.actual_check_out) end = Math.min(end, Date.parse(booking.actual_check_out));
    // An overdue stay still occupies its last room until checkout is recorded.
    if (booking.status === BookingState.CheckedIn && segment.room_id === booking.room_id && end === Date.parse(booking.check_out)) {
      end = Math.max(end, Date.parse(now) + 1);
    }
    return { roomId: segment.room_id, start, end };
  }).filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.end > segment.start);
}

export async function downloadCommand(
  code: Command,
  payload: unknown,
  filename: string,
) {
  const params = new URLSearchParams({
    version: "1",
    code,
    payload: JSON.stringify(payload),
  });
  const response = await fetch(`/action?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json();
    throw new APIError(
      body.error?.code || "export_failed",
      body.error?.message || contracts.errors.export_failed,
      response.status,
    );
  }
  const blob = await response.blob(),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
