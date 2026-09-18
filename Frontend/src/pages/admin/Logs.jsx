import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { ScrollText, FileText, RefreshCw, ChevronDown, Loader2, AlertTriangle } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { PageHeader } from "../../components/admin/page-header";

const LEVEL_STYLES = {
  ERROR: "text-destructive",
  CRITICAL: "text-destructive",
  WARNING: "text-warning",
  INFO: "text-info",
  DEBUG: "text-muted-foreground",
};

function levelOf(line) {
  for (const lv of ["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"]) {
    if (line.toUpperCase().includes(lv)) return lv;
  }
  return null;
}

export default function AdminLogs() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openPath, setOpenPath] = useState("");
  const [lines, setLines] = useState([]);
  const [activeName, setActiveName] = useState("");
  const [viewLoading, setViewLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.adminLogs()
      .then(data => setFiles(data.files || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openFile(file) {
    if (openPath === file.path) return;
    setViewLoading(true);
    setOpenPath(file.path);
    setActiveName(file.name);
    setLines([]);
    try {
      const data = await api.adminLogs({ path: file.path, lines: 300 });
      setLines(data.lines || []);
    } catch (err) {
      setLines([`(failed to read ${file.name}: ${err.message})`]);
    } finally {
      setViewLoading(false);
    }
  }

  function refreshOpen() {
    if (!openPath) return;
    setViewLoading(true);
    api.adminLogs({ path: openPath, lines: 300 })
      .then(data => setLines(data.lines || []))
      .catch(err => setLines([`(failed to read: ${err.message})`]))
      .finally(() => setViewLoading(false));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Logs"
        description="Tail of application, gunicorn and server logs"
        actions={
          <button onClick={load} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition">
            <RefreshCw className="h-4 w-4" /> Refresh list
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      )}

      <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Log files</h3>
            <span className="text-[10px] text-muted-foreground">{files.length}</span>
          </div>
          {loading ? (
            <div className="p-8 flex items-center justify-center"><Mosaic color="var(--admin-loader)" size="small" text="" textColor="" /></div>
          ) : files.length === 0 ? (
            <p className="p-5 text-xs text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> No readable log files detected.</p>
          ) : (
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto scrollbar-thin">
              {files.map(f => (
                <button key={f.path} onClick={() => openFile(f)} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition", openPath === f.path && "bg-primary/10")}>
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium truncate">{f.name}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">{f.path}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition", openPath === f.path && "rotate-180")} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold truncate">{activeName || "Select a log file"}</h3>
            <button onClick={refreshOpen} disabled={!openPath || viewLoading} className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-accent transition disabled:opacity-40">
              {viewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Tail
            </button>
          </div>
          <div className="h-[540px] overflow-auto scrollbar-thin bg-[#0b1220]">
            {!openPath ? (
              <div className="h-full flex items-center justify-center text-sm text-background/40">Pick a log file on the left.</div>
            ) : viewLoading ? (
              <div className="h-full flex items-center justify-center text-white/60 text-xs">Loading…</div>
            ) : (
              <pre className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                {lines.length === 0 ? <span className="text-white/40">(empty log)</span> : lines.map((ln, i) => {
                  const lv = levelOf(ln);
                  return (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <span className={cn("inline-block min-w-[34px] mr-2 select-none text-white/25", lv && "text-white/40")}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={cn("dark:text-white/80 text-slate-200", lv && LEVEL_STYLES[lv])}>{ln || " "}</span>
                    </motion.div>
                  );
                })}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}