import { useEffect, useRef, useState } from "react";

export function Reveal({ children, delay = 0, y = 30 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transitionDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export function PageHero({ eyebrow, title, subtitle }) {
  return (
    <section className="relative pt-36 pb-20 overflow-hidden bg-hero">
      <div className="absolute inset-0 pattern-dots opacity-40" />
      <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-gold opacity-20 blur-3xl" />
      <div className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-emerald opacity-15 blur-3xl" />
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <Reveal>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-xs font-semibold tracking-[0.2em] uppercase text-gradient-gold mb-6">{eyebrow}</span>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05]">
            <span className="text-gradient-luxury">{title}</span>
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.2}>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
