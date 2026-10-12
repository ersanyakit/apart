import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    info: <Info className="w-5 h-5 text-brand-blue-500" />,
    error: <AlertTriangle className="w-5 h-5 text-red-500" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    info: 'bg-brand-blue-50 border-brand-blue-200',
    error: 'bg-red-50 border-red-200'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-3xl border shadow-2xl flex items-center gap-3 min-w-[320px] ${bgColors[type]}`}
        >
          <div className="shrink-0">{icons[type]}</div>
          <p className="text-sm font-bold text-slate-800 flex-1">{message}</p>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
