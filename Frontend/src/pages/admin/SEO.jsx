import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { Search, Save, Loader2, Eye } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/admin/page-header";

const FIELDS = [
  { key: "site_title", label: "Site title (browser tab)", hint: "Shown as the page <title> across the site." },
  { key: "tagline", label: "Tagline / subtitle", hint: "Short faith-focused line used in SEO copy." },
  { key: "description", label: "Meta description", hint: "The snippet search engines show under your result (ideally 150–160 characters)." },
  { key: "keywords", label: "Meta keywords", hint: "Comma-separated keywords." },
  { key: "og_title", label: "Open Graph title", hint: "Title shown when a page is shared on Facebook/WhatsApp." },
  { key: "og_description", label: "Open Graph description", hint: "Description shown when the site is shared." },
  { key: "og_image", label: "Open Graph image URL", hint: "Absolute URL to the share preview image (e.g. https://destinypair.net/og.png)." },
  { key: "canonical_url", label: "Canonical URL", hint: "The preferred version of your homepage for search engines." },
  { key: "google_analytics_id", label: "Google Analytics ID", hint: "e.g. G-XXXXXXXXXX. Injects the GA4 script on the live site." },
  { key: "google_site_verification", label: "Google Site Verification", hint: "Content of the Google Search Console verification meta tag." },
];

export default function AdminSEO() {
  const [values, setValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.adminSeo()
      .then(setValues)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const payload = {};
      for (const f of FIELDS) payload[f.key] = values[f.key] ?? "";
      if (values.robots) payload.robots = values.robots;
      await api.adminUpdateSeo(payload);
      setNotice("SEO settings saved. They take effect on the live site immediately.");
    } catch (err) {
      setError(err.message);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO"
        description="Search engine optimization and social sharing metadata"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition">
              <Eye className="h-4 w-4" /> Reload
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save SEO settings
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}
      {notice && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm">{notice}</div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-4 text-sm">
        <p className="flex items-start gap-2 text-muted-foreground">
          <Search className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <span>The live website reads these from <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/api/seo/</code> and applies them to the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&lt;head&gt;</code> of every public page. Changes go live as soon as you save.</span>
        </p>
      </motion.div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h3 className="font-display font-semibold">Homepage metadata</h3>
          <p className="text-xs text-muted-foreground mt-1">Search engines and social platforms read these fields.</p>
        </div>
        <div className="p-5 space-y-5">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid md:grid-cols-3 gap-3 md:items-start">
              <div>
                <label className="text-sm font-medium">{f.label}</label>
                <p className="text-[11px] text-muted-foreground mt-0.5">{f.hint}</p>
              </div>
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={values?.[f.key] ?? ""}
                  onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          ))}

          <div className="grid md:grid-cols-3 gap-3 md:items-start">
            <div>
              <label className="text-sm font-medium">Robots policy</label>
              <p className="text-[11px] text-muted-foreground mt-0.5">Whom search engines may crawl. Leave as <b>index, follow</b>.</p>
            </div>
            <div className="md:col-span-2">
              <select
                value={values?.robots || "index, follow"}
                onChange={(e) => setValues(v => ({ ...v, robots: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="index, follow">index, follow</option>
                <option value="noindex, follow">noindex, follow</option>
                <option value="index, nofollow">index, nofollow</option>
                <option value="noindex, nofollow">noindex, nofollow</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save SEO settings
      </button>
    </div>
  );
}