import { motion } from "framer-motion";
import { UserPlus, ShieldCheck, CreditCard, Search, HandHeart, BookHeart } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";

const steps = [
  { icon: UserPlus, title: "Create Profile", body: "Share who you are, what you believe, and what you seek." },
  { icon: ShieldCheck, title: "Profile Review", body: "Our team verifies faith, intent, and authenticity." },
  { icon: CreditCard, title: "Subscribe", body: "Unlock guided introductions with the plan that fits you." },
  { icon: Search, title: "Browse & Connect", body: "Discover faith-aligned matches curated for purpose." },
  { icon: HandHeart, title: "Guided Introduction", body: "A matchmaker facilitates your first conversation." },
  { icon: BookHeart, title: "Marriage Counselling", body: "Pre-marital guidance prepares you for covenant." },
];

function HowItWorks() {
  return (
    <>
      <PageHero eyebrow="The Path" title="Six steps to forever." subtitle="A thoughtful, faith-rooted process &mdash; every step accompanied, every moment intentional." />

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative">
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-[color:var(--gold-royal)] to-transparent" />
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <motion.div whileHover={{ x: 8 }} className="relative flex gap-6 mb-8 group">
                  <div className="relative shrink-0">
                    <div className="h-16 w-16 rounded-2xl bg-emerald flex items-center justify-center shadow-luxe group-hover:shadow-glow transition relative z-10">
                      <s.icon className="h-7 w-7 text-[color:var(--gold-royal)]" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gold flex items-center justify-center text-[10px] font-bold text-[color:var(--emerald-deep)] shadow-soft z-20">0{i+1}</span>
                  </div>
                  <div className="flex-1 p-7 rounded-3xl bg-background border border-border shadow-soft group-hover:shadow-luxe transition">
                    <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                    <p className="mt-2 text-muted-foreground">{s.body}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default HowItWorks;
