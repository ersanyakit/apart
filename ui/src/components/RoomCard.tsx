import React from 'react';
import { motion } from 'motion/react';
import { Room } from '../types';
import { Users } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onContextMenu: (e: React.MouseEvent) => void;
  index: number;
  isSelected: boolean;
  onDragStart?: (roomId: string) => void;
  onDrop?: (targetRoomId: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onContextMenu, isSelected, onDragStart, onDrop }) => {
  const statusColors = {
    'Rezervli': 'bg-brand-blue-500 text-white',
    'Dolu': 'bg-red-500 text-white',
    'Bos': 'bg-slate-300 text-white',
    'Temiz': 'bg-green-500 text-white',
    'Kirli': 'bg-orange-500 text-white',
    'Arizali': 'bg-red-800 text-white',
    'Tadilat': 'bg-yellow-600 text-white',
  };

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      draggable={!!onDragStart}
      onDragStart={() => onDragStart?.(room.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop?.(room.id)}
      onContextMenu={onContextMenu}
      whileTap={{ scale: 0.98 }}
      className={`
        bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl hover:shadow-brand-blue-900/10 transition-all border-2 relative group cursor-grab active:cursor-grabbing
        flex flex-col h-[220px] w-full
        ${isSelected ? 'border-brand-blue-500 shadow-xl shadow-brand-blue-900/15' : 'border-slate-100 hover:border-brand-blue-100'}
      `}
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        className="flex flex-col items-center justify-between h-full"
      >
        {/* Modern House Shape */}
        <div className="relative w-full flex justify-center mt-2 h-16 shrink-0">
           <svg viewBox="0 0 100 80" className="w-16 h-14 transition-transform duration-300 group-hover:scale-105">
              <path d="M10 40 L50 10 L90 40" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
              <rect x="20" y="40" width="60" height="40" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
              <rect x="42" y="60" width="16" height="20" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
           </svg>

           <div className={`
             absolute -top-2 -right-1 w-12 h-12 rounded-2xl border-4 border-white flex items-center justify-center font-black text-lg z-10 shadow-xl rotate-12 group-hover:rotate-0 transition-all
             ${statusColors[room.status as keyof typeof statusColors]}
           `}>
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
              <span className="text-lg font-black text-brand-blue-950 tracking-tighter">{room.number}</span>
              <span className="text-[9px] font-black text-brand-blue-500 bg-brand-blue-50 px-1.5 py-0.5 rounded-full uppercase border border-brand-blue-100">{room.type}</span>
           </div>
           <p className="text-[10px] font-bold text-slate-500 line-clamp-1 h-3 uppercase tracking-tight">{room.name}</p>

           <div className="mt-2 pt-2 border-t border-slate-50 space-y-1 w-full min-h-[50px] flex flex-col justify-center">
             {room.checkIn ? (
               <div className="w-full space-y-1">
                <div className="flex items-center justify-between text-[8px] font-bold">
                  <span className="text-slate-400 tracking-wider text-left">GİRİŞ:</span>
                  <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded font-mono italic text-right truncate max-w-[65px]">{room.checkIn.split(/[ T]/)[0]}</span>
                </div>
                <div className="flex items-center justify-between text-[8px] font-bold">
                  <span className="text-slate-400 tracking-wider text-left">ÇIKIŞ:</span>
                  <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-mono italic text-right truncate max-w-[65px]">{room.checkOut?.split(/[ T]/)[0]}</span>
                </div>
               </div>
             ) : (
               <div className="py-1.5 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
                 <p className="italic text-[8px] text-slate-300 font-bold uppercase tracking-widest text-center">BOŞ</p>
               </div>
             )}
           </div>
        </div>
      </motion.div>

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
