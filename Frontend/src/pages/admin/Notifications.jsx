import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mosaic } from "react-loading-indicators";
import { Bell, UserPlus, Heart, CalendarHeart, Camera, ArrowRight, RefreshCw, LogIn, Shield, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeConfig = {
  new_user: { icon: UserPlus, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25", gradient: "from-blue-500/5 to-transparent" },
  user_login: { icon: LogIn, color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25", gradient: "from-cyan-500/5 to-transparent" },
  new_admin: { icon: ShieldCheck, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25", gradient: "from-amber-500/5 to-transparent" },
  admin_login: { icon: Shield, color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25", gradient: "from-purple-500/5 to-transparent" },
  match: { icon: Heart, color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25", gradient: "from-rose-500/5 to-transparent" },
  counselling: { icon: CalendarHeart, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25", gradient: "from-emerald-500/5 to-transparent" },
  photo: { icon: Camera, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25", gradient: "from-amber-500/5 to-transparent" },
};

export default function Notifications() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function fetchEvents() {
    api.adminNotificationFeed()
      .then(data => setEvents(data.events || []))
      .catch(err => setError(err.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { fetchEvents(); }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchEvents();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Mosaic color="var(--admin-loader)" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Recent platform activity"
        actions={
          <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold">No recent activity</h3>
          <p className="text-sm text-muted-foreground mt-1">New events will appear here as they happen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e, i) => {
            const cfg = typeConfig[e.type] || { icon: Bell, color: "bg-muted text-muted-foreground border-border", gradient: "" };
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "rounded-xl border bg-card bg-gradient-to-r p-4 transition-all hover:shadow-sm hover:-translate-y-0.5 cursor-pointer",
                  cfg.gradient,
                )}
                onClick={() => e.link && navigate(e.link)}
              >
                <div className="flex items-start gap-3.5">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", cfg.color)}>
                    <cfg.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{e.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground font-medium">{timeAgo(e.created_at)}</span>
                    {e.link && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
