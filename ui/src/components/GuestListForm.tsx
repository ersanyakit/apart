import React, { useState } from 'react';
import { Plus, Trash2, User, CreditCard, Phone, MessageSquare, Search, History, X, Calendar, MapPin, Star, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Guest } from '../types';

interface GuestListFormProps {
  guests: Guest[];
  onChange: (guests: Guest[]) => void;
}

// Mock guest history for search demonstration
const GUEST_HISTORY: Guest[] = [
  { id: 'h1', name: 'FATİH YAKIT', tcNo: '12345678901', phone: '0532 111 22 33', note: 'VİP Müşteri - 104 nolu odayı sever' },
  { id: 'h2', name: 'MUSTAFA CAN', tcNo: '98765432109', phone: '0544 222 33 44', note: 'Sessiz oda tercih eder, iş seyahati' },
  { id: 'h3', name: 'BEYZA NUR', tcNo: '55667788990', phone: '0555 333 44 55', note: 'Kahvaltı dahil sevmez, erken çıkış yapabilir' },
  { id: 'h4', name: 'AYŞE YAKIT', tcNo: '11223344556', phone: '0533 444 55 66', note: 'Düzenli konaklayan misafir' },
  { id: 'h5', name: 'MURAT ÖZTÜRK', tcNo: '44556677889', phone: '0505 666 77 88', note: 'Fatura şirket adına kesilecek' },
];

