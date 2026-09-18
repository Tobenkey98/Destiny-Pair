import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { FileText, Plus, Pencil, Trash2, X, Save, Loader2, Star, ImagePlus, Eye } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

const CATEGORY_META = {
  devotional: { label: "Devotional", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
  article: { label: "Article", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25" },
  blog: { label: "Blog post", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" },
};
const STATUS_META = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
  published: { label: "Published", cls: "bg-success/10 text-success border-success/25" },
  archived: { label: "Archived", cls: "bg-destructive/10 text-destructive border-destructive/25" },
};

const EMPTY = { title: "", category: "devotional", excerpt: "", body: "", author_name: "", status: "draft", featured: false, cover_image: null };

function timeShort(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function AdminContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.adminContent()
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function startCreate() {
    setForm(EMPTY);
    setEditing("new");
  }

  function startEdit(item) {
    setForm({
      title: item.title || "",
      category: item.category || "devotional",
      excerpt: item.excerpt || "",
      body: item.body || "",
      author_name: item.author_name || "",
      status: item.status || "draft",
      featured: !!item.featured,
      cover_image: null,
    });
    setEditing(item.id);
  }

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("excerpt", form.excerpt || "");
      fd.append("body", form.body || "");
      fd.append("author_name", form.author_name || "");
      fd.append("status", form.status);
      fd.append("featured", form.featured ? "true" : "false");
      if (form.cover_image) fd.append("cover_image", form.cover_image);
      if (editing === "new") {
        await api.adminCreateContent(fd);
      } else {
        await api.adminUpdateContent(editing, fd);
      }
      setNotice(editing === "new" ? "Content item created." : "Content item updated.");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await api.adminDeleteContent(item.id);
      setNotice("Content item deleted.");
      setItems(items => items.filter(i => i.id !== item.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
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
        title="Content"
        description="Blog posts, devotionals and articles shown on the public site"
        actions={
          editing === null ? (
            <button onClick={startCreate} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
              <Plus className="h-4 w-4" /> New item
            </button>
          ) : null
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}
      {notice && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm">{notice}</div>
      )}

      <AnimatePresence>
        {editing !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <h3 className="font-display font-semibold">{editing === "new" ? "New content item" : "Edit content item"}</h3>
              <button onClick={() => setEditing(null)} className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-5 grid lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <input value={form.title} onChange={(e) => update("title", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Category</label>
                    <select value={form.category} onChange={(e) => update("category", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="devotional">Devotional</option>
                      <option value="article">Article</option>
                      <option value="blog">Blog post</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Status</label>
                    <select value={form.status} onChange={(e) => update("status", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Author</label>
                  <input value={form.author_name} onChange={(e) => update("author_name", e.target.value)} placeholder="e.g. Rev. Bola Olorunsanmi" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Cover image</label>
                  <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border border-dashed border-border hover:bg-muted/30 cursor-pointer transition">
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{form.cover_image ? form.cover_image.name : "Click to upload (JPG/PNG)"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => update("cover_image", e.target.files?.[0] || null)} />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} className="h-4 w-4 rounded border-border" />
                  <Star className={cn("h-4 w-4", form.featured ? "text-gold fill-gold" : "text-muted-foreground")} />
                  Feature this item
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Excerpt (short summary)</label>
                  <textarea value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Body content</label>
                  <textarea value={form.body} onChange={(e) => update("body", e.target.value)} rows={10} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" placeholder="Write the full text here…" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => setEditing(null)} className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing === "new" ? "Publish" : "Save changes"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 && editing === null ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border bg-card">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold">No content yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Publish your first devotional, article or blog post.</p>
          <button onClick={startCreate} className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" /> New item
          </button>
        </div>
      ) : items.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Published</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(i => {
                  const cm = CATEGORY_META[i.category] || CATEGORY_META.devotional;
                  const sm = STATUS_META[i.status] || STATUS_META.draft;
                  return (
                    <motion.tr key={i.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 max-w-[320px]">
                          {i.cover_image_url ? (
                            <img src={i.cover_image_url} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate flex items-center gap-1.5">{i.title} {i.featured && <Star className="h-3 w-3 text-gold fill-gold shrink-0" />}</p>
                            <p className="text-[10px] text-muted-foreground truncate">/{i.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", cm.cls)}>{cm.label}</span></td>
                      <td className="px-4 py-3"><span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", sm.cls)}>{sm.label}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{timeShort(i.published_at)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{timeShort(i.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => window.open(`/publications`, "_blank")} title="View on site" className="h-7 w-7 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => startEdit(i)} title="Edit" className="h-7 w-7 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDelete(i)} disabled={deletingId === i.id} title="Delete" className="h-7 w-7 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center justify-center transition disabled:opacity-50">
                            {deletingId === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}