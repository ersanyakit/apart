import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  UserX,
  Calendar,
  User,
  FileText,
  X,
  AlertTriangle,
  History
} from 'lucide-react';
import { BlacklistItem } from '../types';

interface BlacklistViewProps {
  blacklist: BlacklistItem[];
  onAdd: (item: BlacklistItem) => void;
  onRemove: (id: string) => void;
  currentUser: any;
}

export const BlacklistView: React.FC<BlacklistViewProps> = ({ blacklist, onAdd, onRemove, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BlacklistItem>>({
    name: '',
    idNumber: '',
    reason: '',
    note: ''
  });

  const filteredList = blacklist.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.idNumber?.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.reason) return;

    const item: BlacklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      idNumber: newItem.idNumber,
      reason: newItem.reason,
      addedBy: currentUser.name,
      addedAt: new Date().toISOString(),
      note: newItem.note
    };

    onAdd(item);
    setIsAdding(false);
    setNewItem({ name: '', idNumber: '', reason: '', note: '' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-100 shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Kara Liste Yönetimi</h2>
              <p className="text-sm text-slate-400 font-medium italic mt-1">Girişi yasaklanmış veya sorunlu müşteri kayıtlarını buradan takip edebilirsiniz.</p>
            </div>
          </div>
          <motion.button
            onClick={() => setIsAdding(true)}
            className="uni-control flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl text-[10px]   tracking-[0.2em]  shadow-red-100    hover:bg-red-700 active:bg-red-700  cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Kayıt Ekle
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input
            type="text"
            placeholder="İSİM VEYA KİMLİK NO İLE ARA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="uni-input w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[32px] text-xs font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500 transition-all shadow-sm"
          />
        </div>

        {/* Add Modal */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="uni-card bg-white border-2 border-red-100 rounded-[32px] p-8 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-red-500" />
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                  <UserX className="w-5 h-5 text-red-500" />
                  KARA LİSTE KAYIT FORMU
                </h3>
                <button onClick={() => setIsAdding(false)} className="uni-control p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MÜŞTERİ ADI SOYADI</label>
                    <input
                      autoFocus
                      required
                      placeholder="Örn: Ahmet Yılmaz"
                      value={newItem.name}
                      onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      className="uni-input w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-red-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KİMLİK / PASAPORT NO</label>
                    <input
                      placeholder="Örn: 12345678901"
                      value={newItem.idNumber}
                      onChange={e => setNewItem(prev => ({ ...prev, idNumber: e.target.value }))}
                      className="uni-input w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">EKLENME NEDENİ</label>
                    <select
                      required
                      value={newItem.reason}
                      onChange={e => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                      className="uni-input w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-red-500 transition-all"
                    >
                      <option value="">Neden Seçiniz...</option>
                      <option value="Ödeme Sorunu">Ödeme Sorunu</option>
                      <option value="Taşkınlık / Gürültü">Taşkınlık / Gürültü</option>
                      <option value="Eşyaya Zarar Verme">Eşyaya Zarar Verme</option>
                      <option value="Kaçak Konaklama">Kaçak Konaklama</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DETAYLI NOT</label>
                    <textarea
                      placeholder="Durumla ilgili eklemek istediğiniz notlar..."
                      value={newItem.note}
                      onChange={e => setNewItem(prev => ({ ...prev, note: e.target.value }))}
                      className="uni-input w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-red-500 transition-all min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="uni-control px-6 py-3 text-slate-400  text-[10px]   hover:text-slate-600 "
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="uni-control px-10 py-3 bg-red-600 text-white rounded-2xl text-[10px]   tracking-[0.2em]  shadow-red-100 hover:bg-red-700 "
                  >
                    LİSTEYE EKLE
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Blacklist Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredList.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="bg-red-50/50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">YASAKLI KAYIT</span>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="uni-control p-2 text-red-300 hover:text-red-600 hover:bg-red-100 rounded-xl "
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-red-500 group-hover:text-white transition-all shrink-0 shadow-inner">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.idNumber || 'KİMLİK BİLGİSİ YOK'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      NEDEN
                    </span>
                    <p className="text-[11px] font-black text-red-600 uppercase truncate">{item.reason}</p>
                  </div>
                  <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-3 h-3 text-brand-blue-500" />
                      EKLEYEN
                    </span>
                    <p className="text-[11px] font-black text-slate-700 uppercase truncate">{item.addedBy}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YÖNETİCİ NOTU</span>
                  </div>
                  <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl italic text-xs text-slate-500 font-medium">
                    {item.note || 'Eklenmiş bir not bulunmamaktadır.'}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                   <span className="flex items-center gap-1.5">
                      <History className="w-3 h-3" />
                      {new Date(item.addedAt).toLocaleDateString('tr-TR')}
                   </span>
                   <span>Kayıt ID: {item.id}</span>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredList.length === 0 && (
            <div className="uni-card md:col-span-2 py-20 bg-white border border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center text-center gap-4">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                  <UserX className="w-10 h-10" />
               </div>
               <div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">KARA LİSTE TEMİZ</p>
                  <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Herhangi bir yasaklı kayıt bulunamadı.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
