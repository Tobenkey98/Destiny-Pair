import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Heart, ShieldCheck, Crown, MessageCircle, BookOpen, ArrowRight, ArrowUpRight,
  Sparkles, User, Check, MapPin, BadgeCheck, Camera, Users, Bell,
} from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Ring({ value, size = 120, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/25" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#journeyRing)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="journeyRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D3A345" />
            <stop offset="100%" stopColor="#F4EFEA" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="font-display text-2xl font-bold leading-none">{value}%</span>
        <span className="text-[10px] uppercase tracking-widest opacity-80 mt-1">complete</span>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: "/dashboard/discover", icon: Sparkles, label: "Discover", hint: "Meet singles" },
  { to: "/dashboard/matches", icon: Users, label: "Connections", hint: "Likes & matches" },
  { to: "/dashboard/chat", icon: MessageCircle, label: "Chat", hint: "Conversations" },
  { to: "/dashboard/counselling", icon: BookOpen, label: "Counselling", hint: "Guidance" },
];

export default function Overview() {
  const { user } = useAuth();
  const { photos } = useOutletContext();
  const [membership, setMembership] = useState(null);
  const [completion, setCompletion] = useState(user?.profile_completion || null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.getCurrentSubscription().then(setMembership).catch(() => {});
    api.getUnreadCount().then((d) => setUnread(d.count || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.profile_completion) {
      setCompletion(user.profile_completion);
      return;
    }
    let cancelled = false;
    api.getProfileCompletion()
      .then((d) => { if (!cancelled) setCompletion(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const firstName = user?.first_name || "there";
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "DestinyPair member";
  const initial = (user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const pct = completion?.percentage ?? 0;
  const missing = completion?.missing_fields || [];
  const isComplete = completion?.is_complete || false;
  const primaryPhoto = photos.find((p) => p.is_primary);
  const plan = membership?.plan || null;
  const subActive = membership?.subscription?.status === "active";
  const verified = !!user?.is_verified;

  const steps = [
    {
      done: verified,
      title: "Email verified",
      desc: verified ? "Your email is confirmed." : "Confirm your email to unlock everything.",
      to: verified ? null : "/dashboard/profile",
      cta: verified ? null : "Verify",
    },
    {
      done: isComplete,
      title: "Profile completed",
      desc: isComplete
        ? "Your profile is ready for matching."
        : `${missing.length} item${missing.length === 1 ? "" : "s"} left — ${missing.slice(0, 3).join(", ").replace(/_/g, " ")}${missing.length > 3 ? ", …" : ""}`,
      to: isComplete ? null : "/dashboard/profile",
      cta: isComplete ? null : "Continue setup",
    },
    {
      done: subActive,
      title: "Membership active",
      desc: subActive ? `${plan?.name || "Plan"} is active.` : "Upgrade for unlimited likes, chats and more.",
      to: "/membership",
      cta: subActive ? "Manage" : "View plans",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#611C2B] via-[#7A2E3F] to-[#8A525E] text-white shadow-luxe"
      >
        <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none" />
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#D3A345]/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-black/20 blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
            <div className="relative shrink-0">
              {primaryPhoto ? (
                <img src={primaryPhoto.image} alt="" className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-white/60 shadow-luxe" />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/40">
                  <span className="text-2xl sm:text-3xl font-bold">{initial}</span>
                </div>
              )}
              {verified && (
                <span className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-[#D3A345] flex items-center justify-center ring-2 ring-[#611C2B]">
                  <BadgeCheck className="h-3.5 w-3.5 text-[#611C2B]" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold">
                {greeting()}, {firstName}
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-4xl font-bold leading-tight truncate">
                {fullName}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur font-semibold">
                  <MapPin className="h-3 w-3" /> {user?.city_state || user?.state_of_residence || "Add location"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur font-semibold">
                  <Crown className="h-3 w-3 text-[#D3A345]" /> {plan && subActive ? `${plan.name} · Active` : "Free Member"}
                </span>
                {unread > 0 && (
                  <Link to="/dashboard/notifications" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D3A345] text-[#611C2B] font-bold">
                    <Bell className="h-3 w-3" /> {unread} new
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <Ring value={pct} />
            <div className="space-y-3">
              <p className="text-sm text-white/85 max-w-[220px]">
                {isComplete
                  ? "Your profile is ready. Go discover meaningful connections."
                  : "Finish your profile to unlock Discover and matching."}
              </p>
              <Link
                to={isComplete ? "/dashboard/discover" : "/dashboard/profile"}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#D3A345] text-[#611C2B] text-sm font-bold shadow-glow hover:scale-[1.03] transition"
              >
                {isComplete ? "Discover now" : "Complete profile"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {QUICK_ACTIONS.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={a.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
            >
              <Link
                to={a.to}
                className="group flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-luxe hover:-translate-y-0.5 transition-all"
              >
                <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#611C2B] to-[#8A525E] flex items-center justify-center shrink-0 group-hover:from-[#D3A345] group-hover:to-[#C4942F] transition-all">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold truncate">{a.label}</span>
                  <span className="block text-xs text-muted-foreground truncate">{a.hint}</span>
                </span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* NEXT STEPS */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3 rounded-3xl bg-card border border-border/60 shadow-soft p-6 sm:p-7"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Your next steps</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {steps.filter((s) => s.done).length}/{steps.length} done
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-muted-foreground">Profile completion</span>
              <span className="text-[color:var(--gold-royal)]">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#611C2B] to-[#D3A345]"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            {!isComplete && missing.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {missing.slice(0, 6).map((f) => (
                  <span key={f} className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-semibold border border-destructive/20">
                    {f.replace(/_/g, " ")}
                  </span>
                ))}
                {missing.length > 6 && (
                  <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold">
                    +{missing.length - 6} more
                  </span>
                )}
              </div>
            )}
          </div>

          <ol className="mt-6 space-y-1">
            {steps.map((s, i) => (
              <li key={s.title}>
                <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/60 transition">
                  <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm ${s.done ? "bg-emerald text-white" : "bg-muted text-muted-foreground"}`}>
                    {s.done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
                  </div>
                  {s.to && (
                    <Link
                      to={s.to}
                      className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border border-border hover:bg-foreground hover:text-background transition"
                    >
                      {s.cta}
                    </Link>
                  )}
                </div>
                {i < steps.length - 1 && <div className="ml-[29px] h-3 w-px bg-border" />}
              </li>
            ))}
          </ol>
        </motion.section>

        <div className="lg:col-span-2 space-y-6">
          {/* MEMBERSHIP SPOTLIGHT */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D2323] to-[#611C2B] text-white shadow-luxe p-6 sm:p-7"
          >
            <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none" />
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#D3A345]/25 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#D3A345]">
                  <Crown className="h-4 w-4" /> Membership
                </span>
                {subActive && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/30">
                    Active
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold">
                {plan ? plan.name : "Free Member"}
              </h3>
              <p className="mt-1 text-sm text-white/75">
                {plan && subActive
                  ? "Enjoying every premium perk. Your forever deserves it."
                  : "Unlock unlimited likes, chats, who-liked-you and counselling."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/membership"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#D3A345] text-[#611C2B] text-sm font-bold hover:scale-[1.03] transition"
                >
                  {subActive ? "Manage plan" : "Upgrade"} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/dashboard/profile"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-white/25 text-sm font-bold text-white/90 hover:bg-white/10 transition"
                >
                  <User className="h-4 w-4" /> My profile
                </Link>
              </div>
            </div>
          </motion.section>

          {/* PHOTOS */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="rounded-3xl bg-card border border-border/60 shadow-soft p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold flex items-center gap-2">
                <Camera className="h-4 w-4 text-[color:var(--gold-royal)]" /> Photos
              </h3>
              <Link to="/dashboard/profile" className="text-xs font-bold text-muted-foreground hover:text-foreground">
                Manage
              </Link>
            </div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(0, 4).map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-border/40">
                    <img src={photo.image} alt="" className="h-full w-full object-cover" />
                    {photo.is_primary && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-[#D3A345] text-white text-[9px] font-bold">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Link to="/dashboard/profile" className="flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-border hover:border-[#D3A345] transition">
                <span className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="block font-bold text-foreground text-sm">Add your first photo</span>
                  A clear photo builds trust and unlocks matching.
                </span>
              </Link>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              {verified ? "Email verified — you're a trusted member." : "Verify your email to earn trust."}
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-[color:var(--gold-royal)]" />
              Member since {user?.date_joined ? new Date(user.date_joined).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "recently"}
            </p>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
