import type { CSSProperties } from "react";
import type { ResponsiveImage } from "./content";

type PictureProps = {
  image: ResponsiveImage;
  alt: string;
  className?: string;
  /** Above-the-fold images load eagerly with high priority; all others are lazy. */
  priority?: boolean;
  /** Per-image framing, e.g. objectPosition. */
  style?: CSSProperties;
};

/** AVIF with WebP fallback when there is one. `<picture>` is `display: contents`, so style the img. */
export function Picture({ image, alt, className, priority = false, style }: PictureProps) {
  return (
    <picture>
      {image.avif && <source type="image/avif" srcSet={image.avif} />}
      <img
        className={className}
        style={style}
        src={image.webp}
        width={image.width}
        height={image.height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
