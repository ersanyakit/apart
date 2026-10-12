import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export const ReservationCalendar: React.FC<CalendarProps> = ({ selectedDate, onSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const days = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const dateInterval = eachDayOfInterval({ start, end });

  const startDay = (getDay(start) + 6) % 7; // Adjust for Monday start

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="uni-card bg-white rounded-2xl overflow-hidden border border-uni-border">
      <div className="bg-uni-surface p-3 flex items-center justify-between text-uni-ink border-b border-uni-border">
        <span className="text-xs font-medium">
          {format(currentMonth, 'MMMM yyyy', { locale: tr })}
        </span>
        <div className="flex gap-2">
          <button type="button" aria-label="Önceki ay" className="uni-control rounded-lg p-1 hover:bg-uni-hover" onClick={prevMonth}><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Sonraki ay" className="uni-control rounded-lg p-1 hover:bg-uni-hover" onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="p-3 bg-white">
        <div className="grid grid-cols-7 mb-2">
          {days.map((day, i) => (
            <div key={i} className="text-[9px] font-black text-slate-300 text-center uppercase tracking-tighter">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-7 w-7" />
          ))}
          {dateInterval.map((date) => (
            <button
              type="button"
              aria-label={format(date, "d MMMM yyyy", { locale: tr })}
              aria-pressed={isSameDay(date, selectedDate)}
              key={date.toString()}
              onClick={() => onSelect(date)}
              className={`
                uni-control text-[11px] font-medium h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer
                ${isSameDay(date, selectedDate) ? 'uni-button-primary' : 'text-slate-600 hover:bg-slate-100'}
                ${isSameDay(date, new Date()) ? 'ring-1 ring-brand-blue-300' : ''}
              `}
            >
              {format(date, 'd')}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const now = new Date();
            setCurrentMonth(now);
            onSelect(now);
          }}
          className="uni-control w-full mt-3 bg-brand-blue-50 text-brand-blue-600 py-2 rounded-lg text-[10px]    hover:bg-brand-blue-100 "
        >
          Bugün
        </button>
      </div>
    </div>
  );
};
