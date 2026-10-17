import { useI18n } from "./I18n";
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, Share2, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { HotelConfig, Room } from '../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface DocumentPreviewProps {
  type: 'sales' | 'reservation' | 'cancellation';
  data: Room;
  hotel: HotelConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ type, data, hotel, isOpen, onClose }) => {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const windowUrl = window.location.href;
    const uniqueName = new Date().getTime();
    const printWindow = window.open(windowUrl, String(uniqueName), 'width=900,height=900');

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${hotel.name} - ${type.toUpperCase()}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                .no-print { display: none; }
                body { padding: 0; margin: 0; }
              }
              @page { size: auto; margin: 20mm; }
            </style>
          </head>
          <body class="bg-white">
            <div class="max-w-4xl mx-auto p-10">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getDocTitle = () => {
    switch(type) {
      case 'sales': return _uiText("SATIŞ MAKBUZU");
      case 'reservation': return 'REZERVASYON FORMU';
      case 'cancellation': return _uiText("İPTAL FORMU");
      default: return 'BELGE';
    }
  };

  const getDocIcon = () => {
    switch(type) {
      case 'sales': return <CheckCircle2 className="text-emerald-500" />;
      case 'reservation': return <FileText className="text-brand-blue-500" />;
      case 'cancellation': return <XCircle className="text-rose-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Toolbar */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  {getDocIcon()}
               </div>
               <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase leading-none mb-1">{getDocTitle()}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{_uiText("ÖNİZLEME VE ONAY")}</p>
               </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="uni-control flex items-center gap-2 px-6 py-2.5 uni-button-primary text-white rounded-xl text-[10px]          shadow-brand-blue-500/20  cursor-pointer"
              >
                <Printer size={14} /> {_uiText("YAZDIR")} </button>
              <button
                onClick={onClose}
                className="uni-control p-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl "
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 overflow-y-auto p-12 bg-slate-50 custom-scrollbar">
            <div
              ref={printRef}
              className="bg-white w-full mx-auto p-12 shadow-sm border border-slate-100 min-h-[1100px] flex flex-col"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10 mb-10">
                <div className="space-y-4">
                  {hotel.logoUrl && (
                    <img src={hotel.logoUrl} alt={_uiText("Logo")} className="h-16 w-auto object-contain grayscale" />
                  )}
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{hotel.name}</h1>
                    <p className="text-[10px] text-slate-500 font-bold max-w-xs leading-relaxed mt-2 uppercase">{hotel.address}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">{_uiText("TEL:")} {hotel.phone} | {hotel.email}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="inline-block px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black tracking-[0.2em] mb-4">
                    {getDocTitle()}
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{_uiText("DÖKÜMAN NO")}</p>
                  <p className="text-lg font-black text-slate-900 tracking-tighter">{_uiText("#DOC-")}{Math.floor(100000 + Math.random() * 900000)}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">{_uiText("TARİH")}</p>
                  <p className="text-sm font-bold text-slate-900">{new Intl.DateTimeFormat(_uiLocale,{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(new Date())}</p>
                </div>
              </div>

              {/* Guest & Stay Info */}
              <div className="grid grid-cols-2 gap-16 mb-16">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">{_uiText("MİSAFİR BİLGİLERİ")}</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{_uiText("AD SOYAD")}</p>
                      <p className="text-sm font-black text-slate-800 uppercase leading-none">{data.guests?.[0]?.name || data.name}</p>
                    </div>
                    {data.guests?.[0]?.phone && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{_uiText("İLETİŞİM")}</p>
                        <p className="text-sm font-bold text-slate-700">{data.guests[0].phone}</p>
                      </div>
                    )}
                    {data.guests?.[0]?.address && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{_uiText("ADRES")}</p>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed uppercase">{data.guests[0].address}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">{_uiText("KONAKLAMA DETAYLARI")}</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">{_uiText("ODA NO")}</p>
                      <p className="text-sm font-black text-slate-900">{data.number}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">{_uiText("ODA TİPİ")}</p>
                      <p className="text-sm font-black text-slate-900">{data.type}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">{_uiText("GİRİŞ TARİHİ")}</p>
                      <p className="text-xs font-bold text-slate-700">{data.checkIn}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">{_uiText("ÇIKIŞ TARİHİ")}</p>
                      <p className="text-xs font-bold text-slate-700">{data.checkOut}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Table */}
              <div className="flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-y border-slate-200">
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{_uiText("AÇIKLAMA")}</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{_uiText("ADET")}</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{_uiText("BİRİM FİYAT")}</th>
                      <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{_uiText("TOPLAM")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-4">
                        <p className="text-xs font-black text-slate-800 uppercase">{_uiText("KONAKLAMA BEDELİ")}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{_uiText("STANDART ODA (")}{data.number})</p>
                      </td>
                      <td className="py-4 text-xs font-bold text-slate-700 text-center">1</td>
                      <td className="py-4 text-xs font-bold text-slate-700 text-right">₺4.500,00</td>
                      <td className="py-4 text-xs font-black text-slate-900 text-right">₺4.500,00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer / Signature */}
              <div className="mt-16 pt-16 border-t border-slate-100 flex justify-between items-end">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{_uiText("TESLİM EDEN (RESEPSİYON)")}</p>
                    <div className="w-48 h-px bg-slate-200" />
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{_uiText("TESLİM ALAN (MİSAFİR)")}</p>
                    <div className="w-48 h-px bg-slate-200" />
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] min-w-[300px] space-y-4">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-widest">{_uiText("ARA TOPLAM")}</span>
                    <span className="text-xs font-bold">₺4.500,00</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-widest">{_uiText("KDV (%20)")}</span>
                    <span className="text-xs font-bold">₺900,00</span>
                  </div>
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{_uiText("GENEL TOPLAM")}</span>
                    <span className="text-xl font-black text-slate-900 tracking-tighter">₺5.400,00</span>
                  </div>
                </div>
              </div>

              {/* Compliance Info */}
              <div className="mt-10 pt-10 border-t border-slate-50 text-center">
                <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em]">{_uiText("BU BELGE KYS HOTEL OTOMASYON SİSTEMİ TARAFINDAN OLUŞTURULMUŞTUR.")} </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-4 text-slate-400">
            <AlertTriangle size={14} className="text-orange-400 shrink-0" />
            <p className="text-[9px] font-bold uppercase tracking-widest">{_uiText("ÖNİZLEMEDEKİ BİLGİLERİN DOĞRULUĞUNDAN EMİN OLDUKTAN SONRA YAZDIRMA İŞLEMİNİ BAŞLATIN.")} </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
