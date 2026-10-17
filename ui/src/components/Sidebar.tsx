import { useI18n } from "./I18n";
import React from "react";
import { Check, ChevronRight } from "lucide-react";
import { NavigationIcon } from "./NavigationIcon";
import { MenuItem } from "../types";

interface SidebarItemProps {
  item: MenuItem;
  isOpen: boolean;
  activeTab: string;
  onSelect: (id: string) => void;
}

/**
 * iOS gruplu menü: ortak yuvarlatılmış yüzey ve dairesel ikonlar.
 * Grup yüzeyi ortak uni-surface, seçili satır tema vurgu rengini kullanır.
 * Daraltılmış kipte dairesel ray butonları. Açılır-kapanır grup yoktur;
 * bölümler her zaman görünür (mobil bottom sheet ile birebir aynı dil).
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isOpen,
  activeTab,
  onSelect,
}) => {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  if (!isOpen) {
    return <div className="space-y-1">
      {(item.subItems ?? [item]).map((entry) => (
        <button key={entry.id} type="button" title={entry.label} aria-label={entry.label}
          aria-current={activeTab === entry.id ? "page" : undefined}
          onClick={() => onSelect(entry.id)}
          className={`nav-rail-item border-0 shadow-none outline-none ${activeTab === entry.id ? "bg-brand-blue-100 text-brand-blue-500" : "text-slate-500 hover:bg-black/[0.04] active:bg-black/[0.06]"}`}>
          <NavigationIcon name={entry.id} size={48} />
        </button>
      ))}
    </div>;
  }

  return (
    <section aria-label={typeof item.label === "string" ? item.label : undefined}>
      <p className="px-4 pb-2 text-[0.8125rem] font-medium leading-5 text-slate-500">
        {item.label}
      </p>
      <div className="sidebar-menu-group">
        <ul>
          {(item.subItems ?? [item]).map((entry) => {
            const isActive = activeTab === entry.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  title={typeof entry.label === "string" ? entry.label : undefined}
                  onClick={() => onSelect(entry.id)}
                  className="uni-control sidebar-menu-row flex min-h-[72px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none select-none"
                >
                  <span
                    aria-hidden="true"
                    className="sidebar-menu-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-500"
                  >
                    <NavigationIcon name={entry.id} size={48} />
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[15px] leading-6 ${isActive
                        ? "font-semibold text-brand-blue-700"
                        : "font-medium text-slate-900"}`}
                  >
                    {entry.label}
                  </span>
                  {isActive ? (
                    <Check
                      size={18}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      className="shrink-0 text-brand-blue-500"
                    />
                  ) : (
                    <ChevronRight
                      size={18}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="shrink-0 text-slate-300"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
