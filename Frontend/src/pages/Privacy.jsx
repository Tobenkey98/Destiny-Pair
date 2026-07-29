import { Shield, Lock, Eye, FileCheck, AlertCircle, UserCheck } from "lucide-react";
import { PageHero, Reveal } from "../components/Section";

function Privacy() {
  const items = [
    { icon: Shield, title: "NDPA Compliant", body: "Fully aligned with Nigeria Data Protection Act 2023. Your data is processed lawfully, fairly, and transparently." },
    { icon: Lock, title: "End-to-End Encryption", body: "All conversations and sensitive data are encrypted in transit and at rest using industry-grade protocols." },
    { icon: Eye, title: "Profile Control", body: "Choose who sees your profile. Pause, hide, or remove your presence anytime." },
    { icon: FileCheck, title: "Verified Identities", body: "Every profile undergoes faith and identity verification &mdash; no anonymous browsers." },
    { icon: AlertCircle, title: "Anti-Harassment Policy", body: "Zero-tolerance. Reports are reviewed within 24 hours; violators are permanently removed." },
    { icon: UserCheck, title: "Right to Be Forgotten", body: "Request full account deletion at any time &mdash; your data is purged within 30 days." },
  ];

  return (
    <>
      <PageHero eyebrow="Safety & Privacy" title="Your story, fiercely guarded." subtitle="Built with NDPA compliance, verified identities, and a sanctuary mindset." />

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((c, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="p-7 rounded-3xl bg-background border border-border shadow-soft hover:shadow-luxe transition h-full">
                <div className="h-14 w-14 rounded-2xl bg-emerald flex items-center justify-center mb-5"><c.icon className="h-7 w-7 text-[color:var(--gold-royal)]" /></div>
                <h3 className="font-display text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-20 bg-[color:var(--cream-soft)] dark:bg-card">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-bold mb-6">Our commitments</h2>
            <p className="text-muted-foreground leading-relaxed">DestinyPair processes personal data only for the purpose of facilitating purposeful introductions. We never sell your data. We never share your profile without consent. We retain records only as long as necessary to provide our services or as required by law.</p>
            <h3 className="font-display text-2xl font-bold mt-10 mb-4">Reporting concerns</h3>
            <p className="text-muted-foreground">If you experience any conduct that violates our values, contact privacy@destinypair.net. Reports are confidential and acted upon swiftly.</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export default Privacy;
