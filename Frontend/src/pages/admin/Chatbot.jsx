import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import {
  Bot, Headset, CheckCircle2, Clock, Star, RefreshCw,
  MessageSquare, ChevronLeft, Inbox,
} from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

const STATUS_META = {
  new: { label: "New", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25" },
  in_review: { label: "In Review", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25" },
  resolved: { label: "Resolved", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
};

const CATEGORY_LABELS = {
  not_answered: "Question not answered",
  complaint: "Complaint",
  bug: "Bug / technical",
  billing: "Payment / billing",
  account: "Account issue",
  report_user: "Report a user",
  other: "Other",
};

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

export default function Chatbot() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    Promise.all([api.adminChatbotTickets(), api.adminChatbotStats()])
      .then(([t, s]) => { setTickets(t || []); setStats(s || {}); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openTicket(ticket) {
    setSelected(ticket);
    setDetail(null);
    setNote(ticket.resolution_note || "");
    api.adminChatbotTicket(ticket.id)
      .then(d => setDetail(d))
      .catch(() => setDetail(ticket));
  }

  async function updateStatus(status) {
    setSaving(true);
    try {
      const updated = await api.adminChatbotUpdateTicket(selected.id, { status, resolution_note: note });
      setDetail(d => d ? { ...d, ...updated } : updated);
      setSelected(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      if (status === "resolved") {
        const s = await api.adminChatbotStats();
        setStats(s || {});
      }
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Mosaic color="var(--admin-loader)" size="medium" text="" textColor="" />
      </div>
    );
  }

  const statCards = [
    { icon: Inbox, label: "Open Tickets", value: stats.open_tickets ?? 0 },
    { icon: CheckCircle2, label: "Resolved", value: stats.resolved_tickets ?? 0 },
    { icon: MessageSquare, label: "Conversations", value: stats.conversations ?? 0 },
    { icon: Star, label: "Avg. Rating", value: stats.average_rating ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bot Reports"
        description="Support tickets raised by the AI assistant — escalate and resolve customer issues"
        actions={
          <button onClick={load} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border bg-card p-4 flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald/10 text-emerald flex items-center justify-center">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Ticket list */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Headset className="h-4 w-4 text-emerald" /> Escalations ({tickets.length})
          </h3>
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border bg-card">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Bot className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h4 className="font-semibold">No escalations yet</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">When users can't get answers from the assistant, tickets appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t, i) => {
                const sm = STATUS_META[t.status] || STATUS_META.new;
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => openTicket(t)}
                    className={cn(
                      "w-full text-left rounded-2xl border p-4 transition hover:shadow-sm",
                      selected?.id === t.id ? "border-emerald bg-emerald/5" : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.user_name} • {t.message_count} messages • {timeAgo(t.created_at)}
                        </p>
                        <p className="text-xs text-foreground/70 mt-2 line-clamp-2">{t.summary}</p>
                      </div>
                      <span className={cn("shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border", sm.cls)}>
                        {sm.label}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h4 className="font-semibold text-foreground">Select a ticket</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">Choose an escalation on the left to view the full conversation and take action.</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4 text-emerald" />
                  Ticket #{selected.id}
                  <span className="text-xs font-medium text-muted-foreground">({CATEGORY_LABELS[selected.category] || selected.category})</span>
                </div>
                <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border", STATUS_META[selected.status]?.cls)}>
                  {STATUS_META[selected.status]?.label}
                </span>
              </div>

              {/* Transcript */}
              <div className="px-5 py-4 max-h-80 overflow-y-auto space-y-2.5">
                {(detail?.transcript || []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No conversation recorded.</p>
                )}
                {(detail?.transcript || []).map((m, i) => {
                  const isBot = m.role === "assistant";
                  return (
                    <div key={i} className={cn("flex", isBot ? "justify-start" : "justify-end")}>
                      <div className={cn(
                        "max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap",
                        isBot ? "bg-foreground/5 border border-border/50" : "bg-emerald/15 border border-emerald/20"
                      )}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-border/60 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Resolution note</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    placeholder="Add an internal note (visible to admins)…"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-emerald resize-none"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => updateStatus("in_review")}
                    disabled={saving || selected.status === "in_review"}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition disabled:opacity-50"
                  >
                    <Clock className="h-4 w-4" /> Mark In Review
                  </button>
                  <button
                    onClick={() => updateStatus("resolved")}
                    disabled={saving || selected.status === "resolved"}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald text-white text-sm font-medium hover:bg-emerald/90 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {selected.status === "resolved" ? "Resolved" : "Resolve"}
                  </button>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back to list
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}