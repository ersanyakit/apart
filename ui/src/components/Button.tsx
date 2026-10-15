import type { ButtonHTMLAttributes } from 'react';

/** Standard action button; dimensions and interaction states come from the shared theme. */
export function Button({ variant = 'primary', type = 'button', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'soft';
}) {
  return <button {...props} type={type} className={`uni-control uni-button uni-button-${variant} ${className}`}/>;
}
