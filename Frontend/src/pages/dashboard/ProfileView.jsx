import { motion } from "framer-motion";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Heart, Bookmark, Send, Flag, Star, MapPin, Briefcase, Cross, Moon,
  ArrowLeft, Sparkles, Check, X,
} from "lucide-react";

const profiles = {
  1: { id: 1, name: "Sarah M.", age: 28, faith: "Christian", state: "Lagos", occupation: "Medical Doctor", score: 94,
    bio: "A devoted Christian woman seeking a partner who shares my faith, values, and vision for a covenant-centered home. I believe marriage is a sacred journey meant to honor God.",
    denomination: "Pentecostal", education: "MBBS, University of Lagos", workplace: "Lagos University Teaching Hospital",
    about: "I am a paediatrician with a passion for children's health. My faith is the cornerstone of my life, and I serve in the youth ministry at my local church. I enjoy reading, cooking, and meaningful conversations.",
    seeking: "I am looking for a God-fearing, intentional man who is ready for covenant marriage. Someone who leads with faith, integrity, and purpose.",
    values: ["Faith-centered living", "Family-oriented", "Compassionate", "Ambitious for God"],
    interests: ["Missions work", "Choir", "Reading", "Cooking"],
  },
};

export default function ProfileView() {
  const { id } = useParams();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const profile = profiles[id] || profiles[1];
  const FaithIcon = profile.faith === "Christian" ? Cross : Moon;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link to="/dashboard/discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition">
        <ArrowLeft className="h-4 w-4" /> Back to Discover
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-10 p-8 md:p-12 rounded-[2.5rem] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald/20 via-background to-gold/15" />
        <div className="absolute inset-0 pattern-dots opacity-[0.06]" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
          <div className="relative shrink-0">
            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-emerald to-gold p-0.5 shadow-luxe">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                <span className="text-5xl font-bold text-gradient-luxury">{profile.name[0]}</span>
              </div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-emerald border-2 border-background flex items-center justify-center shadow-glow"
            >
              <span className="text-xs font-bold text-gold-royal">{profile.score}%</span>
            </motion.div>
          </div>

          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              {profile.name} <span className="text-muted-foreground font-normal text-3xl">{profile.age}</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FaithIcon className="h-4 w-4 text-gold-royal" /> {profile.faith}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {profile.state}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" /> {profile.occupation}
              </span>
            </div>
            <p className="mt-4 text-foreground/80 max-w-2xl leading-relaxed">{profile.bio}</p>

            <div className="flex items-center justify-center md:justify-start gap-3 mt-6">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setLiked(!liked)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition ${
                  liked ? "bg-destructive/10 text-destructive" : "bg-emerald text-gold-royal shadow-soft hover:shadow-glow"
                }`}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                {liked ? "Liked" : "Like"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSaved(!saved)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border transition ${
                  saved ? "bg-gold/10 border-gold-royal/30 text-gold-royal" : "border-border text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                {saved ? "Saved" : "Save"}
              </motion.button>
              <button className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-foreground/5 border border-border text-foreground/70 hover:bg-foreground/10 transition">
                <Send className="h-4 w-4" /> Introduce
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
          >
            <h2 className="font-display text-xl font-bold text-foreground mb-4">About {profile.name.split(" ")[0]}</h2>
            <p className="text-foreground/80 leading-relaxed">{profile.about}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
          >
            <h2 className="font-display text-xl font-bold text-foreground mb-4">What She Seeks</h2>
            <p className="text-foreground/80 leading-relaxed">{profile.seeking}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
          >
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Values & Interests</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Core Values</p>
                <div className="flex flex-wrap gap-2">
                  {profile.values.map((v) => (
                    <span key={v} className="px-3 py-1.5 rounded-full bg-emerald/5 border border-emerald/20 text-xs font-medium text-emerald-deep dark:text-gold-royal">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((v) => (
                    <span key={v} className="px-3 py-1.5 rounded-full bg-gold/5 border border-gold/20 text-xs font-medium text-gold-royal">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
          >
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Compatibility</h3>
            <div className="space-y-4">
              {[
                { label: "Faith", value: 96, color: "from-emerald to-teal-400" },
                { label: "Lifestyle", value: 88, color: "from-gold-royal to-amber-400" },
                { label: "Values", value: 94, color: "from-emerald to-cyan-400" },
                { label: "Goals", value: 85, color: "from-amber-warm to-orange-400" },
              ].map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-semibold text-foreground">{c.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.value}%` }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                      className={`h-full rounded-full bg-gradient-to-r ${c.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-border/40 text-center">
              <p className="text-2xl font-bold text-gradient-luxury">{profile.score}%</p>
              <p className="text-xs text-muted-foreground">Overall Compatibility</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
          >
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Denomination</span>
                <span className="font-medium text-foreground">{profile.denomination}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Education</span>
                <span className="font-medium text-foreground">{profile.education}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Workplace</span>
                <span className="font-medium text-foreground">{profile.workplace}</span>
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            whileHover={{ scale: 1.02 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-destructive/5 border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/10 transition"
          >
            <Flag className="h-4 w-4" /> Report Profile
          </motion.button>
        </div>
      </div>
    </div>
  );
}
