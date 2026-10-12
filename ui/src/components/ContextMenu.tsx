import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  Power,
  LogOut,
  Printer,
  Repeat,
  Trash2,
  ChevronRight,
  Circle,
} from "lucide-react";
import { Room, RoomStatus } from "../types";

interface ContextMenuProps {
  x: number;
  y: number;
  room: Room;
  onClose: () => void;
  onOperation: (type: "reserve" | "sale" | "checkout" | "exchange") => void;
  onStatusChange: (status: RoomStatus) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onGuests?: () => void;
  onPrint: (
    type: "sales" | "reservation" | "cancellation" | "rental" | "sale_contract",
  ) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  room,
  onClose,
  onOperation,
  onStatusChange,
  onPrint,
  onCancel,
  onDelete,
  onGuests,
}) => {
  const [activeSubMenu, setActiveSubMenu] = React.useState<
    "receipt" | "status" | null
  >(null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 5 }}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 min-w-[220px] shadow-brand-blue-900/20 ring-1 ring-black/5"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-4 py-2 border-b border-slate-50 bg-slate-50 mb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          ODA İŞLEMLERİ
        </p>
        <p className="text-xs font-black text-brand-blue-700">
          ODA #{room.number}
        </p>
      </div>

      <ContextMenuItem
        icon={<CheckCircle2 className="text-green-500" />}
        label="Rezerve Et"
        onClick={() => {
          onOperation("reserve");
          onClose();
        }}
        onMouseEnter={() => setActiveSubMenu(null)}
      />
      <ContextMenuItem
        icon={<Power className="text-brand-blue-500" />}
        label="Satış Yap"
        onClick={() => {
          onOperation("sale");
          onClose();
        }}
        onMouseEnter={() => setActiveSubMenu(null)}
      />
      <ContextMenuItem
        icon={<LogOut className="text-red-500" />}
        label="Çıkış İşlemleri"
        onClick={() => {
          onOperation("checkout");
          onClose();
        }}
        onMouseEnter={() => setActiveSubMenu(null)}
      />

      <div className="h-px bg-slate-100 my-1 mx-2" />

      {/* Receipts Submenu Trigger */}
      <div className="relative group/sub">
        <ContextMenuItem
          icon={<Printer className="text-slate-400" />}
          label="Dekont İşlemleri"
          onMouseEnter={() => setActiveSubMenu("receipt")}
          hasSubMenu
        />
        <AnimatePresence>
          {activeSubMenu === "receipt" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-full top-0 ml-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 min-w-[180px] ring-1 ring-black/5"
              onMouseLeave={() => setActiveSubMenu(null)}
            >
              <ContextMenuItem
                icon={<Printer className="text-brand-blue-500" />}
                label="Rezervasyon Dekontu"
                onClick={() => {
                  onPrint("reservation");
                  onClose();
                }}
              />
              <ContextMenuItem
                icon={<Printer className="text-emerald-500" />}
                label="Satış Dekontu"
                onClick={() => {
                  onPrint("sales");
                  onClose();
                }}
              />
              <ContextMenuItem
                icon={<Printer className="text-red-500" />}
                label="İptal Dekontu"
                onClick={() => {
                  onPrint("cancellation");
                  onClose();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-px bg-slate-100 my-1 mx-2" />

      {/* Status Submenu Trigger */}
      <div className="relative group/sub">
        <ContextMenuItem
          icon={<Repeat className="text-slate-400" />}
          label="Hızlı Durum Güncelle"
          onMouseEnter={() => setActiveSubMenu("status")}
          hasSubMenu
        />
        <AnimatePresence>
          {activeSubMenu === "status" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-full top-0 ml-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 min-w-[160px] ring-1 ring-black/5"
              onMouseLeave={() => setActiveSubMenu(null)}
            >
              <ContextMenuItem
                icon={
                  <Circle className="fill-green-500 text-green-500 w-2 h-2" />
                }
                label="Temiz (T)"
                onClick={() => {
                  onStatusChange("Temiz");
                  onClose();
                }}
              />
              <ContextMenuItem
                icon={
                  <Circle className="fill-orange-500 text-orange-500 w-2 h-2" />
                }
                label="Kirli (K)"
                onClick={() => {
                  onStatusChange("Kirli");
                  onClose();
                }}
              />
              <ContextMenuItem
                icon={
                  <Circle className="fill-slate-900 text-slate-900 w-2 h-2" />
                }
                label="Arıza (A)"
                onClick={() => {
                  onStatusChange("Arizali");
                  onClose();
                }}
              />
              <ContextMenuItem
                icon={
                  <Circle className="fill-amber-600 text-amber-600 w-2 h-2" />
                }
                label="Bakım (M)"
                onClick={() => {
                  onStatusChange("Tadilat");
                  onClose();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-px bg-slate-100 my-1 mx-2" />

      <ContextMenuItem
        icon={<Repeat className="text-slate-400" />}
        label="Oda Değiştir"
        onClick={() => {
          onOperation("exchange");
          onClose();
        }}
        onMouseEnter={() => setActiveSubMenu(null)}
      />
      {room.status === "Rezervli" && (
        <ContextMenuItem
          icon={<Trash2 className="text-red-500" />}
          label="Rezervasyonu İptal Et"
          onClick={() => {
            onCancel?.();
            onClose();
          }}
          onMouseEnter={() => setActiveSubMenu(null)}
        />
      )}
      {onGuests && (
        <ContextMenuItem
          icon={<Circle />}
          label="Misafirleri Düzenle"
          onClick={() => {
            onGuests();
            onClose();
          }}
        />
      )}
      <ContextMenuItem
        icon={<Printer />}
        label="Kira Sözleşmesi"
        onClick={() => {
          onPrint("rental");
          onClose();
        }}
      />
      <ContextMenuItem
        icon={<Printer />}
        label="Satış Sözleşmesi"
        onClick={() => {
          onPrint("sale_contract");
          onClose();
        }}
      />
      {onDelete && (
        <ContextMenuItem
          icon={<Trash2 className="text-red-400" />}
          label="Kaydı Sil"
          onClick={() => {
            onDelete();
            onClose();
          }}
        />
      )}
    </motion.div>
  );
};

function ContextMenuItem({
  icon,
  label,
  onClick,
  onMouseEnter,
  hasSubMenu,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  hasSubMenu?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="w-full flex items-center px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-brand-blue-50 hover:text-brand-blue-700 transition-all group"
    >
      <div className="w-5 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {hasSubMenu && <ChevronRight className="w-3 h-3 text-slate-400" />}
    </button>
  );
}
