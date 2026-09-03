import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Heart, Shield, Users, MapPin, Sparkles, ArrowRight, Check, Star, BookOpen, Compass, HandHeart, Crown, UserCheck } from "lucide-react";
import { Reveal } from "../components/Section";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { PLAN_FALLBACK, planFeatures, planMeta } from "../lib/plans";

function Home() {
  const { user } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [plans, setPlans] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const heroImages = [
    "/Man_and_woman_laughing_together.jpeg",
    "/Man_and_woman_leaning.jpeg",
    "/Man_and_woman_sitting_bench.jpeg",
    "/Man_and_woman_walking_path.jpeg",
    "/1st picture.jfif",
  ];
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroImages.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.recentlyVerified().then(setRecentUsers).catch(() => {});
    api.getPlans().then(setPlans).catch(() => setPlans(PLAN_FALLBACK));
    api.getTestimonials().then(data => setTestimonials(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  return (
    <>
      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden bg-hero pt-24">
        {/* Background photo slideshow (all images in public/) */}
        <div className="absolute inset-0 z-0">
          {heroImages.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms]"
              style={{ backgroundImage: `url("${encodeURI(src)}")`, opacity: i === heroIdx ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0 bg-[color:var(--cream-soft)]/40 dark:bg-[color:var(--background)]/60" />
        </div>
        <div className="absolute inset-0 pattern-grid opacity-30" />
        <motion.div style={{ y: heroY }} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-32 left-[8%] h-72 w-72 rounded-full bg-emerald opacity-25 blur-3xl animate-glow-pulse" />
          <div className="absolute top-1/2 right-[5%] h-96 w-96 rounded-full bg-gold opacity-30 blur-3xl animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-[color:var(--burgundy)] opacity-20 blur-3xl animate-glow-pulse" style={{ animationDelay: "2.5s" }} />
        </motion.div>

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-[color:var(--gold-royal)]"
            style={{ left: `${10 + i * 11}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}

        <motion.div style={{ opacity: heroOpacity }} className="relative max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center py-20">
          <div className="lg:col-span-7 text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs font-semibold tracking-[0.2em] uppercase mb-6">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold-royal)]" />
                <span className="text-gradient-gold">Faith &bull; Purpose &bull; Intention</span>
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}
              className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.02] tracking-tight"
            >
              Find Your <span className="text-gradient-luxury italic">Destined</span> Partner
              <span className="block mt-2 text-foreground">With Faith &amp; Purpose</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl lg:mx-0 mx-auto leading-relaxed"
            >
              Nigeria's most trusted, faith-guided marriage facilitation platform &mdash; purposeful introductions between serious Christian singles, designed to flourish into lifelong commitment.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              {!user && (
                <Link to="/register" className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-emerald text-[color:var(--gold-royal)] font-semibold shadow-luxe hover:shadow-glow transition-all overflow-hidden">
                  <span className="relative z-10">Register Free</span>
                  <ArrowRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <span className="absolute inset-0 bg-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}
              <Link to="/membership" className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full glass border-2 border-[color:var(--gold-royal)]/40 font-semibold hover:border-[color:var(--gold-royal)] transition-all">
                <Crown className="h-5 w-5 text-[color:var(--gold-royal)]" />
                View Membership Plans
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => <div key={i} className="h-9 w-9 rounded-full bg-gold border-2 border-background" />)}
              </div>
              <div>
                <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-[color:var(--gold-royal)] text-[color:var(--gold-royal)]" />)}</div>
                <span>Trusted by thousands of believers</span>
              </div>
            </motion.div>
          </div>

          {/* Hero illustration card stack */}
          <div className="lg:col-span-5 relative h-[500px] hidden lg:block">
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.4 }} className="absolute inset-0">
              <div className="absolute top-0 right-0 w-72 h-96 rounded-[2rem] bg-luxury shadow-luxe animate-float overflow-hidden">
                <div className="absolute inset-0 pattern-dots opacity-20" />
                <div className="relative p-8 h-full flex flex-col justify-between text-[color:var(--cream-soft)]">
                  <Crown className="h-10 w-10 text-[color:var(--gold-royal)]" />
                  <div>
                    <p className="font-display text-3xl font-semibold leading-tight">Sacred bonds, lasting forever.</p>
                    <p className="mt-3 text-sm opacity-80">&mdash; Premium Membership</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-10 left-0 w-64 h-80 rounded-[2rem] glass shadow-luxe animate-float" style={{ animationDelay: "1s" }}>
                <div className="p-7 h-full flex flex-col justify-between">
                  <div className="h-14 w-14 rounded-2xl bg-gold flex items-center justify-center shadow-glow"><HandHeart className="h-7 w-7 text-[color:var(--emerald-deep)]" /></div>
                  <div>
                    <p className="font-display text-2xl font-semibold">Guided Introductions</p>
                    <p className="mt-2 text-sm text-muted-foreground">Every match begins with prayer &amp; intention.</p>
                  </div>
                </div>
              </div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: "spring" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-28 w-28 rounded-full bg-gold flex items-center justify-center shadow-glow animate-glow-pulse">
                <Heart className="h-12 w-12 text-[color:var(--emerald-deep)]" fill="currentColor" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Curved divider */}
        <svg className="absolute bottom-0 inset-x-0 w-full" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,80 C480,0 960,0 1440,80 L1440,80 L0,80 Z" fill="var(--cream-soft)" className="dark:fill-[color:var(--card)]" />
        </svg>
      </section>

      {/* TRUST */}
      <section className="relative py-24 bg-[color:var(--cream-soft)] dark:bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">Why DestinyPair</span>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold">Trusted by a generation of believers</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Star, num: "25+", label: "Years of Experience", desc: "Decades shepherding faith-led unions." },
              { icon: BookOpen, num: "100%", label: "Faith Guided", desc: "Rooted in Christian values." },
              { icon: Heart, num: "1", label: "Marriage Focused", desc: "Built for forever &mdash; never casual." },
              { icon: MapPin, num: "36", label: "States Coverage", desc: "Nationwide across Nigeria." },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div whileHover={{ y: -8 }} className="group relative p-8 rounded-3xl bg-background border border-border shadow-soft hover:shadow-luxe transition-all overflow-hidden">
                  <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold opacity-0 group-hover:opacity-20 blur-2xl transition" />
                  <div className="h-14 w-14 rounded-2xl bg-emerald flex items-center justify-center shadow-soft mb-6">
                    <c.icon className="h-7 w-7 text-[color:var(--gold-royal)]" />
                  </div>
                  <div className="font-display text-4xl font-bold text-gradient-luxury">{c.num}</div>
                  <div className="mt-2 font-semibold">{c.label}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IS */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-gold opacity-10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div className="relative">
              <div className="aspect-square rounded-[3rem] bg-luxury shadow-luxe overflow-hidden relative">
                <div className="absolute inset-0 pattern-dots opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="relative h-80 w-80">
                    <div className="absolute inset-0 rounded-full border-2 border-[color:var(--gold-royal)]/30" />
                    <div className="absolute inset-6 rounded-full border-2 border-[color:var(--gold-royal)]/50" />
                    <div className="absolute inset-12 rounded-full border-2 border-[color:var(--gold-royal)]/70" />
                  </motion.div>
                  <div className="absolute h-40 w-40 rounded-full bg-gold shadow-glow flex items-center justify-center">
                    <Heart className="h-20 w-20 text-[color:var(--emerald-deep)]" fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 p-6 rounded-3xl glass shadow-luxe max-w-[240px]">
                <Compass className="h-8 w-8 text-[color:var(--gold-royal)] mb-3" />
                <p className="font-display text-lg font-semibold">Your journey, divinely guided.</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">What is DestinyPair?</span>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold leading-tight">
              A sanctuary for those <span className="text-gradient-luxury italic">seeking forever</span>.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              DestinyPair is not a dating app. We are a faith-rooted marriage facilitation platform &mdash; pairing serious Christian singles in Nigeria who are ready for purposeful, intentional, and lasting unions.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Carefully vetted, faith-verified members only",
                "Personal guidance from experienced matchmakers",
                "Pre-marital counselling with every introduction",
                "Privacy, dignity, and discretion at every step",
              ].map((t, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="mt-1 h-6 w-6 rounded-full bg-emerald flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5 text-[color:var(--gold-royal)]" /></span>
                  <span className="text-foreground/90">{t}</span>
                </li>
              ))}
            </ul>
            <Link to="/about" className="mt-10 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-semibold shadow-soft hover:shadow-glow transition">
              Our Story <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-28 bg-[color:var(--cream-soft)] dark:bg-card overflow-hidden">
        <div className="absolute inset-0 pattern-grid opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">The Journey</span>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold">How It Works</h2>
              <p className="mt-4 text-muted-foreground">Four sacred steps from registration to flourishing matrimony.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-transparent via-[color:var(--gold-royal)] to-transparent" />
            {[
              { n: "01", title: "Register", desc: "Create a faith-verified profile in minutes.", icon: Users },
              { n: "02", title: "Subscribe", desc: "Unlock guided introductions with a plan.", icon: Crown },
              { n: "03", title: "Connect", desc: "Meet vetted matches aligned in faith & values.", icon: Heart },
              { n: "04", title: "Flourish", desc: "Begin pre-marital counselling and forever.", icon: Sparkles },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <motion.div whileHover={{ y: -10 }} className="relative p-8 rounded-3xl bg-background border border-border shadow-soft text-center group">
                  <div className="relative mx-auto h-20 w-20 rounded-full bg-emerald flex items-center justify-center shadow-luxe mb-5 group-hover:shadow-glow transition">
                    <s.icon className="h-9 w-9 text-[color:var(--gold-royal)]" />
                    <span className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-gold flex items-center justify-center text-xs font-bold text-[color:var(--emerald-deep)] shadow-soft">{s.n}</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBERSHIP PREVIEW */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-gold opacity-10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">Membership</span>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold">Choose your sacred journey</h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
            {(plans || PLAN_FALLBACK).map((p, i) => {
              const meta = planMeta(p.slug);
              const feats = planFeatures(p);
              return (
                <Reveal key={p.slug} delay={i * 0.1}>
                  <motion.div whileHover={{ y: -8 }} className={`relative p-8 rounded-3xl border transition-all h-full ${meta.featured ? "bg-luxury text-[color:var(--cream-soft)] shadow-luxe border-transparent xl:scale-105" : "bg-background border-border shadow-soft hover:shadow-luxe"}`}>
                    {meta.featured && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gold text-[color:var(--emerald-deep)] text-xs font-bold tracking-wider shadow-glow">RECOMMENDED</div>
                    )}
                    <h3 className={`font-display text-2xl font-bold ${meta.featured ? "text-[color:var(--gold-royal)]" : ""}`}>{p.name}</h3>
                    <p className={`text-sm mt-1 ${meta.featured ? "text-[color:var(--cream-soft)]/80" : "text-muted-foreground"}`}>{p.description || p.desc}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className={`font-display text-5xl font-bold ${meta.featured ? "text-gradient-gold" : ""}`}>{p.price_display || `\u20A6${Number(p.price).toLocaleString()}`}</span>
                      <span className={meta.featured ? "text-[color:var(--cream-soft)]/70" : "text-muted-foreground"}>{meta.per}</span>
                    </div>
                    <ul className="mt-7 space-y-3">
                      {feats.slice(0, 4).map(f => (
                        <li key={f} className="flex gap-2.5 items-start text-sm">
                          <Check className={`h-5 w-5 shrink-0 ${meta.featured ? "text-[color:var(--gold-royal)]" : "text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]"}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to={p.slug === "free" ? "/register" : `/checkout/${p.slug}`} className={`mt-8 block text-center py-3.5 rounded-full font-semibold transition ${meta.featured ? "bg-gold text-[color:var(--emerald-deep)] hover:shadow-glow" : "bg-emerald text-[color:var(--gold-royal)]"}`}>
                      Choose {p.name}
                    </Link>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative py-28 bg-[color:var(--cream-soft)] dark:bg-card overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">Testimonies</span>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold">Stories of destined love</h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.1}>
                <motion.div whileHover={{ y: -6 }} className="relative p-8 rounded-3xl glass shadow-soft hover:shadow-luxe transition-all h-full">
                  <div className="absolute top-6 right-6 text-6xl font-display text-[color:var(--gold-royal)]/30 leading-none">&quot;</div>
                  <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-[color:var(--gold-royal)] text-[color:var(--gold-royal)]" />)}</div>
                  <p className="text-foreground/90 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 pt-6 border-t border-border flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-gold" />
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.location || "Christian Union"}</div>
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-luxury" />
        <div className="absolute inset-0 pattern-grid opacity-20" />
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gold opacity-30 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-6 text-center text-[color:var(--cream-soft)]">
          <Reveal>
            <Shield className="h-12 w-12 mx-auto text-[color:var(--gold-royal)] mb-6" />
            <h2 className="font-display text-4xl md:text-6xl font-bold leading-tight">
              Your destined partner is <span className="text-gradient-gold italic">waiting</span>.
            </h2>
            <p className="mt-6 text-lg text-[color:var(--cream-soft)]/80 max-w-2xl mx-auto">
              Begin your journey of purpose, faith, and lasting commitment. Join the thousands who chose intention over chance.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gold text-[color:var(--emerald-deep)] font-bold shadow-glow hover:scale-105 transition">
                Begin Your Journey <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/how-it-works" className="inline-flex items-center justify-center px-8 py-4 rounded-full border-2 border-[color:var(--cream-soft)]/40 font-semibold hover:bg-white/10 transition">
                Learn More
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Recently Verified Members */}
      <section className="py-20 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gradient-gold">Community</span>
              <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold">Newly Verified Members</h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Fresh faces who have completed their faith verification and are ready for intentional relationships.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {recentUsers.map((u, i) => (
              <Reveal key={u.id} delay={i * 0.05}>
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:shadow-soft transition cursor-default">
                  <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-emerald to-gold p-0.5">
                    {u.primary_photo ? (
                      <img src={u.primary_photo} alt="" className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-xl bg-background flex items-center justify-center">
                        <span className="text-lg font-bold text-gradient-luxury">
                          {(u.first_name?.[0] || u.email?.[0] || "U").toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{u.first_name || "New Member"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.city_state || "Nigeria"} &middot; {u.faith || "Christian"}</p>
                  </div>
                  <UserCheck className="h-5 w-5 text-emerald shrink-0 ml-auto" />
                </div>
              </Reveal>
            ))}
          </div>
          {recentUsers.length > 0 && (
            <div className="text-center mt-8">
              <Link to="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-deep dark:text-gold-royal">
                Join them <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default Home;
