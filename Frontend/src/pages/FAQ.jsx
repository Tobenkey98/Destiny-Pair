import { useState } from "react";
import { Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { PageHero, Reveal } from "../components/Section";

const faqs = [
  { cat: "Getting Started", q: "Who can join DestinyPair?", a: "Serious Christian singles in Nigeria who are seeking marriage. Members must be 21+ and willing to undergo faith verification." },
  { cat: "Getting Started", q: "Is DestinyPair a dating app?", a: "No. We are a marriage facilitation platform. Our members are not browsing for casual relationships &mdash; they are seeking covenant unions." },
  { cat: "Membership", q: "What's the difference between plans?", a: "Essential gives you verified browsing. Premium Plus adds a dedicated matchmaker and counselling. Concierge provides full white-glove service." },
  { cat: "Membership", q: "Can I cancel anytime?", a: "Yes. You may pause or cancel anytime from your account. Refunds follow our published policy." },
  { cat: "Faith", q: "How is faith verified?", a: "Through a combination of profile review, references where appropriate, and conversations with our vetting team." },
  { cat: "Faith", q: "Do you allow interfaith matches?", a: "No. We honor the conviction of both faiths that marriage is best built on shared belief." },
  { cat: "Privacy", q: "Who sees my profile?", a: "Only members within your selected filters who you choose to reveal yourself to. You control your visibility." },
  { cat: "Privacy", q: "Are my conversations private?", a: "Yes. Conversations are encrypted, never sold, and never shared outside the platform." },
];

function FAQ() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(faqs.map(f => f.cat)))];
  const filtered = faqs.filter(f => (cat === "All" || f.cat === cat) && (f.q.toLowerCase().includes(q.toLowerCase()) || f.a.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions, answered with care." subtitle="Everything you need to know before beginning your journey." />

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <Reveal>
            <div className="relative mb-6">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search questions..." className="w-full pl-14 pr-5 py-4 rounded-full bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition" />
            </div>
            <div className="flex flex-wrap gap-2 mb-8">
              {cats.map(c => (
                <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${cat === c ? "bg-emerald text-[color:var(--gold-royal)] shadow-soft" : "glass hover:bg-secondary"}`}>{c}</button>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <Accordion type="single" collapsible className="space-y-3">
              {filtered.map((f, i) => (
                <AccordionItem key={i} value={`i${i}`} className="rounded-2xl bg-background border border-border px-6 shadow-soft data-[state=open]:shadow-luxe">
                  <AccordionTrigger className="font-display text-lg font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-10">No questions match your search.</p>}
          </Reveal>
        </div>
      </section>
    </>
  );
}

export default FAQ;
