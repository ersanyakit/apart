import { useI18n } from "./I18n";
import type { ButtonHTMLAttributes } from 'react';

/** Standard action button; dimensions and interaction states come from the shared theme. */
export function Button({ variant = 'primary', type = 'button', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'soft';
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  return <button {...props} type={type} className={`uni-control uni-button uni-button-${variant} ${className}`}/>;
}
