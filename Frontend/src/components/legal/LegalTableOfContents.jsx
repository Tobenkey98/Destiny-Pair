import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Sticky table of contents for legal documents: collapsible on mobile,
 * always visible on desktop, with an active-section indicator.
 */
export default function LegalTableOfContents({ sections, activeId, onNavigate }) {
  const [tocOpen, setTocOpen] = useState(false);

  function handleClick(e, id) {
    setTocOpen(false);
    onNavigate(e, id);
  }

  const toc = (
    <nav aria-label="Table of contents" className="space-y-1">
      {sections.map((section) => {
        const active = activeId === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(e) => handleClick(e, section.id)}
            aria-current={active ? "true" : undefined}
            className={`group flex items-start gap-2.5 rounded-xl px-3 py-2 text-[13px] leading-snug transition-colors ${
              active
                ? "bg-emerald/10 font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <span
              className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${
                active ? "bg-gold" : "bg-foreground/15 group-hover:bg-foreground/30"
              }`}
            />
            {section.title}
          </a>
        );
      })}
    </nav>
  );

  return (
    <aside className="print:hidden mb-10 lg:mb-0">
      <div className="lg:sticky lg:top-28">
        {/* Mobile: collapsible */}
        <button
          onClick={() => setTocOpen((v) => !v)}
          aria-expanded={tocOpen}
          aria-controls="legal-toc"
          className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-background border border-border shadow-soft text-sm font-semibold"
        >
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
            On this page
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${tocOpen ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {tocOpen && (
            <motion.div
              id="legal-toc"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="pt-3">{toc}</div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Desktop: always visible */}
        <div className="hidden lg:block rounded-3xl bg-background border border-border/60 shadow-soft p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Table of contents
          </p>
          {toc}
        </div>
      </div>
    </aside>
  );
}
