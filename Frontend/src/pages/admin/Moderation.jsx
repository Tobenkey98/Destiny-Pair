import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Check, X, RotateCcw, ImageIcon, Flag, Ban } from "lucide-react";
import { PageHeader } from "../../components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";

const TABS = [
  { key: "photos", label: "Photo Approvals", icon: ImageIcon },
  { key: "reports", label: "Member Reports", icon: Flag },
  { key: "bans", label: "Banned Users", icon: Ban },
];

export default function AdminModeration() {
  const [data, setData] = useState({ pending_photos: [], reports: [], banned_users: [] });
  const [tab, setTab] = useState("photos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.adminModeration()
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load moderation queue"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const actOnPhoto = async (photoId, action) => {
    try {
      await api.adminApprovePhoto(photoId, action);
      load();
    } catch (err) {
      setError(err.message || "Could not update photo");
    }
  };

  const reinstate = async (userId) => {
    try {
      await api.adminReinstateUser(userId);
      load();
    } catch (err) {
      setError(err.message || "Could not reinstate user");
    }
  };

  const { pending_photos: photos, reports, banned_users: banned } = data;

  return (
    <div className="space-y-6">
      <PageHeader title="Moderation" description="Review reported content and enforce community guidelines" />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count =
            t.key === "photos" ? photos.length :
            t.key === "reports" ? reports.length :
            banned.length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-background"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Loading moderation queue…</CardContent></Card>
      ) : tab === "photos" ? (
        photos.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-emerald/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No photos waiting for review. All caught up!</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    <img src={p.image} alt="User photo" className="h-full w-full object-cover" />
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{p.user_name}</p>
                      {p.is_ai_generated && <Badge variant="warning">AI Check</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="flex-1" onClick={() => actOnPhoto(p.id, "approve")}>
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => actOnPhoto(p.id, "reject")}>
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      ) : tab === "reports" ? (
        reports.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Flag className="h-10 w-10 text-emerald/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No member reports at the moment.</p>
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border">
              {reports.map((r) => (
                <div key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    {(r.reporter_name || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{r.reporter_name}</span>
                      <span className="text-xs text-muted-foreground">reported</span>
                      <span className="text-sm font-medium">{r.reported_name}</span>
                      <Badge variant="destructive">{r.reason}</Badge>
                    </div>
                    {r.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3">{r.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => api.adminBanUser(r.reported_user_id).then(load).catch((e) => setError(e.message))}
                    >
                      Ban user
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => api.adminSuspendUser(r.reported_user_id).then(load).catch((e) => setError(e.message))}
                    >
                      Suspend
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      ) : (
        banned.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Ban className="h-10 w-10 text-emerald/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No banned users.</p>
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Banned Users</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border">
              {banned.map((u) => (
                <div key={u.id} className="py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold shrink-0">
                    {(u.name || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => reinstate(u.id)}>
                    <RotateCcw className="h-4 w-4" /> Reinstate
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
