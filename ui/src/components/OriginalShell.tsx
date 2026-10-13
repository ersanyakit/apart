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
  Shield,
  FileX,
  Monitor,
  Wind,
  History,
} from "lucide-react";
import { SidebarItem } from "./Sidebar";
import { NavigationIcon } from "./NavigationIcon";
import { MobileNav } from "./MobileNav";
import { UniSelect } from "./UniSelect";
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
  at,
  onDate,
  children,
}: Props) {
  const reducedMotion = useReducedMotion();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true),
    [globalSearch, setGlobalSearch] = useState(""),
    [isSearchOpen, setIsSearchOpen] = useState(false);
  const setSelectedRoomId = (id: string) => {
    document
      .getElementById("unit-" + id)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
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
        type: r.type || unitKinds[r.kind],
        ...(b
          ? {
              name: b.guest_name,
              status: b.status === "checked_in" ? "Dolu" : "Rezervli",
              check_in: b.check_in,
              check_out: b.check_out,
              guests: b.guests,
            }
          : {}),
      },
      snapshot.feature_registry,
    );
  });
  const manager = ["admin", "management"].includes(snapshot.user.role);
  // Referans tasarım standardında açılır-kapanır gruplar (tree): operasyon + sistem
  // ayarları. Tipografi referans tokenlar, renk tonları projenin paleti.
  const SIDEBAR_ITEMS: MenuItem[] = [
    {
      id: "operations",
      label: "Otel Operasyonu",
      icon: <NavigationIcon name="operations" />,
      subItems: [
        { id: "board", label: "Oda Durum Çizelgesi", icon: <NavigationIcon name="board" /> },
        { id: "calendar", label: "Konaklama Takvimi", icon: <NavigationIcon name="calendar" /> },
        { id: "bookings", label: "Rezervasyon Listesi", icon: <NavigationIcon name="bookings" /> },
        { id: "stays", label: "Konaklayan Listesi", icon: <NavigationIcon name="stays" /> },
        { id: "guests", label: "Misafir Arama ve Geçmiş", icon: <NavigationIcon name="guests" /> },
      ],
    },
    ...(manager
      ? [
          {
            id: "settings",
            label: "Sistem Ayarları",
            icon: <NavigationIcon name="settings" />,
            subItems: [
              { id: "facility", label: "Kurumsal Tesis Kartı", icon: <NavigationIcon name="facility" /> },
              { id: "units", label: "Kat ve Oda Tanımları", icon: <NavigationIcon name="units" /> },
              { id: "staff", label: "Personel Tanımları", icon: <NavigationIcon name="staff" /> },
              { id: "templates", label: "Belge Şablonları", icon: <NavigationIcon name="templates" /> },
              { id: "logs", label: "Sistem Logları", icon: <NavigationIcon name="logs" /> },
              { id: "features", label: "Olanak Tanımları", icon: <NavigationIcon name="features" /> },
              { id: "appsettings", label: "Ayarlar", icon: <NavigationIcon name="appsettings" /> },
            ],
          },
        ]
      : []),
  ];
  // Üst bardaki kapanabilir sekmelerin etiketleri (sidebar ağacından).
  const TAB_LABELS: Record<string, string> = { ...extraLabels };
  for (const group of SIDEBAR_ITEMS) {
    for (const sub of group.subItems ?? []) {
      TAB_LABELS[sub.id] ??= sub.label;
    }
  }
  return (
    <div className="app-shell flex flex-col bg-[#f5f5f7] overflow-hidden">
      <header className="mobile-app-header">
        <div className="mobile-app-heading">
          <p className="truncate text-[12px] font-medium text-slate-500">{hotelConfig.name}</p>
          <p className="mt-0.5 truncate text-[17px] font-semibold tracking-tight text-slate-900">{TAB_LABELS[activeTab] ?? "Rezervasyon"}</p>
        </div>
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-100 text-sm font-semibold text-brand-blue-700">
          {user.name.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("")}
        </span>
      </header>
      {/* Desktop tabs stay on desktop; mobile uses the tab bar below. */}
      <header className="desktop-app-header hidden lg:flex h-16 min-w-0 items-center justify-between shrink-0 z-30 border-b border-black/[0.06] bg-white/90">
        <div style={{ width: isSidebarOpen ? 264 : 76 }} className="flex min-w-0 items-center gap-3 px-5 border-r border-slate-100 h-full shrink-0 transition-[width] duration-200 motion-reduce:transition-none">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-brand-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-blue-100 shrink-0 overflow-hidden">
            {hotelConfig.logoUrl ? (
              <img
                src={hotelConfig.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <NavigationIcon name="home" />
            )}
          </div>
          <span className={`${isSidebarOpen ? "block" : "hidden"} min-w-0 flex-1 font-semibold text-slate-800 text-[13px] leading-tight tracking-tight truncate`}>
            {hotelConfig.name || "KYS OTEL"}
            <br />
            <span className="text-[7px] md:text-[8px] text-brand-blue-500 font-medium uppercase">
              YÖNETİM SİSTEMİ
            </span>
          </span>
        </div>

        <nav aria-label="Ana sekmeler" className="flex min-w-0 items-center h-full px-2 gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1">
          {openTabs.map((id) => {
            const label = TAB_LABELS[id] ?? id;
            const isActive = activeTab === id;
            const pinned = id === "board";
            return (
              <div
                key={id}
                className={`group flex shrink-0 items-center gap-0.5 rounded-lg px-1 my-1 transition-colors duration-150 ease-out ${
                  isActive ? "bg-brand-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  title={label}
                  onClick={() => setActiveTab(id)}
                  className={`uni-control uni-top-tab min-h-11 flex items-center justify-center gap-2 px-2 md:px-3 py-1.5 select-none cursor-pointer active:scale-[0.98] outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-brand-blue-500/30 ${
                    isActive ? "text-brand-blue-700" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span className="flex shrink-0 items-center justify-center">
                    <NavigationIcon name={id} />
                  </span>
                  <span className="block max-w-[160px] truncate">{label}</span>
                </button>
                {!pinned && (
                  <button
                    type="button"
                    aria-label={`Sekmeyi kapat: ${label}`}
                    title={`Kapat: ${label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(id);
                    }}
                    className={`nav-icon-button mr-0.5 ${
                      isActive
                        ? "text-brand-blue-400 hover:text-brand-blue-700 hover:bg-brand-blue-100/70 active:bg-brand-blue-100"
                        : "text-slate-300 hover:text-slate-700 hover:bg-slate-200/70 active:bg-slate-200/70 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    }`}
                  >
                    <NavigationIcon name="close" />
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {/* Global Search Bar */}
        <div className="hidden lg:flex items-center gap-2 px-4 border-l border-slate-100 h-full relative">
          <div
            className={`flex items-center transition-all duration-500 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner ${isSearchOpen ? "w-64 ring-4 ring-neutral-200" : "w-11"}`}
          >
            <button
              type="button"
              aria-label={isSearchOpen ? "Aramayı kapat" : "Müşteri veya oda ara"}
              aria-expanded={isSearchOpen}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="nav-icon-button text-slate-500 hover:text-brand-blue-600"
            >
              <NavigationIcon name="search" />
            </button>
            {isSearchOpen && (
              <input
                autoFocus
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="MÜŞTERİ VEYA ODA ARA..."
                className="uni-input w-full bg-transparent border-none text-[10px] font-black outline-none text-slate-700 placeholder:text-slate-400 uppercase tracking-widest"
              />
            )}
            {isSearchOpen && globalSearch && (
              <button
                type="button"
                aria-label="Aramayı temizle"
                onClick={() => setGlobalSearch("")}
                className="nav-icon-button text-slate-500 hover:text-rose-500"
              >
                <NavigationIcon name="close" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {isSearchOpen && globalSearch && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-[calc(100%+8px)] right-4 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 ring-1 ring-slate-900/5"
              >
                <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    ARAMA SONUÇLARI
                  </span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase">
                    '{globalSearch}'
                  </span>
                </div>
                <div className="max-h-[350px] overflow-y-auto no-scrollbar py-2">
                  {rooms.filter(
                    (r) =>
                      r.number.includes(globalSearch) ||
                      r.name
                        .toLowerCase()
                        .includes(globalSearch.toLowerCase()) ||
                      (r.guests &&
                        r.guests.some((g) =>
                          g.name
                            .toLowerCase()
                            .includes(globalSearch.toLowerCase()),
                        )),
                  ).length > 0 ? (
                    rooms
                      .filter(
                        (r) =>
                          r.number.includes(globalSearch) ||
                          r.name
                            .toLowerCase()
                            .includes(globalSearch.toLowerCase()) ||
                          (r.guests &&
                            r.guests.some((g) =>
                              g.name
                                .toLowerCase()
                                .includes(globalSearch.toLowerCase()),
                            )),
                      )
                      .map((room) => (
                        <button
                          key={room.id}
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setActiveTab("board");
                            setGlobalSearch("");
                            setIsSearchOpen(false);
                            // Scroll to room logic would go here
                          }}
                          className="uni-control w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-blue-50/50  text-left group"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              room.status === "Dolu"
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : room.status === "Rezervli"
                                  ? "bg-brand-blue-50 text-brand-blue-600 border border-brand-blue-100"
                                  : "bg-slate-50 text-slate-400 border border-slate-200"
                            }`}
                          >
                            {room.number}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-slate-800 uppercase truncate">
                              {room.guests && room.guests.length > 0
                                ? room.guests[0].name
                                : room.name || "BOŞ ODA"}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                              {room.status} • {room.type}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-brand-blue-500 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))
                  ) : (
                    <div className="py-8 px-4 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        SONUÇ BULUNAMADI
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-brand-blue-600 text-center">
                  <button
                    onClick={() => {
                      setActiveTab("bookings");
                      setGlobalSearch("");
                      setIsSearchOpen(false);
                    }}
                    className="uni-control text-[9px]  text-white  tracking-[0.2em] hover:underline"
                  >
                    TÜM ARŞİVDE ARA
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center px-4 md:px-5 gap-3 md:gap-4 shrink-0 bg-white ml-auto">
          <button type="button" aria-label="Bildirimler" className="nav-icon-button text-slate-500 hover:text-brand-blue-600 hover:bg-brand-blue-50 relative">
            <NavigationIcon name="notifications" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 border border-white rounded-full"></span>
          </button>
          <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200 min-w-0">
            <div className="text-right hidden lg:block min-w-0">
              <p className="text-[10px] md:text-[11px] font-black text-slate-700 truncate max-w-[120px] uppercase tracking-tight">
                {user.name}
              </p>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                {user.role}
              </p>
            </div>
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-brand-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-brand-blue-100 border-2 border-white uppercase shrink-0">
              {user.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (masaüstü; mobilde alt bar + bottom sheet) */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 264 : 76 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
          aria-label="Ana menü"
          className="desktop-sidebar hidden lg:flex min-h-0 bg-[#fafafa] border-r border-black/[0.06] flex-col z-20 shrink-0"
        >
          <div
            className={`flex items-center min-h-16 py-2 ${isSidebarOpen ? "justify-between px-4" : "justify-center px-0"}`}
          >
            {isSidebarOpen ? (
              <span className="w-10 h-10 rounded-full bg-brand-blue-600 flex items-center justify-center text-white shadow-md shadow-brand-blue-100 shrink-0 overflow-hidden">
                {hotelConfig.logoUrl ? (
                  <img
                    src={hotelConfig.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Home className="w-5 h-5" />
                )}
              </span>
            ) : null}
            <button
              type="button"
              aria-label={isSidebarOpen ? "Menüyü daralt" : "Menüyü genişlet"}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="uni-control p-2.5 rounded-full hover:bg-slate-100 active:bg-slate-200/70 active:scale-[0.98]     outline-none   text-slate-700 cursor-pointer"
            >
              {isSidebarOpen ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {isSidebarOpen && (
            <div className="px-3 py-2 space-y-2">
              <UniSelect
                caption="Otel"
                ariaLabel="Otel seçimi"
                icon={<NavigationIcon name="facility" />}
                value={snapshot.hotel_id}
                options={snapshot.hotels.map((h) => ({
                  value: h.hotel_id,
                  label: h.name,
                }))}
                onChange={(hotel_id) => onSelection({ hotel_id })}
              />
              <UniSelect
                caption="Tesis"
                ariaLabel="Tesis seçimi"
                icon={<NavigationIcon name="map" />}
                value={snapshot.branch_id}
                options={snapshot.branches.map((b) => ({
                  value: b.branch_id ?? "",
                  label: b.name,
                }))}
                onChange={(branch_id) =>
                  onSelection({
                    hotel_id: snapshot.hotel_id,
                    branch_id,
                  })
                }
              />
            </div>
          )}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3">
            {SIDEBAR_ITEMS.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                isOpen={isSidebarOpen}
                activeTab={activeTab}
                onSelect={setActiveTab}
              />
            ))}
          </div>

          <div className="p-3 mt-auto">
            <button
              type="button"
              title="Oturumu kapat"
              onClick={async () => {
                if (
                  await confirmDialog(
                    "Oturumu kapatmak istediğinize emin misiniz?",
                  )
                ) {
                  onLogout();
                }
              }}
              className={`uni-control w-full flex items-center gap-3 min-h-16 px-3 rounded-full hover:bg-slate-100    active:bg-slate-100 active:scale-[0.98]  cursor-pointer outline-none   ${isSidebarOpen ? "" : "justify-center px-0"}`}
            >
              <span className="w-10 h-10 rounded-full bg-brand-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md shadow-brand-blue-100 uppercase">
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
                      {user.role}
                    </span>
                  </span>
                  <Power className="w-5 h-5 shrink-0 text-slate-400" strokeWidth={2} />
                </>
              )}
            </button>
          </div>
        </motion.aside>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children} {/* Footer Info */}
          <footer className="hidden lg:flex bg-white border-t border-slate-200 px-6 py-2 items-center justify-between text-[11px] font-medium text-slate-500 shrink-0 z-10 shadow-sm overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-6 min-w-max">
              <div className="flex items-center gap-2 font-bold">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-200"></div>{" "}
                DOLU: {rooms.filter((r) => r.status === "Dolu").length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <div className="w-3 h-3 rounded-full bg-brand-blue-500 shadow-sm shadow-blue-200"></div>{" "}
                REZERV: {rooms.filter((r) => r.status === "Rezervli").length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-200"></div>{" "}
                TEMİZ: {rooms.filter((r) => r.status === "Temiz").length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-200"></div>{" "}
                KİRLİ: {rooms.filter((r) => r.status === "Kirli").length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <div className="w-3 h-3 rounded-full bg-slate-400 shadow-sm shadow-slate-200"></div>{" "}
                BOŞ: {rooms.filter((r) => r.status === "Bos").length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <div className="w-3 h-3 rounded-full bg-slate-900 shadow-sm shadow-slate-500"></div>{" "}
                ARIZALI: {rooms.filter((r) => r.status === "Arizali").length}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <div className="w-3 h-3 rounded-full bg-amber-600 shadow-sm shadow-amber-200"></div>{" "}
                TADİLAT: {rooms.filter((r) => r.status === "Tadilat").length}
              </div>
            </div>
            <div className="italic text-slate-400 ml-6 shrink-0">
              interaktifotel.com - v1.0.0
            </div>
          </footer>
        </div>
        {activeTab === "board" && (
          <aside className="w-64 bg-white border-l border-slate-200 flex-col hidden 2xl:flex shrink-0 z-20">
            <div className="p-6 flex flex-col items-center border-b border-slate-100 bg-slate-50/50">
              <div className="w-16 h-16 bg-brand-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-brand-blue-100 ring-4 ring-white">
                <Home className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-brand-blue-900 tracking-tighter leading-tight text-center">
                interaktif <br />{" "}
                <span className="text-red-600 bg-red-50 px-1">
                  OTEL PROGRAMI
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-2 font-bold tracking-widest uppercase">
                Premium Yönetim
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">
                    HESABIM
                  </h3>
                  <Settings className="w-3.5 h-3.5 text-slate-300" />
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Aktif Kullanıcı
                    </label>
                    <div className="uni-card bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 shadow-sm uppercase">
                      {user.name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Erişim Yetkisi
                    </label>
                    <div className="uni-card bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-brand-blue-600 shadow-sm uppercase">
                      {user.role}
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="uni-control w-full mt-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2  shadow-sm"
                  >
                    <Key className="w-4 h-4 text-brand-blue-500" />
                    Oturumu Kapat
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">
                    TAKVİM
                  </h3>
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
        activeTab={activeTab}
        onSelect={setActiveTab}
        onSelection={onSelection}
        onLogout={onLogout}
      />
    </div>
  );
}
