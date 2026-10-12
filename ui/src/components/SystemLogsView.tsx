import React from 'react';
import { motion } from 'motion/react';
import {
  History,
  Activity,
  User as UserIcon,
  MessageSquare,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { SystemLog } from '../types';

interface SystemLogsViewProps {
  logs: SystemLog[];
}

export const SystemLogsView: React.FC<SystemLogsViewProps> = ({ logs }) => {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-brand-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-blue-100 shrink-0">
              <History className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sistem Logları</h2>
              <p className="text-sm text-slate-400 font-medium italic mt-1">Sistem üzerinde gerçekleştirilen tüm işlemlerin detaylı geçmişi.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button className="uni-control flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px]    text-slate-500 hover:bg-slate-50  shadow-sm">
                <Download className="w-3.5 h-3.5" />
                Dışa Aktar (CSV)
             </button>
             <div className="flex items-center gap-2 px-4 py-2 bg-brand-blue-50 border border-brand-blue-100 rounded-xl text-brand-blue-600 text-[10px] font-black uppercase tracking-widest">
                <Activity className="w-3.5 h-3.5" />
                CANLI TAKİP AKTİF
              </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input
              type="text"
              placeholder="LOGLARDA ARA (GERÇEKLEŞTİREN, EYLEM, AÇIKLAMA...)"
              className="uni-input w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-500 transition-all shadow-sm"
            />
          </div>
          <button className="uni-control px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px]    text-slate-400 hover:text-slate-600 flex items-center gap-3  shrink-0">
             <Filter className="w-4 h-4" />
             Filtrele
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ZAMANLAMA</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">EYLEM TİPİ</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PERSONEL</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">İŞLEM DETAYI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log, index) => (
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={log.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 tracking-tight">{new Date(log.date).toLocaleDateString('tr-TR')}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(log.date).toLocaleTimeString('tr-TR')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                        log.action.includes('Hata') || log.action.includes('İptal') || log.action.includes('Silme')
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : log.action.includes('Değişim') || log.action.includes('Güncelleme')
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-brand-blue-50 text-brand-blue-600 border-brand-blue-100'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-600 group-hover:text-white transition-all shadow-inner">
                           <UserIcon className="w-4 h-4" />
                         </div>
                         <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{log.performer}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-brand-blue-500 transition-colors shrink-0" />
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">{log.description}</p>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                          <History className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">HERHANGİ BİR KAYIT BULUNAMADI</p>
                          <p className="text-[10px] text-slate-200 uppercase mt-1">Sistem hareketleri henüz kaydedilmemiş.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
