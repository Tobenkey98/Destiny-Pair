import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader } from "../../components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useAdmin } from "../../context/AdminContext";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export default function Reports() {
  const { dashboard, loading } = useAdmin();
  const analytics = dashboard?.analytics || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Mosaic color="var(--admin-loader)" size="medium" text="" textColor="" />
      </div>
    );
  }

  const genderData = [
    { name: "Male", value: analytics.gender_breakdown?.male || 0 },
    { name: "Female", value: analytics.gender_breakdown?.female || 0 },
  ];

  const totalKnown = (analytics.gender_breakdown?.male || 0) + (analytics.gender_breakdown?.female || 0);
  const otherCount = (analytics.total_users || 0) - totalKnown;

  if (otherCount > 0) genderData.push({ name: "Other", value: otherCount });

  const monthlyData = (dashboard?.signups_last_7_days || []).map(d => ({
    month: new Date(d.date + "T00:00:00").toLocaleDateString("en", { weekday: "short" }),
    users: d.count,
    matches: Math.round(d.count * 0.3),
  }));

  const userStats = [
    { label: "Total", value: analytics.total_users ?? 0 },
    { label: "Active", value: analytics.active_users ?? 0 },
    { label: "Verified", value: analytics.verified_users ?? 0 },
    { label: "Banned", value: analytics.banned_users ?? 0 },
    { label: "Profile Completed", value: analytics.profile_completed ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Platform analytics and insights" />

      {/* User Stats Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {userStats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border bg-card p-4 text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{s.value.toLocaleString()}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Growth (7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="users" stroke="var(--chart-1)" strokeWidth={2} dot={{ fill: "var(--chart-1)" }} name="Users" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""}>
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups (7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                <Bar dataKey="users" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Signups" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last 30 Days</p>
                <p className="text-4xl font-bold tabular-nums text-foreground mt-2">
                  ₦{analytics.total_revenue_30d != null ? Number(analytics.total_revenue_30d).toLocaleString() : "0"}
                </p>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">All Time</p>
                <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
                  ₦{analytics.total_revenue_all != null ? Number(analytics.total_revenue_all).toLocaleString() : "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
