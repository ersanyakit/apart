import { useI18n } from "./I18n";
/** Generated raster illustrations, exported as AVIF for the bed catalog and room setup. */
export function BedIllustration({ type = 'single', structure = 'standard', levels = 1, twin = false, size = 64 }: {
  type?: string; structure?: string; levels?: number; twin?: boolean; size?: number;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const variant = twin ? 'twin'
    : structure === 'bunk' ? `bunk${Math.min(4, Math.max(2, levels))}`
    : structure === 'loft' ? 'loft'
    : structure === 'capsule' ? 'capsule'
    : type === 'crib' ? 'crib'
    : structure === 'sofa' || type === 'daybed' ? 'sofa'
    : type === 'murphy_bed' ? 'murphy'
    : type === 'trundle_bed' ? 'trundle'
    : type === 'futon' ? 'futon'
    : structure === 'folding' ? 'folding'
    : /double|queen|king/.test(type) ? 'double' : 'single';
  return <img
    src={`/images/bed-icons-dott/${variant}.avif`}
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    draggable={false}
    decoding="async"
    data-bed-illustration={variant}
    style={{ flexShrink: 0, objectFit: 'contain' }}
  />;
}
