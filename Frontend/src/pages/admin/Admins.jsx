import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { Shield, Plus, X, Mail, Send, Clock, CheckCircle, XCircle, UserCheck, Circle, Ban } from "lucide-react";
import { api } from "../../lib/api";
import { useAdmin } from "../../context/AdminContext";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";
import { PageHeader } from "../../components/admin/page-header";

const ROLE_OPTIONS = [
  { value: "operations_admin", label: "Operations Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "counsellor", label: "Counsellor" },
];

export default function AdminAdmins() {
  const { adminProfile } = useAdmin();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "operations_admin", department: "" });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const isSuperAdmin = adminProfile?.role === "super_admin";

  function fetchAdmins() {
    api.adminRoles()
      .then(setAdmins)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchAdmins(); }, []);

  useEffect(() => {
    const interval = setInterval(fetchAdmins, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleBlockUnblock(a) {
    if (!confirm(`${a.is_active ? 'Block' : 'Unblock'} ${a.email || a.first_name}?`)) return;
    try {
      await api.adminBlockUnblock(a.user);
      fetchAdmins();
    } catch (err) {
      alert(err.data?.error || err.message);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const data = await api.adminInvitations(inviteForm);
      setInviteResult({ success: true, message: `Invitation sent to ${inviteForm.email}` });
      setInviteForm({ email: "", role: "operations_admin", department: "" });
      setTimeout(() => setShowInvite(false), 1500);
    } catch (err) {
      setInviteResult({ success: false, message: err.data?.error || err.message });
    } finally {
      setInviting(false);
    }
  }

  const roleColors = {
    super_admin: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
    operations_admin: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
    moderator: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
    counsellor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  };

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
        title="Admin Management"
        description="Manage administrative accounts and permissions"
        actions={isSuperAdmin ? (
          <button onClick={() => { setShowInvite(true); setInviteResult(null); }} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" /> Invite Admin
          </button>
        ) : null}
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 pt-3 pl-5">Admin</th>
                <th className="pb-3 pt-3">Online</th>
                <th className="pb-3 pt-3">Role</th>
                <th className="pb-3 pt-3 hidden sm:table-cell">Department</th>
                <th className="pb-3 pt-3 hidden md:table-cell">Status</th>
                <th className="pb-3 pt-3 text-right pr-5">Joined</th>
                {isSuperAdmin && <th className="pb-3 pt-3 text-right pr-5">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr><td colSpan={isSuperAdmin ? 7 : 6} className="py-16 text-center text-sm text-muted-foreground">No administrators found.</td></tr>
              ) : admins.map((a, i) => (
                <tr key={a.id || a.user} className={cn("transition-colors hover:bg-muted/30", i < admins.length - 1 && "border-b border-border/30")}>
                  <td className="py-3.5 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {(a.first_name || a.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium block">{a.first_name || a.email?.split("@")[0]}</span>
                        <span className="text-[10px] text-muted-foreground">{a.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", a.is_online ? "text-emerald-500" : "text-muted-foreground")}>
                      <Circle className={cn("h-2 w-2 fill-current", a.is_online ? "text-emerald-500" : "text-muted-foreground")} />
                      {a.is_online ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold capitalize border", roleColors[a.role] || "")}>
                      {a.role?.replace("_", " ") || "—"}
                    </Badge>
                  </td>
                  <td className="py-3.5 hidden sm:table-cell text-muted-foreground capitalize">{a.department || "—"}</td>
                  <td className="py-3.5 hidden md:table-cell">
                    {a.is_approved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right pr-5 text-muted-foreground text-xs">{a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}</td>
                  {isSuperAdmin && a.role !== "super_admin" && (
                    <td className="py-3.5 text-right pr-5">
                      <button
                        onClick={() => handleBlockUnblock(a)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition",
                          a.is_active
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        )}
                      >
                        <Ban className="h-3 w-3" />
                        {a.is_active ? "Block" : "Unblock"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowInvite(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border bg-card shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Invite Admin</h2>
                    <p className="text-xs text-muted-foreground">Send an invitation to join the admin panel</p>
                  </div>
                </div>
                <button onClick={() => setShowInvite(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {inviteResult && (
                <div className={cn("mb-4 p-3 rounded-xl text-sm text-center", inviteResult.success ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/30")}>
                  {inviteResult.message}
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email</label>
                  <input type="email" required value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder="admin@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Role</label>
                  <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm">
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Department</label>
                  <select value={inviteForm.department} onChange={e => setInviteForm(f => ({ ...f, department: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm">
                    <option value="">Select department</option>
                    <option value="management">Management</option>
                    <option value="operations">Operations</option>
                    <option value="moderation">Moderation</option>
                    <option value="counselling">Counselling</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <button type="submit" disabled={inviting} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {inviting ? "Sending..." : <><Send className="h-4 w-4" /> Send Invitation</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
