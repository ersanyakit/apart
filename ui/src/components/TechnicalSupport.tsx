import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Search,
  MessageSquare,
  User,
  Calendar,
  ArrowLeft,
  Save,
  Trash2,
  Send,
  FileText,
  Tag,
  ShieldCheck,
  Package,
  Monitor,
  Zap,
  Droplets,
  Hammer,
  HelpCircle
} from 'lucide-react';

interface SupportRequest {
  id: string;
  roomNumber: string;
  category: 'Elektrik' | 'Tesisat' | 'Marangoz' | 'Yazılım' | 'Ürün' | 'Genel';
  description: string;
  status: 'Beklemede' | 'Devam Ediyor' | 'Tamamlandı';
  priority: 'Düşük' | 'Normal' | 'Yüksek' | 'Acil';
  createdAt: string;
  assignedTo?: string;
  notes?: string;
}

const MOCK_REQUESTS: SupportRequest[] = [
  { id: '1', roomNumber: '204', category: 'Elektrik', description: 'Klima soğutma yapmıyor, ses çıkarıyor.', status: 'Beklemede', priority: 'Yüksek', createdAt: '2026-05-04 09:15', notes: 'Dış ünite kontrol edilmeli.' },
  { id: '2', roomNumber: '102', category: 'Tesisat', description: 'Banyo bataryası su sızdırıyor.', status: 'Devam Ediyor', priority: 'Normal', createdAt: '2026-05-04 08:30', assignedTo: 'Murat Teknik', notes: 'Conta değişimi gerekebilir.' },
  { id: '3', roomNumber: '305', category: 'Elektrik', description: 'TV kumandası çalışmıyor pilleri bitmiş olabilir.', status: 'Tamamlandı', priority: 'Düşük', createdAt: '2026-05-03 16:45', assignedTo: 'Ahmet Teknik', notes: 'Piller değiştirildi.' },
  { id: '4', roomNumber: 'Sistem', category: 'Yazılım', description: 'Giriş kartı sistemi yazılımı yanıt vermiyor.', status: 'Beklemede', priority: 'Acil', createdAt: '2026-05-04 10:00', notes: 'Sunucu bağlantısı kontrol edilmeli.' },
];

interface TechnicalSupportProps {
  onSubmit?: (data: any) => void;
}

