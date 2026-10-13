"use client";
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
  Check,
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
  occupancy,
  type Snapshot,
  type Selection,
  type APIRoom,
  type Booking,
  type Floor,
} from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import {
  Drawer,
  ErrorMessage,
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
  BookingGuestsForm,
} from "./components/BookingForm";
import { FloorBoard } from "./components/FloorBoard";
import { confirmDialog } from "./components/ConfirmDialog";
import { ContextMenu } from "./components/ContextMenu";
import { StaffView } from "./components/StaffView";
import { GuestView } from "./components/GuestView";
import {
  DocumentTemplates,
  BookingDocuments,
} from "./components/DocumentsView";
import { InventoryView } from "./components/InventoryView";
import { AuditView } from "./components/AuditView";
import { RoomCard } from "./components/RoomCard";
import { roomView } from "./lib/adapters";
import { OriginalShell } from "./components/OriginalShell";
import { FeatureRegistryView } from "./components/FeatureRegistryView";
import { AppSettingsView } from "./components/AppSettingsView";
import { FontSizeProvider } from "./components/FontSize";
import { ThemeProvider } from "./components/Theme";
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
  | { type: "documents"; booking: Booking; kind?: string }
  | { type: "move"; booking: Booking }
  | { type: "facility"; kind: "hotel" | "branch"; create?: boolean }
  | { type: "bulk" }
  | { type: "history"; booking: Booking };
