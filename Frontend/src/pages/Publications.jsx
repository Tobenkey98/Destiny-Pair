import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { BookOpen, GraduationCap, Download, Mail, Hourglass, Newspaper, CalendarDays, ChevronDown } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";
import { api } from "../lib/api";

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

function ContentCard({ p, i }) {
  const [open, setOpen] = useState(false);
  const catMeta = {
    devotional: { label: "Devotional", cls: "bg-emerald/10 text-emerald-700 dark:text-emerald-300" },
    article: { label: "Article", cls: "bg-blue-600/10 text-blue-700 dark:text-blue-300" },
    blog: { label: "Blog", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  }[p.category] || { label: p.category, cls: "bg-primary/10 text-primary" };

  return (
    <Reveal delay={i * 0.05}>
      <motion.div whileHover={{ y: -8 }} className="group relative p-7 rounded-3xl bg-background border border-border shadow-soft hover:shadow-luxe transition-all h-full overflow-hidden">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gold opacity-0 group-hover:opacity-20 blur-3xl transition" />
        {p.cover_image_url && (
          <img src={p.cover_image_url} alt={p.title} className="w-full h-40 object-cover rounded-2xl mb-5" />
        )}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-[color:var(--gold-royal)]" />
          </div>
          <span className={`text-xs font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full ${catMeta.cls}`}>{catMeta.label}</span>
        </div>
        <h3 className="font-display text-2xl font-semibold leading-tight">{p.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
          {p.author_name && <span>{p.author_name}</span>}
          {p.published_at && (
            <span className="flex items-center gap-1 text-xs"><CalendarDays className="h-3.5 w-3.5" />{new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          )}
        </p>
        <p className="mt-4 text-sm text-foreground/80">{p.excerpt || p.body?.slice(0, 180)}</p>
        {p.body && p.body.length > (p.excerpt?.length || 0) && (
          <>
            <button onClick={() => setOpen(o => !o)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] hover:gap-2.5 transition-all">
              {open ? "Read less" : "Read more"}
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {p.body}
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </Reveal>
  );
}

function Publications() {
  const cats = ["All", "Books", "Research", "Devotionals & Articles"];
  const [active, setActive] = useState("All");
  const [content, setContent] = useState(null);
  const filtered = active === "All" ? items : items.filter(i => i.cat === active);

  const loadContent = useCallback(() => {
    api.publicContent()
      .then(setContent)
      .catch(() => setContent([]));
  }, []);

  useEffect(() => {
    if (active === "Devotionals & Articles" && content === null) loadContent();
  }, [active, content, loadContent]);

  return (
    <>
      <PageHero eyebrow="Library" title="Wisdom for the journey." subtitle="Books, papers, devotionals and articles from our decades of faith-led counseling ministry." />

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
            {active === "Devotionals & Articles" ? (
              content === null ? (
                <div className="text-center py-16 text-muted-foreground text-sm md:col-span-2 lg:col-span-3">Loading devotionals…</div>
              ) : content.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm md:col-span-2 lg:col-span-3">No devotionals or articles published yet — check back soon.</div>
              ) : (
                content.map((p, i) => <ContentCard key={p.id} p={p} i={i} />)
              )
            ) : (
              filtered.map((p, i) => {
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
              })
            )}
          </motion.div>
        </div>
      </section>
    </>
  );
}

export default Publications;
