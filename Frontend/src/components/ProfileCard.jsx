import { motion } from "framer-motion";
import { useState } from "react";
import {
  Heart, X, MapPin, Bookmark, BookmarkCheck, BadgeCheck, Briefcase,
} from "lucide-react";

const SPRING = { type: "spring", stiffness: 300, damping: 30 };

export default function ProfileCard({ profile, position, onLike, onDislike, onSave, saved, onViewFull }) {
  const [imgError, setImgError] = useState(false);
  const [likeAnim, setLikeAnim] = useState(null);
  const [dislikeAnim, setDislikeAnim] = useState(null);

  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : "?";
  const name = profile.first_name || "User";
  const initials = ((profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")).slice(0, 2) || "U";
  const avatarUrl = profile.primary_photo;
  const showImg = avatarUrl && !imgError;

  const positions = {
    previous: { x: -280, scale: 0.85, opacity: 0.4, rotate: -2, zIndex: 0 },
    center: { x: 0, scale: 1, opacity: 1, rotate: 0, zIndex: 10 },
    next: { x: 280, scale: 0.85, opacity: 0.4, rotate: 2, zIndex: 0 },
    hidden: { x: 400, scale: 0.8, opacity: 0, zIndex: 0 },
  };

  if (position === "hidden") return null;

  const handleLike = () => {
    setLikeAnim("active");
    onLike(profile.id);
  };

  const handleDislike = () => {
    setDislikeAnim("active");
    onDislike(profile.id);
  };

  return (
    <motion.div
      layout
      initial={false}
      animate={positions[position]}
      exit={{ x: -200, opacity: 0, scale: 0.85 }}
      transition={SPRING}
      className="absolute left-1/2 -ml-[160px] sm:-ml-[170px] md:-ml-[185px] top-4 w-[320px] sm:w-[340px] md:w-[370px] select-none"
    >
      <div className={`relative rounded-[1.75rem] bg-background border border-border/40 shadow-lg overflow-hidden transition-shadow duration-300 ${position === "center" ? "shadow-2xl" : ""}`}>
        {/* Portrait */}
        <div className="relative w-full" style={{ aspectRatio: "4/5" }}>
          {showImg ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-emerald/10 to-gold/10 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald to-gold p-0.5">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                  <span className="text-3xl font-bold text-gradient-luxury">{initials}</span>
                </div>
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />

          {/* Verification badge */}
          {profile.is_verified && (
            <div className="absolute top-3 left-3 h-7 w-7 rounded-full bg-emerald shadow-md flex items-center justify-center">
              <BadgeCheck className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Online indicator */}
          {profile.is_online && (
            <div className="absolute top-3.5 left-12 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald/90 text-[10px] text-white font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Online
            </div>
          )}
        </div>

        {/* Info section — only center card shows details */}
        {position === "center" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pt-4 pb-3 space-y-3"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">{name}, {age}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{profile.city_state || "—"}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {(profile.denomination_name || profile.denomination) && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald/5 text-xs font-medium text-emerald-dark">{profile.denomination_name || profile.denomination}</span>
                )}
                {profile.marital_status && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gold/10 text-xs font-medium text-gold-royal capitalize">{profile.marital_status}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <Briefcase className="h-3.5 w-3.5" />
              <span>{profile.profession || "—"}</span>
            </div>

            {profile.seeking_description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 italic">
                &ldquo;{profile.seeking_description}&rdquo;
              </p>
            )}
          </motion.div>
        )}

        {/* Actions */}
        {position === "center" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pb-5 space-y-3"
          >
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleDislike}
                className={`h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  dislikeAnim ? "border-destructive bg-destructive/10 scale-110" : "border-border/60 hover:border-destructive/40 hover:bg-destructive/5"
                }`}
              >
                <X className={`h-5 w-5 transition-colors duration-200 ${dislikeAnim ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onViewFull}
                className="px-5 py-2.5 rounded-full bg-emerald text-white text-sm font-semibold shadow-md hover:shadow-lg hover:bg-emerald/90 transition-all"
              >
                View Profile
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onSave}
                className={`h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  saved ? "border-gold-royal bg-gold/10" : "border-border/60 hover:border-gold-royal/40 hover:bg-gold/5"
                }`}
              >
                {saved ? (
                  <BookmarkCheck className="h-5 w-5 text-gold-royal" />
                ) : (
                  <Bookmark className="h-5 w-5 text-muted-foreground hover:text-gold-royal" />
                )}
              </motion.button>
            </div>

            <div className="flex items-center justify-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                className={`h-14 w-14 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                  likeAnim
                    ? "bg-emerald scale-110 shadow-lg"
                    : "bg-emerald hover:bg-emerald/90 hover:scale-105"
                }`}
              >
                <Heart className={`h-7 w-7 text-white transition-all duration-300 ${likeAnim ? "fill-white scale-110" : ""}`} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
