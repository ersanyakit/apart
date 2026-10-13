import {
  BedDouble, Building2, CalendarCheck2, CalendarDays, ClipboardList,
  DoorOpen, Files, LayoutGrid, ScrollText, Settings2, SlidersHorizontal,
  Sparkles, UsersRound, Bell, Search, X, Home, MapPin, type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  operations: LayoutGrid, board: CalendarDays,
  calendar: CalendarDays, bookings: CalendarCheck2,
  stays: BedDouble, guests: UsersRound, settings: Settings2, facility: Building2,
  units: DoorOpen, staff: UsersRound, templates: Files, logs: ScrollText,
  features: Sparkles, appsettings: SlidersHorizontal, newbooking: ClipboardList,
  search: Search, close: X, notifications: Bell, home: Home, map: MapPin,
};

export function NavigationIcon({ name, size = 21 }: { name: string; size?: number }) {
  const Icon = icons[name.startsWith("booking:") ? "bookings" : name] ?? ClipboardList;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />;
}
