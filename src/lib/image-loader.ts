"use client";

/**
 * Every next/image goes through here. Unsplash photos are resized by
 * Unsplash's own CDN (their API guidelines ask us to hotlink); anything else
 * is served as it is.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://images.unsplash.com/")) {
    return `${src}&w=${width}&q=${quality ?? 72}&auto=format&fit=crop`;
  }
  return src;
}
