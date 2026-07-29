import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Bell, Heart, Star, User, BookOpen, Crown, Sparkles,
  Check,
} from "lucide-react";
import { FourSquare } from "react-loading-indicators";
import { api } from "../../lib/api";

const actionConfig = {
  profile_view: { icon: User, color: "from-emerald to-teal-400", label: "Profile View" },
  like: { icon: Heart, color: "from-burgundy to-rose-400", label: "Like" },
  match: { icon: Star, color: "from-gold-royal to-amber-400", label: "Match" },
  message: { icon: Heart, color: "from-emerald to-cyan-400", label: "Message" },
  counselling: { icon: BookOpen, color: "from-emerald to-cyan-400", label: "Counselling" },
};

export default function Notifications() {
  const [filter, setFilter] = useState("all");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getActivities()
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
    api.markRead().catch(() => {});
  }, []);

  const unreadCount = 0;
  const filtered = filter === "all" ? activities : activities;

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-xs font-semibold text-gradient-gold mb-2">
            <Sparkles className="h-3 w-3" />
            Activity Feed
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground">Notifications</h1>
        </div>
      </motion.div>

      <div className="flex gap-2 mb-6">
        {[
          { key: "all", label: "All", count: activities.length },
        ].map((f) => (
          <button
            key={f.key}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === f.key
                ? "bg-emerald text-white shadow-soft"
                : "glass text-foreground/60 hover:text-foreground"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">({f.count})</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-gold-royal/30 via-border to-transparent" />
        {loading ? (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">
              <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
            </div>
            <p className="text-muted-foreground">Loading activity...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a, i) => {
              const cfg = actionConfig[a.action] || { icon: Bell, color: "from-emerald to-teal-400" };
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pl-14 pr-4 py-4 rounded-2xl transition"
                >
                  <div className="absolute left-4 top-5 h-4 w-4 rounded-full border-2 border-background bg-border" />
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/70">
                        {a.description}
                        {a.related_user_name && <span className="font-semibold"> {a.related_user_name}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(a.created_at).toLocaleDateString()} &bull; {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">No activity yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
