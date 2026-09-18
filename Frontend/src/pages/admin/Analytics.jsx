import { useState, useEffect, useCallback } from "react";
import { Mosaic } from "react-loading-indicators";
import {
  Users, UserCheck, Wallet, CreditCard, Heart, MessageSquare,
  Camera, ShieldAlert, Activity, MapPin, Globe,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/admin/page-header";
import { StatCard } from "../../components/admin/stat-card";

const PIE_COLORS = ["#10b981", "#d97706", "#6d28d9", "#0ea5e9", "#f43f5e", "#84cc16", "#64748b"];

const naira = (v) => `₦${Number(v ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
const num = (v) => Number(v ?? 0).toLocaleString("en-US");

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-display font-semibold text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 mb-3">{subtitle}</p>}
      <div className="h-64 mt-3">{children}</div>
    </div>
  );
}

function BreakdownList({ title, rows, formatter = (x) => x }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-display font-semibold text-sm mb-3">{title}</h3>
        <p className="text-xs text-muted-foreground">No data yet.</p>
      </div>
    );
  }
  const max = Math.max(...rows.map(r => r[1]));
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-display font-semibold text-sm mb-3">{title}</h3>
      <div className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground truncate">{label || "(unspecified)"}</span>
              <span className="font-semibold">{formatter(value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.adminAnalytics()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Mosaic color="var(--admin-loader)" size="medium" text="" textColor="" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Analytics" description="Deep dive into platform metrics and trends" />
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
      </div>
    );
  }

  const users = data.users || {};
  const revenue = data.revenue || {};
  const genderRows = Object.entries(data.gender_breakdown || {}).map(([k, v]) => [k, v]);
  const subscriptions = data.subscriptions || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Live platform metrics as of ${new Date(data.as_of).toLocaleString()}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={num(users.total)} icon={Users} color="primary" hint={`${num(users.online_now)} online now`} />
        <StatCard label="Active Users" value={num(users.active)} icon={UserCheck} color="success" hint={`${num(users.verified)} verified`} />
        <StatCard label="Revenue (all time)" value={naira(revenue.total_all)} icon={Wallet} color="gold" hint={`${naira(revenue.last_30d)} last 30 days`} />
        <StatCard label="Active Subscriptions" value={num(subscriptions.active)} icon={CreditCard} color="info" hint={`${num(subscriptions.total)} total`} />
        <StatCard label="Matches" value={num(data.matches?.total)} icon={Heart} color="primary" hint={`${num(data.matches?.last_30d)} in 30d`} />
        <StatCard label="Messages (30d)" value={num(data.messages?.last_30d)} icon={MessageSquare} color="info" hint={`${num(data.messages?.total)} all time`} />
        <StatCard label="Photos Pending Review" value={num(data.photos?.pending)} icon={Camera} color="warning" hint={`${num(data.photos?.last_30d)} uploaded in 30d`} />
        <StatCard label="Reports (30d)" value={num(data.reports?.last_30d)} icon={ShieldAlert} color="warning" hint={`${num(data.reports?.total)} all time`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Signups — last 30 days" subtitle="New members per day">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.signups_last_30_days}>
              <defs>
                <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(d) => d} formatter={(v) => [num(v), "signups"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#gSignups)" strokeWidth={2} name="Signups" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Signups — last 12 months" subtitle="New members per month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.signups_last_12_months}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(d) => d} formatter={(v) => [num(v), "signups"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="#d97706" radius={[6, 6, 0, 0]} name="Signups" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue — last 6 months" subtitle="Successful payments (NGN)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue.by_month}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [naira(v), "revenue"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="amount" stroke="#d97706" fill="url(#gRev)" strokeWidth={2} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Member gender breakdown" subtitle="Declared gender of active members">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={genderRows.map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {genderRows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BreakdownList title="Devices" rows={data.devices} />
        <BreakdownList title="Browsers" rows={data.browsers} />
        <BreakdownList title="Top cities" rows={data.top_cities} />
        <BreakdownList title="Payment status" rows={Object.entries(revenue.by_status || {})} formatter={num} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Admin activity (30d)</h3>
          </div>
          <p className="text-2xl font-bold">{num(data.admin_activity?.last_30d)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">audit-logged actions</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Photos</h3>
          </div>
          <p className="text-2xl font-bold">{num(data.photos?.total)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{num(data.photos?.approved)} approved · {num(data.photos?.rejected)} rejected</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Matches by status</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.matches?.by_status || {}).map(([k, v]) => (
              <span key={k} className="text-[11px] px-2 py-1 rounded-lg bg-muted">{k}: <b>{v}</b></span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Counselling</h3>
          </div>
          <p className="text-2xl font-bold">{num(data.counselling?.total)}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {Object.entries(data.counselling?.by_status || {}).map(([k, v]) => (
              <span key={k} className="text-[11px] px-2 py-1 rounded-lg bg-muted">{k}: <b>{v}</b></span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5" />
        All figures are computed live from the production database.
      </p>
    </div>
  );
}