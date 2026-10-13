"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Info, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "info" | "error";
type Notice = { id: number; message: string; type: ToastType };
type Notify = (message: string, type?: ToastType) => void;
const NotificationContext = createContext<Notify | null>(null);

export function useNotifications() {
  const notify = useContext(NotificationContext);
  if (!notify) throw new Error("NotificationProvider is required");
  return notify;
}

function Toast({ notice, dismiss }: { notice: Notice; dismiss: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (hovered || focused) return;
    const timer = setTimeout(() => dismiss(notice.id), notice.type === "error" ? 8000 : 5000);
    return () => clearTimeout(timer);
  }, [notice.id, notice.type, dismiss, hovered, focused]);
  const Icon = { success: CheckCircle2, info: Info, error: AlertCircle }[notice.type];
  return <motion.div layout={!reducedMotion} className={`app-toast app-toast-${notice.type}`}
    initial={{ opacity: 0, x: reducedMotion ? 0 : 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : 24 }}
    transition={{ duration: reducedMotion ? 0 : 0.18 }}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <span className="app-toast-icon"><Icon size={21} aria-hidden="true" /></span>
    <p role={notice.type === "error" ? "alert" : "status"} aria-atomic="true">{notice.message}</p>
    <button type="button" className="nav-icon-button app-toast-close" aria-label="Bildirimi kapat" onClick={() => dismiss(notice.id)}><X size={18} aria-hidden="true" /></button>
  </motion.div>;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [mounted, setMounted] = useState(false);
  const sequence = useRef(0);
  useEffect(() => setMounted(true), []);
  const dismiss = useCallback((id: number) => setNotices(items => items.filter(item => item.id !== id)), []);
  const notify = useCallback<Notify>((message, type = "success") => {
    if (!message.trim()) return;
    const notice = { id: ++sequence.current, message, type };
    setNotices(items => [...items, notice].slice(-3));
  }, []);
  return <NotificationContext.Provider value={notify}>
    {children}
    {mounted && createPortal(<section className="app-toast-stack" aria-label="Bildirimler">
      <AnimatePresence initial={false}>{notices.map(notice => <Toast key={notice.id} notice={notice} dismiss={dismiss} />)}</AnimatePresence>
    </section>, document.body)}
  </NotificationContext.Provider>;
}
