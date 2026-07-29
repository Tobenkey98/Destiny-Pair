import { Link } from "react-router-dom";
import { Heart, Camera, Globe, MessageCircle, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden">
      <svg className="absolute top-0 inset-x-0 w-full h-12 -translate-y-[99%]" viewBox="0 0 1440 80" preserveAspectRatio="none">
        <path d="M0,80 C360,0 1080,0 1440,80 Z" fill="var(--emerald-deep)" />
      </svg>
      <div className="bg-emerald text-[color:var(--cream-soft)] relative">
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-10 pb-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
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
                  <a key={i} href="#" className="h-8 w-8 rounded-full glass flex items-center justify-center hover:bg-gold hover:text-[color:var(--emerald-deep)] transition-all">
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold mb-3 text-gradient-gold">Navigate</h4>
              <ul className="space-y-1.5 text-xs text-[color:var(--cream-soft)]/80">
                {[["/about","About"],["/how-it-works","How It Works"],["/membership","Membership"],["/faith-values","Faith & Values"]].map(([to,l]) => (
                  <li key={to}><Link to={to} className="hover:text-[color:var(--gold-royal)] transition">{l}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold mb-3 text-gradient-gold">Support</h4>
              <ul className="space-y-1.5 text-xs text-[color:var(--cream-soft)]/80">
                {[["/faq","FAQ"],["/privacy","Privacy & Safety"],["/publications","Publications"],["/contact","Contact"]].map(([to,l]) => (
                  <li key={to}><Link to={to} className="hover:text-[color:var(--gold-royal)] transition">{l}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold mb-3 text-gradient-gold">Reach Us</h4>
              <ul className="space-y-2 text-xs text-[color:var(--cream-soft)]/80">
                <li className="flex gap-2"><Mail className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--gold-royal)]" /> pureintentions.globaltech@gmail.com</li>
                <li className="flex gap-2"><Phone className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--gold-royal)]" /> +234 806 430 3067</li>
                <li className="flex gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[color:var(--gold-royal)]" /> Lagos, Nigeria</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[color:var(--cream-soft)]/15 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between text-xs text-[color:var(--cream-soft)]/70">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>&copy; {new Date().getFullYear()} DestinyPair.net</span>
              <span>BN: 9596573</span>
              <span>TIN: 2622446788316</span>
            </div>
            <div className="flex items-center gap-1">
              Powered by{" "}
              <a href="https://pureintentionsglobal.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[color:var(--gold-royal)] transition">
                Pure Intentions Global Tech Services
              </a>
            </div>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-[color:var(--gold-royal)]">Privacy</Link>
              <Link to="/faith-values" className="hover:text-[color:var(--gold-royal)]">Values</Link>
              <Link to="/contact" className="hover:text-[color:var(--gold-royal)]">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
