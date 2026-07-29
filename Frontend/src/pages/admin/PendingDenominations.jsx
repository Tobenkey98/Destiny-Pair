import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { CheckCircle, XCircle, Clock, Mail } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

export default function AdminPendingDenominations() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  function fetchPending() {
    api.adminPendingDenominations()
      .then(data => setPending(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchPending(); }, []);

  async function handleApprove(id) {
    try {
      await api.adminApprovePendingDenomination(id);
      setActionMsg({ success: true, message: "Denomination approved." });
      fetchPending();
    } catch (err) {
      setActionMsg({ success: false, message: err.data?.error || err.message });
    }
  }

  async function handleReject(id) {
    if (!confirm("Reject this pending denomination?")) return;
    try {
      await api.adminRejectPendingDenomination(id);
      setActionMsg({ success: true, message: "Denomination rejected." });
      fetchPending();
    } catch (err) {
      setActionMsg({ success: false, message: err.data?.error || err.message });
    }
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
        title="Pending Denominations"
        description="Review and approve denomination suggestions from users"
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      {actionMsg && (
        <div className={cn("p-4 rounded-xl text-sm", actionMsg.success ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/30")}>
          {actionMsg.message}
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 pt-3 pl-5">Name</th>
                <th className="pb-3 pt-3">Submitted By</th>
                <th className="pb-3 pt-3 hidden sm:table-cell">Status</th>
                <th className="pb-3 pt-3 hidden md:table-cell">Submitted</th>
                <th className="pb-3 pt-3 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">No pending denomination requests.</td></tr>
              ) : pending.map((p, i) => (
                <tr key={p.id} className={cn("transition-colors hover:bg-muted/30", i < pending.length - 1 && "border-b border-border/30")}>
                  <td className="py-3.5 pl-5 font-medium">{p.name}</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {p.user_email || "—"}
                    </span>
                  </td>
                  <td className="py-3.5 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" /> Pending Review
                    </span>
                  </td>
                  <td className="py-3.5 hidden md:table-cell text-muted-foreground text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                  <td className="py-3.5 text-right pr-5">
                    <div className="inline-flex items-center gap-1.5">
                      <button onClick={() => handleApprove(p.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-semibold transition">
                        <CheckCircle className="h-3 w-3" /> Approve
                      </button>
                      <button onClick={() => handleReject(p.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-[10px] font-semibold transition">
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    </div>
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
