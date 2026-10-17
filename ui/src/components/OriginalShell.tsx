import {roleLabel} from "../lib/roles";
import { useI18n } from "./I18n";
import { RoomCondition, RoomConditionIcon } from './RoomCondition';
import { BookingStatus as BookingState } from '../lib/statuses.generated';
import { RoomStatus as RoomState } from '../lib/statuses.generated';
import { STATUS_PALETTE } from "../lib/status-palette";
import { usePreference } from "./UserPreferences";
import { confirmDialog } from "./ConfirmDialog";
import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Home,
  MessageSquare,
  ShieldCheck,
  Lightbulb,
  Info,
  Mail,
  ChevronRight,
  Settings,
  LogOut,
  Key,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  Maximize2,
  Menu,
  ChevronLeft,
  Power,
  Repeat,
  Plus,
  Shield,
  FileX,
  Monitor,
  Wind,
  History,
} from "lucide-react";
import { REPORTS, REPORT_GROUPS, reportPageID, reportSidebarPage } from "./reports/navigation";
import { SidebarItem } from "./Sidebar";
import { NavigationIcon } from "./NavigationIcon";
import { MobileNav } from "./MobileNav";
import { PropertySwitcher } from "./PropertySwitcher";
import { ReservationCalendar } from "./Calendar";
import { facilityView, roomView } from "../lib/adapters";
import {
  occupancy,
  unitKinds,
  type Snapshot,
  type Selection,
} from "../lib/api";
import type { MenuItem } from "../types";
type Props = {
  snapshot: Snapshot;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openTabs: string[];
  onCloseTab: (tab: string) => void;
  extraLabels?: Record<string, string>;
  onSelection: (selection: Selection) => void;
  onLogout: () => void;
  onNewBooking?: () => void;
  at: string;
  onDate: (date: Date) => void;
  children: React.ReactNode;
};
export function OriginalShell({
  snapshot,
  activeTab,
  setActiveTab,
  openTabs,
  onCloseTab,
  extraLabels = {},
  onSelection,
  onLogout,
  onNewBooking,
  at,
  onDate,
  children,
}: Props) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const reducedMotion = useReducedMotion();
  const [isSidebarOpen, setIsSidebarOpen] = usePreference<boolean>("sidebar_open", true);
  const user = {
    name: snapshot.user.displayname || snapshot.user.username,
    role: snapshot.user.role,
  };
  const hotelConfig = facilityView(
    snapshot.branches.find((b) => b.branch_id === snapshot.branch_id) ||
      snapshot.hotels.find((h) => h.hotel_id === snapshot.hotel_id),
  );
  const selectedDate = new Date(at),
    setSelectedDate = onDate;
  const rooms = snapshot.rooms.map((r) => {
    const b = occupancy(snapshot.rooms, snapshot.bookings, r, at)[0];
    return roomView(
      {
        ...r,
        type: r.type || _uiText(unitKinds[r.kind] || ""),
        ...(b
          ? {
              name: b.guest_name,
              status: b.status === BookingState.CheckedIn ? "Dolu" : "Rezervli",
              check_in: b.check_in,
              check_out: b.check_out,
              guests: b.guests,
            }
          : {}),
      },
      snapshot.feature_registry,
    );
  });
  const canUseNotes = ["admin", "management", "reception"].includes(snapshot.user.role);
  const manager = ["admin", "management"].includes(snapshot.user.role);
  // Referans tasarım standardında açılır-kapanır gruplar (tree): operasyon + sistem
  // ayarları. Tipografi referans tokenlar, renk tonları projenin paleti.
  const SIDEBAR_ITEMS: MenuItem[] = [
    {
      id: "operations",
      label: _uiText("Otel Operasyonu"),
      icon: <NavigationIcon name="operations" />,
      subItems: [
        { id: "board", label: _uiText("Oda Durum Çizelgesi"), icon: <NavigationIcon name="board" /> },
        { id: "property3d", label: _uiText("3 Boyutlu Görünüm"), icon: <NavigationIcon name="property3d" /> },
        { id: "calendar", label: _uiText("Konaklama Takvimi"), icon: <NavigationIcon name="calendar" /> },
        { id: "bookings", label: _uiText("Rezervasyon Listesi"), icon: <NavigationIcon name="bookings" /> },
        { id: "bookings-list", label: _uiText("Ayrıntılı Rezervasyon Listesi"), icon: <NavigationIcon name="bookings-list" /> },
        ...(canUseNotes ? [{ id: "kanban", label: _uiText("Resepsiyon Notları"), icon: <NavigationIcon name="kanban" /> }] : []),
        { id: "stays", label: _uiText("Konaklayan Listesi"), icon: <NavigationIcon name="stays" /> },
        ...(["admin","management","reception"].includes(snapshot.user.role)?[{ id: "blacklist", label: _uiText("Ortak Kara Liste"), icon: <NavigationIcon name="blacklist" /> }]:[]),
        { id: "guests", label: _uiText("Misafir Arama ve Geçmiş"), icon: <NavigationIcon name="guests" /> },
      ],
    },
    ...(manager ? [{ id: "reports", label: _uiText("Raporlar"), icon: <NavigationIcon name="reports" />, subItems: REPORT_GROUPS.map(group=>({id:group.id,label:_uiText(group.name),icon:<NavigationIcon name={group.id} />})) }] : []),
    ...(manager
      ? [
          {
            id: "settings",
            label: _uiText("Sistem Ayarları"),
            icon: <NavigationIcon name="settings" />,
            subItems: [
              { id: "setup", label: _uiText("Kurulum Sihirbazı"), icon: <NavigationIcon name="setup" /> },
              { id: "facility", label: _uiText("Şirket ve Oteller"), icon: <NavigationIcon name="facility" /> },
              { id: "units", label: _uiText("Kat ve Oda Tanımları"), icon: <NavigationIcon name="units" /> },
              { id: "staff", label: _uiText("Personel Tanımları"), icon: <NavigationIcon name="staff" /> },
              { id: "templates", label: _uiText("Belge Şablonları"), icon: <NavigationIcon name="templates" /> },
              { id: "logs", label: _uiText("İşlem Geçmişi"), icon: <NavigationIcon name="logs" /> },
              { id: "features", label: _uiText("Olanak Tanımları"), icon: <NavigationIcon name="features" /> },
            ],
          },
        ]
      : []),
    { id: "personal", label: _uiText("Kişisel"), icon: <NavigationIcon name="appsettings" />, subItems: [
      { id: "appsettings", label: _uiText("Ayarlar"), icon: <NavigationIcon name="appsettings" /> },
    ] },
  ];
  // Üst bardaki kapanabilir sekmelerin etiketleri (sidebar ağacından).
  const TAB_LABELS: Record<string, string> = { ...Object.fromEntries(REPORTS.map(report => [reportPageID(report.key), _uiText(report.name)])), ...extraLabels };
  for (const group of SIDEBAR_ITEMS) {
    for (const sub of group.subItems ?? []) {
      TAB_LABELS[sub.id] ??= sub.label;
    }
  }
  return (
    <div className="app-shell flex flex-col bg-[var(--app-background)] overflow-hidden">
      <header className="mobile-app-header">
        <div className="mobile-app-heading">
          <p className="truncate text-[12px] font-medium text-slate-500">{hotelConfig.name}</p>
          <p className="mt-0.5 truncate text-[17px] font-semibold tracking-tight text-slate-900">{TAB_LABELS[activeTab] ?? _uiText("Rezervasyon")}</p>
        </div>
        {canUseNotes && <button type="button" className="nav-icon-button" aria-label={_uiText("Bildirimler: resepsiyon notlarını aç")} onClick={() => setActiveTab("kanban")}><NavigationIcon name="notifications"/></button>}
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-100 text-sm font-semibold text-brand-blue-500">
          {user.name.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("")}
        </span>
      </header>
      {/* Desktop tabs stay on desktop; mobile uses the tab bar below. */}
      <header className="desktop-app-header hidden lg:flex h-16 min-w-0 items-center justify-between shrink-0 z-30 border-b border-black/[0.06]">
        <div style={{ width: isSidebarOpen ? 264 : 76 }} className="flex min-w-0 items-center gap-2 px-3 h-full shrink-0 transition-[width] duration-200 motion-reduce:transition-none">
          <button
            type="button"
            aria-label={isSidebarOpen ? _uiText("Menüyü daralt") : _uiText("Menüyü genişlet")}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="uni-control flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 outline-none transition-all duration-150 ease-out hover:bg-slate-100 active:bg-slate-200/70 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
            ) : (
              <Menu className="w-5 h-5" strokeWidth={2.2} />
            )}
          </button>
          <div className="w-7 h-7 md:w-8 md:h-8 bg-brand-blue-500 rounded-lg flex items-center justify-center text-accent-contrast shadow-lg shadow-brand-blue-100 shrink-0 overflow-hidden">
            {hotelConfig.logoUrl ? (
              <img
                src={hotelConfig.logoUrl}
                alt={_uiText("Logo")}
                className="w-full h-full object-cover"
              />
            ) : (
              <NavigationIcon name="home" />
            )}
          </div>
          <span className={`${isSidebarOpen ? "block" : "hidden"} min-w-0 flex-1 font-semibold text-slate-800 text-[13px] leading-tight tracking-tight truncate`}>
            {hotelConfig.name || _uiText("KYS OTEL")}
            <br />
            <span className="text-[7px] md:text-[8px] text-brand-blue-500 font-medium uppercase">{_uiText("YÖNETİM SİSTEMİ")} </span>
          </span>
        </div>

        <nav aria-label={_uiText("Ana sekmeler")} className="flex min-w-0 items-center h-full px-2 gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1">
          {openTabs.map((id) => {
            const label = TAB_LABELS[id] ?? id;
            const isActive = activeTab === id;
            const pinned = id === "board";
            return (
              <div
                key={id}
                className={`group flex shrink-0 items-center gap-0.5 rounded-lg px-1 my-1 transition-colors duration-150 ease-out ${isActive ? "bg-brand-blue-50" : "hover:bg-slate-50"}`}
              >
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  title={label}
                  onClick={() => setActiveTab(id)}
                  className={`uni-control uni-top-tab min-h-11 flex items-center justify-center gap-2 px-2 md:px-3 py-1.5 select-none cursor-pointer active:scale-[0.98] outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-brand-blue-500/30 ${isActive ? "text-brand-blue-700" : "text-slate-500 hover:text-slate-900"}`}
                >
                  <span className="flex shrink-0 items-center justify-center">
                    <NavigationIcon name={id} />
                  </span>
                  <span className="block max-w-[160px] truncate">{label}</span>
                </button>
                {!pinned && (
                  <button
                    type="button"
                    aria-label={_uiText("Sekmeyi kapat: {value1}", {value1: String(label)})}
                    title={_uiText("Kapat: {value1}", {value1: String(label)})}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(id);
                    }}
                    className={`nav-icon-button mr-0.5 ${isActive
                        ? "text-brand-blue-400 hover:text-brand-blue-700 hover:bg-brand-blue-100/70 active:bg-brand-blue-100"
                        : "text-slate-300 hover:text-slate-700 hover:bg-slate-200/70 active:bg-slate-200/70 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
                  >
                    <NavigationIcon name="close" />
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {onNewBooking && (
          <div className="hidden lg:flex items-center px-4 border-l border-slate-100 h-full shrink-0">
            <button
              type="button"
              aria-label={_uiText("Yeni rezervasyon")}
              title={_uiText("Yeni rezervasyon")}
              onClick={onNewBooking}
              className="uni-control flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-brand-blue-500 text-accent-contrast shadow-lg shadow-brand-blue-100 outline-none transition-all duration-150 ease-out hover:bg-brand-blue-600 hover:text-white active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-brand-blue-500/40"
            >
              <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex items-center px-4 md:px-5 gap-3 md:gap-4 shrink-0 ml-auto">
          <button type="button" aria-label={_uiText("Bildirimler: resepsiyon notlarını aç")} title={_uiText("Resepsiyon notları")} disabled={!canUseNotes} onClick={() => setActiveTab("kanban")} className="nav-icon-button text-slate-500 hover:text-brand-blue-600 hover:bg-brand-blue-50 relative">
            <NavigationIcon name="notifications" />
          </button>
          <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200 min-w-0">
            <div className="text-right hidden lg:block min-w-0">
              <p className="text-[10px] md:text-[11px] font-black text-slate-700 truncate max-w-[120px] uppercase tracking-tight">
                {user.name}
              </p>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                {_uiText(roleLabel(user.role))}
              </p>
            </div>
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-brand-blue-500 flex items-center justify-center text-accent-contrast font-black text-xs shadow-lg shadow-brand-blue-100 border-2 border-white uppercase shrink-0">
              {user.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </div>
          </div>
        </div>
      </header>

      <div className="app-workspace flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (masaüstü; mobilde alt bar + bottom sheet) */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 264 : 76 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
          aria-label={_uiText("Ana menü")}
          className="desktop-sidebar hidden lg:flex min-h-0 border-0 flex-col z-20 shrink-0"
        >
          {isSidebarOpen && (
            <div className="px-3 pb-2 pt-3">
              <PropertySwitcher snapshot={snapshot} onSelection={onSelection} />
            </div>
          )}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3">
            {SIDEBAR_ITEMS.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                isOpen={isSidebarOpen}
                activeTab={reportSidebarPage(activeTab)}
                onSelect={setActiveTab}
              />
            ))}
          </div>

          <div className="p-3 mt-auto">
            <button
              type="button"
              title={_uiText("Oturumu kapat")}
              onClick={async () => {
                if (
                  await confirmDialog(
                    _uiText("Oturumu kapatmak istediğinize emin misiniz?"),
                  )
                ) {
                  onLogout();
                }
              }}
              className={`uni-control w-full flex items-center gap-3 min-h-16 px-3 rounded-full hover:bg-slate-100    active:bg-slate-100 active:scale-[0.98]  cursor-pointer outline-none   ${isSidebarOpen ? "" : "justify-center px-0"}`}
            >
              <span className="w-10 h-10 rounded-full bg-brand-blue-500 flex items-center justify-center text-accent-contrast text-sm font-bold shrink-0 shadow-md shadow-brand-blue-100 uppercase">
                {user.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </span>
              {isSidebarOpen && (
                <>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="uni-profile-name block truncate text-slate-800">
                      {user.name}
                    </span>
                    <span className="uni-profile-sub block truncate text-slate-500">
                      {_uiText(roleLabel(user.role))}
                    </span>
                  </span>
                  <Power className="w-5 h-5 shrink-0 text-slate-400" strokeWidth={2} />
                </>
              )}
            </button>
          </div>
        </motion.aside>

        <div className="app-content-column flex-1 min-w-0 flex flex-col overflow-hidden">
          {children} {/* Footer Info */}
          <footer className="app-status-footer hidden lg:flex bg-white border-t border-slate-200 px-6 py-2 items-center justify-between text-[11px] font-medium text-slate-500 shrink-0 z-10 shadow-sm">
            <div className="app-status-counts flex items-center">
              <div className="flex items-center gap-2 font-bold">
                <RoomConditionIcon status="Dolu" size={22}/>{" "}{_uiText("DOLU:")} {rooms.filter((r) => r.status === "Dolu").length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <RoomConditionIcon status="Rezervli" size={22}/>{" "}{_uiText("REZERV:")} {rooms.filter((r) => r.status === "Rezervli").length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <RoomConditionIcon status={RoomState.Clean} size={22}/>{" "}{_uiText("TEMİZ:")} {rooms.filter((r) => r.status === RoomState.Clean).length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <RoomConditionIcon status={RoomState.Dirty} size={22}/>{" "}{_uiText("KİRLİ:")} {rooms.filter((r) => r.status === RoomState.Dirty).length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <RoomConditionIcon status={RoomState.Vacant} size={22}/>{" "}{_uiText("BOŞ:")} {rooms.filter((r) => r.status === RoomState.Vacant).length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <RoomConditionIcon status={RoomState.OutOfOrder} size={22}/>{" "}{_uiText("ARIZALI:")} {rooms.filter((r) => r.status === RoomState.OutOfOrder).length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <RoomConditionIcon status={RoomState.Maintenance} size={22}/>{" "}{_uiText("TADİLAT:")} {rooms.filter((r) => r.status === RoomState.Maintenance).length}
              </div>
            </div>
            <div className="italic text-slate-400 shrink-0 whitespace-nowrap">{_uiText("interaktifotel.com - v1.0.0")} </div>
          </footer>
        </div>
        {activeTab === "board" && (
          <aside className="w-64 bg-white border-l border-slate-200 flex-col hidden 2xl:flex shrink-0 z-20">
            <div className="p-6 flex flex-col items-center border-b border-slate-100 bg-slate-50/50">
              <div className="w-16 h-16 bg-brand-blue-500 rounded-2xl flex items-center justify-center text-accent-contrast mb-4 shadow-xl shadow-brand-blue-100 ring-4 ring-white">
                <Home className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-brand-blue-900 tracking-tighter leading-tight text-center">{_uiText("interaktif")} <br />{" "}
                <span className="text-red-600 bg-red-50 px-1">{_uiText("OTEL PROGRAMI")} </span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-2 font-bold tracking-widest uppercase">{_uiText("Premium Yönetim")} </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">{_uiText("HESABIM")} </h3>
                  <Settings className="w-3.5 h-3.5 text-slate-300" />
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{_uiText("Aktif Kullanıcı")} </label>
                    <div className="uni-card bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 shadow-sm uppercase">
                      {user.name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{_uiText("Erişim Yetkisi")} </label>
                    <div className="uni-card bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-brand-blue-600 shadow-sm uppercase">
                      {_uiText(roleLabel(user.role))}
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="uni-control w-full mt-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2  shadow-sm"
                  >
                    <Key className="w-4 h-4 text-brand-blue-500" />{_uiText("Oturumu Kapat")} </button>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">{_uiText("TAKVİM")} </h3>
                </div>
                <ReservationCalendar
                  selectedDate={selectedDate}
                  onSelect={(date) => setSelectedDate(date)}
                />
              </section>
            </div>
          </aside>
        )}
      </div>
      <MobileNav
        snapshot={snapshot}
        groups={SIDEBAR_ITEMS}
        activeTab={reportSidebarPage(activeTab)}
        onSelect={setActiveTab}
        onSelection={onSelection}
        onLogout={onLogout}
      />
    </div>
  );
}
