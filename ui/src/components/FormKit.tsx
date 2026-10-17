import { useI18n } from "./I18n";
import React from "react";
import { X } from "lucide-react";
export const inputStyle = "uni-input w-full px-4 py-3 text-sm";
export const buttonStyle = "uni-button uni-button-primary";
export const secondaryStyle = "uni-button uni-button-secondary min-h-10 rounded-xl px-3 py-2";
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const id = React.useId();
  const control =
    React.isValidElement(children) &&
    ["input", "select", "textarea"].includes(children.type as string)
      ? React.cloneElement(
          children as React.ReactElement<{
            id?: string;
            "aria-labelledby"?: string;
          }>,
          { id, "aria-labelledby": `${id}-label` },
        )
      : children;
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span
        id={`${id}-label`}
        className="text-sm font-medium text-uni-muted"
      >
        {label}
      </span>
      {control}
    </label>
  );
}
export function Drawer({
  title,
  children,
  onClose,
  layout = "side",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  /** side: sağ panel · center: ortada Windows-formu tipi dialog */
  layout?: "side" | "center";
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  if (layout === "center") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-8"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-3xl sm:rounded-[28px]"
        >
          <div aria-hidden="true" className="pt-2.5 sm:hidden">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
            <h2 className="min-w-0 truncate text-lg font-black tracking-tight">{title}</h2>
            <button
              type="button"
              aria-label={_uiText("Pencereyi kapat")}
              onClick={onClose}
              className="uni-control flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 outline-none transition-all duration-150 ease-out hover:bg-slate-200 hover:text-slate-900 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>{children}</div>
        </section>
      </div>
    );
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-stretch sm:justify-end sm:bg-slate-900/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:h-full sm:max-w-3xl sm:rounded-none"
      >
        <div aria-hidden="true" className="pt-2.5 sm:hidden">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="min-w-0 truncate text-lg font-black tracking-tight">{title}</h2>
          <button
            type="button"
            aria-label={_uiText("Pencereyi kapat")}
            className={`uni-control ${secondaryStyle} flex h-9 w-9 shrink-0 items-center justify-center !rounded-full !p-0`}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>{children}</div>
      </section>
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  const {m:_uiText}=useI18n();
  return message ? (
    <div
      role="alert"
      className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
    >
      {_uiText(message)}
    </div>
  ) : null;
}
