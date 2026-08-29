import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Camera, Globe, MessageCircle, Mail, Phone, MapPin, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COLUMNS = [
  {
    title: "DestinyPair",
    links: [
      ["/about", "About Us"],
      ["/how-it-works", "How It Works"],
      ["/contact", "Contact Us"],
      ["/faq", "FAQ"],
    ],
  },
  {
    title: "Discover",
    links: [
      ["/discover", "Discover Singles"],
      ["/membership", "Membership Plans"],
      ["/dashboard/counselling", "Counselling"],
    ],
  },
  {
    title: "Safety",
    links: [
      ["/community-guidelines", "Community & Safety"],
      ["/community-guidelines#reporting", "Safety Centre"],
      ["/contact", "Report a User"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/privacy-policy", "Privacy Policy"],
      ["/terms-of-use", "Terms of Use"],
      ["/disclaimer", "Disclaimer"],
      ["/refund-policy", "Refund & Cancellation Policy"],
    ],
  },
];

function FooterColumn({ column, mobile }) {
  const [open, setOpen] = useState(false);

  if (!mobile) {
    return (
      <div>
        <h4 className="font-display text-sm font-semibold mb-3 text-gradient-gold">{column.title}</h4>
        <ul className="space-y-1.5 text-xs text-[color:var(--cream-soft)]/80">
          {column.links.map(([to, label]) => (
            <li key={to + label}>
              <Link to={to} className="hover:text-[color:var(--gold-royal)] transition">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="border-b border-[color:var(--cream-soft)]/10 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <span className="font-display text-sm font-semibold text-gradient-gold">{column.title}</span>
        <ChevronDown
          className={`h-4 w-4 text-[color:var(--cream-soft)]/60 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <ul className="pb-3 space-y-1.5 text-xs text-[color:var(--cream-soft)]/80">
              {column.links.map(([to, label]) => (
                <li key={to + label}>
                  <Link to={to} className="hover:text-[color:var(--gold-royal)] transition">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden print:hidden">
      <svg className="absolute top-0 inset-x-0 w-full h-12 -translate-y-[99%]" viewBox="0 0 1440 80" preserveAspectRatio="none">
        <path d="M0,80 C360,0 1080,0 1440,80 Z" fill="var(--emerald-deep)" />
      </svg>
      <div className="bg-emerald text-[color:var(--cream-soft)] relative">
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-10 pb-6">
          {/* Desktop columns */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-gold rounded-xl p-2 shadow-glow">
                  <Heart className="h-4 w-4 text-[color:var(--emerald-deep)]" fill="currentColor" />
                </div>
                <span className="font-display text-lg font-bold">DestinyPair<span className="text-gradient-gold">.net</span></span>
              </div>
              <p className="text-[color:var(--cream-soft)]/80 text-xs leading-relaxed">
                A faith-guided marriage facilitation platform connecting purposeful Christian singles across Nigeria.
              </p>
              <div className="flex gap-2 mt-4">
                {[Camera, Globe, MessageCircle].map((Icon, i) => (
                  <a key={i} href="#" aria-label="Social link" className="h-8 w-8 rounded-full glass flex items-center justify-center hover:bg-gold hover:text-[color:var(--emerald-deep)] transition-all">
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>
            {COLUMNS.map((col) => (
              <FooterColumn key={col.title} column={col} />
            ))}
          </div>

          {/* Mobile: collapsible categories */}
          <div className="md:hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gold rounded-xl p-2 shadow-glow">
                <Heart className="h-4 w-4 text-[color:var(--emerald-deep)]" fill="currentColor" />
              </div>
              <span className="font-display text-lg font-bold">DestinyPair<span className="text-gradient-gold">.net</span></span>
            </div>
            {COLUMNS.map((col) => (
              <FooterColumn key={col.title} column={col} mobile />
            ))}
          </div>

          {/* Contact strip */}
          <div className="mt-8 grid sm:grid-cols-3 gap-3 text-xs text-[color:var(--cream-soft)]/80">
            <div className="flex gap-2"><Mail className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--gold-royal)]" /> pureintentions.globaltech@gmail.com</div>
            <div className="flex gap-2"><Phone className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--gold-royal)]" /> +234 806 430 3067</div>
            <div className="flex gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--gold-royal)]" /> Alakuko, Lagos</div>
          </div>

          <div className="mt-8 pt-6 border-t border-[color:var(--cream-soft)]/15 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between text-xs text-[color:var(--cream-soft)]/70">
            <div className="flex flex-col gap-1">
              <span>&copy; 2026 DestinyPair.net â€” Purposeful Introductions. Healthy Marriages.</span>
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <span>BN: 9596573</span>
                <span>TIN: 2622446788316</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              Powered by{" "}
              <a href="https://pureintentionsglobal.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[color:var(--gold-royal)] transition">
                Pure Intentions Global Tech Services
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

