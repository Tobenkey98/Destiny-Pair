import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { Plus, X, CheckCircle, XCircle, Edit2, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

export default function AdminDenominations() {
  const [denominations, setDenominations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editItem, setEditItem] = useState(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalResult, setModalResult] = useState(null);

  function fetchDenominations() {
    api.adminDenominations()
      .then(data => setDenominations(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchDenominations(); }, []);

  function openCreate() {
    setModalMode("create");
    setEditItem(null);
    setFormName("");
    setModalResult(null);
    setShowModal(true);
  }

  function openEdit(d) {
    setModalMode("edit");
    setEditItem(d);
    setFormName(d.name);
    setModalResult(null);
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    setModalResult(null);
    try {
      if (modalMode === "create") {
        await api.adminCreateDenomination({ name: formName.trim() });
        setModalResult({ success: true, message: "Denomination created." });
      } else {
        await api.adminUpdateDenomination(editItem.id, { name: formName.trim() });
        setModalResult({ success: true, message: "Denomination updated." });
      }
      setFormName("");
      setTimeout(() => { setShowModal(false); fetchDenominations(); }, 800);
    } catch (err) {
      setModalResult({ success: false, message: err.data?.error?.[0] || err.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(d) {
    if (!confirm(`${d.is_active ? 'Deactivate' : 'Activate'} "${d.name}"?`)) return;
    try {
      await api.adminDeleteDenomination(d.id);
      fetchDenominations();
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
        title="Denominations"
        description="Manage Christian denominations"
        actions={
          <button onClick={openCreate} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" /> Add Denomination
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 pt-3 pl-5">Name</th>
                <th className="pb-3 pt-3 hidden sm:table-cell">Slug</th>
                <th className="pb-3 pt-3">Approved</th>
                <th className="pb-3 pt-3">Active</th>
                <th className="pb-3 pt-3 hidden md:table-cell">Created</th>
                <th className="pb-3 pt-3 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {denominations.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">No denominations found.</td></tr>
              ) : denominations.map((d, i) => (
                <tr key={d.id} className={cn("transition-colors hover:bg-muted/30", i < denominations.length - 1 && "border-b border-border/30")}>
                  <td className="py-3.5 pl-5 font-medium">{d.name}</td>
                  <td className="py-3.5 hidden sm:table-cell text-muted-foreground text-xs">{d.slug}</td>
                  <td className="py-3.5">
                    {d.approved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        <XCircle className="h-3 w-3" /> Unapproved
                      </span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", d.is_active ? "text-emerald-500" : "text-muted-foreground")}>
                      <span className={cn("h-2 w-2 rounded-full", d.is_active ? "bg-emerald-500" : "bg-muted-foreground")} />
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3.5 hidden md:table-cell text-muted-foreground text-xs">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</td>
                  <td className="py-3.5 text-right pr-5">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleToggleActive(d)} className={cn("p-1.5 rounded-lg transition", d.is_active ? "text-red-500 hover:bg-red-500/10" : "text-emerald-500 hover:bg-emerald-500/10")} title={d.is_active ? "Deactivate" : "Activate"}>
                        {d.is_active ? <Trash2 className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border bg-card shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">{modalMode === "create" ? "Add Denomination" : "Edit Denomination"}</h2>
                  <p className="text-xs text-muted-foreground">{modalMode === "create" ? "Create a new denomination entry" : "Update the denomination name"}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {modalResult && (
                <div className={cn("mb-4 p-3 rounded-xl text-sm text-center", modalResult.success ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/30")}>
                  {modalResult.message}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Denomination Name</label>
                  <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder="e.g. Catholic" />
                </div>
                <button type="submit" disabled={saving || !formName.trim()} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {saving ? "Saving..." : (modalMode === "create" ? "Create" : "Update")}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
