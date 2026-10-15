import { statusStyle, roomStatusKey } from "../lib/status-palette";
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Room } from '../types';
import { Users } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onContextMenu: (e: Pick<React.MouseEvent, "preventDefault" | "clientX" | "clientY">) => void;
  index: number;
  isSelected: boolean;
  onDragStart?: (roomId: string) => void;
  onDrop?: (targetRoomId: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onContextMenu, isSelected, onDragStart, onDrop }) => {
  const reducedMotion = useReducedMotion();
  const statusIcons = {
    'Rezervli': 'R',
    'Dolu': 'D',
    'Bos': 'B',
    'Temiz': 'T',
    'Kirli': 'K',
    'Arizali': 'A',
    'Tadilat': 'M',
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${room.number} numaralı oda, ${room.status}. İşlemleri aç`}
      onKeyDown={(e) => {
        if (["Enter", " ", "ContextMenu"].includes(e.key) || (e.shiftKey && e.key === "F10")) {
          e.preventDefault();
          const bounds = e.currentTarget.getBoundingClientRect();
          onContextMenu({ preventDefault: () => {}, clientX: bounds.x + bounds.width / 2, clientY: bounds.y + bounds.height / 2 });
        }
      }}
      draggable={!!onDragStart}
      onDragStart={() => onDragStart?.(room.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop?.(room.id)}
      onContextMenu={onContextMenu}
      className={`
        uni-card uni-card-interactive bg-white rounded-2xl p-4 relative group cursor-grab active:cursor-grabbing
        flex flex-col min-h-[232px] w-full
        ${isSelected ? 'border-accent' : 'border-uni-border'}
      `}
    >
      <div
        className="flex flex-col items-center justify-between h-full"
      >
        {/* Modern House Shape */}
        <div className="relative w-full flex justify-center mt-2 h-16 shrink-0">
           <svg viewBox="0 0 100 80" className="w-16 h-14">
              <path d="M10 40 L50 10 L90 40" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
              <rect x="20" y="40" width="60" height="40" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
              <rect x="42" y="60" width="16" height="20" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
           </svg>

           <div className={`
             absolute -top-2 -right-1 w-10 h-10 rounded-xl border-2 border-white flex items-center justify-center font-medium text-base z-10

           `} style={statusStyle(roomStatusKey(room.status))}>
             {statusIcons[room.status as keyof typeof statusIcons]}
           </div>

           {room.guests && room.guests.length > 1 && (
              <div className="absolute top-8 -right-2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg border-2 border-white shadow-lg flex items-center gap-1 z-20">
                 <Users className="w-2 h-2" />
                 {room.guests.length} MİSAFİR
              </div>
           )}
        </div>

        <div className="text-center w-full space-y-1 mt-2">
           <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-medium text-uni-ink tracking-tight">{room.number}</span>
              <span className="text-[10px] font-medium text-brand-blue-600 bg-brand-blue-50 px-1.5 py-0.5 rounded-full uppercase border border-brand-blue-100">{room.type}</span>
           </div>
           <p className="text-xs font-normal text-uni-muted line-clamp-1 min-h-4">{room.name}</p>

           <div className="mt-2 pt-2 border-t border-slate-50 space-y-1 w-full min-h-[50px] flex flex-col justify-center">
             {room.checkIn ? (
               <div className="w-full space-y-1">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-slate-400 tracking-wider text-left">GİRİŞ:</span>
                  <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded font-mono text-right truncate max-w-[65px]">{room.checkIn.split(/[ T]/)[0]}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-slate-400 tracking-wider text-left">ÇIKIŞ:</span>
                  <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-mono text-right truncate max-w-[65px]">{room.checkOut?.split(/[ T]/)[0]}</span>
                </div>
               </div>
             ) : (
               <div className="py-1.5 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
                 <p className="text-[11px] text-uni-muted font-medium text-center">BOŞ</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Drag dots */}
      <div className="absolute top-2 left-2 grid grid-cols-2 gap-0.5 opacity-20 group-hover:opacity-100 transition-opacity">
        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
      </div>
    </motion.div>
  );
};
