"use client";
import { useI18n } from "./I18n";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

type Request = { message: string; resolve: (confirmed: boolean) => void };
const queue: Request[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());
export function confirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    queue.push({ message, resolve });
    notify();
  });
}
export function ConfirmDialogHost() {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [request, setRequest] = useState<Request | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => setRequest(queue[0] || null);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);
  const finish = (accepted: boolean) => {
    const item = queue.shift();
    item?.resolve(accepted);
    notify();
  };
  useEffect(() => {
    if (!request) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current
      ?.querySelector<HTMLButtonElement>("button[data-cancel]")
      ?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
      if (e.key === "Tab") {
        const buttons =
          panel.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [request]);
  if (!request) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) finish(false);
      }}
    >
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl border border-white"
      >
        <div className="flex justify-between items-start">
          <span className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle size={24} />
          </span>
          <button
            aria-label={_uiText("Kapat")}
            onClick={() => finish(false)}
            className="uni-control p-2 rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>
        <h2
          id="confirm-title"
          className="text-lg font-black text-slate-800 mt-5"
        >{_uiText("İşlemi onaylayın")} </h2>
        <p
          id="confirm-description"
          className="mt-3 text-sm leading-6 text-slate-500 whitespace-pre-wrap"
        >
          {_uiText(request.message)}
        </p>
        <div className="flex justify-end gap-3 mt-7">
          <button
            data-cancel
            onClick={() => finish(false)}
            className="uni-control px-5 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200"
          >{_uiText("Vazgeç")} </button>
          <button
            onClick={() => finish(true)}
            className="uni-control px-5 py-3 rounded-xl uni-button-primary text-white text-sm font-bold "
          >{_uiText("Onayla")} </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Compatibility for the original settings components.
export function ConfirmDialog({
  isOpen,
  message,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: string;
}) {
  const queued = useRef(false);
  useEffect(() => {
    if (isOpen && !queued.current) {
      queued.current = true;
      void confirmDialog(message).then((ok) => {
        if (ok) onConfirm();
        onClose();
      });
    }
  }, [isOpen, message, onConfirm, onClose]);
  return null;
}
