import { BookOpen, FileText, ScrollText } from "lucide-react";
import { LegalReveal } from "./LegalSection";

/** Document header: eyebrow badge, title, description, version meta. */
export default function DocumentHeader({ title, description, lastUpdated, version, eyebrow = "Legal" }) {
  return (
    <LegalReveal>
      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald/10 text-xs font-bold uppercase tracking-widest text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">
          <ScrollText className="h-3.5 w-3.5" /> {eyebrow}
        </span>
        <h1 className="mt-5 font-display text-4xl md:text-5xl font-bold text-gradient-luxury">
          {title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Last updated: {lastUpdated}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Version {version}
          </span>
        </div>
      </header>
    </LegalReveal>
  );
}
