import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { MessageSquare, Mic, Search, RefreshCw, Mail, Inbox, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/admin/page-header";
import { StatCard } from "../../components/admin/stat-card";
import { Badge } from "../../components/ui/badge";
import { api } from "../../lib/api";

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function convTitle(conv) {
  const parts = (conv.participants || []).map((p) => p.name || p.email || `User #${p.id}`);
  return parts.length > 0 ? parts.join(" ↔ ") : "Unknown";
}

export default function AdminMessages() {
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function fetchConversations() {
    setLoading(true);
    setError("");
    api.adminConversations()
      .then((data) => {
        setConversations(data.conversations || []);
        setTotal(data.total || 0);
      })
      .catch((err) => setError(err.message || "Failed to load conversations"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchConversations(); }, []);

  function openThread(conv) {
    setSelected(conv);
    setThread(null);
    setThreadLoading(true);
    api.adminConversationMessages(conv.id)
      .then((data) => setThread(data))
      .catch((err) => setThread({ error: err.message || "Failed to load messages" }))
      .finally(() => setThreadLoading(false));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => (
      (c.participants || []).some((p) =>
        `${p.name || ""} ${p.email || ""}`.toLowerCase().includes(q)
      ) ||
      `${(c.last_message || {}).text || ""}`.toLowerCase().includes(q)
    ));
  }, [conversations, search]);

  const totalMessages = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.message_count || 0), 0),
    [conversations]
  );
  const activeToday = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return conversations.filter((c) => new Date(c.updated_at).getTime() > cutoff).length;
  }, [conversations]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Every user-to-user conversation across the platform — review chat threads for moderation and support"
        actions={[
          <button key="refresh" onClick={fetchConversations} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>,
        ]}
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard label="Conversations" value={String(total || 0)} icon={Inbox} color="primary" />
        <StatCard label="Messages Sent" value={totalMessages.toLocaleString()} icon={MessageSquare} color="info" />
        <StatCard label="Active (24h)" value={String(activeToday)} icon={Mail} color="success" />
      </div>

      {error && !loading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* Conversation list */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-background overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email or message…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
              {loading ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Loading conversations…</p>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{search ? "No conversations match your search." : "No user conversations yet."}</p>
                </div>
              ) : (
                filtered.map((conv) => {
                  const isSelected = selected?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => openThread(conv)}
                      className={`w-full text-left p-4 transition hover:bg-muted/40 ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex -space-x-2 shrink-0">
                          {(conv.participants || []).slice(0, 2).map((p) => (
                            p.photo ? (
                              <img key={p.id} src={p.photo} alt={p.name} className="h-9 w-9 rounded-full border-2 border-background object-cover" />
                            ) : (
                              <div key={p.id} className="h-9 w-9 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                {(p.name || p.email || "?")[0]?.toUpperCase()}
                              </div>
                            )
                          ))}
                          {(conv.participants || []).slice(2).map((p) => (
                            <div key={p.id} className="h-9 w-9 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                              {(p.name || "?")[0]?.toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold truncate">{convTitle(conv)}</span>
                            <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(conv.updated_at)}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            {conv.last_message ? (
                              <span className="text-xs text-muted-foreground truncate">
                                <span className="font-medium text-foreground/70">{conv.last_message.sender_name}:</span>{" "}
                                {conv.last_message.text}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No messages</span>
                            )}
                            <Badge variant="outline" className="text-[10px] shrink-0">{conv.message_count}</Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>

        {/* Thread viewer */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-3"
        >
          <div className="rounded-2xl border border-border bg-background overflow-hidden min-h-[60vh] flex flex-col">
            <div className="p-4 border-b border-border bg-muted/20">
              {selected ? (
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="font-display font-bold truncate">{convTitle(selected)}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conversation #{selected.id} · {selected.message_count} messages
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a conversation to view its full thread.</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[55vh]">
              {threadLoading ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Loading thread…</p>
              ) : thread?.error ? (
                <p className="p-8 text-center text-sm text-destructive">{thread.error}</p>
              ) : !selected ? (
                <div className="h-full flex items-center justify-center text-muted-foreground/50">
                  <Inbox className="h-10 w-10" />
                </div>
              ) : thread && thread.messages.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No messages in this conversation.</p>
              ) : (
                (thread?.messages || []).map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-[85%]"
                  >
                    <div className="rounded-2xl rounded-tl-sm bg-muted/50 border border-border px-4 py-2.5">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-[11px] font-bold text-primary">{m.sender_name}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                      {m.has_audio && m.audio && (
                        <audio controls src={m.audio} className="mt-2 w-full max-w-sm h-9" preload="metadata" />
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        {m.has_audio && <Mic className="h-3 w-3 text-muted-foreground/60" />}
                        <span className={`text-[10px] ${m.is_read ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          {m.is_read ? "Read" : "Unread"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}