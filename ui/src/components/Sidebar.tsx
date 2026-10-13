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
 * iOS gruplu-liste menü bölümü: gri zemin üstünde başlık + beyaz kart,
 * satırlar renkli ikon kutucuklu, aktif satır dolgulu + tik işaretli.
 * Daraltılmış kipte dairesel ray butonları. Açılır-kapanır grup yoktur;
 * bölümler her zaman görünür (mobil bottom sheet ile birebir aynı dil).
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isOpen,
  activeTab,
  onSelect,
}) => {
  if (!isOpen) {
    return <div className="space-y-1">
      {(item.subItems ?? [item]).map((entry) => (
        <button key={entry.id} type="button" title={entry.label} aria-label={entry.label}
          aria-current={activeTab === entry.id ? "page" : undefined}
          onClick={() => onSelect(entry.id)}
          className={`nav-rail-item border-0 shadow-none outline-none ${activeTab === entry.id ? "bg-brand-blue-100 text-brand-blue-700" : "text-slate-500 hover:bg-black/[0.04] active:bg-black/[0.06]"}`}>
          <NavigationIcon name={entry.id} />
        </button>
      ))}
    </div>;
  }

  return (
    <section aria-label={typeof item.label === "string" ? item.label : undefined}>
      <p className="px-4 pb-1.5 text-[15px] font-medium leading-6 text-slate-500">
        {item.label}
      </p>
      <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-900/[0.06]">
        <ul className="divide-y divide-slate-100">
          {(item.subItems ?? [item]).map((entry) => {
            const isActive = activeTab === entry.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  title={typeof entry.label === "string" ? entry.label : undefined}
                  onClick={() => onSelect(entry.id)}
                  className={`uni-control flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none select-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue-500/40 ${
                    isActive
                      ? "bg-brand-blue-50/80"
                      : "bg-white hover:bg-slate-50 active:bg-slate-100"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-blue-50 text-brand-blue-700"
                  >
                    {entry.icon}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[15px] leading-6 ${
                      isActive
                        ? "font-semibold text-brand-blue-700"
                        : "font-medium text-slate-900"
                    }`}
                  >
                    {entry.label}
                  </span>
                  {isActive ? (
                    <Check
                      size={18}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      className="shrink-0 text-brand-blue-700"
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
