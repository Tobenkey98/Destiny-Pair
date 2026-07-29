import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { CreditCard, UserCheck, Clock, Ban } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";
import { PageHeader } from "../../components/admin/page-header";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.adminSubscriptions()
      .then(setSubs)
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
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    cancelled: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
    expired: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Manage user subscription plans" />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 pt-3 pl-5">User</th>
                <th className="pb-3 pt-3">Plan</th>
                <th className="pb-3 pt-3 hidden sm:table-cell">Price</th>
                <th className="pb-3 pt-3 hidden md:table-cell">Duration</th>
                <th className="pb-3 pt-3 hidden lg:table-cell">Started</th>
                <th className="pb-3 pt-3 hidden lg:table-cell">Ends</th>
                <th className="pb-3 pt-3 text-right pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">No subscriptions found.</td></tr>
              ) : subs.map((s, i) => (
                <tr key={s.id} className={cn("transition-colors hover:bg-muted/30", i < subs.length - 1 && "border-b border-border/30")}>
                  <td className="py-3.5 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {(s.user_name || s.user_email || "?")[0].toUpperCase()}
                      </div>
                      <span className="font-medium truncate max-w-[150px]">{s.user_name || s.user_email?.split("@")[0]}</span>
                    </div>
                  </td>
                  <td className="py-3.5 font-medium">{s.plan || "—"}</td>
                  <td className="py-3.5 hidden sm:table-cell text-muted-foreground">{s.plan_price ? `₦${Number(s.plan_price).toLocaleString()}` : "—"}</td>
                  <td className="py-3.5 hidden md:table-cell text-muted-foreground">{s.plan_duration ? `${s.plan_duration} days` : "—"}</td>
                  <td className="py-3.5 hidden lg:table-cell text-muted-foreground text-xs">{timeAgo(s.start_date)}</td>
                  <td className="py-3.5 hidden lg:table-cell text-muted-foreground text-xs">{timeAgo(s.end_date)}</td>
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
