import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

/**
 * A single legal document section: anchorable, with a heading and
 * body items (optional sub-heading + paragraph).
 */
export default function LegalSection({ section }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-32 border-b border-border/40 pb-10 mb-10 last:border-0 last:mb-0 last:pb-0"
    >
      <h2 className="font-display text-2xl md:text-[1.7rem] font-bold text-foreground">
        {section.title}
      </h2>
      <div className="mt-4 space-y-4">
        {section.body.map((item, i) => (
          <div key={i}>
            {item.sub && (
              <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] mb-1.5">
                {item.sub}
              </h3>
            )}
            <p className="text-[15px] leading-relaxed text-foreground/75">{item.text}</p>
          </div>
        ))}
        {section.note && <LegalSubsection icon="alert">{section.note}</LegalSubsection>}
      </div>
    </section>
  );
}

/**
 * A call-out paragraph for emphasis inside a legal section
 * (e.g. a highlighted warning or reminder).
 */
export function LegalSubsection({ icon = "alert", children }) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border ${
        icon === "alert"
          ? "bg-destructive/5 border-destructive/20"
          : "bg-emerald/5 border-[color:var(--emerald-deep)]/20"
      }`}
    >
      {icon === "alert" && (
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
      )}
      <p className="text-sm leading-relaxed text-foreground/80">{children}</p>
    </div>
  );
}

/**
 * Fade-up wrapper for gentle entrance of content blocks.
 */
export function LegalReveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
