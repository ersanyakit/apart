import { useI18n } from "./I18n";
import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, LogOut, Menu } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { NavigationIcon } from "./NavigationIcon";
import { PropertySwitcher } from "./PropertySwitcher";
import { confirmDialog } from "./ConfirmDialog";
import type { Snapshot, Selection } from "../lib/api";
import type { MenuItem } from "../types";

const PRIMARY_TABS = [
  { id: "board", label: "Durum" },
  { id: "bookings", label: "Rezervasyon" },
  { id: "stays", label: "Konaklayan" },
  { id: "guests", label: "Misafir" },
] as const;

export function MobileNav({ snapshot, groups, activeTab, onSelect, onSelection, onLogout }: {
  snapshot: Snapshot;
  groups: MenuItem[];
  activeTab: string;
  onSelect: (id: string) => void;
  onSelection: (selection: Selection) => void;
  onLogout: () => void;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingLogout = useRef(false);
  const userName = snapshot.user.displayname || snapshot.user.username;
  const primaryActive = PRIMARY_TABS.some((tab) => tab.id === activeTab);
  const visibleTabs = PRIMARY_TABS.filter((tab) => groups.some((group) => group.subItems?.some((item) => item.id === tab.id)));

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setSheetOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const pick = (id: string) => { setSheetOpen(false); onSelect(id); };

  return (
    <>
      <nav aria-label={_uiText("Mobil ana gezinti")} className="mobile-tab-bar">
        {visibleTabs.map((tab) => (
          <button key={tab.id} type="button" aria-current={activeTab === tab.id ? "page" : undefined}
            onClick={() => pick(tab.id)} className="mobile-tab">
            <NavigationIcon name={tab.id} size={24} />
            <span>{_uiText(tab.label)}</span>
          </button>
        ))}
        <button type="button" aria-label={_uiText("Menüyü aç")} aria-expanded={sheetOpen} aria-haspopup="dialog"
          data-active={!primaryActive || sheetOpen} onClick={() => setSheetOpen(true)} className="mobile-tab">
          <Menu size={24} strokeWidth={1.8} aria-hidden="true" /><span>{_uiText("Menü")}</span>
        </button>
      </nav>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={_uiText("Menü")} closeLabel={_uiText("Menüyü kapat")}
        onExitComplete={() => {
          if (!pendingLogout.current) return;
          pendingLogout.current = false;
          // Wait until the native dialog has left the top layer before confirming.
          requestAnimationFrame(() => {
            void confirmDialog(_uiText("Oturumu kapatmak istediğinize emin misiniz?")).then((confirmed) => {
              if (confirmed) onLogout();
            });
          });
        }}>
        <div className="mb-6 flex items-center gap-3 px-1">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-blue-100 text-lg font-semibold text-brand-blue-500">
            {userName.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold text-slate-900">{userName}</p>
            <p className="mt-0.5 truncate text-[13px] text-slate-500">{snapshot.branches.find((b) => b.branch_id === snapshot.branch_id)?.name}</p>
          </div>
        </div>
        <section aria-label={_uiText("Aktif işletme")} className="mb-6">
          <h3 className="mobile-menu-heading">{_uiText("İşletme")}</h3>
          <PropertySwitcher snapshot={snapshot} onSelection={onSelection} />
        </section>
        {groups.map((group) => (
          <section key={group.id} aria-label={group.label} className="mb-6">
            <h3 className="mobile-menu-heading">{group.label}</h3>
            <div className="mobile-menu-group">
              {(group.subItems ?? [group]).map((item) => (
                <button key={item.id} type="button" onClick={() => pick(item.id)} aria-current={activeTab === item.id ? "page" : undefined}
                  className="mobile-menu-row">
                  <span className="mobile-menu-icon"><NavigationIcon name={item.id} size={48} /></span>
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {activeTab === item.id ? <Check size={18} className="shrink-0 text-brand-blue-500" /> : <ChevronRight size={17} className="shrink-0 text-slate-300" />}
                </button>
              ))}
            </div>
          </section>
        ))}
        <button type="button" data-destructive="true" className="mobile-menu-row w-full rounded-2xl bg-white"
          onClick={() => { pendingLogout.current = true; setSheetOpen(false); }}>
          <span className="mobile-menu-icon bg-red-50 text-red-600"><LogOut size={20} /></span>
          <span>{_uiText("Oturumu kapat")}</span>
        </button>
      </BottomSheet>
    </>
  );
}
