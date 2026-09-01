import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Mosaic } from "react-loading-indicators";
import {
  Search, Eye, Printer, X, Receipt,
} from "lucide-react";
import { PageHeader } from "../../components/admin/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

function statusVariant(status) {
  switch (status) {
    case "completed": return "success";
    case "pending": return "warning";
    case "failed": return "destructive";
    case "refunded": return "secondary";
    default: return "secondary";
  }
}

function formatMoney(amount, currency) {
  const num = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency", currency: currency || "NGN", maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency || "NGN"} ${num.toLocaleString()}`;
  }
}

function formatDate(value) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

export default function AdminPayments() {
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  function fetchPayments() {
    api.adminPayments()
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchPayments(); }, []);

  const filtered = Array.isArray(payments) ? payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.user_email || "").toLowerCase().includes(q) ||
      (p.user_name || "").toLowerCase().includes(q) ||
      (p.reference || "").toLowerCase().includes(q) ||
      (p.transaction_id || "").toLowerCase().includes(q) ||
      (p.plan_name || "").toLowerCase().includes(q)
    );
  }) : [];

  const totals = Array.isArray(payments)
    ? payments.filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : 0;

  function printReceipt() {
    window.print();
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
        title="Payments"
        description="Track subscriptions, transactions, and revenue"
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email, reference, plan..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Total confirmed: <span className="font-semibold text-foreground">{formatMoney(totals, "NGN")}</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  {["User", "Plan", "Amount", "Gateway", "Status", "Reference", "Date", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {search ? "No payments match your search." : "No payments found."}
                    </td>
                  </tr>
                )}
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b last:border-0 hover:bg-muted/30 transition cursor-pointer"
                    onClick={() => setSelected(p)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{p.user_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.user_email || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{p.plan_name || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatMoney(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-sm capitalize">{p.gateway}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(p.status)} className="capitalize">{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{p.reference || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); setSelected(p); }}
                        aria-label="View receipt"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl bg-background shadow-luxe overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b bg-luxury text-[color:var(--cream-soft)]">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[color:var(--gold-royal)]" />
                <span className="font-display text-lg font-bold">Payment Receipt</span>
              </div>
              <button
                className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={statusVariant(selected.status)} className="capitalize text-sm">{selected.status}</Badge>
                <span className="text-2xl font-display font-bold text-gradient-luxury">
                  {formatMoney(selected.amount, selected.currency)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="User" value={selected.user_name || "—"} />
                <Field label="Email" value={selected.user_email || "—"} />
                <Field label="Plan" value={selected.plan_name || "—"} />
                <Field label="Gateway" value={selected.gateway} />
                <Field label="Payment Method" value={selected.payment_method || "—"} />
                <Field label="Subscription" value={selected.subscription_status || "—"} />
                <Field label="Reference" value={selected.reference} mono />
                <Field label="Transaction Ref" value={selected.transaction_reference || "—"} mono />
                <Field label="Transaction ID" value={selected.transaction_id || "—"} mono />
                <Field label="Period Start" value={formatDate(selected.period_start)} />
                <Field label="Period End" value={formatDate(selected.period_end)} />
                <Field label="Date" value={formatDate(selected.created_at)} />
              </div>

              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Gateway metadata</p>
                  <pre className="text-xs whitespace-pre-wrap break-words text-muted-foreground">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={printReceipt}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button variant="default" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-medium break-words", mono && "font-mono text-xs")}>{value || "—"}</p>
    </div>
  );
}
