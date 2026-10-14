import {
  Box, KanbanSquare, ReceiptText, ShieldAlert, Wallet, ChartPie, ChartColumnIncreasing, TrendingUp, Wrench, ChartNoAxesCombined, BedDouble, Building2, CalendarCheck2, CalendarDays, ClipboardList,
  DoorOpen, Files, LayoutGrid, ScrollText, Settings2, SlidersHorizontal,
  Sparkles, UsersRound, Bell, Search, X, Home, MapPin, type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  property3d: Box,
  kanban: KanbanSquare,
  folio: ReceiptText, blacklist: ShieldAlert, reports: ChartNoAxesCombined, operations: LayoutGrid, board: CalendarDays,
  calendar: CalendarDays, bookings: CalendarCheck2,
  stays: BedDouble, guests: UsersRound, settings: Settings2, facility: Building2,
  units: DoorOpen, staff: UsersRound, templates: Files, logs: ScrollText,
  features: Sparkles, appsettings: SlidersHorizontal, newbooking: ClipboardList,
  search: Search, close: X, notifications: Bell, home: Home, map: MapPin,
};

export function NavigationIcon({ name, size = 21 }: { name: string; size?: number }) {
  const reportIcons: Record<string,LucideIcon> = {finance:Wallet,occupancy:ChartPie,reservations:CalendarCheck2,pricing:TrendingUp,guests:UsersRound,staff:UsersRound,operations:Wrench,apart:Building2,hostel:BedDouble,management:ChartColumnIncreasing};
  const Icon = name.startsWith("report.") ? reportIcons[name.split(".")[1]] ?? ChartNoAxesCombined : icons[name.startsWith("customer:") ? "guests" : name.startsWith("booking:") ? "bookings" : name] ?? ClipboardList;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />;
}
