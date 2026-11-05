"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  { src: "senate-aerial-tall.jpg", caption: "Senate Building from the air" },
  { src: "senate-front-wide.jpg", caption: "Abubakar Rasheed Senate Building" },
  { src: "senate-aerial-east.jpg", caption: "Senate Building and grounds" },
  { src: "senate-entrance.jpg", caption: "The main entrance" },
  { src: "senate-grounds.jpg", caption: "Approach to the Senate Building" },
  { src: "senate-side.jpg", caption: "Senate Building, side view" },
];
const AUTO_ADVANCE_MS = 5000;

export function CampusCarousel() {
  const track = useRef<HTMLDivElement>(null),
    [paused, setPaused] = useState(false);

  function move(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const step = (el.firstElementChild as HTMLElement).offsetWidth + 14;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (direction === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = setInterval(() => move(1), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="campus-carousel"
      aria-label="Photos of Bayero University"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="carousel-heading">
        <div>
          <h2>Around campus</h2>
          <p>A look at Bayero University, Kano.</p>
        </div>
        <div className="carousel-controls">
          <button onClick={() => move(-1)} aria-label="Previous photo">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => move(1)} aria-label="Next photo">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="carousel-track" ref={track}>
        {SLIDES.map((slide) => (
          <figure className="carousel-slide" key={slide.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/campus/${slide.src}`} alt={slide.caption} loading="lazy" />
            <figcaption>{slide.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
