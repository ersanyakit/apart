import styles from "./Landing.module.css";

export function SectionArtwork({
  name,
  alt,
  className = "",
}: {
  name: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`${styles.sectionArtwork} ${className}`}>
      <img
        src={`/images/landing/${name}.avif`}
        srcSet={`/images/landing/${name}-small.avif 640w, /images/landing/${name}.avif 1200w`}
        sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1400px) 42vw, 560px"
        alt={alt}
        width={1200}
        height={800}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
