import { useState, useEffect } from "react";
import { Mosaic } from "react-loading-indicators";
import { ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

const ROLE_LABELS = {
  super_admin: "Platform Administrator",
  operations_admin: "Operation Manager",
  moderator: "Community Manager",
  counsellor: "Support and Counselling Manager",
};

const ROLE_OPTIONS = [
  { value: "operations_admin", label: "Operation Manager" },
  { value: "moderator", label: "Community Manager" },
  { value: "counsellor", label: "Support and Counselling Manager" },
];

export default function AdminRoles() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  function fetchRoles() {
    setLoading(true);
    api.adminRoles()
      .then(data => setAdmins(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRoles(); }, []);

  async function handleRoleChange(p, role) {
    if (role === p.role || !role) return;
    if (!confirm(`Change ${p.email} to ${ROLE_LABELS[role] || role}?`)) return;
    setSavingId(p.id);
    try {
      await api.adminAssignRole({ user_id: p.user, role });
      fetchRoles();
    } catch (err) {
      alert(err.data?.error || err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemove(p) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;
    if (!confirm(`Remove administrator access for ${name}? They will keep their regular account.`)) return;
    try {
      await api.adminRemoveRole(p.user);
      fetchRoles();
    } catch (err) {
      alert(err.data?.error || err.message);
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
        title="Roles"
        description="Manage administrator roles and access"
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 pt-3 pl-5">Administrator</th>
                <th className="pb-3 pt-3">Role</th>
                <th className="pb-3 pt-3 hidden sm:table-cell">Department</th>
                <th className="pb-3 pt-3">Status</th>
                <th className="pb-3 pt-3 hidden md:table-cell">Last Login</th>
                <th className="pb-3 pt-3 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">No administrators found.</td></tr>
              ) : admins.map((p, i) => (
                <tr key={p.id} className={cn("transition-colors hover:bg-muted/30", i < admins.length - 1 && "border-b border-border/30")}>
                  <td className="py-3.5 pl-5">
                    <div className="font-medium">{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="py-3.5">
                    {p.role === "super_admin" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <ShieldCheck className="h-3.5 w-3.5" /> {ROLE_LABELS[p.role] || p.role}
                      </span>
                    ) : (
                      <select
                        value={p.role}
                        disabled={savingId === p.id}
                        onChange={e => handleRoleChange(p, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs font-medium outline-none focus:border-primary disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-3.5 hidden sm:table-cell text-muted-foreground text-xs capitalize">{p.department || "—"}</td>
                  <td className="py-3.5">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", p.is_active ? "text-emerald-500" : "text-muted-foreground")}>
                      <span className={cn("h-2 w-2 rounded-full", p.is_active ? "bg-emerald-500" : "bg-muted-foreground")} />
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3.5 hidden md:table-cell text-muted-foreground text-xs">{p.last_login ? new Date(p.last_login).toLocaleString() : "—"}</td>
                  <td className="py-3.5 text-right pr-5">
                    {p.role !== "super_admin" && (
                      <button onClick={() => handleRemove(p)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition" title="Remove administrator access">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
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
