import { motion } from "framer-motion";
import { useState } from "react";
import { BookOpen, GraduationCap, Download, Mail, Hourglass } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";

const items = [
  { cat: "Books", icon: BookOpen, title: "200 Common Mistakes in Marriage", desc: "Two hundred practical pitfalls to avoid on the journey to a lasting union.", availability: "Available on request", action: "request" },
  { cat: "Books", icon: BookOpen, title: "Pillars and Caterpillars of Marriage", desc: "What builds a marriage up - and what quietly eats it away.", availability: "PDF available on request", action: "request" },
  { cat: "Books", icon: BookOpen, title: "When Parents Pray", desc: "A charge to parents on standing in the gap for their children.", availability: "Available live on Selar", action: "selar" },
  { cat: "Books", icon: BookOpen, title: "Why the Righteous Suffer", desc: "A biblical look at suffering, faith, and the faithfulness of God.", availability: "Available live on Selar", action: "selar" },
  { cat: "Books", icon: BookOpen, title: "Ìdílé Aláyọ̀ (A Happy Home)", desc: "Yoruba edition of Pillars and Caterpillars of Marriage.", availability: "Available on request", action: "request" },
  { cat: "Books", icon: BookOpen, title: "The Golden Woman", byline: "Rev. Margaret Bola Olorunsanmi", desc: "A portrait of godly womanhood in marriage, family, and ministry.", availability: "Available on request", action: "request" },
  { cat: "Research", icon: GraduationCap, title: "The Influence of Digital Culture on Christian Marriage in Nigeria", byline: "Jesuloba Olorunsanmi", desc: "Dissertation at the National Open University of Nigeria.", availability: "In view", action: "soon" },
];

const actions = {
  selar: { label: "Get on Selar", icon: Download },
  request: { label: "Request a copy", icon: Mail },
  soon: { label: "Coming soon", icon: Hourglass },
};

function Publications() {
  const cats = ["All", "Books", "Research"];
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? items : items.filter(i => i.cat === active);

  return (
    <>
      <PageHero eyebrow="Library" title="Wisdom for the journey." subtitle="Books, papers, and research from our decades of faith-led counseling ministry." />

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
            {filtered.map((p, i) => {
              const act = actions[p.action];
              const ActIcon = act.icon;
              return (
                <Reveal key={p.title} delay={i * 0.05}>
                  <motion.div whileHover={{ y: -8 }} className="group relative p-7 rounded-3xl bg-background border border-border shadow-soft hover:shadow-luxe transition-all h-full overflow-hidden">
                    <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gold opacity-0 group-hover:opacity-20 blur-3xl transition" />
                    <div className="flex items-start justify-between mb-5">
                      <div className="h-12 w-12 rounded-2xl bg-emerald flex items-center justify-center"><p.icon className="h-6 w-6 text-[color:var(--gold-royal)]" /></div>
                      <span className="text-xs font-semibold tracking-wider uppercase text-gradient-gold">{p.cat}</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold leading-tight">{p.title}</h3>
                    {p.byline && <p className="mt-1 text-sm text-muted-foreground">{p.byline}</p>}
                    <p className="mt-4 text-sm text-foreground/80">{p.desc}</p>
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">{p.availability}</span>
                      <button disabled={p.action === "soon"} className={`inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] transition-all ${p.action === "soon" ? "opacity-50 cursor-default" : "hover:gap-3"}`}>
                        <ActIcon className="h-4 w-4" /> {act.label}
                      </button>
                    </div>
                  </motion.div>
                </Reveal>
              );
            })}
          </motion.div>
        </div>
      </section>
    </>
  );
}

export default Publications;
