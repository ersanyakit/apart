import React, { useState, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { MenuItem } from "../types";

interface SidebarItemProps {
  item: MenuItem;
  isOpen: boolean;
  activeTab: string;
  onSelect: (id: string) => void;
}

/**
 * Referans tasarım standardında açılır-kapanır grup satırı:
 * 48px parent (ikon + 14px etiket + döner chevron), girintili 14px alt satırlar.
 * Tipografi referans tokenlar (rem, kök font-size ile ölçeklenir),
 * renk tonları projenin kendi paleti (brand-blue / slate).
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isOpen,
  activeTab,
  onSelect,
}) => {
  const submenuId = useId();
  const reducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(
    () => !!item.subItems?.some((sub) => sub.id === activeTab),
  );

  // Check if any sub-item is active
  const hasActiveSubItem = item.subItems?.some((sub) => sub.id === activeTab);
  React.useEffect(() => {
    if (hasActiveSubItem) setIsExpanded(true);
  }, [activeTab, hasActiveSubItem]);

  const isParentActive = !!hasActiveSubItem || isExpanded;

  return (
    <div className="space-y-1">
      <motion.button
        type="button"
        aria-expanded={item.subItems ? isExpanded && isOpen : undefined}
        aria-controls={item.subItems ? submenuId : undefined}
        aria-label={typeof item.label === "string" ? item.label : undefined}
        aria-current={hasActiveSubItem ? "true" : undefined}
        title={typeof item.label === "string" ? item.label : undefined}
        onClick={() => {
          if (item.subItems) {
            if (!isOpen) onSelect(item.subItems[0].id);
            else setIsExpanded(!isExpanded);
          } else {
            onSelect(item.id);
          }
        }}
        className={`uni-control uni-menu-item
          w-full flex items-center gap-2 min-h-12 px-3 py-3 rounded-xl
             group select-none cursor-pointer
          outline-none
          ${!isOpen ? "justify-center px-0" : ""}
          ${isParentActive && isOpen ? "bg-brand-blue-100 text-brand-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
        `}
      >
        <div
          className={`p-1.5 rounded-lg transition-colors duration-150 shrink-0 ${isParentActive && isOpen ? "bg-white shadow-sm" : "group-hover:bg-white"}`}
        >
          {item.icon}
        </div>
        {isOpen && (
          <span className="uni-nav-parent flex-1 text-left">
            {item.label}
          </span>
        )}
        {isOpen && item.subItems && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="shrink-0 flex items-center justify-center"
          >
            <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={2} />
          </motion.div>
        )}
      </motion.button>

      <AnimatePresence initial={false}>
        {isExpanded && isOpen && item.subItems && (
          <motion.div
            id={submenuId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden pl-9 pr-1 py-1 space-y-1"
          >
            {item.subItems.map((sub) => {
              const isActive = activeTab === sub.id;
              return (
                <motion.button
                  key={sub.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  title={typeof sub.label === "string" ? sub.label : undefined}
                  onClick={() => onSelect(sub.id)}
                  className={`uni-control uni-menu-item w-full flex items-center gap-2 min-h-10 px-3 py-2 rounded-xl    outline-none   text-left select-none cursor-pointer ${
                    isActive ? "uni-nav-sub-active" : "uni-nav-sub"
                  } ${
                    isActive
                      ? "text-brand-blue-600 bg-brand-blue-100"
                      : "text-slate-500 hover:text-brand-blue-600 hover:bg-brand-blue-50/30"
                  }`}
                >
                  {sub.icon ? (
                    <span className="flex shrink-0 items-center">{sub.icon}</span>
                  ) : null}
                  <span className="truncate flex-1">{sub.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
