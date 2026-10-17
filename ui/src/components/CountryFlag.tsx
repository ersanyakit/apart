import { Globe } from "lucide-react";
import { FLAG_ASSETS } from "../lib/flag-assets";

/** Decorative local flag; the adjacent country name supplies its accessible label. */
export function CountryFlag({ code, size = 24 }: { code?: string; size?: number }) {
  const src = FLAG_ASSETS[(code || "").trim().toUpperCase()];
  return src ? (
    <img src={src} alt="" aria-hidden="true" width={size} height={size}
      className="shrink-0 rounded-full object-contain" style={{ width: size, height: size }} />
  ) : <Globe aria-hidden="true" size={size} className="shrink-0 text-slate-500" />;
}
