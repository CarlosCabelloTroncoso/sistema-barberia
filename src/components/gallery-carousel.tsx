"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type GallerySlide = {
  src: string;
  alt: string;
  label: string;
};

const AUTOPLAY_MS = 4500;

export function GalleryCarousel({ slides }: { slides: GallerySlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track) return;
      const n = ((i % slides.length) + slides.length) % slides.length;
      const slide = track.children[n] as HTMLElement | undefined;
      if (!slide) return;
      track.scrollTo({
        left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2,
        behavior: "smooth",
      });
    },
    [slides.length]
  );

  // Índice actual = slide cuyo centro queda más cerca del centro visible.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const dist = Math.abs(el.offsetLeft + el.clientWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setIndex(best);
  }, []);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      goTo(index + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, index, goTo]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      aria-roledescription="carrusel"
      aria-label="Galería de cortes"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[max(1.5rem,calc((100vw-64rem)/2))] py-2 sm:gap-6"
      >
        {slides.map((s, i) => (
          <figure
            key={s.src}
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${slides.length}`}
            className="w-[76%] shrink-0 snap-center sm:w-[44%] lg:w-[30%]"
          >
            <div
              className={`relative aspect-[3/4] overflow-hidden rounded-lg border transition-[opacity,border-color] duration-300 [transition-timing-function:var(--ease-out-quart)] ${
                i === index
                  ? "border-brand-purple/60 opacity-100 shadow-[0_30px_60px_-30px_oklch(0.62_0.22_296_/_0.5)]"
                  : "border-border opacity-60"
              }`}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                sizes="(max-width: 640px) 76vw, (max-width: 1024px) 44vw, 30vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink-3">{s.label}</span>
              <span className="font-mono text-xs tabular-nums text-ink-4">
                {pad(i + 1)}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-5xl items-center justify-between px-6">
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {pad(index + 1)} / {pad(slides.length)}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Corte anterior"
            className="flex size-11 items-center justify-center rounded-full border text-foreground transition-[color,border-color,transform] duration-150 [transition-timing-function:var(--ease-out-quart)] hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.94]"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Corte siguiente"
            className="flex size-11 items-center justify-center rounded-full border text-foreground transition-[color,border-color,transform] duration-150 [transition-timing-function:var(--ease-out-quart)] hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.94]"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