const navigation = [
  { id: "board", label: "Oda Durum Çizelgesi", icon: LayoutGrid },
  { id: "bookings", label: "Rezervasyonlar", icon: CalendarDays },
  { id: "stays", label: "Konaklayan Listesi", icon: Users },
  { id: "units", label: "Kat ve Oda Tanımları", icon: DoorOpen },
  { id: "staff", label: "Personel Tanımları", icon: Users },
  { id: "guests", label: "Misafir Arama ve Geçmiş", icon: Search },
  { id: "templates", label: "Belge Şablonları", icon: Settings },
  { id: "logs", label: "Sistem Logları", icon: Layers },
  { id: "facility", label: "Kurumsal Tesis Kartı", icon: Building2 },
  { id: "features", label: "Olanak Tanımları", icon: Settings },
  { id: "appsettings", label: "Ayarlar", icon: Settings },
];
export default function App({ initialData }: { initialData: Snapshot | null }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(
      initialData ? normalize(initialData) : null,
    ),
    [tab, setTab] = useState("board"),
    [sidebar, setSidebar] = useState(true),
    [modal, setModal] = useState<Modal | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
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
  // Üst bardaki açık sekmeler (kapatılabilir; board sabitlenir).
  const [openTabs, setOpenTabs] = useState<string[]>([
    "board",
    "bookings",
    "stays",
  ]);
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
    setNotice("Değişiklikler kaydedildi.");
    setError("");
  };
  const run = async (
    task: () => Promise<void>,
    message = "İşlem tamamlandı.",
  ) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(message);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  if (!snapshot)
    return (
      <FontSizeProvider>
      <ThemeProvider>
      <LoginScreen
        onLogin={async (selection, register) => {
          await refresh(selection);
          setError("");
          setTab("board");
          setBookingTab(null);
          setOpenTabs(["board", "bookings", "stays"]);
          if (register) {
            activateTab("facility");
            setModal({ type: "facility", kind: "hotel", create: true });
          }
        }}
      />
      </ThemeProvider>
      </FontSizeProvider>
    );
  const s = snapshot,
    manager = ["admin", "management"].includes(s.user.role),
    operator = manager || s.user.role === "reception",
    housekeeping = operator || s.user.role === "housekeeping";
  const branch = s.branches.find((b) => b.branch_id === s.branch_id),
    hotel = s.hotels.find((h) => h.hotel_id === s.hotel_id),
    atISO = dateFilter
      ? new Date(`${dateFilter}T12:00:00+03:00`).toISOString()
      : s.server_time;
  const visibleRooms = s.rooms.filter(
    (r) =>
      (!floorId || r.floor_id === floorId) &&
      (!kind || r.kind === kind) &&
      `${r.code} ${r.type} ${unitKinds[r.kind]}`
        .toLocaleLowerCase("tr")
        .includes(search.toLocaleLowerCase("tr")),
  );
  const leafRooms = s.rooms.filter(
      (r) => !s.rooms.some((c) => c.parent_id === r.room_id),
    ),
    totalCapacity = leafRooms.reduce((sum, r) => sum + r.capacity, 0),
    capacityInUse = leafRooms
      .filter((r) => occupancy(s.rooms, s.bookings, r, atISO).length > 0)
      .reduce((sum, r) => sum + r.capacity, 0);
  const bookings = s.bookings.filter(
    (b) =>
      (tab !== "stays" || b.status === "checked_in") &&
      (!bookingFilter || b.status === bookingFilter) &&
      (!dateFilter ||
        (b.check_in.slice(0, 10) <= dateFilter &&
          b.check_out.slice(0, 10) >= dateFilter)) &&
      `${b.guest_name} ${s.rooms.find((r) => r.room_id === b.room_id)?.code || ""}`
        .toLocaleLowerCase("tr")
        .includes(search.toLocaleLowerCase("tr")),
  );
  const changeBranch = (selection: Selection) =>
    void run(async () => {
      await refresh(selection);
      setFloorId("");
      setModal(null);
      setSearch("");
    }, "Tesis seçildi.");
  const transition = (b: Booking, action: string) =>
    void run(async () => {
      await command("booking.transition", {
        branch_id: b.branch_id,
        booking_id: b.booking_id,
        action,
      });
      await refresh();
    });
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
  const handleLogout = () =>
    void run(async () => {
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
  const openBookingCreate = (roomId?: string) => {
    setBookingTab({ kind: "create", roomId });
    activateTab("newbooking");
  };
  const openBookingEdit = (booking: Booking) => {
    setBookingTab({ kind: "edit", booking });
    activateTab(`booking:${booking.booking_id}`);
  };
  const activateTab = (next: string) => {
    setOpenTabs((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setTab(next);
    setSearch("");
    setError("");
  };
  const closeTab = (id: string) => {
    if (id === "board") return;
    if (bookingTabId && id === bookingTabId) setBookingTab(null);
    if (tab === id) {
      const rest = openTabs.filter((t) => t !== id);
      const idx = openTabs.indexOf(id);
      const fallback = rest[Math.min(idx, rest.length - 1)] ?? "board";
      setTab(fallback);
      setSearch("");
      setError("");
    }
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t !== id);
      return next.length ? next : ["board"];
    });
  };
  return (
    <FontSizeProvider>
    <ThemeProvider>
    <OriginalShell
      snapshot={s}
      activeTab={tab}
      setActiveTab={activateTab}
      openTabs={openTabs}
      onCloseTab={closeTab}
      extraLabels={bookingTab ? { [bookingTabId as string]: bookingTabLabel } : {}}
      onSelection={changeBranch}
      onLogout={handleLogout}
      at={atISO}
      onDate={(d) =>
        setDateFilter(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        )
      }
    >
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-7 space-y-6">
        {!isBookingTab && tab !== "appsettings" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-[.18em] text-slate-500">
              {branch?.name || "TESİS"}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {title}
            </h2>
          </div>
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
                onClick={() => openBookingCreate()}
              >
                <Plus size={16} />
                Rezervasyon Al
              </button>
            )}
          </div>
        </div>
        )}
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
                  className="uni-control flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/40"
                >
                  <X size={18} strokeWidth={2} />
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
        <ErrorMessage message={error} />
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
          >
            <span className="flex gap-2 items-center">
              <Check size={15} />
              {notice}
            </span>
            <button className="uni-control" aria-label="Bildirimi kapat" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        {["board", "bookings", "stays"].includes(tab) && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: "TANIMLI BİRİM", value: s.rooms.length },
                { label: "TOPLAM KAPASİTE", value: totalCapacity },
                { label: "AYRILMIŞ KAPASİTE", value: capacityInUse },
                {
                  label: "AKTİF KONAKLAMA",
                  value: s.bookings.filter((b) => b.status === "checked_in")
                    .length,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="uni-card rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"
                >
                  <span className="text-[9px] font-black tracking-widest text-slate-400">
                    {stat.label}
                  </span>
                  <p className="mt-3 text-3xl font-black tracking-tight">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-44">
                <Search
                  size={15}
                  className="absolute left-3 top-3 text-slate-400"
                />
                <input
                  aria-label="Kayıtlarda ara"
                  className={`uni-input ${inputStyle} !pl-9 !bg-white`}
                  placeholder="Birim veya misafir ara…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {["board", "units"].includes(tab) ? (
                <>
                  <select
                    aria-label="Kat filtresi"
                    className={`uni-input ${inputStyle} !w-auto`}
                    value={floorId}
                    onChange={(e) => {
                      setFloorId(e.target.value);
                      if (!e.target.value) setPlan(false);
                    }}
                  >
                    <option value="">Tüm katlar</option>
                    {s.floors.map((f) => (
                      <option key={f.floor_id} value={f.floor_id}>
                        {localized(f.label) || f.code}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Birim türü filtresi"
                    className={`uni-input ${inputStyle} !w-auto`}
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="">Tüm birimler</option>
                    {Object.entries(unitKinds).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <select
                  aria-label="Rezervasyon durumu"
                  className={`uni-input ${inputStyle} !w-auto`}
                  value={bookingFilter}
                  onChange={(e) => setBookingFilter(e.target.value)}
                >
                  <option value="">Tüm durumlar</option>
                  {Object.entries(bookingStatuses).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
              {tab !== "units" && (
                <input
                  aria-label="Tarih filtresi"
                  type="date"
                  className={`uni-input ${inputStyle} !w-auto`}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              )}
            </div>
          </>
        )}
        {tab === "board" && (
          <>
            <div className="flex flex-wrap justify-between gap-3">
              <p className="text-xs text-slate-400">
                {dateFilter ? `${dateFilter} · 12:00` : "Şu an"} ·{" "}
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
                onEdit={(room) => setModal({ type: "unit", room })}
                onBook={(room) =>
                  openBookingCreate(room.room_id)
                }
                onRefresh={refresh}
                canManage={manager}
              />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-6">
                {visibleRooms.map((room, index) => {
                  const stays = occupancy(s.rooms, s.bookings, room, atISO),
                    active = stays[0];
                  const view = roomView(
                    {
                      ...room,
                      type: `${unitKinds[room.kind]} · ${room.effective_capacity || room.capacity} kişi`,
                      name: active
                        ? stays.length > 1
                          ? `${stays.length} alt birim rezervasyonu`
                          : active.guest_name
                        : room.bed_group
                          ? `${room.bed_group} / ${room.bed_level}. seviye`
                          : "",
                      ...(active
                        ? {
                            status:
                              active.status === "checked_in"
                                ? "Dolu"
                                : "Rezervli",
                            check_in: active.check_in,
                            check_out: active.check_out,
                            guests: active.guests,
                          }
                        : {}),
                    },
                    s.feature_registry,
                  );
                  return (
                    <div id={"unit-" + room.room_id} key={room.room_id}>
                      <RoomCard
                        room={view}
                        index={index}
                        isSelected={false}
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
                        onDragStart={operator ? setDragged : undefined}
                        onDrop={
                          operator
                            ? async (target) => {
                                const sourceBooking = s.bookings.find(
                                  (b) =>
                                    b.room_id === dragged &&
                                    ["checked_in", "confirmed"].includes(
                                      b.status,
                                    ) &&
                                    b.allocations.some(
                                      (a) =>
                                        a.room_id === dragged &&
                                        a.start <= atISO &&
                                        a.end > atISO,
                                    ),
                                );
                                const targetBooking = s.bookings.find(
                                  (b) =>
                                    b.room_id === target &&
                                    ["checked_in", "confirmed"].includes(
                                      b.status,
                                    ) &&
                                    b.allocations.some(
                                      (a) =>
                                        a.room_id === target &&
                                        a.start <= atISO &&
                                        a.end > atISO,
                                    ),
                                );
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
                      />
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                        {operator && room.rentable && (
                          <button
                            className={`uni-control ${secondaryStyle}`}
                            onClick={() =>
                              openBookingCreate(room.room_id)
                            }
                          >
                            <Plus size={12} />
                            Rezervasyon
                          </button>
                        )}
                        {operator && active && stays.length === 1 && (
                          <button
                            aria-label={`${room.code} rezervasyonunu taşı`}
                            className={`uni-control ${secondaryStyle}`}
                            onClick={() =>
                              setModal({ type: "move", booking: active })
                            }
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                        )}
                        {manager && (
                          <button
                            aria-label={`${room.code} düzenle`}
                            className={`uni-control ${secondaryStyle}`}
                            onClick={() => setModal({ type: "unit", room })}
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        {housekeeping && !active && (
                          <select
                            aria-label={`${room.code} oda durumu`}
                            className="uni-input text-[10px] rounded-lg border border-slate-200 p-1"
                            value={room.status}
                            onChange={(e) =>
                              void run(async () => {
                                await command("room.state", {
                                  room_id: room.room_id,
                                  status: e.target.value,
                                });
                                await refresh();
                              })
                            }
                          >
                            {Object.entries({
                              Temiz: "Temiz",
                              Kirli: "Kirli",
                              ...(operator
                                ? {
                                    Bos: "Boş",
                                    Arizali: "Arızalı",
                                    Tadilat: "Tadilat",
                                  }
                                : {}),
                            }).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
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
            snapshot={s}
            onRefresh={refresh}
            onUnit={(room) => setModal({ type: "unit", room })}
            onFloor={(floor) => setModal({ type: "floor", floor })}
            onBulk={() => setModal({ type: "bulk" })}
            onBook={(room) =>
              openBookingCreate(room.room_id)
            }
          />
        )}
        {tab === "staff" && <StaffView snapshot={s} />}
        {tab === "guests" && <GuestView snapshot={s} />}
        {tab === "templates" && <DocumentTemplates snapshot={s} />}
        {tab === "logs" && <AuditView hotelId={s.hotel_id} />}
        {["bookings", "stays"].includes(tab) && (
          <>
            <Table
              headings={[
                "Misafir",
                "Birim",
                "Tarihler",
                "Kişi",
                "Durum",
                "İşlemler",
              ]}
            >
              {bookings.map((b) => (
                <tr
                  key={b.booking_id}
                  onContextMenu={(e) => {
                    const room = s.rooms.find((r) => r.room_id === b.room_id);
                    if (!room) return;
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
                      booking: b,
                    });
                  }}
                >
                  <td className="p-4">
                    <button
                      className="uni-control font-bold text-brand-blue-700 text-left"
                      onClick={() => setModal({ type: "history", booking: b })}
                    >
                      {b.guest_name}
                    </button>
                  </td>
                  <td className="font-bold">
                    {s.rooms.find((r) => r.room_id === b.room_id)?.code}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {date(b.check_in)}
                    <br />
                    <span className="text-slate-400">{date(b.check_out)}</span>
                  </td>
                  <td>{b.guest_count}</td>
                  <td>
                    <span
                      className={`rounded-lg px-2 py-1 text-[10px] font-bold ${b.status === "checked_in" ? "bg-red-50 text-red-600" : b.status === "confirmed" ? "bg-brand-blue-50 text-brand-blue-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {bookingStatuses[b.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    {operator && (
                      <div className="flex flex-wrap gap-2">
                        {b.status === "confirmed" && (
                          <>
                            <button
                              disabled={busy}
                              className={`uni-control ${secondaryStyle}`}
                              onClick={() => transition(b, "check_in")}
                            >
                              Giriş
                            </button>
                            <button
                              className={`uni-control ${secondaryStyle}`}
                              onClick={() =>
                                openBookingEdit(b)
                              }
                            >
                              Düzenle
                            </button>
                            <button
                              disabled={busy}
                              className={`uni-control ${secondaryStyle}`}
                              onClick={async () => {
                                if (
                                  await confirmDialog(
                                    `${b.guest_name} rezervasyonu iptal edilsin mi?`,
                                  )
                                )
                                  transition(b, "cancel");
                              }}
                            >
                              İptal
                            </button>
                          </>
                        )}
                        {b.status === "checked_in" && (
                          <button
                            disabled={busy}
                            className={`uni-control ${secondaryStyle}`}
                            onClick={async () => {
                              if (
                                await confirmDialog(
                                  `${b.guest_name} için çıkış yapılsın mı?`,
                                )
                              )
                                transition(b, "check_out");
                            }}
                          >
                            Çıkış
                          </button>
                        )}
                        {["confirmed", "checked_in"].includes(b.status) && (
                          <button
                            className={`uni-control ${secondaryStyle}`}
                            onClick={() =>
                              setModal({ type: "move", booking: b })
                            }
                          >
                            <ArrowRightLeft size={13} />
                            Taşı / Değiştir
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            {!bookings.length && (
              <Empty label="Bu seçimde rezervasyon kaydı bulunmuyor." />
            )}
          </>
        )}
        {tab === "facility" && (
          <>
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
          </>
        )}
        {tab === "features" && (
          <FeatureRegistryView snapshot={s} onRefresh={refresh} />
        )}
        {tab === "appsettings" && (
          <AppSettingsView
            userName={s.user.displayname || s.user.username}
            userRole={s.user.role}
            onLogout={handleLogout}
          />
        )}
      </main>
      {modal && (
        <Drawer
          title={
            {
              unit: "Birim Tanımı",
              floor: "Kat Tanımı",
              booking: "Rezervasyon",
              move: "Birim Değişikliği",
              facility: "Tesis Bilgileri",
              bulk: "Toplu Birim Tanımı",
              history: "Rezervasyon Geçmişi",
              guests: "Konaklama Misafirleri",
              documents: "Sözleşme ve Dekontlar",
            }[modal.type]
          }
          onClose={() => setModal(null)}
        >
          {modal.type === "guests" ? (
            <BookingGuestsForm booking={modal.booking} onSaved={saved} />
          ) : modal.type === "documents" ? (
            <BookingDocuments
              snapshot={s}
              booking={modal.booking}
              initialKind={modal.kind}
            />
          ) : modal.type === "unit" ? (
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
            <div className="space-y-4">
              <h3 className="text-xl font-black">{modal.booking.guest_name}</h3>
              <p className="text-sm text-slate-500">
                {bookingStatuses[modal.booking.status]} ·{" "}
                {modal.booking.guest_count} kişi
              </p>
              <div className="flex gap-2">
                {["confirmed", "checked_in"].includes(modal.booking.status) && (
                  <button
                    className={`uni-control ${secondaryStyle}`}
                    onClick={() =>
                      setModal({ type: "guests", booking: modal.booking })
                    }
                  >
                    Misafirleri Düzenle
                  </button>
                )}
                <button
                  className={`uni-control ${secondaryStyle}`}
                  onClick={() =>
                    setModal({ type: "documents", booking: modal.booking })
                  }
                >
                  Sözleşme / Dekont
                </button>
              </div>
              {modal.booking.allocations.map((a) => (
                <div
                  key={a.allocation_id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <strong>
                    {s.rooms.find((r) => r.room_id === a.room_id)?.code}
                  </strong>
                  <p className="text-xs text-slate-400 mt-2">
                    {date(a.start)} → {date(a.end)}
                  </p>
                </div>
              ))}
              {modal.booking.guests?.map((g) => (
                <p key={g.id} className="text-sm">
                  {g.name} · {g.phone}
                </p>
              ))}
              <p className="text-sm text-slate-500 whitespace-pre-wrap">
                {modal.booking.notes}
              </p>
            </div>
          )}
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
                openBookingCreate(contextMenu.room.room_id);
              } else if (type === "sale") {
                if (b?.status === "confirmed") transition(b, "check_in");
                else if (b)
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
              } else if (type === "exchange" && b)
                setModal({ type: "move", booking: b });
              else if (type === "checkout" && b)
                void confirmDialog(
                  `${b.guest_name} için çıkış yapılsın mı?`,
                ).then((ok) => {
                  if (ok) transition(b, "check_out");
                });
            }}
            onStatusChange={(status) =>
              void run(async () => {
                await command("room.state", {
                  room_id: contextMenu.room.room_id,
                  status,
                });
                await refresh();
              })
            }
            onPrint={(type) => {
              const b = contextMenu.booking;
              if (!b) {
                setError(contracts.errors.booking_required);
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
                    void confirmDialog(
                      `${b.guest_name} rezervasyonu iptal edilsin mi?`,
                    ).then((ok) => {
                      if (ok) transition(b, "cancel");
                    });
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
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
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
