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
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <h2 className="text-lg font-black tracking-tight">{title}</h2>
          <button
            type="button"
            aria-label="Pencereyi kapat"
            className={`uni-control ${secondaryStyle}`}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </section>
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div
      role="alert"
      className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
    >
      {message}
    </div>
  ) : null;
}
