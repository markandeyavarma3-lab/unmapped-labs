import Image from "next/image";
import type { Photo } from "@/content/photos";

/**
 * A credited photograph. It is tinted to the palette until hovered, revealed
 * with a wipe, and drifts slightly as the page scrolls (parallax).
 */
export function SitePhoto({
  photo,
  sizes,
  className = "",
  priority = false,
  parallax = true,
  caption = true,
  tint = true,
}: {
  photo: Photo;
  sizes: string;
  className?: string;
  priority?: boolean;
  parallax?: boolean;
  caption?: boolean;
  tint?: boolean;
}) {
  return (
    <figure className={`photo ${tint ? "photo-tint" : ""} ${className}`} data-reveal={priority ? undefined : "photo"} data-progress={parallax ? "" : undefined}>
      <div className="absolute inset-[-8%_0] will-change-transform" style={parallax ? { transform: "translate3d(0, calc((var(--p, 0.5) - 0.5) * -10%), 0)" } : undefined}>
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
      {caption && <PhotoCredit photo={photo} className="absolute right-3 bottom-2 left-3 z-[2]" />}
    </figure>
  );
}

/** Title, author, source and licence — what the Creative Commons licences ask for. */
export function PhotoCredit({ photo, className = "" }: { photo: Photo; className?: string }) {
  return (
    <figcaption className={`label flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[0.62rem] text-white/75 ${className}`}>
      <span>{photo.place}</span>
      <span>
        Photo:{" "}
        <a href={photo.source} target="_blank" rel="noopener noreferrer" className="-my-1.5 inline-block py-1.5 underline decoration-white/30 underline-offset-2 hover:text-white">
          {photo.author}
        </a>
        ,{" "}
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className="-my-1.5 inline-block py-1.5 underline decoration-white/30 underline-offset-2 hover:text-white">
          {photo.license}
        </a>
      </span>
    </figcaption>
  );
}