export const TechnicalSupport: React.FC<TechnicalSupportProps> = ({ onSubmit }) => {
  const [requests, setRequests] = useState<SupportRequest[]>(MOCK_REQUESTS);
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newRequest, setNewRequest] = useState({
    roomNumber: '',
    category: 'Genel' as any,
    priority: 'Normal' as any,
    description: '',
    notes: ''
  });

  const handleSendRequest = () => {
    const freshRequest: SupportRequest = {
      id: Math.random().toString(36).substr(2, 9),
      ...newRequest,
      status: 'Beklemede',
      createdAt: new Date().toLocaleString('tr-TR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
    };

    setRequests([freshRequest, ...requests]);
    setView('list');
    onSubmit?.(freshRequest);
    setNewRequest({ roomNumber: '', category: 'Genel', priority: 'Normal', description: '', notes: '' });
  };

  const filtered = requests.filter(r =>
    r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRequest = requests.find(r => r.id === selectedRequestId);

  const renderView = () => {
    if (view === 'new') {
      return (
        <motion.div
          key="new"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden"
        >
          {/* Internal Header */}
          <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setView('list')}
                className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all border border-slate-100 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <Plus className="w-6 h-6 text-orange-600" />
                  Yeni Teknik Talep Formu
                </h2>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-orange-50 text-orange-600">
                     ARIZA BİLDİRİMİ
                   </span>
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                     LÜTFEN SORUNU DETAYLICA TANIMLAYIN
                   </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <button
                 onClick={() => setView('list')}
                 className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
               >
                 İPTAL ET
               </button>
               <button
                 onClick={handleSendRequest}
                 className="px-10 py-3 rounded-2xl text-xs font-black text-white shadow-xl transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95 bg-orange-600 shadow-orange-200"
               >
                 <Send className="w-4 h-4" />
                 TALEBİ GÖNDER
               </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-8 space-y-6">
                <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/60 ring-1 ring-slate-100 space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 tracking-tight">TALEP DETAYLARI</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Temel ariza bilgileri</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">LOKASYON / ODA</label>
                      <input
                        type="text"
                        value={newRequest.roomNumber}
                        onChange={(e) => setNewRequest({...newRequest, roomNumber: e.target.value})}
                        placeholder="Örn: 204 veya Resepsiyon"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div className="md:col-span-12 space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KATEGORİ SEÇİN</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { id: 'Elektrik', label: 'ELEKTRİK', icon: <Zap className="w-5 h-5" /> },
                          { id: 'Tesisat', label: 'TESİSAT', icon: <Droplets className="w-5 h-5" /> },
                          { id: 'Marangoz', label: 'MARANGOZ', icon: <Hammer className="w-5 h-5" /> },
                          { id: 'Yazılım', label: 'YAZILIM', icon: <Monitor className="w-5 h-5" /> },
                          { id: 'Ürün', label: 'ÜRÜN', icon: <Package className="w-5 h-5" /> },
                          { id: 'Genel', label: 'GENEL', icon: <HelpCircle className="w-5 h-5" /> },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setNewRequest({...newRequest, category: cat.id as any})}
                            className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all gap-2 group hover:scale-[1.02] active:scale-95 ${
                              newRequest.category === cat.id
                                ? 'bg-orange-600 border-orange-600 text-white shadow-xl shadow-orange-100 ring-4 ring-orange-500/10'
                                : 'bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:bg-orange-50/30'
                            }`}
                          >
                            <div className={`p-2 rounded-xl transition-colors ${
                              newRequest.category === cat.id ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-orange-100/50 group-hover:text-orange-600'
                            }`}>
                              {cat.icon}
                            </div>
                            <span className="text-[10px] font-black tracking-widest">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ARIZA / SORUN AÇIKLAMASI</label>
                    <textarea
                      rows={5}
                      value={newRequest.description}
                      onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                      placeholder="Lütfen teknik sorunu buraya açıklayın..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none resize-none transition-all"
                    />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/60 ring-1 ring-slate-100 space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 tracking-tight">EK NOTLAR</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Teknik ekibe iletilecek notlar</p>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={newRequest.notes}
                    onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                    placeholder="Varsa eklemek istediğiniz notlar..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none resize-none transition-all"
                  />
                </section>
              </div>

              <div className="md:col-span-4 space-y-6">
                <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/60 ring-1 ring-slate-100 space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 tracking-tight">ÖNCELİK</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aciliyet durumu belirtin</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {['Düşük', 'Normal', 'Yüksek', 'Acil'].map(p => (
                      <button
                        key={p}
                        onClick={() => setNewRequest({...newRequest, priority: p as any})}
                        className={`py-3 rounded-2xl text-[10px] font-black border transition-all ${
                          newRequest.priority === p
                            ? 'bg-orange-600 border-orange-600 text-white shadow-lg'
                            : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="p-6 bg-orange-600 rounded-[32px] shadow-xl shadow-orange-100 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative z-10 space-y-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                       <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                       <h4 className="font-black text-sm uppercase tracking-wider">Bilgilendirme</h4>
                       <p className="text-[10px] font-bold text-white/70 leading-relaxed mt-2 italic">
                         "Talep gönderildikten sonra teknik ekip paneline anlık olarak düşecektir. Acil talepler için bildirim sesi aktif edilecektir."
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (view === 'detail' && selectedRequest) {
      return (
        <motion.div
          key="detail"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setView('list')}
                className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all border border-slate-100 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <FileText className="w-6 h-6 text-brand-blue-600" />
                  Teknik Talep Detayı
                </h2>
                <div className="flex items-center gap-3 mt-1">
                   <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${getStatusBgStyle(selectedRequest.status)} ${getStatusTextStyle(selectedRequest.status)}`}>
                     {selectedRequest.status}
                   </span>
                   <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                     KAYIT NO: <span className="text-slate-900 font-black">#T-{selectedRequest.id.toUpperCase()}</span>
                   </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
               {selectedRequest.status !== 'Tamamlandı' && (
                 <button
                   onClick={() => {
                     setRequests(requests.map(r => r.id === selectedRequest.id ? {...r, status: 'Tamamlandı'} : r));
                     setView('list');
                   }}
                   className="px-10 py-3 rounded-2xl text-xs font-black text-white shadow-xl transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95 bg-green-600 shadow-green-200"
                 >
                   <CheckCircle2 className="w-4 h-4" />
                   TALEBİ TAMAMLA
                 </button>
               )}
               <button
                 onClick={() => {
                   setRequests(requests.filter(r => r.id !== selectedRequest.id));
                   setView('list');
                 }}
                 className="p-3 text-red-500 hover:bg-red-50 rounded-2xl border border-transparent hover:border-red-100 transition-all"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-8 space-y-6">
                <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 ring-1 ring-slate-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1.5">ARIZA TANIMI</p>
                       <h3 className="text-xl font-bold text-slate-800 leading-tight">{selectedRequest.description}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                     <div className="space-y-1.5">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                           <Tag className="w-3.5 h-3.5" /> KATEGORİ
                        </p>
                        <p className="text-base font-black text-slate-700">{selectedRequest.category}</p>
                     </div>
                     <div className="space-y-1.5">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                           <Calendar className="w-3.5 h-3.5" /> KAYIT TARİHİ
                        </p>
                        <p className="text-base font-black text-slate-700">{selectedRequest.createdAt}</p>
                     </div>
                  </div>
                </section>

                <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 ring-1 ring-slate-100">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500">
                       <MessageSquare className="w-5 h-5" />
                     </div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">EK NOTLAR VE GÜNCELLEMELER</h3>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100">
                     <p className="text-sm font-medium text-slate-600 italic">
                        {selectedRequest.notes || 'Herhangi bir ek not bulunmuyor.'}
                     </p>
                  </div>
                </section>
              </div>

              <div className="md:col-span-4 space-y-6">
                <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden flex flex-col">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl" />

                    <div className="relative z-10 mb-8 border-b border-white/10 pb-6">
                       <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-5">KONUM BİLGİSİ</p>
                       <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-white/10 rounded-[22px] flex flex-col items-center justify-center font-black border border-white/5 shadow-2xl">
                             <span className="text-[10px] opacity-60 uppercase tracking-tighter">BÖLÜM</span>
                             <span className="text-2xl leading-none mt-0.5">{selectedRequest.roomNumber}</span>
                          </div>
                          <div>
                             <p className="font-black text-lg uppercase tracking-tight">
                               {selectedRequest.roomNumber === 'Sistem' ? 'MERKEZİ ÜNİTE' : `KONAKLAMA ÜNİTESİ`}
                             </p>
                             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                               {selectedRequest.roomNumber === 'Sistem' ? 'YAZILIM VE ALTYAPI' : 'OTEL KAT PLANI / HİZMET ALANI'}
                             </p>
                          </div>
                       </div>
                    </div>

                   <div className="relative z-10 space-y-6">
                      <div>
                         <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3">PERSONEL ATAMASI</p>
                         <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/60">
                               <User className="w-4.5 h-4.5" />
                            </div>
                            <span className="text-base font-bold text-slate-300">{selectedRequest.assignedTo || 'Henüz Atanmadı'}</span>
                         </div>
                      </div>
                      <div>
                         <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3">ÖNCELİK DURUMU</p>
                         <div className={`inline-flex px-4 py-1.5 rounded-xl text-[11px] font-black border ${getPriorityStyle(selectedRequest.priority)}`}>
                            {selectedRequest.priority.toUpperCase()}
                         </div>
                      </div>
                   </div>

                   <div className="mt-12 relative z-10">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-[28px] flex items-center gap-3">
                         <Clock className="w-4.5 h-4.5 text-brand-blue-400" />
                         <span className="text-[11px] font-bold text-slate-400">Tahmini Müdahale: 15 Dakika</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden"
      >
        {/* Header Area */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-orange-600 shadow-xl shadow-orange-100/50 border border-slate-100 ring-4 ring-slate-50/50 transition-transform hover:rotate-3 cursor-pointer shrink-0">
               <Wrench className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Teknik Destek Merkezi</h2>
              <div className="flex items-center gap-2 mt-0.5">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Teknik ekip çevrimiçi (4 Personel)</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <div className="relative group flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                placeholder="Talep no veya oda ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-300 transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => setView('new')}
              className="flex items-center justify-center gap-2 bg-orange-600 text-white px-7 py-3.5 rounded-[22px] text-xs font-black hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 hover:scale-[1.02] active:scale-95 group whitespace-nowrap"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
              YENİ TALEP OLUŞTUR
            </button>
          </div>
        </div>

        {/* Stats Summary Area */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="BEKLEYEN" value={requests.filter(r => r.status === 'Beklemede').length} color="bg-orange-500" icon={<Clock className="w-5 h-5" />} />
          <StatCard label="MÜDAHALE EDİLEN" value={requests.filter(r => r.status === 'Devam Ediyor').length} color="bg-brand-blue-500" icon={<AlertCircle className="w-5 h-5" />} />
          <StatCard label="ÇÖZÜLENLER" value={requests.filter(r => r.status === 'Tamamlandı').length} color="bg-emerald-500" icon={<CheckCircle2 className="w-5 h-5" />} />
          <StatCard label="KATEGORİLER" value={6} color="bg-slate-800" icon={<Monitor className="w-5 h-5" />} />
        </div>

        {/* Main Request List Area */}
        <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
            {filtered.map((req, idx) => (
              <motion.div
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: idx * 0.05 }}
                 key={req.id}
                 onClick={() => { setSelectedRequestId(req.id); setView('detail'); }}
                 className="bg-white rounded-[32px] p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group flex items-start gap-6 relative overflow-hidden cursor-pointer active:scale-[0.99]"
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  req.status === 'Beklemede' ? 'bg-orange-500' :
                  req.status === 'Devam Ediyor' ? 'bg-brand-blue-500' : 'bg-emerald-500'
                }`}></div>

                <div className={`w-16 h-16 rounded-[22px] flex flex-col items-center justify-center font-black shrink-0 transition-transform group-hover:scale-105 ${req.priority === 'Acil' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-800'}`}>
                  <span className="text-[9px] uppercase mb-0.5 opacity-50">ODA</span>
                  <span className="text-xl leading-none">{req.roomNumber}</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border tracking-wider shadow-sm ${getPriorityStyle(req.priority)}`}>
                      {req.priority.toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 tracking-widest uppercase">
                       {getCategoryIcon(req.category)}
                       {req.category}
                    </span>
                    <span className="text-[10px] text-slate-300 ml-auto font-black flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {req.createdAt.split(' ').pop()}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-1 leading-tight group-hover:text-brand-blue-600 transition-colors">{req.description}</h4>
                  <div className="flex items-center gap-4 mt-4">
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <User className="w-3 h-3 text-slate-300" />
                        <span className="text-slate-600">{req.assignedTo || 'BOŞTA'}</span>
                     </div>
                     <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ml-auto ${getStatusTextStyle(req.status)}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {req.status}
                     </div>
                  </div>
                </div>

                <div className="self-center bg-slate-50 p-2.5 rounded-2xl group-hover:bg-brand-blue-50 group-hover:text-brand-blue-600 transition-all text-slate-300">
                   <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200">
                 <AlertCircle className="w-20 h-20 text-slate-200 mb-6" />
                 <p className="text-slate-400 font-black text-lg uppercase tracking-[0.2em]">Sonuç Bulunamadı</p>
                 <p className="text-slate-300 text-sm font-bold mt-2">Arama kriterlerinizi kontrol edin veya yeni bir talep oluşturun.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {renderView()}
    </AnimatePresence>
  );
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Elektrik': return <Zap className="w-3 h-3" />;
    case 'Tesisat': return <Droplets className="w-3 h-3" />;
    case 'Marangoz': return <Hammer className="w-3 h-3" />;
    case 'Yazılım': return <Monitor className="w-3 h-3" />;
    case 'Ürün': return <Package className="w-3 h-3" />;
    case 'Genel': return <HelpCircle className="w-3 h-3" />;
    default: return null;
  }
};

const StatCard = ({ label, value, color, icon }: { label: string, value: number, color: string, icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-200/60 shadow-sm flex items-center justify-between group hover:shadow-md transition-all cursor-default">
    <div className="flex flex-col">
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
       <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
    </div>
    <div className={`w-14 h-14 ${color} rounded-[22px] flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3`}>
      {icon}
    </div>
  </div>
);

const getPriorityStyle = (p: string) => {
  switch (p) {
    case 'Acil': return 'bg-rose-50 text-rose-600 border-rose-100';
    case 'Yüksek': return 'bg-orange-50 text-orange-600 border-orange-100';
    case 'Normal': return 'bg-brand-blue-50 text-brand-blue-600 border-brand-blue-100';
    default: return 'bg-slate-50 text-slate-400 border-slate-200';
  }
};

const getStatusBgStyle = (s: string) => {
  switch (s) {
    case 'Tamamlandı': return 'bg-emerald-50';
    case 'Devam Ediyor': return 'bg-brand-blue-50';
    default: return 'bg-orange-50';
  }
};

const getStatusTextStyle = (s: string) => {
  switch (s) {
    case 'Tamamlandı': return 'text-emerald-500';
    case 'Devam Ediyor': return 'text-brand-blue-500';
    default: return 'text-orange-500';
  }
};
