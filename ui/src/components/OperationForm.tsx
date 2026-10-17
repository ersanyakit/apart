import { useI18n } from "./I18n";
import { RoomStatus as RoomState } from '../lib/statuses.generated';
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User,
  Phone,
  CreditCard,
  Clock,
  Save,
  ArrowLeft,
  ClipboardList,
  Hotel,
  Repeat,
  AlertCircle,
  Banknote,
  Send,
  Building2,
  FileText,
  Wallet,
  History,
  Search,
} from "lucide-react";

const MOCK_HISTORY = [
  { name: "ERSAN YAKİT", phone: "0532 111 22 33", tcNo: "11122233344" },
  { name: "MEHMET DEMİR", phone: "0544 555 66 77", tcNo: "55566677788" },
  { name: "AYŞE YILMAZ", phone: "0505 888 99 00", tcNo: "99900011122" },
  { name: "FATMA KAYA", phone: "0533 333 44 55", tcNo: "33344455566" },
];
import { Room, RoomStatus } from "../types";
import { DateTimePicker } from "./DateTimePicker";

interface OperationFormProps {
  room: Room;
  type: "reserve" | "sale" | "checkout" | "exchange";
  availableRooms?: Room[];
  onConfirm: (roomId: string, newStatus: RoomStatus, data: any) => void;
  onCancel: () => void;
}

