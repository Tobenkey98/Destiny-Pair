import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { CalendarHeart, Clock, CheckCircle, XCircle } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";
import { PageHeader } from "../../components/admin/page-header";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Counselling() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.adminCounsellingSessions()
      .then(setSessions)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Mosaic color="var(--admin-loader)" size="medium" text="" textColor="" />
      </div>
    );
  }

  const statusColors = {
    scheduled: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
    upcoming: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
    completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    cancelled: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
    pending: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Counselling Sessions" description="Manage counselling sessions" />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 pt-3 pl-5">Title</th>
                <th className="pb-3 pt-3">Counsellor</th>
                <th className="pb-3 pt-3 hidden sm:table-cell">Type</th>
                <th className="pb-3 pt-3 hidden md:table-cell">Date</th>
                <th className="pb-3 pt-3 hidden md:table-cell">Time</th>
                <th className="pb-3 pt-3 text-right pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">No counselling sessions found.</td></tr>
              ) : sessions.map((s, i) => (
                <tr key={s.id} className={cn("transition-colors hover:bg-muted/30", i < sessions.length - 1 && "border-b border-border/30")}>
                  <td className="py-3.5 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <CalendarHeart className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{s.title || "Untitled"}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-muted-foreground">{s.counsellor_name || s.counsellor_email || "—"}</td>
                  <td className="py-3.5 hidden sm:table-cell text-muted-foreground capitalize">{s.session_type || "—"}</td>
                  <td className="py-3.5 hidden md:table-cell text-muted-foreground text-xs">{s.date || "—"}</td>
                  <td className="py-3.5 hidden md:table-cell text-muted-foreground text-xs">{s.time || "—"}</td>
                  <td className="py-3.5 text-right pr-5">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold capitalize border", statusColors[s.status] || "")}>
                      {s.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
