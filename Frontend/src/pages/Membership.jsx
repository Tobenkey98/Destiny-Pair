import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, HeartHandshake, Sparkles } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";
import { api } from "../lib/api";
import { PLAN_FALLBACK, planFeatures, planMeta, compareRows } from "../lib/plans";

const FAQ = [
  {
    q: "Is my payment secure?",
    a: "All payments are processed by Flutterwave using bank-grade encryption. We never store your card details.",
  },
  {
    q: "Can I cancel or change my plan?",
    a: "Yes. You can upgrade, downgrade, or cancel anytime from your profile. Changes take effect at the end of the billing cycle.",
  },
  {
    q: "What is a counselling session?",
    a: "Premium and Kingdom plans include monthly faith-guided counselling sessions with a vetted Christian counsellor.",
  },
  {
    q: "Do you offer refunds?",
    a: "If something isn't right within 7 days of a new subscription, reach out and we'll make it right.",
  },
];

function Membership() {
  const [plans, setPlans] = useState(PLAN_FALLBACK);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => setPlans(PLAN_FALLBACK));
  }, []);

  const compare = compareRows(plans);

  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Tiers worthy of forever."
        subtitle="Every plan is built with the same conviction &mdash; your forever deserves intention. Choose the level of access that fits your season."
      />

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
            {plans.map((p, i) => {
              const meta = planMeta(p.slug);
              const Icon = meta.icon;
              const feats = planFeatures(p);
              const shown = feats.slice(0, 6);
              const extra = feats.length - shown.length;
              const ctaTo = p.slug === "free" ? "/register" : `/checkout/${p.slug}`;
              const ctaLabel = p.slug === "free" ? "Register Free" : `Choose ${p.name}`;
              return (
                <Reveal key={p.slug} delay={i * 0.1}>
                  <motion.div
                    whileHover={{ y: -6 }}
                    className={`relative p-6 rounded-3xl transition-all h-full flex flex-col ${
                      meta.featured
                        ? "bg-luxury text-[color:var(--cream-soft)] shadow-luxe ring-1 ring-[color:var(--gold-royal)]/40"
                        : "bg-background border border-border shadow-soft hover:shadow-luxe"
                    }`}
                  >
                    {meta.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold text-[color:var(--emerald-deep)] text-[11px] font-bold tracking-wider shadow-glow flex items-center gap-1 whitespace-nowrap">
                        <Sparkles className="h-3 w-3" /> MOST POPULAR
                      </div>
                    )}
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-4 ${meta.featured ? "bg-gold" : "bg-emerald"}`}>
                      <Icon className={`h-5 w-5 ${meta.featured ? "text-[color:var(--emerald-deep)]" : "text-[color:var(--gold-royal)]"}`} />
                    </div>
                    <h3 className={`font-display text-2xl font-bold ${meta.featured ? "text-gradient-gold" : ""}`}>{p.name}</h3>
                    <p className={`text-[13px] mt-1 line-clamp-2 min-h-[2.5rem] ${meta.featured ? "text-[color:var(--cream-soft)]/80" : "text-muted-foreground"}`}>
                      {p.description || p.desc}
                    </p>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className={`font-display text-4xl font-bold ${meta.featured ? "text-gradient-gold" : "text-gradient-luxury"}`}>
                        {p.price_display || `\u20A6${Number(p.price).toLocaleString()}`}
                      </span>
                      <span className={`text-xs ${meta.featured ? "text-[color:var(--cream-soft)]/70" : "text-muted-foreground"}`}>
                        {meta.per}
                      </span>
                    </div>
                    <ul className="mt-5 space-y-2.5 flex-1">
                      {shown.map((f) => (
                        <li key={f} className="flex gap-2 items-start">
                          <Check className={`h-4 w-4 shrink-0 mt-0.5 ${meta.featured ? "text-[color:var(--gold-royal)]" : "text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]"}`} />
                          <span className="text-[13px] leading-snug">{f}</span>
                        </li>
                      ))}
                      {extra > 0 && (
                        <li className={`text-xs font-semibold pl-6 ${meta.featured ? "text-[color:var(--gold-royal)]" : "text-muted-foreground"}`}>
                          +{extra} more features
                        </li>
                      )}
                    </ul>
                    <Link
                      to={ctaTo}
                      className={`mt-6 block text-center py-3 rounded-full text-sm font-bold transition ${
                        meta.featured
                          ? "bg-gold text-[color:var(--emerald-deep)] hover:shadow-glow"
                          : "bg-emerald text-[color:var(--gold-royal)] hover:shadow-glow"
                      }`}
                    >
                      {ctaLabel}
                    </Link>
                  </motion.div>
                </Reveal>
              );
            })}
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
                    {plans.map((p) => (
                      <th key={p.slug} className="p-5 font-semibold">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compare.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-5 font-medium">{row[0]}</td>
                      {row[1].map((v, j) => (
                        <td key={j} className="p-5 text-center">
                          {v === true ? (
                            <Check className="h-5 w-5 mx-auto text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
                          ) : v === false ? (
                            <X className="h-5 w-5 mx-auto text-muted-foreground/40" />
                          ) : (
                            <span className="text-sm font-semibold">{v}</span>
                          )}
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

      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <div className="flex items-center justify-center gap-2 mb-10">
              <HeartHandshake className="h-6 w-6 text-[color:var(--gold-royal)]" />
              <h2 className="text-center font-display text-4xl font-bold">Questions, answered</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {FAQ.map((item, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="h-full rounded-3xl bg-background border border-border shadow-soft p-6">
                  <h3 className="font-display text-lg font-bold mb-2">{item.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default Membership;
