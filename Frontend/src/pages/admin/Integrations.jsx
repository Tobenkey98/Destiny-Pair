import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { Puzzle, Save, Plug, Loader2, CheckCircle2, XCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

const GROUP_META = {
  flutterwave: { title: "Flutterwave Payments", desc: "Card payments, transfers and webhooks for subscriptions." },
  email: { title: "Email (SMTP)", desc: "Outgoing mail used for verification and notifications." },
  cloudinary: { title: "Cloudinary Media", desc: "Image and video storage for profile photos." },
  sightengine: { title: "SightEngine Moderation", desc: "Automatic screening of uploaded profile photos." },
  chatbot: { title: "AI Chatbot", desc: "OpenAI-compatible assistant used in the support widget." },
  "social-login": { title: "Social Login", desc: "Google and Facebook sign-in configuration." },
  site: { title: "Site", desc: "General site settings." },
};

const GROUP_ORDER = ["flutterwave", "email", "cloudinary", "sightengine", "chatbot", "social-login", "site"];

export default function AdminIntegrations() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [draft, setDraft] = useState({});
  const [reveal, setReveal] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.adminIntegrations()
      .then(data => setEntries(data.integrations || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function setValue(key, value) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const changed = Object.keys(draft).filter(k => draft[k] !== undefined);
    if (changed.length === 0) {
      setNotice({ kind: "warn", text: "No changes to save." });
      return;
    }
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const payload = {};
      for (const k of changed) payload[k] = draft[k];
      const data = await api.adminUpdateIntegrations(payload);
      const envNote = data.env_updated ? "" : data.note;
      setNotice({
        kind: "ok",
        text: envNote || "Integrations saved. Changes apply immediately and were written to the server's .env file.",
      });
      setDraft({});
      setEntries(data.integrations || entries);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await api.adminTestFlutterwave();
      setTestResult({ ok: data.ok, detail: data.detail });
    } catch (err) {
      setTestResult({ ok: false, detail: err.message });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Mosaic color="var(--admin-loader)" size="medium" text="" textColor="" />
      </div>
    );
  }

  const grouped = GROUP_ORDER
    .map(g => ({ key: g, meta: GROUP_META[g], items: entries.filter(e => e.group === g) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Third-party connections, live test result and immediate effect"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}
      {notice && (
        <div className={cn("p-4 rounded-xl border text-sm", notice.kind === "ok" ? "bg-success/10 border-success/30 text-success" : "bg-warning/10 border-warning/30 text-warning")}>
          {notice.text}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold">Flutterwave connection test</h3>
            <p className="text-xs text-muted-foreground mt-1">Fetches an access token with the current credentials to verify the whole payment setup (sandbox vs live).</p>
          </div>
          {testResult && (
            <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold", testResult.ok ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive")}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.detail}
            </div>
          )}
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition disabled:opacity-50 shrink-0"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Test Flutterwave
          </button>
        </div>
      </motion.div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <motion.section
            key={group.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Puzzle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold leading-none">{group.meta.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{group.meta.desc}</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {group.items.map((e) => {
                const isSecret = e.is_secret;
                const value = draft[e.key] !== undefined ? draft[e.key] : e.value;
                const showReveal = isSecret && reveal[e.key];
                return (
                  <div key={e.key} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{e.label}</p>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{e.key}</span>
                        {e.source === "database" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">edited</span>}
                        {e.source === "env" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">from config</span>}
                      </div>
                      {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 md:w-[360px] shrink-0">
                      <div className="relative flex-1">
                        <input
                          type={showReveal ? "text" : isSecret ? "password" : "text"}
                          value={value ?? ""}
                          onChange={(e2) => setValue(e.key, e2.target.value)}
                          placeholder={isSecret ? "Enter new value to replace" : "Enter value"}
                          className="w-full h-9 px-3 pr-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {isSecret && (
                          <button
                            type="button"
                            onClick={() => setReveal(prev => ({ ...prev, [e.key]: !prev[e.key] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Toggle visibility"
                          >
                            {showReveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      {isSecret && <span className="text-[10px] text-muted-foreground w-12 shrink-0">masked</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={load} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition">
          <RefreshCw className="h-4 w-4" />
          Reload from server
        </button>
      </div>
    </div>
  );
}