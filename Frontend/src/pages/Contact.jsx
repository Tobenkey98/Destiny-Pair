import { motion } from "framer-motion";
import { Mail, Phone, MessageCircle, MapPin, Clock, Send } from "lucide-react";
import { useState } from "react";
import { PageHero, Reveal } from "../components/Section";

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHero eyebrow="Reach Us" title="Begin a conversation." subtitle="Our team is here to guide, listen, and answer &mdash; with the same care we bring to every introduction." />

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[
              { icon: Mail, title: "Email", body: "pureintentions.globaltech@gmail.com", grad: "bg-emerald" },
              { icon: Phone, title: "Call", body: "+234 806 430 3067", grad: "bg-gold" },
              { icon: MessageCircle, title: "WhatsApp", body: "+234 806 430 3067", grad: "bg-luxury" },
              { icon: MapPin, title: "Office", body: "Alakuko, Lagos", grad: "bg-emerald" },
              { icon: Clock, title: "Hours", body: "Monâ€“Fri â€¢ 9am â€“ 6pm WAT", grad: "bg-gold" },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <motion.div whileHover={{ x: 6 }} className={`p-5 rounded-2xl ${c.grad} ${c.grad === "bg-gold" ? "text-[color:var(--emerald-deep)]" : "text-[color:var(--cream-soft)]"} shadow-soft flex gap-4 items-center`}>
                  <div className="h-12 w-12 rounded-xl glass flex items-center justify-center shrink-0"><c.icon className="h-5 w-5" /></div>
                  <div>
                    <div className="font-display text-sm uppercase tracking-wider opacity-80">{c.title}</div>
                    <div className="font-semibold">{c.body}</div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>

          <div className="lg:col-span-3">
            <Reveal>
              <div className="p-8 md:p-10 rounded-3xl glass shadow-luxe">
                <h2 className="font-display text-3xl font-bold">Send us a message</h2>
                <p className="mt-2 text-muted-foreground">We typically respond within one business day.</p>
                <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="mt-8 grid sm:grid-cols-2 gap-5">
                  <Field label="Full name" type="text" />
                  <Field label="Email" type="email" />
                  <div className="sm:col-span-2"><Field label="Subject" type="text" /></div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Message</label>
                    <textarea rows={5} required className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-semibold shadow-soft hover:shadow-glow transition">
                      <Send className="h-4 w-4" /> Send Message
                    </button>
                    {sent && <span className="ml-4 text-sm text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] font-semibold">Thank you &mdash; we will be in touch.</span>}
                  </div>
                </form>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-8 aspect-[16/9] rounded-3xl bg-emerald relative overflow-hidden shadow-soft">
                <div className="absolute inset-0 pattern-grid opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center text-[color:var(--gold-royal)]">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-3" />
                    <p className="font-display text-xl">Alakuko, Lagos</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, type }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <input type={type} required className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition" />
    </div>
  );
}

export default Contact;

