import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart, Users, Sparkles, Star, MessageCircle,
  Check, UserPlus,
} from "lucide-react";
import { FourSquare } from "react-loading-indicators";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function ConnectionNode({ conn, index, userId }) {
  const isFromMe = String(conn.from_user) === String(userId);
  const otherName = isFromMe
    ? (conn.to_user_name || conn.to_user)
    : (conn.from_user_name || conn.from_user);
  const initial = (otherName || "U")[0];
  const navigate = useNavigate();

  const getStatusLabel = () => {
    if (conn.status === "matched") return "Connected";
    if (conn.status === "pending") return "Pending response";
    if (isFromMe) return "You liked them";
    return "Liked you";
  };

  const statusColors = {
    matched: "from-emerald to-teal-400",
    pending: "from-gold-royal to-amber-400",
    liked: "from-burgundy to-rose-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.5 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group relative"
    >
      <Link to={`/dashboard/chat/${conn.conversation_id || ''}`}>
        <div className="relative p-5 rounded-3xl bg-background/80 backdrop-blur-xl border border-border/60 shadow-soft hover:shadow-luxe transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald/3 via-transparent to-gold/3 opacity-0 group-hover:opacity-100 transition" />

          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${statusColors[conn.status] || "from-emerald to-teal-400"} p-0.5`}>
                <div className="h-full w-full rounded-2xl bg-background flex items-center justify-center">
                  <span className="text-xl font-bold text-gradient-luxury">{initial}</span>
                </div>
              </div>
              <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-background flex items-center justify-center ${
                conn.status === "matched" ? "bg-emerald" : conn.status === "pending" ? "bg-gold-royal" : isFromMe ? "bg-emerald" : "bg-amber-warm"
              }`}>
                {conn.status === "matched" ? <Check className="h-3 w-3 text-white" /> :
                 conn.status === "pending" ? <UserPlus className="h-3 w-3 text-white" /> :
                 <Heart className="h-3 w-3 text-white" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-bold text-foreground">{otherName}</h3>
              <p className="text-xs text-muted-foreground">{getStatusLabel()}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(conn.created_at).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/dashboard/chat/${conn.conversation_id || ''}`); }}
                className="p-2 rounded-full bg-emerald/10 text-emerald-deep dark:text-gold-royal hover:bg-emerald/20 transition"
              >
                <MessageCircle className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Matches() {
  const { user } = useAuth();
  const [tab, setTab] = useState("all");
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMatches()
      .then(setConnections)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === "all" ? connections : connections.filter((c) => c.status === tab);

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-xs font-semibold text-gradient-gold mb-2">
          <Sparkles className="h-3 w-3" />
          Relationship Ecosystem
        </span>
        <h1 className="font-display text-3xl font-bold text-foreground">Your Connections</h1>
      </motion.div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: "all", label: "All Connections", count: connections.length },
          { key: "matched", label: "Matched", count: connections.filter((c) => c.status === "matched").length },
          { key: "pending", label: "Pending", count: connections.filter((c) => c.status === "pending").length },
          { key: "liked", label: "Liked", count: connections.filter((c) => c.status === "liked").length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              tab === t.key
                ? "bg-emerald text-white shadow-soft"
                : "glass text-foreground/60 hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-4">
            <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
          </div>
          <p className="text-muted-foreground">Loading connections...</p>
        </div>
      ) : (
        <motion.div layout className="space-y-3">
          {filtered.map((conn, i) => (
            <ConnectionNode key={conn.id} conn={conn} index={i} userId={user?.id} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No connections in this category yet.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
