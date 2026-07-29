import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Heart, Shield, Crown, Star, MessageCircle, BookOpen,
  ArrowRight, Sparkles, User, Check, Compass, Mail, MapPin, Phone,
  Camera,
} from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import CoverCropModal from "../../components/CoverCropModal";

const PROFILE_FIELDS = [
  "phone", "date_of_birth", "gender", "city_state",
  "faith", "denomination", "ethnic_group",
  "highest_qualification", "institution", "profession",
  "genotype", "blood_group", "love_language",
  "preferred_age_min", "preferred_age_max",
  "interests", "hobbies", "short_bio",
  "about_self", "seeking_description",
];

function computeProfileCompletion(user) {
  if (!user) return 0;
  const filled = PROFILE_FIELDS.filter(f => user[f] && user[f].toString().trim()).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

function CompletionRing({ value, size = 100, strokeWidth = 6, color = "var(--emerald-deep)" }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
  );
}

function JourneyModule({ m, index }) {
  const Icon = m.icon;
  return (
    <Link to={m.path}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.6 }}
        whileHover={{ y: -6, scale: 1.02 }}
        className="group relative p-5 rounded-3xl bg-background/80 backdrop-blur-xl border border-border/60 shadow-soft hover:shadow-luxe transition-all overflow-hidden"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-[0.03] group-hover:opacity-[0.06] transition`} />
        <div className="relative flex items-start justify-between">
          <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-soft`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="relative h-14 w-14">
            <CompletionRing value={m.value} size={56} strokeWidth={4} color={m.value >= 100 ? "var(--gold-royal)" : "var(--emerald-deep)"} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{m.value}%</span>
          </div>
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{m.label}</h3>
        <p className="text-sm text-muted-foreground">{m.detail}</p>
      </motion.div>
    </Link>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { photos } = useOutletContext();
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef(null);
  const coverRef = useRef(null);
  const [cropModal, setCropModal] = useState(null);
  const canvasRef = useRef(null);
  const [primaryImgError, setPrimaryImgError] = useState(false);

  const initial = (user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User";
  const profilePct = computeProfileCompletion(user);
  const isVerified = user?.is_verified;
  const primaryPhoto = photos.find((p) => p.is_primary);
  const coverPhoto = user?.cover_photo;

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const rect = coverRef.current?.getBoundingClientRect();
    const ratio = rect && rect.height ? rect.width / rect.height : 4;
    setCropModal({ file, url, ratio });
  }

  async function handleCropSave(croppedBlob) {
    setCoverUploading(true);
    setCropModal(null);
    try {
      const fd = new FormData();
      fd.append('image', croppedBlob, 'cover.jpg');
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      await fetch('/api/auth/cover-photo/', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: fd,
      });
      window.location.reload();
    } catch {}
    setCoverUploading(false);
  }

  const modules = [
    { icon: User, label: "Profile", value: profilePct, color: "from-emerald to-teal-400", detail: `${profilePct}% complete`, path: "/dashboard/profile" },
    { icon: Shield, label: "Verification", value: isVerified ? 100 : 0, color: "from-gold-royal to-amber-400", detail: isVerified ? "Verified" : "Email not verified", path: "/dashboard/profile" },
    { icon: Crown, label: "Membership", value: 0, color: "from-emerald to-gold-royal", detail: "Free tier", path: "/dashboard/membership" },
    { icon: Star, label: "Profile Quality", value: profilePct, color: "from-amber-warm to-orange-400", detail: profilePct >= 80 ? "Excellent" : profilePct >= 50 ? "Good" : "Needs improvement", path: "/dashboard/discover" },
    { icon: MessageCircle, label: "Messages", value: 0, color: "from-emerald to-cyan-400", detail: "No messages yet", path: "/dashboard/chat" },
    { icon: BookOpen, label: "Counselling", value: 0, color: "from-burgundy to-rose-400", detail: "Not started", path: "/dashboard/counselling" },
  ];

  return (
      <div className="max-w-7xl mx-auto">
        {/* Cover + Profile header wrapper */}
        <div className="relative">
          {/* Cover photo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="rounded-[2.5rem] overflow-hidden">
              <div ref={coverRef} className="relative w-full bg-gradient-to-br from-emerald/30 to-gold/20">
                {coverPhoto ? (
                  <img src={coverPhoto} alt="Cover" className="block w-full h-[200px] sm:h-[320px] md:h-[420px] object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-[200px] sm:h-[320px] md:h-[420px] pattern-dots opacity-[0.08]" />
                )}

                {/* Cover upload button */}
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition backdrop-blur-sm"
                >
                  {coverUploading ? (
                    <span className="text-xs">Uploading...</span>
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
            </div>
          </motion.div>

          {/* Profile photo + name — stacked in flow on mobile, overlapping cover on sm+ */}
          <div className="relative z-50 mt-4 px-2 sm:mt-0 sm:absolute sm:-bottom-16 sm:left-6 md:left-8 sm:px-0 flex flex-col items-center sm:items-end sm:flex-row gap-3 sm:gap-4">
            <div className="relative">
              {primaryPhoto && !primaryImgError ? (
                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl sm:rounded-[2rem] ring-4 ring-background shadow-luxe overflow-hidden">
                  <img src={primaryPhoto.image} alt="" className="h-full w-full object-cover" onError={() => setPrimaryImgError(true)} />
                </div>
              ) : (
                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl sm:rounded-[2rem] ring-4 ring-background shadow-luxe bg-gradient-to-br from-emerald to-gold p-0.5">
                  <div className="h-full w-full rounded-3xl sm:rounded-[2rem] bg-background flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-bold text-gradient-luxury">{initial}</span>
                  </div>
                </div>
              )}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="absolute -bottom-1 -right-1 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gold border-2 border-background flex items-center justify-center shadow-glow"
              >
                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-deep" />
              </motion.div>
            </div>
            <div className="text-center sm:text-left sm:pb-2 min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground drop-shadow-lg truncate">{fullName}</h2>
              <p className="text-xs sm:text-sm text-foreground/80 drop-shadow truncate">{user?.city_state || ""}</p>
            </div>
          </div>
        </div>

        {/* Spacer for the overlapping photo (mobile uses in-flow spacing via mt-4) */}
        <div className="h-4 sm:h-20" />

      {/* Welcome + details row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pl-2 sm:pl-0">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald/10 dark:bg-gold/20 text-emerald-deep dark:text-gold-royal text-xs font-semibold mb-2">
              <Sparkles className="h-3 w-3" />
              Your Relationship Journey
            </span>
            <p className="mt-1 text-muted-foreground">Continue where you left off on your path to forever.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-3 flex flex-wrap gap-x-5 gap-y-1"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5 text-emerald-deep dark:text-gold-royal" /> {user?.email}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-emerald-deep dark:text-gold-royal" /> {user?.phone || "—"}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-emerald-deep dark:text-gold-royal" /> {user?.city_state || "—"}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-emerald-deep dark:text-gold-royal" /> {user?.faith || "—"}
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4 shrink-0"
        >
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Profile Completion</p>
            <p className="font-display text-2xl font-bold text-gradient-luxury">{profilePct}%</p>
          </div>
          <div className="relative">
            <CompletionRing value={profilePct} size={72} strokeWidth={5} color="var(--gold-royal)" />
            <Star className="absolute inset-0 m-auto h-5 w-5 text-gold-royal" fill="currentColor" />
          </div>
        </motion.div>
      </div>

      {/* Progress modules */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-bold text-foreground">Your Progress</h2>
          <Link to="/dashboard/profile" className="text-sm font-semibold text-emerald-deep dark:text-gold-royal flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m, i) => (
            <JourneyModule key={m.label} m={m} index={i} />
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
          >
            <h3 className="font-display text-xl font-bold text-foreground mb-5">Recent Activity</h3>
            {user?.date_joined ? (
              <div className="flex items-center gap-4 p-3 rounded-2xl">
                <div className="h-10 w-10 rounded-xl bg-emerald/10 text-emerald-deep flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80">
                    Joined DestinyPair <span className="font-semibold">{new Date(user.date_joined).toLocaleDateString()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Welcome aboard!</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            )}
          </motion.div>
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="p-6 rounded-3xl bg-gradient-to-br from-emerald to-burgundy shadow-luxe text-[color:var(--cream-soft)] h-full relative"
          >
            <div className="absolute inset-0 pattern-dots opacity-10 rounded-3xl pointer-events-none" />
            <div className="relative">
              <Crown className="h-8 w-8 text-gold-royal mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">Free Member</h3>
              <p className="text-sm opacity-80 mb-4">Upgrade to unlock dedicated matchmaker, unlimited matches, and pre-marital counselling.</p>
              <div className="space-y-2">
                {["Personal Matchmaker", "Unlimited Introductions", "Priority Support"].map((f, i) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-gold-royal" />
                    <span className={i > 0 ? "opacity-50" : ""}>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/membership" className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gold text-emerald-deep text-sm font-bold shadow-glow hover:scale-105 transition">
                Upgrade Plan <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Photo gallery */}
      {photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold text-foreground">My Photos</h2>
            <Link to="/dashboard/profile" className="text-sm font-semibold text-emerald-deep dark:text-gold-royal">Manage</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {photos.map((photo) => (
              <div key={photo.id} className="relative shrink-0 h-32 w-32 rounded-2xl overflow-hidden border border-border/40 shadow-soft">
                <img src={photo.image} alt="" className="h-full w-full object-cover" />
                {photo.is_primary && (
                  <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-gold-royal flex items-center justify-center">
                    <Star className="h-3 w-3 text-white" fill="currentColor" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {cropModal && (
        <CoverCropModal
          src={cropModal.url}
          ratio={cropModal.ratio}
          onSave={handleCropSave}
          onClose={() => {
            URL.revokeObjectURL(cropModal.url);
            setCropModal(null);
          }}
        />
      )}
    </div>
  );
}
