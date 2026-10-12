import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, setHours, setMinutes, isToday, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  hideTime?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, label, hideTime = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const days = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const dateInterval = eachDayOfInterval({ start, end });
  const startDay = (getDay(start) + 6) % 7;

  const handleDateSelect = (date: Date) => {
    const newDate = setHours(setMinutes(date, value.getMinutes()), value.getHours());
    onChange(newDate);
    if (hideTime) setIsOpen(false);
  };

  const updateTime = (unit: 'h' | 'm', val: string) => {
    let num = parseInt(val);
    if (isNaN(num)) return;
    if (unit === 'h') onChange(setHours(value, Math.min(23, Math.max(0, num))));
    if (unit === 'm') onChange(setMinutes(value, Math.min(59, Math.max(0, num))));
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-0.5 block">{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="uni-control w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-brand-blue-500  shadow-sm group text-left"
      >
        <CalendarIcon className={`w-4 h-4 transition-colors ${isOpen ? 'text-brand-blue-600' : 'text-slate-400'}`} />
        <span className="flex-1 truncate">
          {format(value, hideTime ? 'dd MMMM yyyy' : 'dd.MM.yyyy HH:mm', { locale: tr })}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-1 z-[150] bg-white rounded-2xl shadow-2xl border border-slate-200 w-[280px] overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="uni-control p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-blue-600 shadow-sm "
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="uni-control p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-blue-600 shadow-sm "
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5 mb-2">
                {days.map(d => (
                  <div key={d} className="text-[10px] font-black text-slate-300 text-center py-1">{d}</div>
                ))}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8 w-8" />
                ))}
                {dateInterval.map(date => {
                  const isSel = isSameDay(date, value);
                  const isTodayDate = isToday(date);
                  return (
                    <button
                      key={date.toString()}
                      type="button"
                      onClick={() => handleDateSelect(date)}
                      className={`uni-control
                        h-8 w-8 rounded-lg text-xs font-bold  relative
                        ${isSel ? 'uni-button-primary text-white  shadow-brand-blue-100' : 'text-slate-600 hover:bg-brand-blue-50 hover:text-brand-blue-600'}
                        ${isTodayDate && !isSel ? 'border border-brand-blue-200 bg-brand-blue-50/30' : ''}
                      `}
                    >
                      {format(date, 'd')}
                      {isTodayDate && <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full ${isSel ? 'bg-white' : 'bg-brand-blue-500'}`} />}
                    </button>
                  );
                })}
              </div>

              {!hideTime && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SAAT</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={format(value, 'HH')}
                      onChange={(e) => updateTime('h', e.target.value)}
                      className="uni-input w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-xs text-slate-700 outline-none focus:border-brand-blue-500"
                    />
                    <span className="font-black text-slate-300">:</span>
                    <input
                      type="text"
                      value={format(value, 'mm')}
                      onChange={(e) => updateTime('m', e.target.value)}
                      className="uni-input w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-xs text-slate-700 outline-none focus:border-brand-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCurrentMonth(today);
                    onChange(today);
                  }}
                  className="uni-control flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px]    hover:bg-slate-200 "
                >
                  BUGÜN
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="uni-control flex-1 py-2 uni-button-primary text-white rounded-xl text-[10px]     shadow-brand-blue-100  "
                >
                  KAPAT
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
