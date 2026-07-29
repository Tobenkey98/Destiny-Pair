import { motion } from "framer-motion";
import { Cross, Heart, Shield, Users, Sparkles } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";

function FaithValues() {
  return (
    <>
      <PageHero eyebrow="Faith & Values" title="One faith, one sacred standard." subtitle="DestinyPair serves Christian believers with honor, discretion, and devotion to their traditions." />

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          {[
            { icon: Cross, title: "For Christians", grad: "bg-emerald", body: "We honor the biblical view of marriage as a covenant before God. Our Christian members are vetted for sincere faith, denominational openness, and readiness for covenant union.", points: ["Born-again profile verification","Pastor/church reference encouraged","Pre-marital biblical counselling","Cross-denominational respect"] },
          ].map((c, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <motion.div whileHover={{ y: -8 }} className={`relative p-10 rounded-[2.5rem] ${c.grad} text-[color:var(--cream-soft)] shadow-luxe overflow-hidden h-full`}>
                <div className="absolute inset-0 pattern-dots opacity-20" />
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl glass flex items-center justify-center mb-6"><c.icon className="h-8 w-8 text-[color:var(--gold-royal)]" /></div>
                  <h3 className="font-display text-3xl font-bold">{c.title}</h3>
                  <p className="mt-4 opacity-90 leading-relaxed">{c.body}</p>
                  <ul className="mt-6 space-y-2.5">
                    {c.points.map(p => (
                      <li key={p} className="flex gap-2.5 items-start"><Sparkles className="h-4 w-4 mt-1 text-[color:var(--gold-royal)] shrink-0" /><span className="text-sm">{p}</span></li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-24 bg-[color:var(--cream-soft)] dark:bg-card">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">Core Values</span>
              <h2 className="mt-3 font-display text-4xl font-bold">The pillars we stand upon</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Heart, title: "Sacred Intention", body: "Every connection is built for forever." },
              { icon: Shield, title: "Unwavering Privacy", body: "Your story remains yours." },
              { icon: Users, title: "Family Honor", body: "We respect the role of family in covenant." },
              { icon: Sparkles, title: "Divine Guidance", body: "We invite faith into every step." },
            ].map((v, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div whileHover={{ y: -6 }} className="p-7 rounded-3xl bg-background border border-border shadow-soft text-center h-full">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-gold flex items-center justify-center mb-4"><v.icon className="h-7 w-7 text-[color:var(--emerald-deep)]" /></div>
                  <h3 className="font-display text-xl font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-6">
          <Reveal>
            <div className="p-8 rounded-3xl glass shadow-soft h-full">
              <h3 className="font-display text-2xl font-bold text-gradient-luxury">Non-Discrimination</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">DestinyPair welcomes all sincere believers regardless of ethnicity, denomination within their faith, age, profession, or financial standing. What unites us is faith and intention.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="p-8 rounded-3xl glass shadow-soft h-full">
              <h3 className="font-display text-2xl font-bold text-gradient-luxury">Moderation Standards</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">Profiles are reviewed by trained moderators. Disrespectful behavior, deceit, or non-marital intent results in immediate removal &mdash; without refund and without exception.</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export default FaithValues;
