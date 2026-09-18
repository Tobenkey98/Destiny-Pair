import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { ClipboardCheck, Search, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

const PAGE_SIZE = 25;

const TYPE_STYLES = {
  create: "bg-success/10 text-success border-success/25",
  update: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  delete: "bg-destructive/10 text-destructive border-destructive/25",
  read: "bg-muted text-muted-foreground border-border",
  other: "bg-warning/10 text-warning border-warning/25",
};

function shortChanges(changes) {
  if (!changes || Object.keys(changes).length === 0) return null;
  return JSON.stringify(changes).slice(0, 160);
}

function timeFull(iso) {
  try {
    return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminAudit() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback((off, q, typeFilter) => {
    setLoading(true);
    setError(null);
    api.adminAuditLogs({ limit: PAGE_SIZE, offset: off, search: q, action_type: typeFilter })
      .then(data => {
        setRows(data.results || []);
        setTotal(data.total || 0);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0, "", ""); }, [load]);

  function applyFilters() {
    setOffset(0);
    load(0, query, filter);
  }

  function nextPage() {
    if (offset + PAGE_SIZE >= total) return;
    const n = offset + PAGE_SIZE;
    setOffset(n);
    load(n, query, filter);
  }

  function prevPage() {
    if (offset === 0) return;
    const n = Math.max(0, offset - PAGE_SIZE);
    setOffset(n);
    load(n, query, filter);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description={`${total.toLocaleString()} recorded administrative actions`}
        actions={
          <button onClick={() => { setOffset(0); load(0, "", ""); setQuery(""); setFilter(""); }} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition">
            <RefreshCw className="h-4 w-4" /> Reset
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search action or target..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setOffset(0); load(0, query, e.target.value); }} className="h-9 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">All types</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="read">Read</option>
            <option value="other">Other</option>
          </select>
          <button onClick={applyFilters} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
            Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actor</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP / Device</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16"><div className="flex justify-center"><Mosaic color="var(--admin-loader)" size="small" text="" textColor="" /></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-muted-foreground text-sm">No audit records found.</td></tr>
              ) : rows.map((r, i) => (
                <motion.tr key={r.id ?? i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{timeFull(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate max-w-[140px]">{r.actor_name || "System"}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{r.actor_email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium">{r.action}</span>
                      <span className={cn("w-fit text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase", TYPE_STYLES[r.action_type] || TYPE_STYLES.other)}>{r.action_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium">{r.target_model || "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{r.target_repr || (r.target_id ? `#${r.target_id}` : "")}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[11px] text-muted-foreground">{r.ip_address || "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{r.device || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {shortChanges(r.changes) ? (
                      <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{shortChanges(r.changes)}</code>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} · Page {Math.floor(offset / PAGE_SIZE) + 1}/{pages}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={prevPage} disabled={offset === 0} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={nextPage} disabled={offset + PAGE_SIZE >= total} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}