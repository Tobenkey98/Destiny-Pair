import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Crown, Star, Sparkles } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";

const plans = [
  { name: "Essential", icon: Star, price: "\u20A615,000", per: "per quarter", desc: "Begin your faith-led search.", feats: ["Verified profile","Browse up to 50 matches","Standard support","Faith verification"], cta: "Start Essential", featured: false },
  { name: "Premium Plus", icon: Crown, price: "\u20A645,000", per: "per quarter", desc: "Our most chosen plan.", feats: ["Unlimited matches","Dedicated matchmaker","Pre-marital counselling","Priority introductions","Faith-verification badge","Family liaison"], cta: "Choose Premium Plus", featured: true },
  { name: "Concierge", icon: Sparkles, price: "\u20A6120,000", per: "per quarter", desc: "Bespoke white-glove service.", feats: ["Personal advisor","Hand-picked introductions","Family consultations","In-person meetings","Lifetime support","Wedding planning concierge"], cta: "Inquire Concierge", featured: false },
];

const compare = [
  ["Verified faith profile", true, true, true],
  ["Browse matches", "50/mo", "Unlimited", "Unlimited"],
  ["Dedicated matchmaker", false, true, true],
  ["Pre-marital counselling", false, true, true],
  ["Family consultations", false, false, true],
  ["Priority support", false, true, true],
  ["Lifetime support", false, false, true],
];

function Membership() {
  return (
    <>
      <PageHero eyebrow="Membership" title="Tiers worthy of forever." subtitle="Every plan is built with the same conviction &mdash; your forever deserves intention." />

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.1}>
                <motion.div whileHover={{ y: -10 }} className={`relative p-8 rounded-3xl transition-all h-full ${p.featured ? "bg-luxury text-[color:var(--cream-soft)] shadow-luxe lg:scale-105" : "bg-background border border-border shadow-soft hover:shadow-luxe"}`}>
                  {p.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gold text-[color:var(--emerald-deep)] text-xs font-bold tracking-wider shadow-glow">MOST POPULAR</div>
                  )}
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-5 ${p.featured ? "bg-gold" : "bg-emerald"}`}>
                    <p.icon className={`h-7 w-7 ${p.featured ? "text-[color:var(--emerald-deep)]" : "text-[color:var(--gold-royal)]"}`} />
                  </div>
                  <h3 className={`font-display text-3xl font-bold ${p.featured ? "text-gradient-gold" : ""}`}>{p.name}</h3>
                  <p className={`text-sm mt-1 ${p.featured ? "text-[color:var(--cream-soft)]/80" : "text-muted-foreground"}`}>{p.desc}</p>
                  <div className="mt-7">
                    <div className={`font-display text-5xl font-bold ${p.featured ? "text-gradient-gold" : "text-gradient-luxury"}`}>{p.price}</div>
                    <div className={`text-sm mt-1 ${p.featured ? "text-[color:var(--cream-soft)]/70" : "text-muted-foreground"}`}>{p.per}</div>
                  </div>
                  <ul className="mt-7 space-y-3.5">
                    {p.feats.map(f => (
                      <li key={f} className="flex gap-3 items-start">
                        <Check className={`h-5 w-5 shrink-0 mt-0.5 ${p.featured ? "text-[color:var(--gold-royal)]" : "text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]"}`} />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className={`mt-10 block text-center py-4 rounded-full font-bold transition ${p.featured ? "bg-gold text-[color:var(--emerald-deep)] hover:shadow-glow" : "bg-emerald text-[color:var(--gold-royal)] hover:shadow-glow"}`}>{p.cta}</Link>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[color:var(--cream-soft)] dark:bg-card">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <h2 className="text-center font-display text-4xl font-bold mb-14">Compare all features</h2>
          </Reveal>
          <Reveal>
            <div className="overflow-x-auto rounded-3xl bg-background border border-border shadow-soft">
              <table className="w-full">
                <thead>
                  <tr className="bg-emerald text-[color:var(--gold-royal)]">
                    <th className="text-left p-5 font-semibold">Feature</th>
                    <th className="p-5 font-semibold">Essential</th>
                    <th className="p-5 font-semibold">Premium Plus</th>
                    <th className="p-5 font-semibold">Concierge</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-5 font-medium">{row[0]}</td>
                      {row.slice(1).map((v, j) => (
                        <td key={j} className="p-5 text-center">
                          {v === true ? <Check className="h-5 w-5 mx-auto text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
                            : v === false ? <X className="h-5 w-5 mx-auto text-muted-foreground/40" />
                            : <span className="text-sm font-semibold">{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export default Membership;
