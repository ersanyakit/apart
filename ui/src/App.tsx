"use client";
import roomCardStyles from "./components/RoomStatusCard.module.css";
import { bookingMatchesDay, bookingSearchText } from "./lib/booking-grid";
import { BookingDetails } from "./components/BookingDetails";
import { RoomCleaning } from "./components/RoomCleaning";
import { ReservationsWorkspace } from "./components/ReservationsWorkspace";
import { NavigationIcon } from "./components/NavigationIcon";
import { CheckoutFolio } from "./components/CheckoutFolio";
import { OperationReason,type ReasonOperation } from "./components/OperationReason";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  LayoutGrid,
  CalendarDays,
  Layers,
  Settings,
  Power,
  Plus,
  Search,
  RefreshCw,
  Users,
  DoorOpen,
  ArrowRightLeft,
  Pencil,
  Trash2,
  Menu,
  Map,
  X,
} from "lucide-react";
import {
  command,
  messageOf,
  contracts,
  localized,
  unitKinds,
  bookingStatuses,
  type Snapshot,
  type Selection,
  type APIRoom,
  type Booking,
  type Floor,
} from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import {
  Drawer,
  inputStyle,
  buttonStyle,
  secondaryStyle,
} from "./components/FormKit";
import {
  UnitForm,
  FloorForm,
  FacilityForm,
  BulkUnitForm,
} from "./components/AccommodationForms";
import {
  BookingForm,
  MoveBookingForm,
} from "./components/BookingForm";
import { FieldCard, FieldCaption, DateField, InlineSelectField } from "./components/fields";
import { useNotifications } from "./components/Toast";
import { SettingsEditor } from "./components/SettingsEditor";
import { HotelCalendar } from "./components/hotel-calendar/HotelCalendar";
import { FloorBoard } from "./components/FloorBoard";
import { confirmDialog } from "./components/ConfirmDialog";
import { ContextMenu } from "./components/ContextMenu";
import { StaffView } from "./components/StaffView";
import { BlacklistView } from "./components/BlacklistView";
import { GuestHistoryNavigation, type GuestHistoryTarget } from "./components/GuestHistoryNavigation";
import { GuestView } from "./components/GuestView";
import {
  DocumentTemplates,
} from "./components/DocumentsView";
import { InventoryView } from "./components/InventoryView";
import { REPORTS, REPORT_GROUPS, reportPageID, reportForPage, reportGroupForPage } from "./components/reports/navigation";
import { ReportGroupView } from "./components/reports/ReportGroupView";
import { ReportsView } from "./components/reports/ReportsView";
import { CustomerDetail } from "./components/reports/CustomerDetail";
import type { Customer } from "./components/reports/CustomerList";
import { PropertyView } from "./components/property-3d/PropertyView";
import { KanbanView } from "./components/kanban/KanbanView";
import { AuditView } from "./components/AuditView";
import { RoomStatusCard } from "./components/RoomStatusCard";
import { RoomStatusPicker } from "./components/RoomStatusPicker";
import { roomBoardState, roomMenuOperation } from "./lib/room-board";
import { roomView } from "./lib/adapters";
import { OriginalShell } from "./components/OriginalShell";
import { FeatureRegistryView } from "./components/FeatureRegistryView";
import { StaysScheduler } from "./components/stays-scheduler/StaysScheduler";
import { AppSettingsView } from "./components/AppSettingsView";
import { FontSizeProvider } from "./components/FontSize";
import { I18nProvider } from "./components/I18n";
import { PageHeader, PageHeaderProvider } from "./components/PageHeader";
import { UserPreferencesProvider, useUserPreferences } from "./components/UserPreferences";
import { ThemeProvider } from "./components/Theme";
import { CurrencyProvider } from "./components/Currency";
const date = (value: string) =>
  new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short",
  });
const normalize = (s: Snapshot): Snapshot => ({
  ...s,
  rooms: s.rooms || [],
  floors: s.floors || [],
  bookings: s.bookings || [],
  branches: s.branches || [],
  hotels: s.hotels || [],
  feature_registry: s.feature_registry || { categories: [], definitions: [] },
});
type Modal =
  | { type: "unit"; room?: APIRoom }
  | { type: "floor"; floor?: Floor }
  | { type: "booking"; booking?: Booking; roomId?: string; sale?: boolean }
  | { type: "guests"; booking: Booking }
  | { type: "folio"; booking: Booking }
  | { type: "documents"; booking: Booking; kind?: string }
  | { type: "move"; booking: Booking }
  | { type: "facility"; kind: "hotel" | "branch"; create?: boolean }
  | { type: "bulk" }
  | { type: "history"; booking: Booking };
const navigation = [
  { id: "property3d", label: "3 Boyutlu Görünüm", icon: Building2 },
  { id: "kanban", label: "Resepsiyon Notları", icon: Layers },
  ...REPORT_GROUPS.map(group=>({id:group.id,label:group.name,icon:Layers})),
  ...REPORTS.map(r=>({id:reportPageID(r.key),label:r.name,icon:Layers})),
  { id: "reports", label: "Yönetim özeti", icon: Layers },
  { id: "board", label: "Oda Durum Çizelgesi", icon: LayoutGrid },
  { id: "calendar", label: "Konaklama Takvimi", icon: CalendarDays },
  { id: "bookings", label: "Rezervasyonlar", icon: CalendarDays },
  { id: "bookings-list", label: "Ayrıntılı Rezervasyon Listesi", icon: CalendarDays },
  { id: "stays", label: "Konaklayan Listesi", icon: Users },
  { id: "units", label: "Kat ve Oda Tanımları", icon: DoorOpen },
  { id: "staff", label: "Personel Tanımları", icon: Users },
  { id: "blacklist", label: "Ortak Kara Liste", icon: Users },
  { id: "guests", label: "Misafir Arama ve Geçmiş", icon: Search },
  { id: "templates", label: "Belge Şablonları", icon: Settings },
  { id: "logs", label: "Sistem Logları", icon: Layers },
  { id: "facility", label: "Kurumsal Tesis Kartı", icon: Building2 },
  { id: "features", label: "Olanak Tanımları", icon: Settings },
  { id: "appsettings", label: "Ayarlar", icon: Settings },
];
const NAV_TAB_IDS = new Set(navigation.map((n) => n.id));

