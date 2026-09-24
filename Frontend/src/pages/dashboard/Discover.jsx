import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Search, ChevronDown,
  Sparkles, Users, Filter, ChevronLeft, ChevronRight, X,
  MapPin, Bookmark, BookmarkCheck, BadgeCheck, Eye,
} from "lucide-react";
import { FourSquare } from "react-loading-indicators";
import ProfileDetailModal from "../../components/ProfileDetailModal";
import { api } from "../../lib/api";

const PAGE_SIZE = 6;

function ageOf(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return new Date().getFullYear() - d.getFullYear();
}

function scoreColor(score) {
  if (score == null) return "#8A8F98";
  if (score >= 80) return "#4ADE80";
  if (score >= 60) return "#0B7A5B";
  if (score >= 40) return "#C8A96E";
  return "#8A8F98";
}

function DiscoverGridCard({ profile, index, saved, onLike, onDislike, onSave, onViewFull }) {
  const [imgError, setImgError] = useState(false);
  const name = profile.first_name || "User";
  const age = ageOf(profile.date_of_birth);
  const initials = ((profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")).slice(0, 2) || "U";
  const score = typeof profile.compatibility_score === "number" ? profile.compatibility_score : null;
  const color = scoreColor(score);
  const showImg = profile.primary_photo && !imgError;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
      transition={{ duration: 0.35, delay: Math.min(index, 5) * 0.06, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className="group rounded-3xl bg-card border border-border/50 shadow-soft hover:shadow-luxe transition-shadow overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-emerald/15 via-background to-gold/15">
        {showImg ? (
          <img
            src={profile.primary_photo}
            alt={name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald to-gold p-0.5">
              <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                <span className="text-2xl font-bold text-gradient-luxury">{initials}</span>
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {score != null && (
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow"
              style={{ backgroundColor: color }}
            >
              {score}% match
            </span>
          )}
          {profile.is_online && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 text-white text-[10px] font-semibold backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
            </span>
          )}
        </div>
        <button
          onClick={() => onSave(profile.id)}
          aria-label="Save profile"
          className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/65 transition"
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onViewFull(profile)}
          aria-label="View full profile"
          className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-black/55 backdrop-blur-sm text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition"
        >
          <Eye className="h-3.5 w-3.5" /> Quick view
        </button>
      </div>

      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="font-display text-lg font-bold truncate">
            {name}{age != null ? `, ${age}` : ""}
          </h3>
          {profile.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[color:var(--gold-royal)]" />}
        </div>
        {(profile.city_state || profile.state_of_residence) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <MapPin className="h-3 w-3 shrink-0" /> {profile.city_state || profile.state_of_residence}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {(profile.denomination_name || profile.denomination) && (
            <span className="px-2 py-0.5 rounded-full bg-emerald/10 text-emerald-dark text-[11px] font-semibold truncate max-w-full">
              {profile.denomination_name || profile.denomination}
            </span>
          )}
          {profile.profession && (
            <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-semibold truncate max-w-full">
              {profile.profession}
            </span>
          )}
        </div>
        {score != null && (
          <div className="mt-1.5">
            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.7, delay: 0.2 + Math.min(index, 5) * 0.06 }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2.5 pt-1">
          <button
            onClick={() => onDislike(profile.id)}
            aria-label="Skip"
            className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewFull(profile)}
            aria-label="View details"
            className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition shrink-0"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onLike(profile.id)}
            className="flex-1 h-10 rounded-full bg-emerald text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow hover:shadow-glow hover:brightness-110 active:scale-95 transition"
          >
            <Heart className="h-4 w-4" fill="currentColor" /> Like
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function FilterPanel({ open, onToggle, filters, onChange }) {
  return (
    <div className="mb-6">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-sm font-medium text-foreground/70 hover:text-foreground transition w-full sm:w-auto"
      >
        <Filter className="h-4 w-4" />
        Filters
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-5 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 mb-1.5">Age Range</label>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Min" value={filters.ageMin} onChange={e => onChange("ageMin", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-emerald" />
                    <span className="text-muted-foreground">—</span>
                    <input type="number" placeholder="Max" value={filters.ageMax} onChange={e => onChange("ageMax", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-emerald" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 mb-1.5">Denomination</label>
                  <input type="text" placeholder="e.g. Pentecostal" value={filters.denomination} onChange={e => onChange("denomination", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-emerald" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 mb-1.5">Occupation</label>
                  <input type="text" placeholder="e.g. Doctor" value={filters.occupation} onChange={e => onChange("occupation", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-emerald" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 mb-1.5">Marital Status</label>
                  <select value={filters.maritalStatus} onChange={e => onChange("maritalStatus", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-emerald">
                    <option value="">Any</option>
                    <option value="single">Single</option>
                    <option value="never married">Never Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border/30">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={filters.verifiedOnly} onChange={e => onChange("verifiedOnly", e.target.checked)} className="rounded border-border text-emerald focus:ring-emerald" />
                  Verified Profiles Only
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={filters.recentlyActive} onChange={e => onChange("recentlyActive", e.target.checked)} className="rounded border-border text-emerald focus:ring-emerald" />
                  Recently Active
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onAdjustFilters }) {
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
        We could not find any more compatible Christian singles based on your preferences.
      </p>
      <button
        onClick={onAdjustFilters}
        className="mt-6 px-6 py-3 rounded-full bg-emerald text-white font-semibold shadow-md hover:shadow-lg hover:bg-emerald/90 transition-all"
      >
        Adjust Filters
      </button>
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

export default function Discover() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchedUser, setMatchedUser] = useState(null);
  const [matchedConvId, setMatchedConvId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedProfiles, setSavedProfiles] = useState(new Set());
  const [likeFeedback, setLikeFeedback] = useState(null);
  const [dislikeFeedback, setDislikeFeedback] = useState(null);
  const [likeConvId, setLikeConvId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageDir, setPageDir] = useState(0);
  const gridRef = useRef(null);

  const [filters, setFilters] = useState({
    ageMin: "", ageMax: "", denomination: "", occupation: "",
    maritalStatus: "", verifiedOnly: false, recentlyActive: false,
  });

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  const [profileBlocked, setProfileBlocked] = useState(null);
  useEffect(() => {
    setLoading(true);
    api.discover()
      .then(setProfiles)
      .catch((err) => {
        if (err.data?.code === "PROFILE_INCOMPLETE") {
          setProfileBlocked(err.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
      if (q) {
        const name = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (filters.ageMin !== "" || filters.ageMax !== "") {
        const age = ageOf(p.date_of_birth);
        if (age == null) return false;
        if (filters.ageMin !== "" && age < Number(filters.ageMin)) return false;
        if (filters.ageMax !== "" && age > Number(filters.ageMax)) return false;
      }
      if (filters.denomination) {
        const d = String(p.denomination_name ?? p.denomination ?? "").toLowerCase();
        if (!d.includes(filters.denomination.toLowerCase())) return false;
      }
      if (filters.occupation) {
        if (!(p.profession || "").toLowerCase().includes(filters.occupation.toLowerCase())) return false;
      }
      if (filters.maritalStatus) {
        if ((p.marital_status || "").toLowerCase() !== filters.maritalStatus.toLowerCase()) return false;
      }
      if (filters.verifiedOnly && !p.is_verified) return false;
      if (filters.recentlyActive && !p.is_online) return false;
      return true;
    });
  }, [profiles, searchQuery, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
    setPageDir(0);
  }, [searchQuery, filters]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goPage(n) {
    const next = Math.min(Math.max(1, n), pageCount);
    if (next === page) return;
    setPageDir(next > page ? 1 : -1);
    setPage(next);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleLike(userId) {
    const profile = profiles.find(p => p.id === userId);
    try {
      const match = await api.createMatch({ to_user: userId, status: "liked" });
      setLikeFeedback(userId);
      setTimeout(() => setLikeFeedback(null), 1200);
      setProfiles(prev => prev.filter(p => p.id !== userId));
      if (match.conversation_id) setLikeConvId(match.conversation_id);
      if (match.status === "matched") {
        setMatchedUser(profile || { first_name: "User" });
        setMatchedConvId(match.conversation_id || null);
      }
    } catch (err) {
      if (err.data?.code === "PROFILE_INCOMPLETE") {
        setProfileBlocked(err.data);
        return;
      }
      console.error("Like failed:", err);
      const reason = err.data?.reason || err.data?.error;
      let msg = err.data?.detail || err.data?.error || err.message || "Could not send your like. Please try again.";
      if (reason === "DAILY_LIKE_LIMIT_REACHED") {
        msg = "You have reached your daily like limit. Upgrade your plan for more likes."
      } else if (reason === "PHOTOS_REQUIRED") {
        msg = "Add a profile photo and a cover photo before liking anyone."
      }
      alert(msg);
    }
  }

  async function handleDislike(userId) {
    setProfiles(prev => prev.filter(p => p.id !== userId));

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

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 mt-2"
      >
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Discover</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} compatible Christian single{filtered.length !== 1 ? "s" : ""}
            {pageCount > 1 && ` · Page ${page} of ${pageCount}`}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3 py-2 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-emerald transition"
            />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald/5 text-xs font-semibold text-emerald-dark whitespace-nowrap">
            <Sparkles className="h-3.5 w-3.5" />
            Faith-aligned
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <FilterPanel
        open={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
        filters={filters}
        onChange={updateFilter}
      />

      {/* Profile incomplete wall */}
      {profileBlocked && (
        <motion.div initial={{opacity:0, y:12}} animate={{opacity:1,y:0}} className="rounded-3xl bg-background border border-border/60 shadow-soft p-8 sm:p-10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4"><Sparkles className="h-8 w-8 text-amber-600"/></div>
          <h2 className="font-display text-2xl font-bold">Complete your profile to discover</h2>
          <p className="text-muted-foreground mt-2">You are {profileBlocked.completion_percentage||profileBlocked.completion?.percentage||0}% complete. Finish the missing fields to unlock Discover.</p>
          {profileBlocked.missing_fields?.length>0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {profileBlocked.missing_fields.map(f=> <span key={f} className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">{f.replace(/_/g," ")}</span>)}
            </div>
          )}
          <button onClick={()=> navigate("/dashboard/profile")} className="mt-6 px-8 py-3 rounded-full bg-foreground text-background font-bold hover:shadow-glow transition">Complete Profile</button>
        </motion.div>
      )}

      {/* Main content */}
      {!profileBlocked && loading ? (
        <LoadingState />
      ) : !profileBlocked && filtered.length === 0 ? (
        <EmptyState onAdjustFilters={() => setFiltersOpen(true)} />
      ) : !profileBlocked && (
        <div ref={gridRef} className="scroll-mt-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 48 * (pageDir >= 0 ? 1 : -1) }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -48 * (pageDir >= 0 ? 1 : -1), transition: { duration: 0.18 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
            >
              <AnimatePresence>
                {pageItems.map((p, i) => (
                  <DiscoverGridCard
                    key={p.id}
                    profile={p}
                    index={i}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    onSave={() => handleSave(p.id)}
                    saved={savedProfiles.has(p.id)}
                    onViewFull={() => setSelectedProfile(p)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
                className="h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => goPage(n)}
                  className={`h-10 min-w-10 px-2 rounded-full text-sm font-bold transition ${
                    n === page
                      ? "bg-[#611C2B] text-white dark:bg-[#D3A345] dark:text-[#2D2323] shadow"
                      : "border border-border bg-card hover:bg-accent"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => goPage(page + 1)}
                disabled={page === pageCount}
                aria-label="Next page"
                className="h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground mt-3">
            Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + pageItems.length} of {filtered.length}
          </p>
        </div>
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

      {/* Like/Dislike feedback toast */}
      <AnimatePresence>
        {likeFeedback && likeConvId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-emerald text-white text-sm font-semibold shadow-lg">
            <Heart className="h-4 w-4 inline mr-1.5" fill="currentColor" /> Like request sent!
          </motion.div>
        )}
        {dislikeFeedback && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-destructive text-white text-sm font-semibold shadow-lg">
            <X className="h-4 w-4 inline mr-1.5" /> Not interested
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
