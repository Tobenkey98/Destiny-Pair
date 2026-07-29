import { motion } from "framer-motion";
import { Heart, Eye, Target, Award, Users, Sparkles } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";

function About() {
  return (
    <>
      <PageHero eyebrow="Our Story" title="Crafted with faith, devoted to forever." subtitle="A quarter-century of shepherding believers into purposeful, lasting matrimony." />

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">Founder's Story</span>
            <h2 className="mt-3 font-display text-4xl font-bold">A calling, not a business.</h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              DestinyPair was born from a simple conviction: marriage is sacred. After watching too many believers settle, struggle, or stray from their values in search of love, our founder began a quiet ministry of intentional introductions. Twenty-five years later, that ministry has become a movement.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We exist for the serious &mdash; those who believe a spouse is a sacred gift, not a swipe.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="relative aspect-square rounded-[3rem] bg-luxury shadow-luxe overflow-hidden">
              <div className="absolute inset-0 pattern-dots opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Heart className="h-40 w-40 text-[color:var(--gold-royal)]" fill="currentColor" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-24 bg-[color:var(--cream-soft)] dark:bg-card">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: "Mission", body: "To facilitate God-honoring marriages between serious Christian singles in Nigeria, through trusted, faith-aligned introductions." },
              { icon: Eye, title: "Vision", body: "A generation of believers entering covenant marriages built on shared faith, purpose, and lifelong commitment." },
              { icon: Award, title: "Why We Exist", body: "Because the marketplace of casual dating has failed those who want forever. We honor those who choose intention." },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div whileHover={{ y: -6 }} className="p-8 rounded-3xl bg-background border border-border shadow-soft h-full">
                  <div className="h-14 w-14 rounded-2xl bg-emerald flex items-center justify-center mb-5"><c.icon className="h-7 w-7 text-[color:var(--gold-royal)]" /></div>
                  <h3 className="font-display text-2xl font-semibold">{c.title}</h3>
                  <p className="mt-3 text-muted-foreground">{c.body}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">Our Journey</span>
              <h2 className="mt-3 font-display text-4xl font-bold">Twenty-five years, one mission.</h2>
            </div>
          </Reveal>
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-[color:var(--gold-royal)] to-transparent" />
            {[
              { year: "1999", title: "The first introduction", body: "A pastoral mentorship leads to our first faith-aligned union." },
              { year: "2008", title: "Ministry expands", body: "Quiet word-of-mouth grows into structured matchmaking across Lagos & Abuja." },
              { year: "2017", title: "Nationwide reach", body: "Coverage extends to all 36 states with a network of vetted advisors." },
              { year: "2024", title: "DestinyPair.net", body: "Our trusted ministry becomes a premium digital platform." },
            ].map((m, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className={`relative grid md:grid-cols-2 gap-8 mb-12 ${i % 2 ? "md:[direction:rtl]" : ""}`}>
                  <div className="md:[direction:ltr]">
                    <div className={`p-6 rounded-2xl bg-background border border-border shadow-soft ${i % 2 ? "md:text-right" : ""}`}>
                      <div className="font-display text-3xl font-bold text-gradient-luxury">{m.year}</div>
                      <h3 className="mt-1 font-display text-xl font-semibold">{m.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{m.body}</p>
                    </div>
                  </div>
                  <div className="hidden md:block" />
                  <div className="absolute left-1/2 top-8 -translate-x-1/2 h-5 w-5 rounded-full bg-gold border-4 border-background shadow-glow" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-luxury text-[color:var(--cream-soft)] relative overflow-hidden">
        <div className="absolute inset-0 pattern-grid opacity-20" />
        <div className="relative max-w-6xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[["25+","Years"],["10K+","Members"],["3K+","Unions"],["36","States"]].map(([n,l], i) => (
            <Reveal key={i} delay={i*0.1}>
              <div className="font-display text-6xl font-bold text-gradient-gold">{n}</div>
              <div className="mt-2 text-sm tracking-widest uppercase opacity-80">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

export default About;
