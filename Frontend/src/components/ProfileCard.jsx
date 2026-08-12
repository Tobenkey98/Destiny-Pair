import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";
import {
  Heart, X, MapPin, Bookmark, BookmarkCheck, BadgeCheck, Eye,
} from "lucide-react";

export default function ProfileCard({ profile, position, onLike, onDislike, onSave, saved, onViewFull }) {
  const [imgError, setImgError] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [dislikeAnim, setDislikeAnim] = useState(false);

  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : "?";
  const name = profile.first_name || "User";
  const initials = ((profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")).slice(0, 2) || "U";
  const avatarUrl = profile.primary_photo;
  const showImg = avatarUrl && !imgError;

  const score = typeof profile.compatibility_score === "number" ? profile.compatibility_score : null;
  const ringColor = score >= 80 ? "#4ADE80" : score >= 60 ? "#0B7A5B" : score >= 40 ? "#C8A96E" : "#8A8F98";
  const ringBg = score >= 80 ? "rgba(74, 222, 128, 0.18)" : "rgba(255,255,255,0.15)";

  const SPRING = { type: "spring", stiffness: 170, damping: 24, mass: 1.05 };

  const positions = {
    previous: { x: -260, y: 18, scale: 0.9, opacity: 0.45, rotate: -3, zIndex: 5 },
    center: { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0, zIndex: 10 },
    next: { x: 260, y: 18, scale: 0.9, opacity: 0.45, rotate: 3, zIndex: 5 },
    hidden: { x: 420, y: 0, scale: 0.78, opacity: 0, zIndex: 0 },
  };

  // Drag-to-swipe tracked separately so the slide stays springy.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const likeLabelOpacity = useTransform(x, [60, 140], [0, 1]);
  const dislikeLabelOpacity = useTransform(x, [-140, -60], [1, 0]);

  if (position === "hidden") return null;

  const isCenter = position === "center";

  function handleLike() {
    setLikeAnim(true);
    onLike(profile.id);
  }

  function handleDislike() {
    setDislikeAnim(true);
    onDislike(profile.id);
  }

  function handleDragEnd(event, info) {
    if (!isCenter) return;
    if (info.offset.x > 100) handleLike();
    else if (info.offset.x < -100) handleDislike();
  }

  const cardContent = (
    <div key="card" className="absolute inset-0 rounded-[1.75rem] bg-background border border-border/40 shadow-2xl overflow-hidden">
      {/* Photo fills the whole card — stretched edge to edge */}
      {showImg ? (
        <img
          src={avatarUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald/20 via-background to-gold/20 flex items-center justify-center">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald to-gold p-0.5">
            <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
              <span className="text-4xl font-bold text-gradient-luxury">{initials}</span>
            </div>
          </div>
        </div>
      )}

      {/* Readability gradient */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

      {/* Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        {profile.is_verified && (
          <span className="h-8 w-8 rounded-full bg-emerald shadow-md flex items-center justify-center">
            <BadgeCheck className="h-[18px] w-[18px] text-white" />
          </span>
        )}
        {profile.is_online && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-[11px] text-white font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-light animate-pulse" />
            Online
          </span>
        )}
      </div>

      {/* Match percentage — shown on every card */}
      {score !== null && (
        <div className="absolute top-3 right-3 z-10 flex flex-col items-center">
          <div className="relative h-16 w-16">
            <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
              <circle cx="32" cy="32" r="27" fill={ringBg} stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="27"
                fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 169.6} 169.6`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-base font-bold text-white leading-none">{score}%</span>
              <span className="text-[9px] text-white/70 tracking-wide mt-0.5">MATCH</span>
            </div>
          </div>
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-display text-2xl font-bold drop-shadow">{name}{age !== "?" ? `, ${age}` : ""}</h3>
          {score !== null && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "rgba(255,255,255,0.14)", color: ringColor }}>
              {score >= 80 ? "Excellent" : score >= 60 ? "Great" : score >= 40 ? "Fair" : "New"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/85 mb-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>{profile.city_state || "Nigeria"}</span>
          {(profile.denomination_name || profile.denomination) && (
            <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-medium">
              {profile.denomination_name || profile.denomination}
            </span>
          )}
        </div>
        {profile.seeking_description && (
          <p className="text-sm text-white/80 leading-relaxed line-clamp-1 pb-1">
            &ldquo;{profile.seeking_description}&rdquo;
          </p>
        )}
      </div>

      {/* Swipe hint label */}
      <motion.span
        style={{ opacity: likeLabelOpacity, x }}
        className="absolute top-24 left-6 z-10 px-3 py-1 rounded-lg bg-emerald text-white text-xs font-bold tracking-wider uppercase pointer-events-none"
      >
        Like
      </motion.span>
      <motion.span
        style={{ opacity: dislikeLabelOpacity, x }}
        className="absolute top-24 right-6 z-10 px-3 py-1 rounded-lg bg-destructive text-white text-xs font-bold tracking-wider uppercase pointer-events-none"
      >
        Skip
      </motion.span>
    </div>
  );

  return (
    <motion.div
      className="absolute top-2 left-1/2 -ml-[160px] sm:-ml-[175px] md:-ml-[195px] w-[320px] sm:w-[350px] md:w-[390px] h-[calc(100%-6rem)] sm:h-[calc(100%-4rem)] md:h-[calc(100%-2rem)] max-h-[560px] select-none cursor-grab active:cursor-grabbing"
      exit={{ x: -340, opacity: 0, scale: 0.8 }}
    >
      <motion.div
        className="relative h-full"
        style={{ x, rotate }}
        animate={positions[position]}
        exit={{ x: -260, opacity: 0, scale: 0.85 }}
        transition={SPRING}
        drag={position === "center" ? "x" : false}
        dragElastic={{ left: 0.55, right: 0.55 }}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
      >
        {cardContent}
      </motion.div>

      {/* Actions — only the center card */}
      <AnimatePresence>
        {isCenter && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3"
          >
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleDislike}
              className={`h-[52px] w-[52px] rounded-full bg-background/85 backdrop-blur-md border-2 flex items-center justify-center shadow-xl transition-colors ${
                dislikeAnim ? "border-destructive bg-destructive/15" : "border-border/40 hover:border-destructive/50"
              }`}
            >
              <X className={`h-6 w-6 ${dislikeAnim ? "text-destructive" : "text-foreground/70"}`} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onViewFull}
              className="px-5 py-2.5 rounded-full bg-emerald text-white text-sm font-semibold shadow-xl hover:bg-emerald/90 transition-colors"
            >
              <Eye className="h-4 w-4 inline mr-1.5" /> View Profile
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onSave}
              className={`h-[52px] w-[52px] rounded-full bg-background/85 backdrop-blur-md border-2 flex items-center justify-center shadow-xl transition-colors ${
                saved ? "border-gold-royal bg-gold/15" : "border-border/40 hover:border-gold-royal/40"
              }`}
            >
              {saved ? <BookmarkCheck className="h-[22px] w-[22px] text-gold-royal" /> : <Bookmark className="h-5 w-5 text-foreground/70" />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.65 }}
              onClick={handleLike}
              className={`h-16 w-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                likeAnim ? "bg-emerald scale-110" : "bg-gradient-to-br from-emerald to-emerald-dark hover:scale-105"
              }`}
            >
              <Heart className={`h-8 w-8 text-white ${likeAnim ? "fill-white" : ""}`} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}