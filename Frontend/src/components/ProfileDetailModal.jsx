import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  X, User, Cross, MapPin, Heart, Briefcase, Church,
  GraduationCap, Star, BookHeart, Sparkles, BadgeCheck, Circle, ExternalLink,
} from "lucide-react";

export default function ProfileDetailModal({ profile, onClose, onLike }) {
  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : "?";
  const name = profile.first_name || "User";
  const initials = ((profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")).slice(0, 2) || "U";
  const avatarUrl = profile.primary_photo;
  const [imgError, setImgError] = useState(false);

  const details = [
    { icon: User, label: "Age", value: age },
    { icon: Cross, label: "Denomination", value: profile.denomination_name || profile.denomination },
    { icon: MapPin, label: "Location", value: profile.city_state || profile.state_of_residence },
    { icon: Heart, label: "Relationship Status", value: profile.marital_status ? profile.marital_status.charAt(0).toUpperCase() + profile.marital_status.slice(1) : null },
    { icon: Briefcase, label: "Occupation", value: profile.profession },
    { icon: GraduationCap, label: "Qualification", value: profile.highest_qualification },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg mt-8 mb-8 rounded-3xl bg-background overflow-hidden shadow-luxe"
      >
        {/* Cover — tall so a significant part of the photo is visible */}
        <div className="relative h-[300px] sm:h-[360px] md:h-[400px] bg-gradient-to-br from-emerald/15 to-gold/15">
          {!imgError && avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover object-center" onError={() => setImgError(true)} />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald to-gold p-0.5">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                  <span className="text-4xl font-bold text-gradient-luxury">{initials}</span>
                </div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/30 text-white/80 hover:bg-black/50 hover:text-white flex items-center justify-center backdrop-blur-sm transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Name header */}
        <div className="px-6 -mt-14 relative z-10">
          <div className="flex items-end gap-3">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">{name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{profile.city_state || profile.state_of_residence || "—"}</span>
              </div>
            </div>
            {profile.is_verified && (
              <BadgeCheck className="h-5 w-5 text-emerald mb-1" />
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="px-6 pt-6 pb-4 space-y-5">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-3">
              <Circle className="h-3 w-3 fill-emerald text-emerald" /> About
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {details.map(d => (
                d.value ? (
                  <div key={d.label} className="p-3 rounded-xl bg-foreground/5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      <d.icon className="h-3 w-3" />
                      {d.label}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{d.value}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {/* Seeking description */}
          {profile.seeking_description && (
            <div>
              <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-gold-royal" /> What I Seek
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed italic">{profile.seeking_description}</p>
            </div>
          )}

          {/* About self */}
          {profile.about_self && (
            <div>
              <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-2">
                <BookHeart className="h-4 w-4 text-emerald" /> About {profile.first_name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.about_self}</p>
            </div>
          )}

          {/* Hobbies */}
          {profile.hobbies && (
            <div>
              <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-gold-royal" /> Hobbies & Interests
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.hobbies.split(/[,;|\n]+/).filter(Boolean).map((h, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-emerald/5 text-xs font-medium text-foreground/70">
                    {h.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          {profile.public_id && (
            <Link
              to={`/dashboard/profile/${profile.public_id}`}
              onClick={onClose}
              className="w-full py-3 rounded-full border border-emerald/30 text-emerald text-sm font-semibold transition flex items-center justify-center gap-2 hover:bg-emerald/10"
            >
              <ExternalLink className="h-4 w-4" /> View Full Profile
            </Link>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-full border border-border/60 text-sm font-semibold text-foreground/70 hover:bg-foreground/5 transition">Close</button>
            <button
              onClick={() => { onLike(profile.id); onClose(); }}
              className="flex-1 py-3 rounded-full bg-emerald text-white text-sm font-semibold shadow-md hover:shadow-lg hover:bg-emerald/90 transition flex items-center justify-center gap-2"
            >
              <Heart className="h-4 w-4" /> Interest
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
