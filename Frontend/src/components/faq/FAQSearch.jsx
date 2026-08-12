import { Search, SearchX } from "lucide-react";
import { motion } from "framer-motion";

/** Search input for the FAQ — filters questions by question text. */
export default function FAQSearch({ query, onChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative max-w-2xl mx-auto"
    >
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search questions…  e.g. “How do I cancel?”"
        aria-label="Search frequently asked questions"
        className="w-full pl-14 pr-5 py-4 rounded-full bg-background border border-border text-foreground placeholder:text-muted-foreground/70 shadow-soft focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition"
      />
      {query && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition"
        >
          <SearchX className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
