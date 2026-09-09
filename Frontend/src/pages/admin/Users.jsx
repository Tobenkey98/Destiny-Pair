import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Mosaic } from "react-loading-indicators";
import {
  Search,
  Check, X, Circle,
  Ban, Trash2, Undo2, Download,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { PageHeader } from "../../components/admin/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

export default function AdminUsers() {
  const { adminProfile, hasRole } = useAdmin();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isModerator = hasRole('moderator');

  function fetchUsers() {
    api.adminUsers({ limit: 50 })
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = Array.isArray(users) ? users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.first_name || '').toLowerCase().includes(q) ||
      (u.last_name || '').toLowerCase().includes(q)
    );
  }) : [];

  const isBlocked = (u) => !u.is_active || u.is_banned;

  async function handleBlock(u) {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
    if (!confirm(`Block ${name}? They will be signed out and unable to use their account.`)) return;
    try {
      await api.adminSuspendUser(u.id);
      fetchUsers();
    } catch (err) {
      alert(err.data?.error || err.message);
    }
  }

  async function handleUnblock(u) {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
    if (!confirm(`Unblock ${name}? Their account will be active again.`)) return;
    try {
      await api.adminReinstateUser(u.id);
      fetchUsers();
    } catch (err) {
      alert(err.data?.error || err.message);
    }
  }

  async function handleDelete(u) {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
    if (!confirm(`Delete ${name} permanently? All of their data (photos, matches, messages, payments history) will be removed. This cannot be undone.`)) return;
    try {
      await api.adminDeleteUser(u.id);
      fetchUsers();
    } catch (err) {
      alert(err.data?.error || err.message);
    }
  }

  function handleExport() {
    const headers = ["Name", "Email", "Phone", "Gender", "City/State", "Status", "Verified", "Date Joined", "Last Login"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const statusOf = (u) => (u.is_banned ? "Banned" : u.is_active ? "Active" : "Inactive");
    const rows = filtered.map((u) => [
      `${u.first_name || ""} ${u.last_name || ""}`.trim(),
      u.email || "",
      u.phone || "",
      u.gender || "",
      u.city_state || "",
      statusOf(u),
      u.is_verified ? "Yes" : "No",
      u.date_joined ? new Date(u.date_joined).toLocaleString() : "",
      u.last_login ? new Date(u.last_login).toLocaleString() : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    a.href = url;
    a.download = `destinypair-users-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
        title="Users"
        description={isModerator ? "Review user profiles and activity" : "Manage all registered users"}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isModerator && (
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  {["User", "Online", "Email", "Status", "Verified", "Last Login", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {search ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                )}
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u.id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b last:border-0 hover:bg-muted/30 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {u.first_name || ''} {u.last_name || ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", u.is_online ? "text-emerald-500" : "text-muted-foreground")}>
                        <Circle className={cn("h-2 w-2 fill-current", u.is_online ? "text-emerald-500" : "text-muted-foreground")} />
                        {u.is_online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.is_active ? (u.is_banned ? "destructive" : "success") : "secondary"}>
                        {u.is_banned ? "Banned" : u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_verified ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isBlocked(u) ? (
                          <button onClick={() => handleUnblock(u)} className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition" title="Unblock user">
                            <Undo2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleBlock(u)} className="h-8 w-8 rounded-lg hover:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 transition" title="Block user">
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        {!isModerator && (
                          <button onClick={() => handleDelete(u)} className="h-8 w-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-red-500 transition" title="Delete user permanently">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
