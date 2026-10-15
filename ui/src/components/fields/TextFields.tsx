import React from "react";
import { FieldCard, FieldCaption } from "./FieldCard";

/**
 * Metin giriş kartı: başlık + çerçevesiz büyük değer (referans amount input dili).
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  type = "text",
  step,
  autoComplete,
  minLength,
  maxLength,
  uppercase = false,
  tone = "surface",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  step?: string | number;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  /** Açıkken girilen metin tr-TR büyük harfe çevrilir. */
  uppercase?: boolean;
  /** "surface" (varsayılan gri kart) ya da gri zemin üstünde "white" kart. */
  tone?: "surface" | "white";
}) {
  return (
    <FieldCard
      className={tone === "white" ? "bg-white" : undefined}
    >
      <label className="block min-w-0 cursor-text">
        <FieldCaption>{label}</FieldCaption>
        <input
          type={type}
          step={step}
          required={required}
          disabled={disabled}
          aria-label={label}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={(e) =>
            onChange(
              uppercase ? e.target.value.toLocaleUpperCase("tr-TR") : e.target.value,
            )
          }
          className="font-uninav-book mt-1 w-full min-w-0 bg-transparent text-[1.25rem] leading-8 text-slate-900 uppercase outline-none placeholder:text-slate-400 placeholder:normal-case disabled:opacity-60"
        />
        </label>
    </FieldCard>
  );
}

/**
 * Seçim kartı: başlık + çerçevesiz native select + chevron.
 */
export function SelectField({
  label,
  value,
  onChange,
  required,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <FieldCard>
      <label className="block min-w-0 cursor-pointer">
        <FieldCaption>{label}</FieldCaption>
        <span className="relative mt-1 block">
          <select
            required={required}
            disabled={disabled}
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-uninav-medium w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-8 text-[1.125rem] leading-7 text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60 [&>option]:text-base [&>option]:font-normal"
          >
            {children}
          </select>
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          >
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </label>
    </FieldCard>
  );
}

/**
 * Uzun metin kartı: başlık + çerçevesiz alan.
 */
export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
  uppercase = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  /** Açıkken girilen metin tr-TR büyük harfe çevrilir. */
  uppercase?: boolean;
}) {
  return (
    <FieldCard>
      <label className="block min-w-0 cursor-text">
        <FieldCaption>{label}</FieldCaption>
        <textarea
          aria-label={label}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          value={value}
          onChange={(e) =>
            onChange(
              uppercase ? e.target.value.toLocaleUpperCase("tr-TR") : e.target.value,
            )
          }
          className="font-uninav-book mt-1 w-full min-w-0 resize-y bg-transparent text-base leading-6 text-slate-900 uppercase outline-none placeholder:text-slate-400 placeholder:normal-case disabled:opacity-60"
        />
      </label>
    </FieldCard>
  );
}
