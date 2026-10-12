import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { MenuItem } from "../types";

interface SidebarItemProps {
  item: MenuItem;
  isOpen: boolean;
  activeTab: string;
  onSelect: (id: string) => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isOpen,
  activeTab,
  onSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(
    () => !!item.subItems?.some((sub) => sub.id === activeTab),
  );

  // Check if any sub-item is active
  const hasActiveSubItem = item.subItems?.some((sub) => sub.id === activeTab);
  React.useEffect(() => {
    if (hasActiveSubItem) setIsExpanded(true);
  }, [activeTab, hasActiveSubItem]);

  return (
    <div className="space-y-1">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          if (item.subItems) {
            setIsExpanded(!isExpanded);
          } else {
            onSelect(item.id);
          }
        }}
        className={`
          w-full flex items-center p-2 rounded-xl transition-all duration-200 group
          ${(isExpanded || hasActiveSubItem) && isOpen ? "bg-brand-blue-50 text-brand-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
        `}
      >
        <div
          className={`p-1.5 rounded-lg transition-all ${(isExpanded || hasActiveSubItem) && isOpen ? "bg-white shadow-sm" : "group-hover:bg-white"}`}
        >
          {item.icon}
        </div>
        {isOpen && (
          <span className="ml-3 text-xs font-bold flex-1 text-left tracking-tight">
            {item.label}
          </span>
        )}
        {isOpen && item.subItems && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </motion.div>
        )}
      </motion.button>

      <AnimatePresence>
        {isExpanded && isOpen && item.subItems && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-10 space-y-1"
          >
            {item.subItems.map((sub) => (
              <motion.button
                key={sub.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(sub.id)}
                className={`w-full text-left py-1.5 px-3 text-[11px] font-black transition-all rounded ${
                  activeTab === sub.id
                    ? "text-brand-blue-600 bg-brand-blue-50/50"
                    : "text-slate-500 hover:text-brand-blue-600"
                }`}
              >
                {sub.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
