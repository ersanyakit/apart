import { confirmDialog } from "./ConfirmDialog";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  Calendar as CalendarIcon,
  Users,
  MessageSquare,
  ShieldCheck,
  Lightbulb,
  Info,
  Mail,
  ChevronRight,
  ChevronDown,
  Bell,
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
  Search,
  X,
  Building2,
  Shield,
  FileText,
  FileCheck,
  FileX,
  LayoutGrid,
  Monitor,
  Wind,
  History,
} from "lucide-react";
import { SidebarItem } from "./Sidebar";
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
  onSelection,
  onLogout,
  at,
  onDate,
  children,
}: Props) {
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
  const TABS = [
    {
      id: "board",
      label: "Oda Durum Çizelgesi",
      icon: <CalendarIcon className="w-4 h-4" />,
      highlight: false,
    },
    {
      id: "bookings",
      label: "Rezervasyon Listesi",
      icon: <FileCheck className="w-4 h-4" />,
      highlight: false,
    },
    {
      id: "stays",
      label: "Konaklayan Listesi",
      icon: <Users className="w-4 h-4" />,
      highlight: false,
    },
  ];
  const manager = ["admin", "management"].includes(snapshot.user.role);
  const SIDEBAR_ITEMS: MenuItem[] = [
    {
      id: "operations",
      label: "OTEL OPERASYONU",
      icon: <LayoutGrid className="w-4 h-4" />,
      subItems: [
        { id: "board", label: "Oda Durum Çizelgesi", icon: null },
        { id: "bookings", label: "Rezervasyon Listesi", icon: null },
        { id: "stays", label: "Konaklayan Listesi", icon: null },
        { id: "guests", label: "Misafir Arama ve Geçmiş", icon: null },
      ],
    },
    ...(manager
      ? [
          {
            id: "settings",
            label: "SİSTEM AYARLARI",
            icon: <Settings className="w-4 h-4" />,
            subItems: [
              { id: "facility", label: "Kurumsal Tesis Kartı", icon: null },
              { id: "units", label: "Kat ve Oda Tanımları", icon: null },
              { id: "staff", label: "Personel Tanımları", icon: null },
              { id: "templates", label: "Belge Şablonları", icon: null },
              { id: "logs", label: "Sistem Logları", icon: null },
              { id: "features", label: "Olanak Tanımları", icon: null },
            ],
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col h-screen bg-[#f0f2f5] overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-12 md:h-14 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-30 shadow-sm px-4 md:px-0">
        <div className="flex items-center gap-3 px-5 border-r border-slate-100 h-full hidden lg:flex bg-slate-50/50 shrink-0">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-brand-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-blue-100 shrink-0 overflow-hidden">
            {hotelConfig.logoUrl ? (
              <img
                src={hotelConfig.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <Home className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </div>
          <span className="font-bold text-slate-800 text-[11px] md:text-[13px] leading-tight uppercase tracking-tight whitespace-nowrap">
            {hotelConfig.name || "KYS OTEL"}
            <br />
            <span className="text-[7px] md:text-[8px] text-brand-blue-500 font-medium uppercase">
              YÖNETİM SİSTEMİ
            </span>
          </span>
        </div>

        <nav className="flex items-center h-full px-1 gap-0.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 max-w-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex flex-col items-center justify-center min-w-[90px] md:min-w-[120px] h-full px-2 md:px-3 transition-all duration-200 group relative shrink-0
                ${activeTab === tab.id ? "bg-brand-blue-50 text-brand-blue-700" : "text-slate-500 hover:bg-slate-50"}
                ${tab.highlight ? "text-red-500" : ""}
              `}
            >
              <div
                className={`mb-0.5 md:mb-1 group-hover:scale-110 transition-transform ${activeTab === tab.id ? "text-brand-blue-600" : ""}`}
              >
                {React.cloneElement(
                  tab.icon as React.ReactElement<{ className?: string }>,
                  { className: "w-4 h-4 md:w-5 md:h-5" },
                )}
              </div>
              <span className="text-[8px] md:text-[10px] font-black whitespace-nowrap uppercase tracking-tighter sm:tracking-normal">
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-brand-blue-600 rounded-t-full mx-1 md:mx-2"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Global Search Bar */}
        <div className="hidden lg:flex items-center gap-2 px-4 border-l border-slate-100 h-full relative">
          <div
            className={`flex items-center transition-all duration-500 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner ${isSearchOpen ? "w-64 ring-4 ring-brand-blue-500/5" : "w-10"}`}
          >
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand-blue-600 transition-colors shrink-0"
            >
              <Search className="w-4 h-4" />
            </button>
            {isSearchOpen && (
              <input
                autoFocus
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="MÜŞTERİ VEYA ODA ARA..."
                className="w-full bg-transparent border-none text-[10px] font-black outline-none text-slate-700 placeholder:text-slate-300 uppercase tracking-widest"
              />
            )}
            {isSearchOpen && globalSearch && (
              <button
                onClick={() => setGlobalSearch("")}
                className="w-8 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
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
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-blue-50/50 transition-colors text-left group"
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
                    className="text-[9px] font-black text-white uppercase tracking-[0.2em] hover:underline"
                  >
                    TÜM ARŞİVDE ARA
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center px-4 md:px-5 gap-3 md:gap-4 shrink-0 bg-white ml-auto">
          <button className="hidden sm:flex p-1.5 text-slate-400 hover:text-brand-blue-600 hover:bg-brand-blue-50 rounded-full transition-colors relative">
            <Bell className="w-4 h-4 md:w-5 md:h-5" />
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
        {/* Left Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 240 : 64 }}
          className="bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl shadow-slate-200/50"
        >
          <div className="flex items-center justify-between p-4 bg-brand-blue-700 text-white shadow-md mb-2">
            {isSidebarOpen && (
              <span className="font-bold text-xs tracking-wider uppercase">
                İŞLEMLER
              </span>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 hover:bg-brand-blue-600 rounded-md transition-colors ml-auto"
            >
              {isSidebarOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>

          {isSidebarOpen && (
            <div className="px-3 py-2 space-y-2">
              <select
                aria-label="Otel seçimi"
                value={snapshot.hotel_id}
                onChange={(e) => onSelection({ hotel_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-[10px] font-bold"
              >
                {snapshot.hotels.map((h) => (
                  <option key={h.hotel_id} value={h.hotel_id}>
                    {h.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Tesis seçimi"
                value={snapshot.branch_id}
                onChange={(e) =>
                  onSelection({
                    hotel_id: snapshot.hotel_id,
                    branch_id: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-[10px] font-bold"
              >
                {snapshot.branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
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

          <div className="p-2 border-t border-slate-100 mt-auto">
            <div
              onClick={async () => {
                if (
                  await confirmDialog(
                    "Oturumu kapatmak istediğinize emin misiniz?",
                  )
                ) {
                  onLogout();
                }
              }}
              className="bg-red-50 p-3 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors cursor-pointer group"
            >
              <Power className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && (
                <span className="ml-2 font-bold text-xs uppercase">
                  OTURUMU KAPAT
                </span>
              )}
            </div>
          </div>
        </motion.aside>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children} {/* Footer Info */}
          <footer className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between text-[11px] font-medium text-slate-500 shrink-0 z-10 shadow-sm overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-6 min-w-max">
              <div className="flex items-center gap-2 font-bold transition-all hover:scale-105">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-200"></div>{" "}
                DOLU: {rooms.filter((r) => r.status === "Dolu").length}
              </div>
              <div className="flex items-center gap-2 font-bold transition-all hover:scale-105">
                <div className="w-3 h-3 rounded-full bg-brand-blue-500 shadow-sm shadow-blue-200"></div>{" "}
                REZERV: {rooms.filter((r) => r.status === "Rezervli").length}
              </div>
              <div className="flex items-center gap-2 font-bold transition-all hover:scale-105">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-200"></div>{" "}
                TEMİZ: {rooms.filter((r) => r.status === "Temiz").length}
              </div>
              <div className="flex items-center gap-2 font-bold transition-all hover:scale-105">
                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-200"></div>{" "}
                KİRLİ: {rooms.filter((r) => r.status === "Kirli").length}
              </div>
              <div className="flex items-center gap-2 font-bold transition-all hover:scale-105">
                <div className="w-3 h-3 rounded-full bg-slate-400 shadow-sm shadow-slate-200"></div>{" "}
                BOŞ: {rooms.filter((r) => r.status === "Bos").length}
              </div>
              <div className="flex items-center gap-2 font-bold transition-all hover:scale-105">
                <div className="w-3 h-3 rounded-full bg-slate-900 shadow-sm shadow-slate-500"></div>{" "}
                ARIZALI: {rooms.filter((r) => r.status === "Arizali").length}
              </div>
              <div className="flex items-center gap-2 font-bold transition-all hover:scale-105">
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
          <aside className="w-72 bg-white border-l border-slate-200 flex flex-col hidden xl:flex z-20 shadow-xl shadow-slate-200/50">
            <div className="p-6 flex flex-col items-center border-b border-slate-100 bg-slate-50/50 group">
              <div className="w-16 h-16 bg-brand-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-brand-blue-100 ring-4 ring-white transition-transform group-hover:scale-105">
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
                    <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 shadow-sm uppercase">
                      {user.name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Erişim Yetkisi
                    </label>
                    <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-brand-blue-600 shadow-sm uppercase">
                      {user.role}
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full mt-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
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
    </div>
  );
}
