"use client";
import React, { createContext, useContext, useId } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePreference } from "./UserPreferences";
import { reportForPage, reportGroupForPage, type ReportPageID, type ReportGroupPageID } from "./reports/navigation";
import { NavigationIcon } from "./NavigationIcon";

export const PAGE_HEADERS = {
  property3d: ["3 Boyutlu Görünüm", "Tesisinizin katlarını, odalarını ve yataklarını üç boyutlu olarak inceleyin."],
  kanban: ["Resepsiyon Notları", "Vardiya notlarını paylaşın, bekleyen işleri takip edin ve tamamlananları ekipçe görün."],
  blacklist: ["Ortak Kara Liste", "Tüm otellerin paylaştığı misafir kayıtlarını, gerekçeleri ve kayıt geçmişini inceleyin."],
  reports: ["Raporlama", "İşletmenizin finansal, kapasite ve operasyon performansını takip edin."],
  board: ["Oda Durum Çizelgesi", "Birimlerin doluluk ve temizlik durumlarını takip edin."],
  calendar: ["Konaklama takvimi", "Odalar, konaklayanlar ve rezervasyonlar bir arada."],
  bookings: ["Rezervasyonlar", "Rezervasyonları, misafir bilgilerini ve işlem geçmişini yönetin."],
  stays: ["Konaklayan Listesi", "Konaklamaları birim ve tarih çizelgesinde takip edin."],
  units: ["Kat ve Oda Tanımları", "Kat, oda, yatak ve fiziksel yerleşim tanımlarını düzenleyin."],
  staff: ["Personel Tanımları", "Personel hesaplarını, şube erişimlerini ve yetkilerini yönetin."],
  guests: ["Misafir Arama ve Geçmiş", "Misafirleri bulun, konaklama geçmişlerini inceleyin."],
  templates: ["Belge Şablonları", "Belge ve rapor şablonlarını görsel editörle, dil bazında düzenleyin."],
  logs: ["Sistem Logları", "Kullanıcı işlemlerini ve kayıt değişikliklerini takip edin."],
  facility: ["Kurumsal Tesis Kartı", "Otel ve tesis bilgilerini, iletişim detaylarını ve medyayı yönetin."],
  features: ["Olanak Tanımları", "Olanakları ve kategorileri tanımlayın, tesis kataloğunu düzenleyin."],
  appsettings: ["Ayarlar", "Çalışma alanını kendine göre düzenle. Tercihlerin hesabında saklanır."],
} as const;
export type PageID = keyof typeof PAGE_HEADERS | ReportPageID | ReportGroupPageID;
const HeaderContext = createContext<{ propertyName?: string; actions?: React.ReactNode }>({});
export const PageHeaderProvider = HeaderContext.Provider;

export function PageHeader({ pageId, propertyName, actions, children, globalActions }: {
  pageId: PageID; propertyName?: string; actions?: React.ReactNode;
  children?: React.ReactNode; globalActions?: React.ReactNode;
}) {
  const inherited = useContext(HeaderContext);
  const [collapsed, setCollapsed] = usePreference<boolean>(`header.${pageId}`, false);
  const id = useId();
  const report = reportForPage(pageId) ?? reportGroupForPage(pageId);
  const [title, description] = report ? [report.name, report.description] : PAGE_HEADERS[pageId as keyof typeof PAGE_HEADERS];
  return <header className="page-header" data-collapsed={collapsed} aria-labelledby={`${id}-title`}>
    <div className="page-header-top">
      <div className="page-header-heading">
        {!collapsed && (propertyName || inherited.propertyName) && <p className="page-header-eyebrow">{propertyName || inherited.propertyName}</p>}
        <h2 id={`${id}-title`} className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-500">
            <NavigationIcon name={pageId} />
          </span>
          <span className="min-w-0">{title}</span>
        </h2>
      </div>
      <button type="button" className="nav-icon-button page-header-toggle" aria-expanded={!collapsed} aria-controls={`${id}-details`}
        aria-label={`${title}: üst alanı ${collapsed ? "genişlet" : "daralt"}`} title={collapsed ? "Üst alanı genişlet" : "Üst alanı daralt"}
        onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronDown size={20} aria-hidden="true" /> : <ChevronUp size={20} aria-hidden="true" />}
      </button>
    </div>
    <div id={`${id}-details`} className="page-header-details" hidden={collapsed}>
      <p className="page-header-description">{description}</p>
      <div className="page-header-actions" role="group" aria-label={`${title} araç çubuğu`}>{globalActions ?? inherited.actions}{actions}</div>
      {children && <div className="page-header-tools">{children}</div>}
    </div>
  </header>;
}
