import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircleQuestion, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { Accordion } from "../components/ui/accordion";
import FAQSearch from "../components/faq/FAQSearch";
import FAQCategory from "../components/faq/FAQCategory";
import FAQItem from "../components/faq/FAQItem";
import { faqCategories } from "../legalContent/faq";
import { useSEO } from "../hooks/useSEO";

function normalize(text) {
  return text.toLowerCase().trim();
}

function NoResults({ query, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 max-w-md mx-auto"
    >
      <div className="h-16 w-16 rounded-full bg-emerald/10 flex items-center justify-center mx-auto mb-4">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-bold text-foreground">No results found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Nothing matches &ldquo;{query}&rdquo;. Try a different keyword, or browse the categories below.
      </p>
      <button
        onClick={onClear}
        className="mt-5 px-5 py-2.5 rounded-full bg-emerald text-white text-sm font-semibold hover:bg-emerald/90 transition"
      >
        Clear search
      </button>
    </motion.div>
  );
}

function FAQ() {
  const [query, setQuery] = useState("");
  const q = normalize(query);

  const filtered = useMemo(() => {
    if (!q) return faqCategories;
    return faqCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            normalize(item.q).includes(q) ||
            normalize(item.a).includes(q) ||
            normalize(cat.label).includes(q),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [q]);

  const total = filtered.reduce((sum, cat) => sum + cat.items.length, 0);

  useSEO({
    title: "DestinyPair Frequently Asked Questions",
    description:
      "Answers to common questions about DestinyPair — membership, connection, messaging, subscriptions, calls, counselling, safety and payments.",
    canonical: `${window.location.origin}/faq`,
  });

  return (
    <section className="pt-28 pb-24 bg-hero">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald/10 text-xs font-bold uppercase tracking-widest text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">
            <MessageCircleQuestion className="h-3.5 w-3.5" /> Help Centre
          </span>
          <h1 className="mt-5 font-display text-4xl md:text-5xl font-bold text-gradient-luxury">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know before and after joining — or search for something specific.
          </p>
        </motion.header>

        <FAQSearch query={query} onChange={setQuery} />

        {/* Results */}
        <div className="mt-12">
          {total === 0 ? (
            <NoResults query={query} onClear={() => setQuery("")} />
          ) : (
            filtered.map((category) => (
              <FAQCategory key={category.id} category={category}>
                <Accordion type="single" collapsible className="space-y-3">
                  {category.items.map((item, i) => (
                    <FAQItem key={item.q} item={item} index={i} />
                  ))}
                </Accordion>
              </FAQCategory>
            ))
          )}
        </div>

        {/* Still stuck? */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-16 p-8 rounded-3xl bg-luxury text-[color:var(--cream-soft)] shadow-luxe text-center"
        >
          <h2 className="font-display text-2xl font-bold text-gradient-gold">Still have questions?</h2>
          <p className="mt-2 text-sm text-[color:var(--cream-soft)]/80 max-w-xl mx-auto">
            Our support team is happy to help. Reach us anytime and we&rsquo;ll respond as soon as we can.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-block px-8 py-3.5 rounded-full bg-gold text-[color:var(--emerald-deep)] font-bold shadow-glow hover:scale-105 transition"
          >
            Contact Support
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default FAQ;
