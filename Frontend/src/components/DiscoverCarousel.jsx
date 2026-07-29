import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FourSquare } from "react-loading-indicators";
import {
  Heart, MessageCircle, Sparkles, Users, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import ProfileCard from "./ProfileCard";
import ProfileDetailModal from "./ProfileDetailModal";
import { api } from "../lib/api";

const SPRING = { type: "spring", stiffness: 300, damping: 30 };

function EmptyState({ onPrev }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 max-w-md mx-auto"
    >
      <div className="h-24 w-24 rounded-full bg-emerald/5 flex items-center justify-center mx-auto mb-6">
        <Users className="h-12 w-12 text-emerald/30" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-3">No more profiles</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        You have viewed all available Christian singles.
      </p>
      {onPrev && (
        <button
          onClick={onPrev}
          className="mt-6 px-6 py-3 rounded-full bg-emerald text-white font-semibold shadow-md hover:shadow-lg hover:bg-emerald/90 transition-all"
        >
          Go Back
        </button>
      )}
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
        <p className="text-sm text-muted-foreground">Finding compatible Christian singles...</p>
      </div>
    </div>
  );
}

export default function DiscoverCarousel() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchedUser, setMatchedUser] = useState(null);
  const [matchedConvId, setMatchedConvId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [savedProfiles, setSavedProfiles] = useState(new Set());
  const [likeFeedback, setLikeFeedback] = useState(null);
  const [dislikeFeedback, setDislikeFeedback] = useState(null);
  const [likeConvId, setLikeConvId] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.discover()
      .then(setProfiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function goNext() {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }

  async function handleLike(userId) {
    const profile = profiles.find(p => p.id === userId);
    if (currentIndex < profiles.length - 1) {
      goNext();
    } else {
      setProfiles(prev => prev.filter(p => p.id !== userId));
    }

    setLikeFeedback(userId);
    setTimeout(() => setLikeFeedback(null), 1200);

    try {
      const match = await api.createMatch({ to_user: userId, status: "liked" });
      if (match.conversation_id) setLikeConvId(match.conversation_id);
      if (match.status === "matched") {
        setMatchedUser(profile || { first_name: "User" });
        setMatchedConvId(match.conversation_id || null);
      }
    } catch (err) {
      console.error("Like failed:", err);
    }
  }

  async function handleDislike(userId) {
    if (currentIndex < profiles.length - 1) {
      goNext();
    } else {
      setProfiles(prev => prev.filter(p => p.id !== userId));
    }

    setDislikeFeedback(userId);
    setTimeout(() => setDislikeFeedback(null), 1200);

    try {
      await api.createMatch({ to_user: userId, status: "rejected" });
    } catch (err) {
      console.error("Dislike failed:", err);
    }
  }

  function handleSave(userId) {
    setSavedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    api.saveProfile(userId).catch(() => {});
  }

  function getCardPosition(index) {
    if (index === currentIndex) return "center";
    if (index === currentIndex - 1) return "previous";
    if (index === currentIndex + 1) return "next";
    return "hidden";
  }

  const isEmpty = profiles.length === 0;

  return (
    <>
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="relative w-full h-[520px] sm:h-[580px] md:h-[640px]">
            <AnimatePresence>
              {profiles.map((p, i) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  position={getCardPosition(i)}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  onSave={() => handleSave(p.id)}
                  saved={savedProfiles.has(p.id)}
                  onViewFull={() => setSelectedProfile(p)}
                />
              ))}
            </AnimatePresence>

            {/* Nav arrows — only when profiles exist */}
            {!isEmpty && (
              <>
                {currentIndex > 0 && (
                  <button
                    onClick={goPrev}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-md flex items-center justify-center hover:bg-background transition text-foreground/70 hover:text-foreground"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {currentIndex < profiles.length - 1 && (
                  <button
                    onClick={goNext}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-md flex items-center justify-center hover:bg-background transition text-foreground/70 hover:text-foreground"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Navigation dots + progress */}
          {!isEmpty && (
            <div className="flex flex-col items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5">
                {profiles.slice(0, Math.min(profiles.length, 20)).map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentIndex ? "w-6 bg-emerald" : "w-1.5 bg-foreground/20 hover:bg-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} of {profiles.length}
              </p>
            </div>
          )}

          {isEmpty && !loading && <EmptyState onPrev={profiles.length > 0 ? goPrev : null} />}

          {/* Like/Dislike feedback toast */}
          <AnimatePresence>
            {likeFeedback && likeConvId && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
                <span className="px-4 py-2.5 rounded-full bg-emerald text-white text-sm font-semibold shadow-lg">
                  <Heart className="h-4 w-4 inline mr-1.5" fill="currentColor" /> Liked!
                </span>
                <button
                  onClick={() => navigate(`/dashboard/chat/${likeConvId}`)}
                  className="px-4 py-2.5 rounded-full bg-background border border-border text-foreground text-sm font-semibold shadow-lg hover:bg-secondary transition"
                >
                  <MessageCircle className="h-4 w-4 inline mr-1.5" /> Chat
                </button>
              </motion.div>
            )}
            {likeFeedback && !likeConvId && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-emerald text-white text-sm font-semibold shadow-lg">
                <Heart className="h-4 w-4 inline mr-1.5" fill="currentColor" /> Liked!
              </motion.div>
            )}
            {dislikeFeedback && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-destructive text-white text-sm font-semibold shadow-lg">
                <X className="h-4 w-4 inline mr-1.5" /> Not interested
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Profile Detail Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <ProfileDetailModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} onLike={handleLike} />
        )}
      </AnimatePresence>

      {/* Mutual Match Modal */}
      <AnimatePresence>
        {matchedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setMatchedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-background overflow-hidden shadow-luxe text-center"
            >
              <div className="pt-10 pb-6 px-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald to-gold p-0.5 mx-auto mb-4">
                  <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                    <Heart className="h-10 w-10 text-gold-royal" fill="currentColor" />
                  </div>
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">It is a Match!</h2>
                <p className="text-muted-foreground mt-2">You and <strong>{matchedUser.first_name}</strong> are interested in each other.</p>
              </div>
              <div className="flex border-t border-border/50">
                <button onClick={() => setMatchedUser(null)} className="flex-1 py-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition">
                  Continue Browsing
                </button>
                <button
                  onClick={() => { setMatchedUser(null); navigate(matchedConvId ? `/dashboard/chat/${matchedConvId}` : "/dashboard/chat"); }}
                  className="flex-1 py-4 text-sm font-semibold text-emerald border-l border-border/50 hover:bg-emerald/5 transition"
                >
                  <MessageCircle className="h-4 w-4 inline mr-1.5" /> Send Message
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
