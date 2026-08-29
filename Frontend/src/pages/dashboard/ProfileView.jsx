import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FourSquare } from "react-loading-indicators";
import {
  Heart, Bookmark, MapPin, Briefcase, Cross, Moon,
  ArrowLeft, Sparkles, BadgeCheck, Pencil,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

function ageFromDOB(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function splitList(value) {
  return String(value || "").split(",").map(s => s.trim()).filter(Boolean);
}

export default function ProfileView() {
  const { publicId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.getPublicProfile(publicId)
      .then(data => { if (!cancelled) setProfile(data); })
      .catch(err => { if (!cancelled) setError(err.data?.error || err.message || "Profile not found."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [publicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto text-center py-24">
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">Profile not available</h2>
        <p className="text-muted-foreground mb-8">{error || "This profile could not be loaded."}</p>
        <Link to="/dashboard/discover" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald text-gold-royal font-semibold transition hover:shadow-glow">
          <ArrowLeft className="h-4 w-4" /> Back to Discover
        </Link>
      </div>
    );
  }

  const isOwn = user && profile.public_id === user.public_id;
  const age = ageFromDOB(profile.date_of_birth);
  const FaithIcon = profile.faith === "Christianity" || profile.faith === "Christian" ? Cross : Moon;
  const interests = splitList(profile.interests);
  const hobbies = splitList(profile.hobbies);
  const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Member";
  const avatarUrl = profile.primary_photo;
  const photoBg = avatarUrl ? undefined : { background: `linear-gradient(135deg, var(--emerald), var(--gold-royal))` };

  const detailRows = [
    { label: "Faith", value: profile.faith || "Christianity" },
    { label: "Denomination", value: profile.denomination_name || "—" },
    { label: "Marital Status", value: profile.marital_status || "—" },
    { label: "State of Residence", value: profile.state_of_residence || "—" },
    { label: "State of Origin", value: profile.state_of_origin || "—" },
    { label: "Ethnic Group", value: profile.ethnic_group || "—" },
    { label: "Highest Qualification", value: profile.highest_qualification || "—" },
    { label: "Profession", value: profile.profession || "—" },
    { label: "Complexion", value: profile.complexion || "—" },
    { label: "Height", value: profile.height ? `${profile.height}cm` : "—" },
    { label: "Alcohol", value: profile.alcohol || "—" },
    { label: "Smoking", value: profile.smoking || "—" },
  ].filter(r => r.value !== "—");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link to="/dashboard/discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Back to Discover
        </Link>
        {isOwn && (
          <Link to="/dashboard/profile" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald/10 border border-emerald/30 text-emerald-deep dark:text-gold-royal text-sm font-semibold transition hover:bg-emerald/20">
            <Pencil className="h-4 w-4" /> Edit Profile
          </Link>
        )}
      </div>

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
              <div className="h-full w-full rounded-full bg-background overflow-hidden flex items-center justify-center" style={photoBg}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                  : <span className="text-5xl font-bold text-gradient-luxury">{(name[0] || "D").toUpperCase()}</span>}
              </div>
            </div>
            {profile.is_verified && (
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-emerald border-2 border-background flex items-center justify-center shadow-glow">
                <BadgeCheck className="h-5 w-5 text-gold-royal" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              {name} {age ? <span className="text-muted-foreground font-normal text-3xl">{age}</span> : null}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
              {profile.faith && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FaithIcon className="h-4 w-4 text-gold-royal" /> {profile.faith}
                </span>
              )}
              {profile.city_state && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {profile.city_state}
                </span>
              )}
              {profile.profession && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" /> {profile.profession}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-gold-royal" /> {profile.public_id}
              </span>
            </div>
            {profile.short_bio && <p className="mt-4 text-foreground/80 max-w-2xl leading-relaxed">{profile.short_bio}</p>}

            <div className="flex items-center justify-center md:justify-start gap-3 mt-6">
              {isOwn ? (
                <span className="px-5 py-3 rounded-full bg-emerald/10 border border-emerald/30 text-emerald-deep dark:text-gold-royal text-sm font-semibold">
                  This is your profile
                </span>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {(profile.about_self || profile.seeking_description) && (
            <>
              {profile.about_self && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
                >
                  <h2 className="font-display text-xl font-bold text-foreground mb-4">About {name.split(" ")[0]}</h2>
                  <p className="text-foreground/80 leading-relaxed">{profile.about_self}</p>
                </motion.div>
              )}
              {profile.seeking_description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
                >
                  <h2 className="font-display text-xl font-bold text-foreground mb-4">What {name.split(" ")[0]} Seeks</h2>
                  <p className="text-foreground/80 leading-relaxed">{profile.seeking_description}</p>
                </motion.div>
              )}
            </>
          )}

          {(interests.length > 0 || hobbies.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
            >
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Interests & Hobbies</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((v) => (
                      <span key={v} className="px-3 py-1.5 rounded-full bg-gold/5 border border-gold/20 text-xs font-medium text-gold-royal">{v}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Hobbies</p>
                  <div className="flex flex-wrap gap-2">
                    {hobbies.map((v) => (
                      <span key={v} className="px-3 py-1.5 rounded-full bg-emerald/5 border border-emerald/20 text-xs font-medium text-emerald-deep dark:text-gold-royal">{v}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          {detailRows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-3xl glass border border-border/60 shadow-soft"
            >
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Details</h3>
              <div className="space-y-3">
                {detailRows.map((r) => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium text-foreground text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}