export const OperationForm: React.FC<OperationFormProps> = ({
  room,
  type,
  availableRooms = [],
  onConfirm,
  onCancel,
}) => {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [formError, setFormError] = React.useState("");
  const [formData, setFormData] = useState({
    customerName: room.name || "",
    phone: "",
    checkIn: room.checkIn ? new Date(room.checkIn) : new Date(),
    checkOut: room.checkOut
      ? new Date(room.checkOut)
      : new Date(Date.now() + 86400000),
    price: 0 || "450.00",
    notes: "",
    targetRoomId: "",
    paymentType: "Nakit",
    isDeposit: false,
    depositAmount: "0.00",
    guests: room.guests || [
      { id: "1", name: room.name || "", tcNo: "", phone: "", note: "" },
    ],
  });

  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const selectFromHistory = (guest: any) => {
    updateGuest(formData.guests[0].id, "name", guest.name);
    updateGuest(formData.guests[0].id, "tcNo", guest.tcNo);
    updateGuest(formData.guests[0].id, "phone", guest.phone);
    setFormData((prev) => ({
      ...prev,
      customerName: guest.name,
      phone: guest.phone,
    }));
    setShowHistory(false);
  };

  const addGuest = () => {
    const newGuest = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      tcNo: "",
      phone: "",
      note: "",
    };
    setFormData((prev) => ({
      ...prev,
      guests: [...prev.guests, newGuest],
    }));
  };

  const removeGuest = (id: string) => {
    if (formData.guests.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      guests: prev.guests.filter((g) => g.id !== id),
    }));
  };

  const updateGuest = (id: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      guests: prev.guests.map((g) =>
        g.id === id ? { ...g, [field]: value } : g,
      ),
    }));
  };

  const paymentMethods = [
    { id: "Nakit", label: _uiText("NAKİT"), icon: <Banknote className="w-3 h-3" /> },
    {
      id: "Kredi Kartı",
      label: _uiText("K. KARTI"),
      icon: <CreditCard className="w-3 h-3" />,
    },
    { id: "Havale", label: _uiText("HAVALE"), icon: <Send className="w-3 h-3" /> },
    { id: "Şirket", label: _uiText("ŞİRKET"), icon: <Building2 className="w-3 h-3" /> },
  ];

  const titles = {
    reserve: "Rezervasyon Kaydı",
    sale: "Hızlı Satış",
    checkout: "Misafir Çıkış",
    exchange: "Oda Değişimi",
  };

  const operationColors = {
    reserve: "text-emerald-600 bg-emerald-50",
    sale: "text-brand-blue-600 bg-brand-blue-50",
    checkout: "text-rose-600 bg-rose-50",
    exchange: "text-amber-600 bg-amber-50",
  };

  const operationIcons = {
    reserve: <ClipboardList className="w-5 h-5 text-emerald-600" />,
    sale: <CreditCard className="w-5 h-5 text-brand-blue-600" />,
    checkout: <Clock className="w-5 h-5 text-rose-600" />,
    exchange: <Repeat className="w-5 h-5 text-amber-600" />,
  };

  const getConfirmationMessage = () => {
    if (type === "exchange") {
      const targetRoom = availableRooms.find(
        (r) => r.id === formData.targetRoomId,
      );
      return _uiText("ODA {value1} kaydını ODA {value2} üzerine aktarmak istediğinize emin misiniz?", {value1: String(room.number), value2: String(targetRoom?.number)});
    }
    if (type === "checkout")
      return _uiText("ODA {value1} için check-out işlemini onaylıyor musunuz? Odadaki tüm misafir kayıtları silinecektir.", {value1: String(room.number)});
    if (type === "reserve")
      return _uiText("{value1} adına oda {value2} için rezervasyon kaydı yapılacaktır.", {value1: String(formData.customerName), value2: String(room.number)});
    return _uiText("{value1} adına oda {value2} için satış işlemi (check-in) yapılacaktır.", {value1: String(formData.customerName), value2: String(room.number)});
  };

  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    if (isConfirming) {
      const statusMap: Record<string, RoomStatus> = {
        reserve: "Rezervli",
        sale: "Dolu",
        checkout: RoomState.Clean,
        exchange: room.status,
      };

      onConfirm(room.id, statusMap[type], {
        ...formData,
        checkIn: formData.checkIn.toISOString(),
        checkOut: formData.checkOut.toISOString(),
      });
      setIsConfirming(false);
    } else {
      if (type === "exchange" && !formData.targetRoomId) {
        setFormError("Lütfen hedef odayı seçiniz.");
        return;
      }
      setIsConfirming(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden h-full"
    >
      {formError && (
        <p role="alert" className="p-4 text-sm text-red-600">
          {formError}
        </p>
      )}
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={onCancel}
            className="uni-control p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900  border border-slate-100 shadow-sm shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              {operationIcons[type]}
              {titles[type]}
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-0">
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded self-start ${operationColors[type]}`}
              >{_uiText("SYSTEM")} </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{_uiText("ODA:")}{" "}
                <span className="text-slate-900 font-black">
                  #{room.number}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {(type === "reserve" || type === "sale") && (
            <button
              onClick={() => {
                window.print();
                setFormError("Belge işlemlerini oda menüsünden açabilirsiniz.");
              }}
              className="uni-control flex-1 md:flex-none px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-[11px]  text-slate-500 hover:bg-slate-200 active:bg-slate-200    shadow-sm  cursor-pointer   flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />{_uiText("DEKONT AL")} </button>
          )}
          <button
            onClick={onCancel}
            className="uni-control flex-1 md:flex-none px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-[11px]  text-slate-500 hover:bg-slate-50 active:bg-slate-50    shadow-sm  cursor-pointer  "
          >{_uiText("İPTAL")} </button>
          <button
            onClick={handleConfirm}
            className={`uni-control flex-[2] md:flex-none px-5 py-2 rounded-lg text-[11px]  text-white     flex items-center justify-center gap-2  cursor-pointer   ${type === "checkout"
                ? "bg-rose-600 shadow-rose-200"
                : "uni-button-primary shadow-brand-blue-200"}`}
          >
            <Save className="w-3.5 h-3.5" />{_uiText("KAYDI ONAYLA")} </button>
        </div>
      </div>

      {/* Confirmation Modal Overlays */}
      <AnimatePresence>
        {isConfirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="uni-card bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl border-2 border-brand-blue-100/50 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 flex">
                <div className="flex-1 bg-brand-blue-600" />
                <div className="flex-1 bg-brand-blue-400" />
                <div className="flex-1 bg-brand-blue-200" />
              </div>

              <div className="w-20 h-20 bg-brand-blue-50 rounded-[32px] flex items-center justify-center text-brand-blue-600 mx-auto mb-8 shadow-inner">
                <AlertCircle className="w-10 h-10" />
              </div>

              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4">{_uiText("İŞLEM ONAYI")} </h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10 italic">
                {getConfirmationMessage()}
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsConfirming(false)}
                  className="uni-control flex-1 py-4 text-slate-400  text-[11px]  tracking-[0.2em] hover:text-slate-600 "
                >{_uiText("VAZGEÇ")} </button>
                <button
                  onClick={handleConfirm}
                  className="uni-control flex-2 py-4 uni-button-primary text-white rounded-[20px] text-[11px]   tracking-[0.2em]  shadow-brand-blue-100       cursor-pointer"
                >{_uiText("EVET, ONAYLIYORUM")} </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Content Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-slate-50/50 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* Left Column: Form Sections (8 Units) */}
            <div className="lg:col-span-8 space-y-3">
              {/* Combined Info Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="uni-card bg-white p-4 rounded-xl shadow-sm border border-slate-200/60"
              >
                {type === "exchange" && (
                  <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-3xl mb-6 shadow-inner">
                    <div className="flex items-center gap-3 mb-4">
                      <Repeat className="w-5 h-5 text-amber-600" />
                      <label className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em]">{_uiText("HEDEF ODA SEÇİMİ (TRANSFER EDİLECEK ODA)")} </label>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {availableRooms.map((targetRoom) => (
                        <button
                          key={targetRoom.id}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              targetRoomId: targetRoom.id,
                            })
                          }
                          className={`uni-control flex flex-col items-center justify-center p-3 rounded-2xl border-2  gap-1 h-20 shadow-sm ${formData.targetRoomId === targetRoom.id
                              ? "bg-amber-500 border-amber-600 text-white  ring-4 ring-amber-500/10 scale-105 z-10"
                              : "bg-white border-slate-100 text-slate-400 hover:border-amber-300 hover:text-amber-600"}`}
                        >
                          <span className="text-[13px] font-black tracking-tight">
                            #{targetRoom.number}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-tighter opacity-80">
                            {targetRoom.type}
                          </span>
                        </button>
                      ))}
                      {availableRooms.length === 0 && (
                        <div className="uni-card col-span-full py-8 text-center bg-white/50 rounded-2xl border-2 border-dashed border-amber-200">
                          <AlertCircle className="w-8 h-8 text-amber-300 mx-auto mb-2" />
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{_uiText("MÜSAİT ODA BULUNAMADI")} </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-3">
                  {/* Guest Info */}
                  <div className="md:col-span-7 space-y-1 relative">
                    <div className="flex items-center justify-between ml-0.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{_uiText("AD SOYAD / ÜNVAN")} </label>
                      <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className={`uni-control flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px]   tracking-tight  ${showHistory
                            ? "uni-button-primary text-white "
                            : "bg-brand-blue-50 text-brand-blue-600 hover:bg-brand-blue-100"}`}
                      >
                        <History className="w-2.5 h-2.5" />{_uiText("GEÇMİŞTEN GETİR")} </button>
                    </div>
                    <div className="relative group">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                      <input
                        type="text"
                        value={formData.customerName || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customerName: e.target.value,
                          })
                        }
                        placeholder={_uiText("MİSAFİR İSMİ...")}
                        className="uni-input w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none uppercase placeholder:text-slate-400"
                      />
                    </div>

                    {/* History Popover */}
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-3xl shadow-2xl border-2 border-brand-blue-100 z-50 overflow-hidden"
                        >
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                autoFocus
                                value={historySearch}
                                onChange={(e) =>
                                  setHistorySearch(e.target.value)
                                }
                                placeholder={_uiText("İSİM, TELEFON VEYA TC ARA...")}
                                className="uni-input w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-neutral-400 placeholder:text-slate-400 shadow-inner"
                              />
                            </div>
                          </div>
                          <div className="max-h-[280px] overflow-y-auto custom-scrollbar py-2">
                            {MOCK_HISTORY.filter(
                              (h) =>
                                h.name
                                  .toLowerCase()
                                  .includes(historySearch.toLowerCase()) ||
                                h.tcNo.includes(historySearch) ||
                                h.phone.includes(historySearch),
                            ).length > 0 ? (
                              MOCK_HISTORY.filter(
                                (h) =>
                                  h.name
                                    .toLowerCase()
                                    .includes(historySearch.toLowerCase()) ||
                                  h.tcNo.includes(historySearch) ||
                                  h.phone.includes(historySearch),
                              ).map((guest, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => selectFromHistory(guest)}
                                  className="uni-control w-full px-4 py-3 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0 group "
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 bg-brand-blue-50 text-brand-blue-600 rounded-xl flex items-center justify-center font-black text-xs">
                                        {guest.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">
                                          {guest.name}
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {guest.phone}
                                          </span>
                                          <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{_uiText("TC:")} {guest.tcNo}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                      <span className="text-[9px] font-black text-brand-blue-600 bg-brand-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">{_uiText("SEÇ")} </span>
                                    </div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="py-10 px-4 text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                                  <Search size={20} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{_uiText("ARANAN MİSAFİR BULUNAMADI")} </p>
                              </div>
                            )}
                          </div>
                          <div className="p-3 bg-brand-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] text-center">{_uiText("MERKEZİ MİSAFİR VERİTABANI")} </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{_uiText("TELEFON")} </label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                      <input
                        type="tel"
                        value={formData.phone || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder={_uiText("05xx...")}
                        className="uni-input w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Planning */}
                  <div className="md:col-span-6">
                    <DateTimePicker
                      label={_uiText("GİRİŞ")}
                      value={formData.checkIn}
                      onChange={(date) =>
                        setFormData({ ...formData, checkIn: date })
                      }
                    />
                  </div>
                  <div className="md:col-span-6">
                    <DateTimePicker
                      label={_uiText("ÇIKIŞ")}
                      value={formData.checkOut}
                      onChange={(date) =>
                        setFormData({ ...formData, checkOut: date })
                      }
                    />
                  </div>
                </div>
              </motion.section>

              {/* Financial & Details Combined */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="uni-card bg-white p-4 rounded-xl shadow-sm border border-slate-200/60"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{_uiText("BİRİM FİYAT")} </label>
                    <div className="relative">
                      <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        className="uni-input w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-8 flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{_uiText("ÖDEME YÖNTEMİ")} </label>
                    <div className="grid grid-cols-4 gap-1.5 w-full">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, paymentType: method.id })
                          }
                          className={`uni-control flex flex-col items-center justify-center py-2.5 rounded-xl border  gap-1.5 ${formData.paymentType === method.id
                              ? "uni-button-primary border-brand-blue-600 text-white  shadow-brand-blue-100 ring-4 ring-brand-blue-500/5"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-white hover:text-slate-600"}`}
                        >
                          <span
                            className={`${formData.paymentType === method.id ? "opacity-100" : "opacity-40"}`}
                          >
                            {method.icon}
                          </span>
                          <span className="text-[9px] font-black tracking-tighter">
                            {method.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {type === "reserve" && (
                    <div
                      className={`md:col-span-12 p-4 rounded-xl border transition-all ${formData.isDeposit
                          ? "bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-100"
                          : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ease-out shadow-sm ${formData.isDeposit
                                ? "bg-emerald-600 text-white shadow-emerald-200"
                                : "bg-white text-slate-400 border border-slate-100"}`}
                          >
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                            <p
                              className={`text-xs font-black uppercase tracking-tight ${formData.isDeposit ? "text-emerald-900" : "text-slate-600"}`}
                            >{_uiText("ÖN ÖDEME / KAPORA")} </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{_uiText("KAYIT SIRASINDA ALINAN TUTAR")} </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="uni-card flex bg-white rounded-xl p-1 border border-slate-200/60 shadow-inner">
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, isDeposit: false })
                              }
                              className={`uni-control px-4 py-1.5 rounded-lg text-[10px]   ${!formData.isDeposit
                                  ? "bg-slate-100 text-slate-600 shadow-sm"
                                  : "text-slate-400 hover:text-slate-500"}`}
                            >{_uiText("YOK")} </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, isDeposit: true })
                              }
                              className={`uni-control px-4 py-1.5 rounded-lg text-[10px]   ${formData.isDeposit
                                  ? "bg-emerald-600 text-white  shadow-emerald-100"
                                  : "text-slate-400 hover:text-slate-500"}`}
                            >{_uiText("ALINDI")} </button>
                          </div>

                          {formData.isDeposit && (
                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="relative group min-w-[140px]"
                            >
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                <span className="text-[10px] font-black text-emerald-600 uppercase">{_uiText("TL")} </span>
                                <div className="w-px h-3 bg-emerald-200" />
                              </div>
                              <input
                                type="number"
                                value={formData.depositAmount}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    depositAmount: e.target.value,
                                  })
                                }
                                className="uni-input w-full pl-12 pr-4 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-black text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
                                placeholder="0.00"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes Section moved here for better flow */}
                  <div className="md:col-span-12 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{_uiText("NOTLAR / ÖZEL İSTEKLER")} </label>
                    <textarea
                      rows={2}
                      placeholder={_uiText("Misafir ile ilgili ek bilgiler...")}
                      className="uni-input w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none resize-none focus:border-neutral-400 transition-all"
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              </motion.section>

              {/* Guest List Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="uni-card bg-white p-4 rounded-xl shadow-sm border border-slate-200/60"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">{_uiText("MİSAFİR LİSTESİ")} </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addGuest}
                    className="uni-control px-3 py-1.5 bg-brand-blue-50 text-brand-blue-600 rounded-lg text-[10px]    hover:bg-brand-blue-100  flex items-center gap-1.5"
                  >
                    <Save className="w-3 h-3 rotate-45" />{_uiText("YENİ EKLE")} </button>
                </div>

                <div className="space-y-3">
                  {formData.guests.map((guest, index) => (
                    <div
                      key={guest.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl relative group"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-5 space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{_uiText("AD SOYAD")} </label>
                          <input
                            type="text"
                            value={guest.name || ""}
                            onChange={(e) =>
                              updateGuest(
                                guest.id,
                                "name",
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="uni-input w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none uppercase"
                            placeholder={_uiText("MİSAFİR ADI...")}
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{_uiText("TC NO / PASAPORT")} </label>
                          <input
                            type="text"
                            maxLength={11}
                            value={guest.tcNo || ""}
                            onChange={(e) =>
                              updateGuest(
                                guest.id,
                                "tcNo",
                                e.target.value.replace(/\D/g, ""),
                              )
                            }
                            className="uni-input w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                            placeholder={_uiText("KİMLİK NO")}
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{_uiText("TELEFON")} </label>
                          <input
                            type="text"
                            value={guest.phone || ""}
                            onChange={(e) =>
                              updateGuest(guest.id, "phone", e.target.value)
                            }
                            className="uni-input w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                            placeholder={_uiText("05xx...")}
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeGuest(guest.id)}
                            className={`uni-control p-2 rounded-lg text-rose-300 hover:text-rose-600 hover:bg-rose-50  ${formData.guests.length <= 1 ? "hidden" : ""}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Guest Note Field */}
                        <div className="md:col-span-12 space-y-1 mt-1">
                          <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                            <FileText size={10} /> {_uiText("MİSAFİR ÖZEL NOTU (TERCİHLER, ALERJİLER VB.)")} </label>
                          <input
                            type="text"
                            value={guest.note || ""}
                            onChange={(e) =>
                              updateGuest(guest.id, "note", e.target.value)
                            }
                            className="uni-input w-full px-3 py-1.5 bg-indigo-50/30 border border-indigo-100 rounded-lg text-xs font-medium text-slate-600 outline-none focus:border-indigo-300 transition-all italic placeholder:text-slate-400"
                            placeholder={_uiText("Bu misafir için özel bir not yazın...")}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            </div>

            {/* Right Column: Order Summary (4 Units) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-4 space-y-3 lg:sticky lg:top-16"
            >
              <div className="bg-white rounded-xl shadow-xl shadow-slate-200/20 border border-slate-200 overflow-hidden">
                <div
                  className={`p-4 relative overflow-hidden ${type === "checkout"
                      ? "bg-rose-600"
                      : type === "reserve"
                        ? "bg-emerald-600"
                        : "bg-brand-blue-700"} text-white`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl opacity-50" />
                  <h3 className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-4 relative z-10">{_uiText("ÖZET")} </h3>

                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black bg-white/10 border border-white/20">
                        <span className="text-[8px] opacity-60 font-bold uppercase tracking-tighter">{_uiText("ODA")} </span>
                        <span className="text-base">{room.number}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase truncate">
                          {room.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black leading-none">
                        {Number(formData.price).toLocaleString(_uiLocale, {
                          minimumFractionDigits: 2,
                        })}{" "}{_uiText("TL")} </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4 bg-white">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 border-b border-slate-50 pb-2">
                      <span className="uppercase tracking-widest text-[9px]">{_uiText("KONAKLAMA SÜRESİ")} </span>
                      <span className="text-slate-900 font-black">{_uiText("2 GECE")}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 border-b border-slate-50 pb-2">
                      <span className="uppercase tracking-widest text-[9px]">{_uiText("GÜNLÜK BİRİM FİYAT")} </span>
                      <span className="text-slate-700 font-bold">
                        {Number(formData.price).toLocaleString(_uiLocale, {
                          minimumFractionDigits: 2,
                        })}{" "}{_uiText("TL")} </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 border-b border-slate-50 pb-2">
                      <span className="uppercase tracking-widest text-[9px]">{_uiText("HİZMET TOPLAMI (KDV HARİÇ)")} </span>
                      <span className="text-slate-700 font-bold">
                        {(Number(formData.price) * 2).toLocaleString(_uiLocale, {
                          minimumFractionDigits: 2,
                        })}{" "}{_uiText("TL")} </span>
                    </div>
                    {formData.isDeposit && (
                      <div className="flex justify-between items-center text-[10px] font-black text-emerald-600 border-b border-emerald-100 bg-emerald-50/30 -mx-1 px-1 py-1 rounded">
                        <span className="uppercase tracking-widest text-[9px]">{_uiText("TAHSİL EDİLEN KAPORA")} </span>
                        <span className="font-black">
                          -
                          {Number(formData.depositAmount).toLocaleString(
                            _uiLocale,
                            { minimumFractionDigits: 2 },
                          )}{" "}{_uiText("TL")} </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[10px] font-black text-indigo-400">
                      <span className="uppercase tracking-widest text-[9px]">{_uiText("KDV (%20)")} </span>
                      <span className="text-indigo-600 font-bold text-[11px]">
                        {(Number(formData.price) * 2 * 0.2).toLocaleString(
                          _uiLocale,
                          { minimumFractionDigits: 2 },
                        )}{" "}{_uiText("TL")} </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-slate-100 mt-4 bg-slate-50 -mx-4 px-4 py-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">{_uiText("TOPLAM BAKİYE")} </span>
                      <span className="text-[10px] font-black text-brand-blue-600 bg-brand-blue-50 px-2 py-0.5 rounded uppercase">
                        {formData.paymentType}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">
                        {
                          (
                            Number(formData.price) * 2 * 1.2 -
                            (formData.isDeposit
                              ? Number(formData.depositAmount)
                              : 0)
                          )
                            .toLocaleString(_uiLocale, {
                              minimumFractionDigits: 0,
                            })
                            .split(",")[0]
                        }
                      </span>
                      <span className="text-lg font-black text-slate-400">
                        ,
                        {(
                          Number(formData.price) * 2 * 1.2 -
                          (formData.isDeposit
                            ? Number(formData.depositAmount)
                            : 0)
                        )
                          .toLocaleString(_uiLocale, { minimumFractionDigits: 2 })
                          .split(",")[1] || "00"}
                      </span>
                      <span className="text-sm font-black text-slate-500 ml-1 uppercase">{_uiText("TL")} </span>
                    </div>
                  </div>

                  {formData.notes && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <AlertCircle size={10} /> {_uiText("GENEL REZERVASYON NOTU")} </p>
                      <p className="text-[11px] text-amber-800 font-medium italic leading-relaxed">
                        "{formData.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
