import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { Heart, Users, TrendingUp, MessageCircle, ThumbsUp, XCircle, CheckCircle, Hourglass, ListFilter } from "lucide-react";
import { PageHeader } from "../../components/admin/page-header";
import { StatCard } from "../../components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { api } from "../../lib/api";

const STATUS_STYLE = {
  matched: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  liked: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
};

const TABS = [
  { key: "all", label: "All", color: "bg-primary/10 text-primary" },
  { key: "liked", label: "Liked", icon: ThumbsUp, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { key: "pending", label: "Pending", icon: Hourglass, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { key: "matched", label: "Matched", icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "bg-red-500/10 text-red-600 dark:text-red-400" },
];

function relationLabel(m) {
  if (m.status === "matched") {
    return { text: `${m.from_user_name} and ${m.to_user_name} are a mutual match`, tone: "success" };
  }
  if (m.status === "rejected") {
    return { text: `${m.to_user_name} rejected ${m.from_user_name}'s like`, tone: "destructive" };
  }
  return m.relation === "both liked"
    ? { text: `${m.from_user_name} liked ${m.to_user_name} — both interested`, tone: "info" }
    : { text: `${m.from_user_name} sent a like to ${m.to_user_name}`, tone: "default" };
}

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [activeConversations, setActiveConversations] = useState(0);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    api.adminMatches()
      .then((data) => {
        setMatches(data.matches || []);
        setTotal(data.total || 0);
        setStatusCounts(data.status_counts || {});
        setActiveConversations(data.active_conversations || 0);
      })
      .catch((err) => setError(err.message || "Failed to load matches"));
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? matches : matches.filter((m) => m.status === filter)),
    [matches, filter]
  );

  const matchRate = total > 0
    ? Math.round(((statusCounts.matched || 0) / total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Matches" description="Every like, rejection and match across the platform — who engaged with whom" />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard label="Total Matches" value={String(total || 0)} icon={Heart} color="primary" />
        <StatCard label="Match Rate" value={`${matchRate}%`} icon={TrendingUp} color="success" />
        <StatCard label="Active Conversations" value={String(activeConversations || 0)} icon={MessageCircle} color="info" />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListFilter className="h-4 w-4" /> Match Activity
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === t.key ? t.color : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon && <t.icon className="h-3.5 w-3.5" />}
                {t.label}
                <span className="tabular-nums">
                  {t.key === "all" ? total : (statusCounts[t.key] || 0)}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="py-3 pl-5 pr-3">Who liked / matched</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 hidden md:table-cell">Details</th>
                  <th className="py-3 pr-5 pl-3 text-right">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No {filter === "all" ? "" : `${filter} `}activity recorded yet.
                    </td>
                  </tr>
                )}
                <AnimatePresence initial={false}>
                  {filtered.map((m, i) => {
                    const rel = relationLabel(m);
                    const fromInitial = (m.from_user_name || m.from_user_email || "?")[0];
                    const toInitial = (m.to_user_name || m.to_user_email || "?")[0];
                    return (
                      <motion.tr
                        key={m.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="border-b last:border-0 hover:bg-muted/40 transition"
                      >
                        <td className="py-3 pl-5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-card">
                                {fromInitial}
                              </div>
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-card">
                                {toInitial}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {m.from_user_name || m.from_user_email?.split("@")[0]}
                                <span className="text-muted-foreground font-normal"> → </span>
                                {m.to_user_name || m.to_user_email?.split("@")[0]}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {m.from_user_email || `User ${m.from_user}`}
                                <span className="mx-1">·</span>
                                {m.to_user_email || `User ${m.to_user}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className={`text-[10px] font-semibold capitalize border ${STATUS_STYLE[m.status] || ""}`}>
                            {m.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <p className={`text-xs ${rel.tone === "destructive" ? "text-red-600 dark:text-red-400" : rel.tone === "success" ? "text-emerald-600 dark:text-emerald-400" : rel.tone === "info" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                            {rel.text}
                          </p>
                        </td>
                        <td className="py-3 pr-5 pl-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {m.updated_at ? new Date(m.updated_at).toLocaleString() : new Date(m.created_at).toLocaleString()}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}