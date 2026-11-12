"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AuthSlide } from "./authSlides";

type AuthCarouselProps = {
  slides: AuthSlide[];
  intervalMs?: number;
  className?: string;
};

export default function AuthCarousel({ slides, intervalMs = 5000, className }: AuthCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setTimeout(() => setActive((current) => (current + 1) % slides.length), intervalMs);
    return () => clearTimeout(timer);
  }, [active, paused, slides.length, intervalMs]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="RukaPay highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn("relative overflow-hidden rounded-2xl bg-primary", className)}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.title}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={index !== active}
            className="relative h-full w-full shrink-0"
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 50vw, 1px"
              fetchPriority={index === 0 ? "high" : undefined}
              className="object-cover object-center"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-primary/90 via-primary/45 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-8 pb-16 xl:p-10 xl:pb-16">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/75">{slide.label}</p>
              <h2 className="mt-3 max-w-md text-balance text-2xl font-semibold leading-snug tracking-tight text-white xl:text-3xl">
                {slide.title}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-7 left-8 flex gap-2 xl:left-10">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show slide ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              className={cn(
                "h-1.5 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                index === active ? "w-7 bg-white" : "w-1.5 bg-white/45 hover:bg-white/75"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
