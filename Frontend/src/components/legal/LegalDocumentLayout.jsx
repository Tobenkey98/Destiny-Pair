import { useEffect, useRef, useState } from "react";
import { ArrowUp, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import LegalSection, { LegalReveal } from "./LegalSection";
import DocumentHeader from "./DocumentHeader";
import LegalTableOfContents from "./LegalTableOfContents";

/**
 * Reusable layout for public legal documents.
 *
 * Features: sticky desktop table of contents with active-section indicator,
 * collapsible mobile ToC, smooth scrolling, back-to-top button and
 * print-friendly styling. Content lives in the document modules under
 * src/legalContent — updating wording never touches this layout.
 *
 * Optional `notice` renders a prominent banner below the header
 * (e.g. a highlighted safety reminder on the Disclaimer).
 */
export default function LegalDocumentLayout({
  title,
  description,
  lastUpdated,
  version,
  sections,
  notice,
  eyebrow = "Legal",
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");
  const [showTop, setShowTop] = useState(false);
  const [ready, setReady] = useState(false);
  const sectionEls = useRef({});

  useEffect(() => {
    setReady(true);
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      if (sections.some((s) => s.id === id)) setActiveId(id);
    }
  }, [sections]);

  // Active section tracking while scrolling.
  useEffect(() => {
    if (!ready) return;
    const onScroll = () => {
      setShowTop(window.scrollY > 640);
      const probe = window.scrollY + 160;
      let current = sections[0]?.id || "";
      for (const section of sections) {
        const el = sectionEls.current[section.id];
        if (el && el.offsetTop <= probe) current = section.id;
      }
      setActiveId(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ready, sections]);

  function scrollToSection(e, id) {
    e.preventDefault();
    const el = sectionEls.current[id] || document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActiveId(id);
  }

  return (
    <section className="pt-28 pb-24 bg-hero">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <DocumentHeader
          title={title}
          description={description}
          lastUpdated={lastUpdated}
          version={version}
          eyebrow={eyebrow}
        />

        {/* Optional prominent notice */}
        {notice && (
          <LegalReveal delay={0.05}>
            <div className="mt-8 flex items-start gap-3 p-5 rounded-3xl border border-destructive/25 bg-destructive/10 text-foreground shadow-soft">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5 text-destructive" />
              <p className="text-sm sm:text-[15px] leading-relaxed">{notice}</p>
            </div>
          </LegalReveal>
        )}

        <div className="mt-12 lg:grid lg:grid-cols-[280px_1fr] lg:gap-12 lg:items-start">
          {/* Table of contents */}
          <LegalTableOfContents
            sections={sections}
            activeId={activeId}
            onNavigate={scrollToSection}
          />

          {/* Document body */}
          <div className="min-w-0 bg-background/60 rounded-3xl border border-border/40 p-6 sm:p-10 md:p-14 print:border-0 print:bg-transparent print:p-0 print:shadow-none">
            {sections.map((section) => (
              <div key={section.id} ref={(el) => (sectionEls.current[section.id] = el)}>
                <LegalReveal delay={0.05}>
                  <LegalSection section={section} />
                </LegalReveal>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Back to top */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="print:hidden fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full bg-emerald text-[color:var(--gold-royal)] shadow-luxe flex items-center justify-center hover:bg-emerald-dark hover:scale-105 transition focus-visible:ring-2 focus-visible:ring-[color:var(--gold-royal)] outline-none"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
