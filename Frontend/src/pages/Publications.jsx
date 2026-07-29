import { motion } from "framer-motion";
import { useState } from "react";
import { BookOpen, FileText, GraduationCap, Download } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";

const items = [
  { cat: "Books", icon: BookOpen, title: "Covenant Hearts", author: "Dr. A. Olawale", year: 2022, desc: "A theological framework for faith-anchored marriage in modern Nigeria." },
  { cat: "Seminar Papers", icon: FileText, title: "The Vetting Imperative", author: "DestinyPair Council", year: 2023, desc: "Why pre-introduction screening protects faith communities." },
  { cat: "Seminar Papers", icon: FileText, title: "Inter-Family Counselling", author: "Rev. F. Adeleke", year: 2021, desc: "Bridging two families through pre-marital dialogue." },
  { cat: "Research", icon: GraduationCap, title: "Faith & Marital Longevity", author: "DP Research Lab", year: 2024, desc: "A 10-year study of faith-led marriages in Nigeria." },
  { cat: "Research", icon: GraduationCap, title: "Digital Matchmaking Ethics", author: "DP Research Lab", year: 2023, desc: "Building privacy-first platforms for serious singles." },
];

function Publications() {
  const cats = ["All", "Books", "Seminar Papers", "Research"];
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? items : items.filter(i => i.cat === active);

  return (
    <>
      <PageHero eyebrow="Library" title="Wisdom for the journey." subtitle="Books, papers, and research from our decades of faith-led matchmaking ministry." />

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="flex flex-wrap gap-3 justify-center mb-14">
              {cats.map(c => (
                <button key={c} onClick={() => setActive(c)} className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${active === c ? "bg-emerald text-[color:var(--gold-royal)] shadow-soft" : "glass hover:bg-secondary"}`}>{c}</button>
              ))}
            </div>
          </Reveal>

          <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05}>
                <motion.div whileHover={{ y: -8 }} className="group relative p-7 rounded-3xl bg-background border border-border shadow-soft hover:shadow-luxe transition-all h-full overflow-hidden">
                  <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gold opacity-0 group-hover:opacity-20 blur-3xl transition" />
                  <div className="flex items-start justify-between mb-5">
                    <div className="h-12 w-12 rounded-2xl bg-emerald flex items-center justify-center"><p.icon className="h-6 w-6 text-[color:var(--gold-royal)]" /></div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-gradient-gold">{p.cat}</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold leading-tight">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.author} &bull; {p.year}</p>
                  <p className="mt-4 text-sm text-foreground/80">{p.desc}</p>
                  <button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] hover:gap-3 transition-all">
                    <Download className="h-4 w-4" /> Download
                  </button>
                </motion.div>
              </Reveal>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}

export default Publications;
