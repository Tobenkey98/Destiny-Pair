import { motion } from "framer-motion";

export function Reveal({ children, delay = 0, y = 30 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

export function PageHero({ eyebrow, title, subtitle }) {
  return (
    <section className="relative pt-36 pb-20 overflow-hidden bg-hero">
      <div className="absolute inset-0 pattern-dots opacity-40" />
      <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-gold opacity-20 blur-3xl animate-glow-pulse" />
      <div className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-emerald opacity-15 blur-3xl animate-glow-pulse" />
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
