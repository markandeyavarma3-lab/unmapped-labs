"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { unsplashHome, type Photo } from "@/content/photos";

/**
 * A photo frame that crossfades between its photos every couple of seconds.
 * It only runs while on screen, pauses while hovered or focused, and stays on
 * the first photo for visitors who ask for reduced motion. The credit always
 * names the photo currently showing.
 */
export function SitePhoto({
  photos,
  sizes,
  className = "",
  priority = false,
  interval = 2000,
  offset = 0,
  credit = true,
}: {
  photos: Photo[];
  sizes: string;
  className?: string;
  priority?: boolean;
  interval?: number;
  /** Stagger, in steps of 350ms, so neighbouring frames don't all change at once. */
  offset?: number;
  credit?: boolean;
}) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const paused = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || photos.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let delay: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (timer || delay) return;
      delay = setTimeout(() => {
        delay = undefined;
        timer = setInterval(() => {
          if (!paused.current) setActive((a) => (a + 1) % photos.length);
        }, interval);
      }, offset * 350);
    };
    const stop = () => {
      clearInterval(timer);
      clearTimeout(delay);
      timer = delay = undefined;
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [photos.length, interval, offset]);

  const shown = photos[active];
  return (
    <figure
      ref={ref}
      className={`photo ${className}`}
      style={{ backgroundColor: photos[0]?.color }}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      {photos.map((p, i) => (
        <Image
          key={p.src}
          src={p.src}
          alt={i === active ? p.alt : ""}
          aria-hidden={i === active ? undefined : true}
          fill
          sizes={sizes}
          priority={priority && i === 0}
          className="object-cover transition-opacity duration-700 ease-out"
          style={{ opacity: i === active ? 1 : 0 }}
        />
      ))}
      {photos.length > 1 && (
        <span aria-hidden className="absolute top-3 right-3 z-[2] flex gap-1">
          {photos.map((p, i) => (
            <span key={p.src} className={`h-[3px] w-4 rounded-full transition-colors duration-500 ${i === active ? "bg-white" : "bg-white/35"}`} />
          ))}
        </span>
      )}
      {credit && shown && (
        <figcaption className="absolute right-3 bottom-2 z-[2] text-[11px] text-white/70">
          Photo:{" "}
          <a href={shown.profile} target="_blank" rel="noopener noreferrer" className="-my-1.5 inline-block py-1.5 underline decoration-white/30 underline-offset-2 hover:text-white">
            {shown.author}
          </a>{" "}
          /{" "}
          <a href={unsplashHome} target="_blank" rel="noopener noreferrer" className="-my-1.5 inline-block py-1.5 underline decoration-white/30 underline-offset-2 hover:text-white">
            Unsplash
          </a>
        </figcaption>
      )}
    </figure>
  );
}
