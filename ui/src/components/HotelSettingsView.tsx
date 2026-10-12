import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Hash,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  PlusCircle,
  X,
  Camera
} from 'lucide-react';
import { HotelConfig } from '../types';

interface HotelSettingsViewProps {
  config: HotelConfig;
  onUpdate: (config: HotelConfig) => void;
}

export const HotelSettingsView: React.FC<HotelSettingsViewProps> = ({ config, onUpdate }) => {
  const [formData, setFormData] = useState<HotelConfig>(config);
  const [isSaved, setIsSaved] = useState(false);
  const [showLogoInput, setShowLogoInput] = useState(false);
  const [showCoverInput, setShowCoverInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] custom-scrollbar">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 md:p-12 space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">TESİS AYARLARI</h2>
            <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-blue-500 rounded-full animate-pulse" />
              Kurumsal Kimlik ve Operasyonel Bilgiler
            </p>
          </div>
          <button
            type="submit"
            className="uni-control flex items-center gap-3 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[11px]    hover:bg-black active:bg-black     shadow-slate-200  cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" />
            DEĞİŞİKLİKLERİ KAYDET
          </button>
        </div>

        {/* Brand Asset Preview */}
        <div className="relative">
          {/* Cover Asset */}
          <div className="h-64 w-full bg-slate-100 rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm relative group">
            {formData.coverUrl ? (
              <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                <Camera size={40} className="mb-2 opacity-20" />
                <span className="text-[10px] font-black uppercase tracking-widest">KAPAK GÖRSELİ EKLENMEDİ</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowCoverInput(!showCoverInput)}
              className="uni-control absolute top-6 right-6 px-4 py-2 bg-white/90 backdrop-blur-md text-slate-900 rounded-xl text-[10px]     hover:bg-white  flex items-center gap-2 opacity-0 group-hover:opacity-100"
            >
              <Camera size={14} /> GÖRSELİ DEĞİŞTİR
            </button>

            {showCoverInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="uni-card absolute top-20 right-6 w-80 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl z-20"
              >
                <input
                  autoFocus
                  placeholder="Kapak Görsel URL girin..."
                  className="uni-input w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-brand-blue-500"
                  value={formData.coverUrl || ''}
                  onChange={e => setFormData({...formData, coverUrl: e.target.value})}
                  onKeyDown={e => e.key === 'Enter' && setShowCoverInput(false)}
                />
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => setShowCoverInput(false)} className="uni-control flex-1 py-3 uni-button-primary text-white rounded-xl text-[10px]   ">TAMAM</button>
                  <button type="button" onClick={() => { setFormData({...formData, coverUrl: ''}); setShowCoverInput(false); }} className="uni-control px-4 py-3 bg-red-50 text-red-600 rounded-xl text-[10px]   ">KALDIR</button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Logo Asset Overlay */}
          <div className="absolute -bottom-10 left-12 group">
            <div className="uni-card w-32 h-32 bg-white rounded-[32px] p-2 shadow-2xl shadow-slate-900/10 border border-slate-100 relative">
              <div className="w-full h-full bg-slate-50 rounded-[24px] overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-100 group-hover:border-brand-blue-200 transition-all duration-150 ease-out">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-200" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowLogoInput(!showLogoInput)}
                className="uni-control absolute -bottom-2 -right-2 w-10 h-10 uni-button-primary text-white rounded-xl flex items-center justify-center        cursor-pointer"
              >
                {showLogoInput ? <X size={20} /> : <PlusCircle size={20} />}
              </button>
            </div>

            {showLogoInput && (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="uni-card absolute left-full bottom-0 ml-4 w-72 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl z-20"
              >
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Logo Kaynağı (URL)</p>
                <input
                  autoFocus
                  placeholder="https://gorsel-linki.com/logo.png"
                  className="uni-input w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-brand-blue-500"
                  value={formData.logoUrl || ''}
                  onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                  onKeyDown={e => e.key === 'Enter' && setShowLogoInput(false)}
                />
                <button type="button" onClick={() => setShowLogoInput(false)} className="uni-control w-full mt-3 py-3 uni-button-primary text-white rounded-xl text-[10px]   ">GÜNCELLE</button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-10">

          {/* Identity & Legal */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="uni-card bg-white border border-slate-200/60 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">TEMEL TESİS BİLGİLERİ</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">TESİS ADI / TİCARİ ÜNVAN</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="uni-input w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black text-slate-800 outline-none focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-500/50 transition-all placeholder:text-slate-300"
                    placeholder="Grand Hotel Luxury Resort..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">VERGİ DAİRESİ</label>
                  <input
                    value={formData.taxOffice || ''}
                    onChange={e => setFormData({...formData, taxOffice: e.target.value})}
                    className="uni-input w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-brand-blue-500/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">VERGİ NUMARASI</label>
                  <input
                    value={formData.taxNumber || ''}
                    onChange={e => setFormData({...formData, taxNumber: e.target.value})}
                    className="uni-input w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-brand-blue-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="uni-card bg-white border border-slate-200/60 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-blue-50 text-brand-blue-600 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">KONUM VE TANITIM</h3>
              </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">AÇIK ADRES</label>
                    <textarea
                      rows={3}
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="uni-input w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-brand-blue-500/50 transition-all resize-none"
                      placeholder="Bölge, mahalle, sokak ve kapı numarası..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">TESİS HAKKINDA AÇIKLAMA</label>
                    <textarea
                      rows={6}
                      value={formData.description || ''}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="uni-input w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium leading-relaxed text-slate-600 outline-none focus:border-brand-blue-500/50 transition-all resize-none"
                      placeholder="Tesisinizin özellikleri, manzarası ve sunduğu ayrıcalıklar hakkında detaylı bilgi verin..."
                    />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-2 px-1">
                      <Hash size={10} /> Bu alan misafirler için düzenlenecek dökümanlarda yer alabilir.
                    </p>
                  </div>
                </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-4 space-y-8">
            <div className="uni-card bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue-50 text-brand-blue-600 flex items-center justify-center">
                  <Phone size={20} />
                </div>
                <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">İLETİŞİM KANALLARI</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">RESMİ TELEFON</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      required
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="uni-input w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-brand-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">YAZIŞMA E-POSTASI</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="uni-input w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-brand-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 italic text-[11px] text-slate-500 leading-relaxed font-medium">
                "Not: İletişim bilgileri misafir onay maillerinde ve fatura dökümlerinde otomatik olarak kullanılmaktadır."
              </div>
            </div>

            {isSaved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-emerald-600 shadow-sm"
              >
                <CheckCircle2 size={20} className="shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-widest">Tüm Değişiklikler Başarıyla Kaydedildi</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Global Action Footer (Mobile optimization) */}
        <div className="flex md:hidden pt-4">
           <button
            type="submit"
            className="uni-control w-full flex items-center justify-center gap-3 p-5 bg-slate-900 text-white rounded-2xl text-xs     shadow-slate-200"
          >
            <Save className="w-5 h-5" />
            AYARLARI KAYDET
          </button>
        </div>

      </form>
    </div>
  );
};
