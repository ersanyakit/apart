"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { X, type LucideIcon } from "lucide-react";
import { RoomOperationDialog } from "./RoomOperationDialog";

function SheetDialog({ title, closeLabel, onClose, children }: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dragControls = useDragControls();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const previous = {
      position: document.body.style.position, top: document.body.style.top,
      width: document.body.style.width, overflow: document.body.style.overflow,
    };
    // A modal dialog provides focus containment and makes the page inert.
    element.showModal();
    Object.assign(document.body.style, { position: "fixed", top: `-${scrollY}px`, width: "100%", overflow: "hidden" });
    return () => {
      element.close();
      Object.assign(document.body.style, previous);
      window.scrollTo(0, scrollY);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialog} className="mobile-sheet-dialog" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <motion.div className="mobile-sheet-scrim" aria-hidden="true" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }} />
      <motion.section className="mobile-sheet-panel" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
        drag="y" dragListener={false} dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.45 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || (info.offset.y > 15 && info.velocity.y > 600)) onClose();
        }}>
        <div className="mobile-sheet-handle" onPointerDown={(event) => dragControls.start(event)} aria-hidden="true">
          <span />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-4">
          <h2 id={titleId} className="text-[28px] font-semibold tracking-[-0.035em] text-slate-900">{title}</h2>
          <button type="button" autoFocus aria-label={closeLabel} onClick={onClose}
            className="nav-icon-button bg-black/[0.055] text-slate-500">
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>
        <div className="mobile-sheet-scroll">{children}</div>
      </motion.section>
    </dialog>
  );
}

export function BottomSheet({ open, onClose, title, closeLabel = "Pencereyi kapat", children, onExitComplete }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onExitComplete?: () => void;
  closeLabel?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && <SheetDialog key="sheet" title={title} closeLabel={closeLabel} onClose={onClose}>{children}</SheetDialog>}
    </AnimatePresence>, document.body,
  );
}

/** 768px altı mobil sayılır; eşleşene kadar hiçbir şey çizilmez. */
function useDesktopSheetBreakpoint() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return desktop;
}

/**
 * Mobilde alttan açılan sheet, masaüstünde ortalanmış modal.
 * Checkout ve tahsilat gibi işlem pencereleri için tek giriş noktası.
 */
export function ResponsiveDialog({ open, onClose, title, subtitle, icon, busy = false, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  busy?: boolean;
  children: React.ReactNode;
}) {
  const desktop = useDesktopSheetBreakpoint();
  if (desktop === null || !open) return null;
  if (!desktop) return <BottomSheet open onClose={onClose} title={title}>{children}</BottomSheet>;
  return <RoomOperationDialog title={title} subtitle={subtitle} icon={icon} busy={busy} onClose={onClose}>{children}</RoomOperationDialog>;
}