export const GuestListForm: React.FC<GuestListFormProps> = ({ guests, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHistoryGuestId, setActiveHistoryGuestId] = useState<string | null>(null);

  const addGuest = () => {
    const newGuest: Guest = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      tcNo: '',
      phone: '',
      note: ''
    };
    onChange([...guests, newGuest]);
  };

  const removeGuest = (id: string) => {
    onChange(guests.filter(g => g.id !== id));
  };

  const updateGuest = (id: string, field: keyof Guest, value: string) => {
    onChange(guests.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const selectFromHistory = (targetGuestId: string, historicalGuest: Guest) => {
    onChange(guests.map(g => g.id === targetGuestId ? {
      ...historicalGuest,
      id: targetGuestId // Keep the internal state ID
    } : g));
    setActiveHistoryGuestId(null);
    setSearchQuery('');
  };

  const filteredHistory = GUEST_HISTORY.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.tcNo?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-blue-600 shadow-sm border border-slate-100">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">KONAKLAYAN MİSAFİRLER</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hızlı giriş için misafir geçmişi aktiftir</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addGuest}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 group whitespace-nowrap"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            YENİ MİSAFİR EKLE
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {guests.map((guest, index) => (
          <div
            key={guest.id}
            className="p-4 md:p-8 bg-white border border-slate-200 rounded-[32px] md:rounded-[40px] shadow-sm relative group animate-in fade-in slide-in-from-top-4 duration-500 hover:border-brand-blue-200 transition-all"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pl-2 md:pl-2">
              <div className="lg:col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">MİSAFİR BİLGİLERİ</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{index === 0 ? 'ASIL KONAKLAYAN' : 'EK MİSAFİR'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveHistoryGuestId(guest.id);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue-50 text-brand-blue-600 rounded-xl text-[9px] font-black hover:bg-brand-blue-100 transition-all border border-brand-blue-100/50 group"
                  >
                    <History className="w-3.5 h-3.5 transition-transform group-hover:rotate-[-45deg]" />
                    ARŞİVDEN GETİR
                  </button>

                  {guests.length > 1 && (
                    <button
                      onClick={() => removeGuest(guest.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black hover:bg-rose-100 transition-all border border-rose-100/50 group/del"
                      title="Misafiri Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5 group-hover/del:scale-110" />
                      SİL
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-1.5 order-2 lg:order-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <User className="w-3 h-3" /> TAM AD SOYAD
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={guest.name || ''}
                    onChange={(e) => updateGuest(guest.id, 'name', e.target.value.toUpperCase())}
                    placeholder="MİSAFİR ADI VE SOYADI"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-500 outline-none transition-all shadow-inner uppercase"
                  />
                  {guest.name && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                       <ShieldCheck className="w-5 h-5 text-emerald-500 opacity-50" />
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-1.5 order-3 lg:order-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <CreditCard className="w-3 h-3" /> T.C. NO / PASAPORT
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={guest.tcNo || ''}
                  onChange={(e) => updateGuest(guest.id, 'tcNo', e.target.value.replace(/\D/g, ''))}
                  placeholder="KİMLİK NUMARASI"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-500 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="lg:col-span-4 space-y-1.5 order-4 lg:order-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> İLETİŞİM NO
                </label>
                <input
                  type="text"
                  value={guest.phone || ''}
                  onChange={(e) => updateGuest(guest.id, 'phone', e.target.value)}
                  placeholder="TELEFON NUMARASI"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-500 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="lg:col-span-12 space-y-1.5 order-5 lg:order-4 pt-4 border-t border-slate-50 mt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> MİSAFİR ÖZEL NOTU / AYRINTILAR
                </label>
                <textarea
                  rows={2}
                  value={guest.note || ''}
                  onChange={(e) => updateGuest(guest.id, 'note', e.target.value)}
                  placeholder="ÖZEL TALEPLER, ALERJİLER VEYA KİMLİK AYRINTILARI..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[32px] text-sm font-bold text-slate-700 focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-500 outline-none transition-all resize-none shadow-inner"
                />
              </div>
            </div>
          </div>
        ))}

        {guests.length === 0 && (
          <div className="py-20 border-4 border-dashed border-slate-100 rounded-[48px] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border-2 border-slate-100">
               <User className="w-10 h-10" />
            </div>
            <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Henüz misafir eklenmedi</p>
            <button
              onClick={addGuest}
              className="mt-6 px-10 py-4 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-brand-blue-600 transition-all shadow-xl shadow-slate-200 animate-bounce"
            >
              İLK MİSAFİRİ EKLE
            </button>
          </div>
        )}
      </div>

      {/* Modern High-End History Modal */}
      <AnimatePresence>
        {activeHistoryGuestId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveHistoryGuestId(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl shadow-black/20 overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="bg-slate-50/50 p-6 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center text-brand-blue-600 ring-2 ring-slate-100">
                      <History className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">MİSAFİR ARŞİVİ</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-brand-blue-500 uppercase tracking-widest bg-brand-blue-50 px-1.5 py-0.5 rounded border border-brand-blue-100">
                           GÜVENLİ VERİ
                        </span>
                      </div>
                   </div>
                </div>
                <button
                  onClick={() => setActiveHistoryGuestId(null)}
                  className="p-2.5 bg-white hover:bg-slate-100 text-slate-400 rounded-xl transition-all border border-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Search Box */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="İsim veya T.C. Kimlik ile ara..."
                    className="w-full pl-11 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-black text-slate-800 outline-none focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-300 transition-all placeholder:text-slate-300"
                  />
                </div>

                {/* Results List */}
                <div className="max-h-[350px] overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-2">
                  {filteredHistory.map(h => (
                    <button
                      key={h.id}
                      onClick={() => selectFromHistory(activeHistoryGuestId, h)}
                      className="w-full p-4 group relative rounded-2xl text-left transition-all bg-white border border-slate-100 hover:border-brand-blue-300 hover:bg-brand-blue-50/30 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-brand-blue-600 transition-all border border-slate-50">
                            <User className="w-6 h-6" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-sm font-black text-slate-700 group-hover:text-brand-blue-700 uppercase tracking-tight">{h.name}</p>
                            <div className="flex items-center gap-3">
                               <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" /> {h.tcNo}
                               </p>
                               <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {h.phone}
                               </p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-slate-900 group-hover:bg-brand-blue-600 text-white px-4 py-2 rounded-lg text-[9px] font-black transition-all shadow-lg shadow-slate-100 uppercase tracking-widest">
                         AKTAR
                      </div>
                    </button>
                  ))}

                  {filteredHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-white">
                       <Search className="w-8 h-8 text-slate-200 mb-3" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kayıt Bulunamadı</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOPLAM {GUEST_HISTORY.length} KAYIT</p>
                <button
                  onClick={() => setActiveHistoryGuestId(null)}
                  className="px-6 py-2.5 bg-white text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  KAPAT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