/** URL'deki ?tab= değerini doğrular; geçersizse null döner. */
function readTabFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const t = new URLSearchParams(window.location.search).get("tab");
    return t && NAV_TAB_IDS.has(t) ? t : null;
  } catch {
    return null;
  }
}
type AppProps = { initialData: Snapshot | null; initialTab?: string };
export default function App({ initialData, initialTab = "board" }: AppProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => initialData ? normalize(initialData) : null);
  const [sessionStart, setSessionStart] = useState({ tab: initialTab, register: false });
  const onLogin = async (selection?: Selection, register = false) => {
    const data = await command<Snapshot>("system.initial_sync", selection || {});
    setSessionStart({ tab: register ? "facility" : initialTab, register });
    setSnapshot(normalize(data));
  };
  return <UserPreferencesProvider key={snapshot?.user.user_id || "guest"} userId={snapshot?.user.user_id} initial={snapshot?.user.preferences}>
    <I18nProvider><AppContent snapshot={snapshot} setSnapshot={setSnapshot} initialTab={sessionStart.tab} startRegistration={sessionStart.register} onLogin={onLogin} /></I18nProvider>
  </UserPreferencesProvider>;
}
function AppContent({ snapshot, setSnapshot, initialTab, startRegistration, onLogin }: { snapshot: Snapshot | null; setSnapshot: React.Dispatch<React.SetStateAction<Snapshot | null>>; initialTab: string; startRegistration: boolean; onLogin: (selection?: Selection, register?: boolean) => Promise<void> }) {
  const notify = useNotifications();
  const preferences = useUserPreferences();
  const [tab, setTab] = useState(() => NAV_TAB_IDS.has(initialTab) ? initialTab : "board"),
    [sidebar, setSidebar] = useState(true),
    [checkout,setCheckout]=useState<Booking|null>(null),
    [reasonOperation,setReasonOperation]=useState<ReasonOperation|null>(null),
    [cleaningRoom,setCleaningRoom]=useState<APIRoom|null>(null),
    [modal, setModal] = useState<Modal | null>(() => startRegistration && snapshot ? { type: "facility", kind: "hotel", create: true } : null),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [floorId, setFloorId] = useState(""),
    [plan, setPlan] = useState(false),
    [kind, setKind] = useState(""),
    [dateFilter, setDateFilter] = useState(""),
    [bookingFilter, setBookingFilter] = useState(""),
    [dragged, setDragged] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    room: APIRoom;
    booking?: Booking;
  } | null>(null);
  // Rezervasyon sekmesi: oluşturma veya düzenleme formu üst barda sekme
  // olarak açılır (VSCode modeli — sekme değişiminde form durumu korunur).
  const [bookingTab, setBookingTab] = useState<
    { kind: "create"; roomId?: string } | { kind: "edit"; booking: Booking } | null
  >(null);
  const [guestHistoryTabs, setGuestHistoryTabs] = useState<Record<string, GuestHistoryTarget>>({});
  const [customerTabs, setCustomerTabs] = useState<Record<string, Customer>>({});
  const customerScope = `${snapshot?.hotel_id ?? ''}:${snapshot?.user.user_id ?? ''}:${snapshot?.user.role ?? ''}`;
  const customerScopeRef = React.useRef(customerScope);
  const mainRef = React.useRef<HTMLElement>(null);
  const pageScroll = React.useRef<Record<string, number>>({});
  React.useLayoutEffect(() => {
    mainRef.current?.scrollTo({top: pageScroll.current[tab] ?? 0});
  }, [tab]);
  // Üst bardaki açık sekmeler (kapatılabilir; board sabitlenir).
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const initial = NAV_TAB_IDS.has(initialTab) ? initialTab : "board";
    const base = ["board", "bookings", "stays"];
    return initial && !base.includes(initial) ? [...base, initial] : base;
  });
  React.useEffect(() => {
    if (customerScopeRef.current === customerScope) return;
    customerScopeRef.current = customerScope;
    setCustomerTabs({});
    pageScroll.current = {};
    setOpenTabs(previous => previous.filter(id => !id.startsWith("customer:")));
    setTab(previous => previous.startsWith("customer:") ? "report.guests.customers" : previous);
  }, [customerScope]);
  React.useLayoutEffect(() => {
    setGuestHistoryTabs({});
    setOpenTabs(previous => previous.filter(id => !id.startsWith("guest-history:")));
    setTab(previous => previous.startsWith("guest-history:") ? "guests" : previous);
  }, [customerScope, snapshot?.branch_id]);
  // Sekme ↔ URL eşitlemesi: yenileme/paylaşımda ekran korunur,
  // geri/ileri düğmeleri sekmeler arasında gezinir.
  const skipPush = React.useRef(false);
  const authenticated = snapshot !== null;
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!authenticated) {
      if (url.pathname !== "/login" || url.searchParams.has("tab")) {
        url.pathname = "/login";
        url.searchParams.delete("tab");
        window.history.replaceState(null, "", url);
      }
      return;
    }
    const enteringApp = url.pathname !== "/app";
    url.pathname = "/app";
    if (NAV_TAB_IDS.has(tab)) {
      if (!enteringApp && url.searchParams.get("tab") === tab) return;
      url.searchParams.set("tab", tab);
      if (enteringApp || skipPush.current) {
        skipPush.current = false;
        window.history.replaceState(null, "", url);
      } else {
        window.history.pushState({ tab }, "", url);
      }
    } else if (url.searchParams.has("tab")) {
      // Geçici sekmeler (rezervasyon açma/düzenleme) URL'ye yazılmaz.
      url.searchParams.delete("tab");
      window.history.replaceState(null, "", url);
    }
  }, [tab, authenticated]);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const t = readTabFromUrl();
      if (!t) return;
      skipPush.current = true;
      setOpenTabs((prev) => (prev.includes(t) ? prev : [...prev, t]));
      setTab(t);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const refresh = async (selection?: Selection) => {
    const data = await command<Snapshot>(
      "system.initial_sync",
      selection || {
        hotel_id: snapshot?.hotel_id,
        branch_id: snapshot?.branch_id,
      },
    );
    setSnapshot(normalize(data));
  };
  const saved = async () => {
    await refresh();
    setModal(null);
    notify("Değişiklikler kaydedildi.");
  };
  const run = async (
    task: () => Promise<void>,
    message = "İşlem tamamlandı.",
  ) => {
    setBusy(true);
    try {
      await task();
      notify(message);
    } catch (e) {
      notify(messageOf(e), "error");
    } finally {
      setBusy(false);
    }
  };
  if (!snapshot)
    return (
      <FontSizeProvider>
      <ThemeProvider>
      <CurrencyProvider>
      <LoginScreen onLogin={onLogin} />
      </CurrencyProvider>
      </ThemeProvider>
      </FontSizeProvider>
    );
  const s = snapshot,
    manager = ["admin", "management"].includes(s.user.role),
    operator = manager || s.user.role === "reception",
    housekeeping = operator || s.user.role === "housekeeping";
  const activeReportGroup = reportGroupForPage(tab);
  const branch = s.branches.find((b) => b.branch_id === s.branch_id),
    hotel = s.hotels.find((h) => h.hotel_id === s.hotel_id),
    atISO = dateFilter
      ? new Date(`${dateFilter}T12:00:00+03:00`).toISOString()
      : s.server_time;
  const roomStates = new globalThis.Map(s.rooms.map(room => [room.room_id, roomBoardState(s.rooms, s.bookings, room, s.server_time, dateFilter)]));
  const visibleRooms = s.rooms.filter(
    (r) =>
      r.rentable !== false &&
      (!floorId || r.floor_id === floorId) &&
      (!kind || r.kind === kind) &&
      `${r.code} ${r.type} ${unitKinds[r.kind]} ${(roomStates.get(r.room_id)?.bookings || []).map(b => [b.guest_name, ...(b.guests || []).map(g => g.name)].join(" ")).join(" ")}`
        .toLocaleLowerCase("tr")
        .includes(search.toLocaleLowerCase("tr")),
  );
  const leafRooms = s.rooms.filter(
      (r) => !s.rooms.some((c) => c.parent_id === r.room_id),
    ),
    totalCapacity = leafRooms.filter((r) => r.kind === "bed").reduce((sum, r) => sum + r.capacity, 0),
    capacityInUse = leafRooms.filter((r) => r.kind === "bed")
      .filter((r) => (dateFilter ? roomStates.get(r.room_id)!.bookings : roomStates.get(r.room_id)!.current).length > 0)
      .reduce((sum, r) => sum + r.capacity, 0);
  const matchingBookings = s.bookings
    .filter(
      (b) =>
        (tab !== "stays" || b.status === "checked_in") &&
        (!bookingFilter || b.status === bookingFilter) &&
        bookingSearchText(b,s.rooms.find(room=>room.room_id===b.room_id)?.code||'')
          .includes(search.toLocaleLowerCase("tr")),
    )
    // En son eklenen en üstte (kayıt tarihi yoksa giriş tarihine düşer).
    .sort((a, b) => {
      const ts = (x: Booking) => Date.parse(x.created_at || x.check_in) || 0;
      return ts(b) - ts(a);
    });
  const bookings = matchingBookings.filter(b => bookingMatchesDay(b, dateFilter, s.server_time));
  const changeBranch = (selection: Selection) =>
    void run(async () => {
      await refresh(selection);
      setFloorId("");
      setModal(null);
      setSearch("");
    }, "Tesis seçildi.");
  const transition = (b: Booking, action: string) => {
    if(action==="check_out"){setModal(null);setCheckout(b);return}
    if(action==="cancel"){setReasonOperation({kind:"cancel",booking:b});return}
    void run(async () => { await command("booking.transition", {branch_id:b.branch_id,booking_id:b.booking_id,action});await refresh();});
  };
  const changeRoomState=(room:APIRoom,status:string)=>{
    if(status==="Temiz"){setCleaningRoom(room);return}
    if(status==="Tadilat"||status==="Arizali"){setReasonOperation({kind:"state",room,status});return}
    void run(async()=>{await command("room.state",{room_id:room.room_id,status});await refresh()});
  };
  const remove = async (type: "room" | "floor", id: string) => {
    if (
      await confirmDialog(
        "Bu kaydı silmek istiyor musunuz? Kullanımdaki kayıtlar silinemez.",
      )
    )
      void run(async () => {
        await command(`${type}.delete`, { id });
        await refresh();
      });
  };
  const title = navigation.find((n) => n.id === tab)?.label || "";
  const removeBranch = async (id: string, name: string) => {
    if (
      !(await confirmDialog(
        `"${name}" arşive kaldırılsın mı? Kayıtlar fiziksel olarak silinmez, geçmiş korunur.`,
      ))
    )
      return;
    await run(async () => {
      await command("branch.delete", { id });
      const remaining = s.branches.filter((b) => b.branch_id !== id);
      await refresh();
      if (s.branch_id === id) {
        await changeBranch({
          hotel_id: s.hotel_id,
          branch_id: remaining[0]?.branch_id ?? "",
        });
      }
    }, "Tesis arşive kaldırıldı.");
  };
  const handleLogout = () =>
    void run(async () => {
      await preferences?.flush();
      await command("auth.logout");
      setSnapshot(null);
      setModal(null);
    });
  const bookingTabId = bookingTab
    ? bookingTab.kind === "create"
      ? "newbooking"
      : `booking:${bookingTab.booking.booking_id}`
    : null;
  const bookingTabLabel = !bookingTab
    ? ""
    : bookingTab.kind === "create"
      ? "Yeni Rezervasyon"
      : bookingTab.booking.guest_name || "Rezervasyon";
  const isBookingTab = bookingTabId !== null && tab === bookingTabId;
  const openBookingEdit = (booking: Booking) => {
    setBookingTab({ kind: "edit", booking: s.bookings.find(item => item.booking_id === booking.booking_id) || booking });
    activateTab(`booking:${booking.booking_id}`);
  };
  const activateTab = (next: string) => {
    setModal(null);
    setOpenTabs((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setTab(next);
    setSearch("");
  };
  const openCustomer = (customer: Customer) => {
    if (!manager) return;
    const id = `customer:${customer.guest_id}`;
    setCustomerTabs(previous => ({...previous, [id]: customer}));
    activateTab(id);
  };
  const openGuestHistory = (guest: GuestHistoryTarget) => {
    const id = `guest-history:${guest.id}`;
    setGuestHistoryTabs(previous => ({...previous, [id]: guest}));
    activateTab(id);
  };
  const closeTab = (id: string) => {
    if (id === "board") return;
    if (bookingTabId && id === bookingTabId) setBookingTab(null);
    if (id.startsWith("guest-history:")) {
      setGuestHistoryTabs(previous => { const next = {...previous}; delete next[id]; return next; });
      delete pageScroll.current[id];
    }
    if (id.startsWith("customer:")) {
      setCustomerTabs(previous => { const next = {...previous}; delete next[id]; return next; });
      delete pageScroll.current[id];
    }
    if (tab === id) {
      setModal(null);
      const rest = openTabs.filter((t) => t !== id);
      const idx = openTabs.indexOf(id);
      const fallback = id.startsWith("customer:") && rest.includes("report.guests.customers") ? "report.guests.customers" : rest[Math.min(idx, rest.length - 1)] ?? "board";
      setTab(fallback);
      setSearch("");
    }
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t !== id);
      return next.length ? next : ["board"];
    });
  };
  const detailModal = modal && (modal.type === "history" || modal.type === "folio" || modal.type === "documents" || modal.type === "guests") ? modal : null;
  const settingsEditorOpen = !!modal && ["unit", "floor", "facility", "bulk"].includes(modal.type);
  const editorTitle = modal ? {
    unit: "Birim Tanımı", floor: "Kat Tanımı", booking: modal.type === "booking" && modal.sale ? "Yeni Konaklama" : "Rezervasyon", move: "Birim Değişikliği",
    facility: "Tesis Bilgileri", bulk: "Toplu Birim Tanımı", history: "Rezervasyon Geçmişi",
    guests: "Konaklama Misafirleri", folio: "Oda Folyosu", documents: "Sözleşme ve Dekontlar",
  }[modal.type] : "";
  const editorContent = modal && (<>
          {modal.type === "unit" ? (
            <UnitForm snapshot={s} room={modal.room} onSaved={saved} />
          ) : modal.type === "floor" ? (
            <FloorForm
              branchId={s.branch_id}
              floor={modal.floor}
              onSaved={saved}
            />
          ) : modal.type === "booking" ? (
            <BookingForm
              snapshot={s}
              booking={modal.booking}
              roomId={modal.roomId}
              checkInAfterSave={modal.sale}
              onSaved={saved}
            />
          ) : modal.type === "move" ? (
            <MoveBookingForm
              snapshot={s}
              booking={modal.booking}
              onSaved={saved}
            />
          ) : modal.type === "facility" ? (
            <FacilityForm
              snapshot={s}
              kind={modal.kind}
              create={modal.create}
              onSaved={saved}
            />
          ) : modal.type === "bulk" ? (
            <BulkUnitForm snapshot={s} onSaved={saved} />
          ) : (
            null
          )}
  </>);
  const pageActions = (
    <div className="flex gap-2">
      <button
        aria-label="Yenile"
        disabled={busy}
        className={`uni-control ${secondaryStyle}`}
        onClick={() => void run(() => refresh(), "Kayıtlar güncellendi.")}
      >
        <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
      </button>
      {operator && s.branch_id && (
        <button
          className={`uni-control ${buttonStyle}`}
          onClick={() => setModal({ type: "booking" })}
        >
          <Plus size={16} />
          Rezervasyon Al
        </button>
      )}
    </div>
  );
  const menuOperation = roomMenuOperation(contextMenu?.booking, s.server_time);
  const menuRoomOccupied = !!contextMenu && !!roomStates.get(contextMenu.room.room_id)?.current.length;
  return (
    <FontSizeProvider>
    <ThemeProvider>
    <CurrencyProvider>
    <PageHeaderProvider value={{ propertyName: branch?.name || hotel?.name, actions: ["board", "calendar", "bookings", "bookings-list", "stays", "units", "facility", "features"].includes(tab) ? pageActions : undefined }}>
    <GuestHistoryNavigation.Provider value={openGuestHistory}>
    <OriginalShell
      snapshot={s}
      activeTab={tab}
      setActiveTab={activateTab}
      openTabs={openTabs}
      onCloseTab={closeTab}
      extraLabels={{...Object.fromEntries(Object.entries(guestHistoryTabs).map(([id, guest]) => [id, `${guest.name} · Geçmiş`])),...(bookingTab ? { [bookingTabId as string]: bookingTabLabel } : {}), ...Object.fromEntries(Object.entries(customerTabs).map(([id, customer]) => [id, customer.name || "Müşteri detayı"]))}}
      onSelection={changeBranch}
      onLogout={handleLogout}
      onNewBooking={operator ? () => setModal({ type: "booking" }) : undefined}
      at={atISO}
      onDate={(d) =>
        setDateFilter(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        )
      }
    >
      <main ref={mainRef} onScroll={event => { pageScroll.current[tab] = event.currentTarget.scrollTop; }} tabIndex={0} aria-label="Sayfa içeriği" className={tab === "property3d" && !settingsEditorOpen ? "flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden" : "flex-1 min-w-0 overflow-y-auto p-4 md:p-7 space-y-6"}>
        {settingsEditorOpen && <SettingsEditor icon={modal?.type === "folio" ? <NavigationIcon name="folio"/> : undefined} title={editorTitle} description={modal?.type === "documents" ? "Belge türünü seçin, metni kontrol edin ve çıktınızı oluşturun." : modal?.type === "folio" ? "Hizmetleri kalem kalem ekleyin; borç, tahsilat ve bakiyeyi takip edin." : undefined} onClose={() => setModal(null)}>{editorContent}</SettingsEditor>}
        <div hidden={settingsEditorOpen} className={tab === "property3d" && !settingsEditorOpen ? "app-page-content flex flex-1 min-h-0 min-w-0 overflow-hidden" : "app-page-content space-y-6"}>
        <AnimatePresence>
          {bookingTab && bookingTabId && (
            <motion.section
              key={bookingTabId}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              aria-label={bookingTabLabel}
              ref={(node) => {
                node?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={tab === bookingTabId ? "block" : "hidden"}
            >
              <div className="mx-auto w-full max-w-[720px] space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-uninav-book text-[2.25rem] leading-[2.5rem] tracking-[-0.01em] text-slate-900">
                    {bookingTab.kind === "create" ? "Yeni Rezervasyon" : "Rezervasyonu Düzenle"}
                  </h2>
                  <p className="mt-2 text-[0.875rem] leading-5 text-slate-500">
                    {bookingTab.kind === "create"
                      ? bookingTab.roomId
                        ? `${s.rooms.find((r) => r.room_id === bookingTab.roomId)?.code ?? ""} birimi için tarih, misafir ve ödeme öncesi bilgileri girin.`
                        : "Tarih, birim ve misafir bilgilerini girin."
                      : `${bookingTab.booking.guest_name} kaydını güncelleyin.`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Sekmeyi kapat"
                  onClick={() => bookingTabId && closeTab(bookingTabId)}
                  className="uni-control flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 outline-none transition-all duration-150 ease-out hover:bg-slate-200 hover:text-slate-900 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-brand-blue-500/40"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
                {bookingTab.kind === "create" ? (
                  <BookingForm
                    snapshot={s}
                    roomId={bookingTab.roomId}
                    onSaved={async () => {
                      closeTab(bookingTabId);
                      await saved();
                    }}
                  />
                ) : (
                  <BookingForm
                    snapshot={s}
                    key={`${bookingTab.booking.booking_id}:${bookingTab.booking.updated_at || ""}`}
                    booking={bookingTab.booking}
                    onSaved={async () => {
                      closeTab(bookingTabId);
                      await saved();
                    }}
                  />
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        {["board", "bookings", "bookings-list"].includes(tab) && (
          <>
            <PageHeader pageId={tab === "board" ? "board" : tab === "bookings-list" ? "bookings-list" : "bookings"} actions={tab !== "board" && (housekeeping||["technical","maintenance"].includes(s.user.role))?<button type="button" className={`${secondaryStyle} !rounded-full`} onClick={()=>setReasonOperation({kind:"issue",rooms:s.rooms})}>Arıza bildir</button>:undefined}>
            <div className="flex flex-wrap items-stretch gap-3">
              <FieldCard className="w-full lg:w-auto lg:flex-[2] lg:min-w-64">
                <label className="block min-w-0 cursor-text">
                  <FieldCaption>Ara</FieldCaption>
                  <span className="mt-1 flex items-center gap-2">
                    <Search size={16} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-slate-400" />
                    <input
                      aria-label="Kayıtlarda ara"
                      placeholder="Birim veya misafir ara…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="font-uninav-book w-full min-w-0 bg-transparent text-[1.125rem] leading-7 text-slate-900 outline-none placeholder:text-slate-400 placeholder:text-base"
                    />
                    {search && (
                      <button
                        type="button"
                        aria-label="Aramayı temizle"
                        onClick={() => setSearch("")}
                        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:bg-slate-200/60 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        <X size={14} strokeWidth={2.5} aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </label>
              </FieldCard>
              {["board", "units"].includes(tab) ? (
                <>
                  <div className="min-w-36 flex-1">
                    <InlineSelectField
                      label="Kat"
                      value={floorId}
                      onChange={(v) => {
                        setFloorId(v);
                        if (!v) setPlan(false);
                      }}
                      options={[
                        { value: "", label: "Tüm katlar" },
                        ...s.floors.map((f) => ({
                          value: f.floor_id,
                          label: localized(f.label) || f.code,
                        })),
                      ]}
                    />
                  </div>
                  <div className="min-w-36 flex-1">
                    <InlineSelectField
                      label="Birim türü"
                      value={kind}
                      onChange={(v) => setKind(v)}
                      options={[
                        { value: "", label: "Tüm birimler" },
                        ...Object.entries(unitKinds).map(([v, l]) => ({
                          value: v,
                          label: l,
                        })),
                      ]}
                    />
                  </div>
                </>
              ) : (
                <div className="min-w-36 flex-1">
                  <InlineSelectField
                    label="Durum"
                    value={bookingFilter}
                    onChange={(v) => setBookingFilter(v)}
                    options={[
                      { value: "", label: "Tüm durumlar" },
                      ...Object.entries(bookingStatuses).map(([v, l]) => ({
                        value: v,
                        label: l,
                      })),
                    ]}
                  />
                </div>
              )}
              {tab !== "units" && (
                <div className="min-w-40 flex-1">
                  <DateField
                    label="Tarih"
                    value={dateFilter}
                    onChange={(v) => setDateFilter(v)}
                    withTime={false}
                  />
                </div>
              )}
            </div>
            </PageHeader>
            {tab === "board" && <div className={roomCardStyles.summaryStats}>
              {[
                { label: "TANIMLI BİRİM", value: s.rooms.length },
                { label: "TANIMLI YATAK KAPASİTESİ", value: totalCapacity },
                { label: "AYRILMIŞ YATAK KAPASİTESİ", value: capacityInUse },
                {
                  label: "AKTİF KONAKLAMA",
                  value: s.bookings.filter((b) => b.status === "checked_in")
                    .length,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={roomCardStyles.summaryStat}
                >
                  <span className="font-uninav-book text-xs font-medium uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </span>
                  <p className="font-uninav-book mt-3 text-3xl leading-none tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>}
          </>
        )}
        {tab === "board" && (
          <>
            <div className="flex flex-wrap justify-between gap-3">
              <p className="font-uninav-book text-[0.875rem] leading-5 text-slate-500">
                {dateFilter ? `${dateFilter} · Günün tamamı` : "Şu an"} ·{" "}
                {visibleRooms.length} birim
              </p>
              <button
                disabled={!floorId}
                className={`uni-control ${secondaryStyle}`}
                onClick={() => setPlan(!plan)}
              >
                <Map size={15} />
                {plan ? "Kart Görünümü" : "Kat Planı"}
              </button>
            </div>
            {plan && floorId ? (
              <FloorBoard
                snapshot={s}
                floorId={floorId}
                at={atISO}
                day={dateFilter}
                onOpenBooking={booking => setModal({ type: "history", booking })}
                onBook={(room) =>
                  setModal({ type: "booking", roomId: room.room_id })
                }
                onRefresh={refresh}
                canManage={manager}
              />
            ) : (
              <div className="room-status-grid">
                {visibleRooms.map((room) => {
                  const state = roomStates.get(room.room_id)!;
                  const active = state.bookings[0];
                  const checkedInNow = state.current.filter(booking => booking.status === "checked_in");
                  const folioBooking = checkedInNow.length === 1 ? checkedInNow[0] : undefined;
                  return (
                    <div id={"unit-" + room.room_id} key={room.room_id}>
                      <RoomStatusCard
                        room={room}
                        state={state}
                        now={s.server_time}
                        day={dateFilter}
                        floorName={localized(s.floors.find(f => f.floor_id === room.floor_id)?.label) || s.floors.find(f => f.floor_id === room.floor_id)?.code}
                        busy={busy}
                        onOpenBooking={booking => setModal({ type: "history", booking })}
                        onTransition={operator ? async (booking, action) => {
                          transition(booking, action);
                        } : undefined}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            x: Math.max(
                              8,
                              Math.min(e.clientX, window.innerWidth - 430),
                            ),
                            y: Math.max(
                              8,
                              Math.min(e.clientY, window.innerHeight - 520),
                            ),
                            room,
                            booking: active,
                          });
                        }}
                        onDragStart={operator && !dateFilter && state.current.length === 1 ? setDragged : undefined}
                        onDrop={
                          operator && !dateFilter
                            ? async (target) => {
                                const sourceBooking = roomStates.get(dragged || "")?.current.find(b => b.room_id === dragged);
                                const targetBooking = roomStates.get(target)?.current.find(b => b.room_id === target);
                                if (!sourceBooking || dragged === target) {
                                  setDragged(null);
                                  return;
                                }
                                if (
                                  await confirmDialog(
                                    "Seçilen konaklamanın birimi değiştirilsin mi?",
                                  )
                                )
                                  void run(async () => {
                                    await command("booking.transition", {
                                      branch_id: s.branch_id,
                                      booking_id: sourceBooking.booking_id,
                                      action: targetBooking ? "swap" : "move",
                                      ...(targetBooking
                                        ? {
                                            other_booking_id:
                                              targetBooking.booking_id,
                                          }
                                        : { target_id: target }),
                                    });
                                    await refresh();
                                  });
                                setDragged(null);
                              }
                            : undefined
                        }
                      >
                        {operator && folioBooking && <button className={`uni-control ${secondaryStyle}`} onClick={()=>setModal({type:"folio",booking:folioBooking})}><NavigationIcon name="folio" size={18}/>Folyo</button>}
                        {operator && room.rentable && !active && (
                          <button
                            className={`uni-control ${secondaryStyle}`}
                            onClick={() =>
                              setModal({ type: "booking", roomId: room.room_id })
                            }
                          >
                            <Plus size={12} />
                            Rezervasyon
                          </button>
                        )}
                        {housekeeping && !state.current.length && (
                          <RoomStatusPicker
                            roomCode={room.code}
                            status={state.operationalStatus}
                            canSetAdvanced={operator}
                            onPick={status=>changeRoomState(room,status)}
                          />
                        )}
                      </RoomStatusCard>
                    </div>
                  );
                })}
              </div>
            )}
            {!visibleRooms.length && (
              <Empty
                onClick={manager ? () => setModal({ type: "unit" }) : undefined}
                label="Henüz görüntülenecek birim yok. Önce kat ve birimlerinizi tanımlayın."
              />
            )}
          </>
        )}
        {tab === "units" && (
          <InventoryView
            key={s.branch_id}
            snapshot={s}
            onRefresh={refresh}
            onUnit={(room) => setModal({ type: "unit", room })}
            onFloor={(floor) => setModal({ type: "floor", floor })}
            onBulk={() => setModal({ type: "bulk" })}
            onBook={(room) =>
              setModal({ type: "booking", roomId: room.room_id })
            }
          />
        )}
        {tab === "staff" && <StaffView key={s.hotel_id} snapshot={s} />}
        {checkout&&<CheckoutFolio booking={checkout} onClose={()=>setCheckout(null)} onSaved={async()=>{await refresh();notify("Çıkış tamamlandı.")}}/>}
        {cleaningRoom&&<RoomCleaning room={cleaningRoom} onClose={()=>setCleaningRoom(null)} onSaved={async()=>{await refresh();notify("Temizlik kaydedildi; oda Temiz olarak güncellendi.")}}/>}
        {reasonOperation&&<OperationReason operation={reasonOperation} onClose={()=>setReasonOperation(null)} onSaved={async()=>{await refresh();notify("İşlem gerekçesiyle kaydedildi.")}}/>}
        {openTabs.includes("guests") && <div hidden={tab !== "guests"}><GuestView key={`${s.hotel_id}-${s.branch_id}`} snapshot={s} /></div>}
        {Object.entries(guestHistoryTabs).map(([id, guest]) => <section key={`${s.hotel_id}-${s.branch_id}-${id}`} hidden={tab !== id} aria-label={`${guest.name} · Konaklama geçmişi`}>
          <GuestView snapshot={s} guestId={guest.id} guestName={guest.name} onBack={()=>activateTab("guests")}/>
        </section>)}
        {tab === "blacklist" && <BlacklistView snapshot={s} onGuests={()=>activateTab("guests")} />}
        {tab === "templates" && <DocumentTemplates snapshot={s} />}
        {tab === "calendar" && <HotelCalendar key={s.branch_id} bookings={s.bookings} rooms={s.rooms}
          propertyName={s.branches.find(b => b.branch_id === s.branch_id)?.name || s.hotels.find(h => h.hotel_id === s.hotel_id)?.name || "Otel"}
          headerActions={pageActions}
          onOpenBooking={booking => setModal({type:"history",booking})} />}
        {activeReportGroup?.id === tab && (manager
          ? <ReportGroupView group={activeReportGroup} onSelect={activateTab} />
          : <p>Raporlama yalnızca işletme yöneticilerine açıktır.</p>)}
        {manager && (reportForPage(tab) || tab === "reports") && activeReportGroup && <button
          type="button" className="uni-control inline-flex min-h-11 items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 text-sm font-medium"
          onClick={() => activateTab(activeReportGroup.id)}>
          <span aria-hidden="true">←</span> {activeReportGroup.name} raporlarına dön
        </button>}
        {openTabs.includes("report.guests.customers") && <div hidden={tab !== "report.guests.customers"}>
          <ReportsView key={`${customerScope}-customers`} snapshot={s} reportKey="guests.customers" onOpenCustomer={openCustomer}/>
        </div>}
        {manager && customerScopeRef.current === customerScope && Object.entries(customerTabs).map(([id, customer]) => <section key={`${customerScope}-${id}`} hidden={tab !== id} aria-label={`${customer.name} · Müşteri detayı`}>
          <CustomerDetail snapshot={s} customer={customer} onClose={() => activateTab("report.guests.customers")}/>
        </section>)}
        {tab !== "report.guests.customers" && (tab === "reports" || reportForPage(tab)) && <ReportsView key={`${s.hotel_id}-${tab}`} snapshot={s} reportKey={reportForPage(tab)?.key ?? "management.dashboard"} onOpenCustomer={openCustomer} />}
        {tab === "property3d" && <PropertyView key={`${s.hotel_id}:${s.branch_id}`} snapshot={s}
          onOpenBooking={booking => setModal({type:"history",booking})}
          onBook={operator ? room => setModal({ type: "booking", roomId: room.room_id }) : undefined}
          onDefinitions={manager ? () => activateTab("units") : undefined} />}
        {tab === "kanban" && <KanbanView snapshot={s}/>}
        {tab === "logs" && <AuditView hotelId={s.hotel_id} />}
        {tab === "stays" && (
          <StaysScheduler key={s.branch_id} rooms={s.rooms} floors={s.floors} bookings={s.bookings}
            serverTime={s.server_time} busy={busy}
            onDetails={booking => setModal({ type: "history", booking })}
            onEdit={operator ? openBookingEdit : undefined}
            onMove={operator ? booking => setModal({ type: "move", booking }) : undefined}
            onCheckOut={operator ? async booking => {
              transition(booking, "check_out");
            } : undefined} />
        )}
        {["bookings", "bookings-list"].includes(tab) && <ReservationsWorkspace list={tab === "bookings-list"} onOpenList={()=>activateTab("bookings-list")} timelineBookings={matchingBookings} floors={s.floors} anchorDay={dateFilter} cancelledOnly={bookingFilter === "cancelled"} bookings={bookings} rooms={s.rooms} serverTime={s.server_time} busy={busy} canOperate={operator}
          onDetails={booking=>setModal({type:"history",booking})} onGuest={openGuestHistory} onEdit={openBookingEdit}
          onMove={booking=>setModal({type:"move",booking})} onTransition={transition}
          onContextMenu={(event,booking)=>{const room=s.rooms.find(room=>room.room_id===booking.room_id);if(!room)return;event.preventDefault();setContextMenu({x:Math.max(8,Math.min(event.clientX,window.innerWidth-430)),y:Math.max(8,Math.min(event.clientY,window.innerHeight-520)),room,booking});}}/>}
        {tab === "facility" && (
          <>
            <PageHeader pageId="facility" actions={
            <div className="flex gap-2">
              {s.user.role === "admin" && (
                <button
                  className={`uni-control ${buttonStyle}`}
                  onClick={() =>
                    setModal({ type: "facility", kind: "hotel", create: true })
                  }
                >
                  Otel Ekle
                </button>
              )}
              <button
                className={`uni-control ${secondaryStyle}`}
                disabled={!s.hotel_id}
                onClick={() =>
                  setModal({ type: "facility", kind: "branch", create: true })
                }
              >
                Tesis / Şube Ekle
              </button>
            </div>
            } />
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { kind: "hotel" as const, data: hotel },
                { kind: "branch" as const, data: branch },
              ].map(
                ({ kind, data }) =>
                  data && (
                    <article
                      key={kind}
                      className="uni-card rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
                    >
                      <span className="text-[10px] font-black text-brand-blue-600 uppercase">
                        {kind === "hotel" ? "Otel" : "Tesis / Şube"}
                      </span>
                      <h3 className="text-xl font-black">{data.name}</h3>
                      <p className="text-sm text-slate-500">{data.address}</p>
                      <p className="text-sm text-slate-400">
                        {localized(data.description)}
                      </p>
                      <div className="flex gap-2 overflow-x-auto">
                        {(data.assets || []).map((a, i) =>
                          a.kind === "image" ? (
                            <img
                              key={i}
                              alt={localized(a.alt_text)}
                              src={a.url}
                              className="h-24 rounded-xl"
                            />
                          ) : (
                            <video
                              key={i}
                              src={a.url}
                              controls
                              className="h-24 rounded-xl"
                            />
                          ),
                        )}
                      </div>
                      <button
                        className={`uni-control ${secondaryStyle}`}
                        onClick={() => setModal({ type: "facility", kind })}
                      >
                        Bilgileri ve Medyayı Düzenle
                      </button>
                    </article>
                  ),
              )}
            </div>
            {s.branches.length > 0 && (
              <div className="uni-card rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-500">
                  Tesisler · {s.branches.length}
                </h4>
                {s.branches.map((b) => (
                  <div
                    key={b.branch_id}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {b.name}
                        {b.branch_id === s.branch_id && (
                          <span className="ml-2 rounded-full bg-brand-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-brand-blue-700">
                            Aktif
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-400">{b.address}</p>
                    </div>
                    {manager && (
                      <button
                        type="button"
                        aria-label={`${b.name} tesisini arşive kaldır`}
                        title="Arşive kaldır"
                        className="uni-control flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 outline-none transition-all duration-150 ease-out hover:bg-red-50 hover:text-red-500 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-neutral-400"
                        onClick={() => b.branch_id && void removeBranch(b.branch_id, b.name)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-[11px] leading-5 text-slate-400">
                  Silinen tesis arşive kaldırılır; kayıtlar fiziksel olarak silinmez,
                  geçmiş korunur. Aktif veya yaklaşan konaklaması olan tesis kaldırılamaz.
                </p>
              </div>
            )}
          </>
        )}
        {tab === "features" && (
          <FeatureRegistryView key={s.hotel_id} snapshot={s} onRefresh={refresh} />
        )}
        {tab === "appsettings" && (
          <AppSettingsView
            userName={s.user.displayname || s.user.username}
            userRole={s.user.role}
            onLogout={handleLogout}
          />
        )}
        </div>
      </main>
      {detailModal && <BookingDetails key={`${detailModal.booking.booking_id}-${detailModal.type}`}
        booking={s.bookings.find(booking=>booking.booking_id===detailModal.booking.booking_id) || detailModal.booking}
        snapshot={s} initialDocumentKind={detailModal.type === "documents" ? detailModal.kind : undefined} initialTab={detailModal.type === "history" ? "overview" : detailModal.type}
        onClose={()=>setModal(null)} onRefresh={refresh}
        onEdit={operator?openBookingEdit:undefined}
        onMove={operator?booking=>setModal({type:"move",booking}):undefined}
        onTransition={operator?(booking,action)=>{setModal(null);transition(booking,action)}:undefined}/>}
      {modal && !settingsEditorOpen && !detailModal && (
        <Drawer
          title={editorTitle}
          onClose={() => setModal(null)}
          layout={["history", "guests", "move", "booking"].includes(modal.type) ? "center" : "side"}
        >
          {editorContent}
        </Drawer>
      )}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <ContextMenu
            saleLabel={menuOperation === "check_in" ? (Date.parse(contextMenu.booking!.check_in) > Date.parse(s.server_time) ? "Rezervasyona erken giriş yap" : "Rezervasyona giriş yap") : menuOperation === "receipt" ? "Satış belgeleri" : "Yeni konaklama başlat"}
            saleDisabled={!operator || (menuOperation === "create" && menuRoomOccupied)}
            canCheckOut={operator && contextMenu.booking?.status === "checked_in"}
            canExchange={operator && !!contextMenu.booking && ["confirmed", "checked_in"].includes(contextMenu.booking.status)}
            bookingHint={contextMenu.booking?.status === "confirmed" ? `Planlanan: ${date(contextMenu.booking.check_in)} – ${date(contextMenu.booking.check_out)}. Erken girişte oda müsaitliği kontrol edilir.` : undefined}
            onEditBooking={operator && contextMenu.booking && ["confirmed", "checked_in"].includes(contextMenu.booking.status) ? () => openBookingEdit(contextMenu.booking!) : undefined}
            x={contextMenu.x}
            y={contextMenu.y}
            room={{
              ...roomView(contextMenu.room, s.feature_registry),
              status:
                contextMenu.booking?.status === "confirmed"
                  ? "Rezervli"
                  : contextMenu.booking?.status === "checked_in"
                    ? "Dolu"
                    : (contextMenu.room.status as import("./types").RoomStatus),
            }}
            onClose={() => setContextMenu(null)}
            onOperation={(type) => {
              const b = contextMenu.booking;
              if (type === "reserve") {
                setContextMenu(null);
                setModal({ type: "booking", roomId: contextMenu.room.room_id });
              } else if (type === "sale") {
                if (!operator || (menuOperation === "create" && menuRoomOccupied)) return;
                if (b && menuOperation === "check_in") transition(b, "check_in");
                else if (b && menuOperation === "receipt")
                  setModal({
                    type: "documents",
                    booking: b,
                    kind: "sale_receipt",
                  });
                else
                  setModal({
                    type: "booking",
                    roomId: contextMenu.room.room_id,
                    sale: true,
                  });
              } else if (type === "exchange" && operator && b && ["confirmed", "checked_in"].includes(b.status))
                setModal({ type: "move", booking: b });
              else if (type === "checkout" && operator && b?.status === "checked_in")
                transition(b,"check_out");
            }}
            onStatusChange={status=>changeRoomState(contextMenu.room,status)}
            onPrint={(type) => {
              const b = contextMenu.booking;
              if (!b) {
                notify(contracts.errors.booking_required, "error");
                return;
              }
              setModal({
                type: "documents",
                booking: b,
                kind: {
                  sales: "sale_receipt",
                  reservation: "reservation_receipt",
                  cancellation: "cancellation_receipt",
                  rental: "rental_contract",
                  sale_contract: "sale_contract",
                }[type],
              });
            }}
            onGuests={
              contextMenu.booking
                ? () =>
                    setModal({ type: "guests", booking: contextMenu.booking! })
                : undefined
            }
            onCancel={
              contextMenu.booking
                ? () => {
                    const b = contextMenu.booking!;
                    transition(b, "cancel");
                  }
                : undefined
            }
            onDelete={
              manager
                ? () => void remove("room", contextMenu.room.room_id)
                : undefined
            }
          />
        </>
      )}
    </OriginalShell>
    </GuestHistoryNavigation.Provider>
    </PageHeaderProvider>
    </CurrencyProvider>
    </ThemeProvider>
    </FontSizeProvider>
  );
}
function Empty({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
      <Building2 className="mx-auto text-slate-300" size={36} />
      <p className="text-sm text-slate-400">{label}</p>
      {onClick && (
        <button className={`uni-control ${buttonStyle}`} onClick={onClick}>
          <Plus size={15} />
          Yeni Kayıt
        </button>
      )}
    </div>
  );
}
function Table({
  headings,
  children,
}: {
  headings: string[];
  children: React.ReactNode;
}) {
  return (
    <div tabIndex={0} role="region" aria-label="Kayıt tablosu; yatay kaydırılabilir" className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
          <tr>
            {headings.map((h) => (
              <th key={h} className="p-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
