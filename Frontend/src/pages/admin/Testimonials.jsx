import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { Plus, X, Edit2, Trash2, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editItem, setEditItem] = useState(null);
  const [formQuote, setFormQuote] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalResult, setModalResult] = useState(null);

  function fetchTestimonials() {
    api.adminTestimonials()
      .then(data => setTestimonials(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchTestimonials(); }, []);

  function openCreate() {
    setModalMode("create");
    setEditItem(null);
    setFormQuote("");
    setFormName("");
    setFormLocation("");
    setModalResult(null);
    setShowModal(true);
  }

  function openEdit(t) {
    setModalMode("edit");
    setEditItem(t);
    setFormQuote(t.quote);
    setFormName(t.name);
    setFormLocation(t.location || "");
    setModalResult(null);
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formQuote.trim() || !formName.trim()) return;
    setSaving(true);
    setModalResult(null);
    try {
      const payload = { quote: formQuote.trim(), name: formName.trim(), location: formLocation.trim() };
      if (modalMode === "create") {
        await api.adminCreateTestimonial(payload);
        setModalResult({ success: true, message: "Testimonial created." });
      } else {
        await api.adminUpdateTestimonial(editItem.id, payload);
        setModalResult({ success: true, message: "Testimonial updated." });
      }
      setTimeout(() => { setShowModal(false); fetchTestimonials(); }, 800);
    } catch (err) {
      setModalResult({ success: false, message: err.data?.error?.[0] || err.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(t) {
    if (!confirm(`${t.is_active ? 'Deactivate' : 'Activate'} this testimonial?`)) return;
    try {
      await api.adminActivateTestimonial(t.id);
      fetchTestimonials();
    } catch (err) {
      alert(err.data?.error || err.message);
    }
  }

  async function handleDelete(t) {
    if (!confirm(`Delete this testimonial from "${t.name}" permanently?`)) return;
    try {
      await api.adminDeleteTestimonial(t.id);
      fetchTestimonials();
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
        title="Testimonials"
        description="Manage customer testimonials shown on the home page"
        actions={
          <button onClick={openCreate} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" /> Add Testimonial
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
                <th className="pb-3 pt-3 pl-5">Quote</th>
                <th className="pb-3 pt-3">Name</th>
                <th className="pb-3 pt-3 hidden sm:table-cell">Location</th>
                <th className="pb-3 pt-3">Active</th>
                <th className="pb-3 pt-3 hidden md:table-cell">Created</th>
                <th className="pb-3 pt-3 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">No testimonials found. Add one to show it on the home page.</td></tr>
              ) : testimonials.map((t, i) => (
                <tr key={t.id} className={cn("transition-colors hover:bg-muted/30", i < testimonials.length - 1 && "border-b border-border/30")}>
                  <td className="py-3.5 pl-5 max-w-[320px]"><span className="line-clamp-2 italic text-muted-foreground">&ldquo;{t.quote}&rdquo;</span></td>
                  <td className="py-3.5 whitespace-nowrap font-medium">{t.name}</td>
                  <td className="py-3.5 hidden sm:table-cell text-muted-foreground text-xs">{t.location || "—"}</td>
                  <td className="py-3.5">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", t.is_active ? "text-emerald-500" : "text-muted-foreground")}>
                      <span className={cn("h-2 w-2 rounded-full", t.is_active ? "bg-emerald-500" : "bg-muted-foreground")} />
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3.5 hidden md:table-cell text-muted-foreground text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
                  <td className="py-3.5 text-right pr-5">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleToggleActive(t)} className={cn("p-1.5 rounded-lg transition", t.is_active ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10")} title={t.is_active ? "Deactivate" : "Activate"}>
                        {t.is_active ? <RefreshCw className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
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
              className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">{modalMode === "create" ? "Add Testimonial" : "Edit Testimonial"}</h2>
                  <p className="text-xs text-muted-foreground">{modalMode === "create" ? "Create a new testimonial" : "Update the testimonial details"}</p>
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
                  <label className="block text-sm font-semibold mb-1.5">Testimonial Quote</label>
                  <textarea required value={formQuote} onChange={e => setFormQuote(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder="Their story, in their words..." />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Name</label>
                    <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder="e.g. Adaeze & Kelechi" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Location</label>
                    <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder="e.g. Lagos &bull; Christian Union" />
                  </div>
                </div>
                <button type="submit" disabled={saving || !formQuote.trim() || !formName.trim()} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
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
