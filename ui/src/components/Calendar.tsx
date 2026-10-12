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
    <div className="bg-brand-blue-900 rounded-2xl overflow-hidden shadow-lg shadow-brand-blue-100 ring-4 ring-white border border-slate-100">
      <div className="bg-brand-blue-800 p-3 flex items-center justify-between text-white border-b border-brand-blue-700">
        <span className="text-xs font-black tracking-widest uppercase">
          {format(currentMonth, 'MMMM yyyy', { locale: tr })}
        </span>
        <div className="flex gap-2">
          <ChevronLeft className="w-3.5 h-3.5 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" onClick={prevMonth} />
          <ChevronRight className="w-3.5 h-3.5 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" onClick={nextMonth} />
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
            <div
              key={date.toString()}
              onClick={() => onSelect(date)}
              className={`
                text-[11px] font-bold h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer
                ${isSameDay(date, selectedDate) ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'text-slate-600 hover:bg-slate-100'}
                ${isSameDay(date, new Date()) ? 'ring-1 ring-red-200' : ''}
              `}
            >
              {format(date, 'd')}
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const now = new Date();
            setCurrentMonth(now);
            onSelect(now);
          }}
          className="w-full mt-3 bg-brand-blue-50 text-brand-blue-600 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue-100 transition-colors"
        >
          Bugün
        </button>
      </div>
    </div>
  );
};
