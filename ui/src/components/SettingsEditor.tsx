"use client";

import React, { useId, useLayoutEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";

/** Settings forms are ordinary page content, never an overlay or side drawer. */
export function SettingsEditor({ title, description = "Bilgileri düzenleyip kaydet. Listeye dönerek diğer kayıtlarla devam edebilirsin.", backLabel = "Listeye dön", onClose, children }: {
  title: string;
  description?: string;
  backLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    heading.current?.focus({ preventScroll: true });
    heading.current?.closest("main")?.scrollTo({ top: 0 });
    return () => {
      requestAnimationFrame(() => {
        if (previous?.isConnected && !previous.closest("[hidden]")) previous.focus({ preventScroll: true });
      });
    };
  }, []);
  return <section className="settings-editor" aria-labelledby={id}>
    <header className="settings-editor-header">
      <button type="button" className="uni-control settings-editor-back" onClick={onClose}>
        <ArrowLeft size={18} aria-hidden="true" />{backLabel}
      </button>
      <h2 ref={heading} tabIndex={-1} id={id}>{title}</h2>
      <p>{description}</p>
    </header>
    <div className="settings-editor-card">{children}</div>
  </section>;
}
