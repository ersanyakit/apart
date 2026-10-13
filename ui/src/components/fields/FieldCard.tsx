import React from "react";

/**
 * Form kartı kabuğu: referans yüzey kartı (surface, 20px radius, 16px padding).
 * Odak halkası marka rengini takip eder (tema uyumlu).
 */
export function FieldCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] bg-[#f9f9f9] p-4 outline-none transition-all duration-150 ease-out hover:bg-[#efefef] focus-within:bg-[#efefef] focus-within:ring-2 focus-within:ring-neutral-300 active:scale-[0.99] ${className}`}
    >
      {children}
    </div>
  );
}

/** Kart içi micro başlık (referans body3: 14px / 485). */
export function FieldCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-uninav-book truncate text-[0.875rem] leading-5 text-slate-500">
      {children}
    </p>
  );
}
