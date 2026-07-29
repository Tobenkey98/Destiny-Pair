import { motion } from "framer-motion";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Mosaic } from "react-loading-indicators";
import {
  Users, Heart, UserCheck, Ban, Camera, CalendarCheck,
  TrendingUp, DollarSign, Shield, Clock, CheckCircle,
  Activity, ArrowUpRight, UserPlus, Sparkles,
  AlertTriangle, XCircle, Star, Zap,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const cardStyles = [
  {
    gradient: "from-emerald-600 to-emerald-800 dark:from-emerald-700 dark:to-emerald-950",
    iconBg: "bg-emerald-400/20",
    iconColor: "text-emerald-200",
    accent: "bg-emerald-400/10 border-emerald-400/20",
  },
  {
    gradient: "from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-950",
    iconBg: "bg-blue-400/20",
    iconColor: "text-blue-200",
    accent: "bg-blue-400/10 border-blue-400/20",
  },
  {
    gradient: "from-violet-600 to-violet-800 dark:from-violet-700 dark:to-violet-950",
    iconBg: "bg-violet-400/20",
    iconColor: "text-violet-200",
    accent: "bg-violet-400/10 border-violet-400/20",
  },
  {
    gradient: "from-amber-600 to-amber-800 dark:from-amber-700 dark:to-amber-950",
    iconBg: "bg-amber-400/20",
    iconColor: "text-amber-200",
    accent: "bg-amber-400/10 border-amber-400/20",
  },
  {
    gradient: "from-rose-600 to-rose-800 dark:from-rose-700 dark:to-rose-950",
    iconBg: "bg-rose-400/20",
    iconColor: "text-rose-200",
    accent: "bg-rose-400/10 border-rose-400/20",
  },
  {
    gradient: "from-indigo-600 to-indigo-800 dark:from-indigo-700 dark:to-indigo-950",
    iconBg: "bg-indigo-400/20",
    iconColor: "text-indigo-200",
    accent: "bg-indigo-400/10 border-indigo-400/20",
  },
  {
    gradient: "from-cyan-600 to-cyan-800 dark:from-cyan-700 dark:to-cyan-950",
    iconBg: "bg-cyan-400/20",
    iconColor: "text-cyan-200",
    accent: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    gradient: "from-orange-600 to-orange-800 dark:from-orange-700 dark:to-orange-950",
    iconBg: "bg-orange-400/20",
    iconColor: "text-orange-200",
    accent: "bg-orange-400/10 border-orange-400/20",
  },
];

function StatCard({ stat, index }) {
  const cs = cardStyles[index % cardStyles.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        "hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1",
        "bg-gradient-to-br text-white",
        cs.gradient,
      )}
    >
      <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/5" />
      <div className="absolute bottom-0 left-0 h-20 w-20 -translate-x-6 translate-y-6 rounded-full bg-white/5" />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">{stat.label}</p>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            {stat.delta != null && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <ArrowUpRight className={cn("h-3.5 w-3.5", stat.delta < 0 && "rotate-180")} />
                <span>{stat.delta >= 0 ? "+" : ""}{stat.delta} {stat.deltaLabel || ""}</span>
              </div>
            )}
            {stat.hint && (
              <p className="text-[11px] text-white/50">{stat.hint}</p>
            )}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm", cs.iconBg)}>
            <stat.icon className={cn("h-6 w-6", cs.iconColor)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SectionCard({ title, icon: Icon, badge, children, className }) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm overflow-hidden", className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
        </div>
        {badge != null && (
          <Badge variant="secondary" className="text-[10px] font-semibold">{badge}</Badge>
        )}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

function UsersTable({ users }) {
  if (!users || users.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No users yet.</p>;
  }
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <th className="pb-3 pl-5">User</th>
            <th className="pb-3 hidden sm:table-cell">Email</th>
            <th className="pb-3 hidden md:table-cell">Gender</th>
            <th className="pb-3 text-right pr-5">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.id} className={cn(
              "transition-colors hover:bg-muted/40",
              i < users.length - 1 && "border-b border-border/30",
            )}>
              <td className="py-3 pl-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 shadow-sm">
                    {(u.first_name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-sm truncate max-w-[120px] sm:max-w-none">
                    {u.first_name || u.email?.split("@")[0] || "User"}
                  </span>
                </div>
              </td>
              <td className="py-3 text-muted-foreground text-xs hidden sm:table-cell truncate max-w-[160px]">{u.email || "—"}</td>
              <td className="py-3 text-muted-foreground text-xs hidden md:table-cell capitalize">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium",
                  u.gender === "male" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                  u.gender === "female" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                  "bg-muted text-muted-foreground"
                )}>
                  {u.gender || "—"}
                </span>
              </td>
              <td className="py-3 text-right pr-5 text-muted-foreground text-xs">{timeAgo(u.date_joined)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchesTable({ matches }) {
  if (!matches || matches.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No matches yet.</p>;
  }
  const statusColors = {
    matched: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    liked: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
    rejected: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  };
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <th className="pb-3 pl-5">From</th>
            <th className="pb-3">To</th>
            <th className="pb-3 hidden sm:table-cell">Status</th>
            <th className="pb-3 text-right pr-5">When</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={m.id} className={cn(
              "transition-colors hover:bg-muted/40",
              i < matches.length - 1 && "border-b border-border/30",
            )}>
              <td className="py-3 pl-5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {(m.from_user_name || m.from_user_email || "?")[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{m.from_user_name || m.from_user_email?.split("@")[0]}</span>
                </div>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {(m.to_user_name || m.to_user_email || "?")[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{m.to_user_name || m.to_user_email?.split("@")[0]}</span>
                </div>
              </td>
              <td className="py-3 hidden sm:table-cell">
                <Badge variant="outline" className={cn("text-[10px] font-semibold capitalize border", statusColors[m.status] || "")}>
                  {m.status}
                </Badge>
              </td>
              <td className="py-3 text-right pr-5 text-muted-foreground text-xs">{timeAgo(m.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const roleConfig = {
  super_admin: {
    label: "Super Admin",
    icon: Shield,
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    quickActions: [
      { label: "Audit Logs", icon: Activity, to: "/admin/audit" },
      { label: "Manage Roles", icon: Shield, to: "/admin/roles" },
      { label: "Settings", icon: TrendingUp, to: "/admin/settings" },
      { label: "Reports", icon: AlertTriangle, to: "/admin/reports" },
    ],
  },
  operations_admin: {
    label: "Operations Admin",
    icon: TrendingUp,
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    quickActions: [
      { label: "Subscriptions", icon: DollarSign, to: "/admin/subscriptions" },
      { label: "Payments", icon: Activity, to: "/admin/payments" },
      { label: "Users", icon: Users, to: "/admin/users" },
    ],
  },
  moderator: {
    label: "Moderator",
    icon: Shield,
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    quickActions: [
      { label: "Reports", icon: AlertTriangle, to: "/admin/reports" },
      { label: "Moderation", icon: Camera, to: "/admin/moderation" },
      { label: "Users", icon: Ban, to: "/admin/users" },
    ],
  },
  counsellor: {
    label: "Counsellor",
    icon: Heart,
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    quickActions: [
      { label: "Sessions", icon: CalendarCheck, to: "/admin/counselling" },
      { label: "Pending", icon: Clock, to: "/admin/counselling" },
    ],
  },
};

export default function AdminDashboard() {
  const { dashboard, adminProfile, loading } = useAdmin();
  const navigate = useNavigate();
  const analytics = dashboard?.analytics || {};
  const config = roleConfig[adminProfile?.role] || roleConfig.super_admin;

  const stats = useMemo(() => {
    const role = adminProfile?.role;
    if (role === "super_admin") return [
      { label: "Total Users", value: (analytics.total_users ?? 0).toLocaleString(), delta: analytics.new_users_30d ?? 0, deltaLabel: "this month", icon: Users },
      { label: "Active Users", value: (analytics.active_users ?? 0).toLocaleString(), icon: UserCheck, hint: `${analytics.verified_users ?? 0} verified` },
      { label: "Users Online", value: (dashboard?.users_online ?? 0).toLocaleString(), icon: Activity, hint: `~15 min active window` },
      { label: "Matches", value: (analytics.total_matches ?? 0).toLocaleString(), icon: Heart },
      { label: "Admins", value: (dashboard?.admin_count ?? 0).toLocaleString(), icon: Shield, hint: `${dashboard?.admins_online ?? 0} online now` },
      { label: "Revenue (30d)", value: analytics.total_revenue_30d != null ? `₦${Number(analytics.total_revenue_30d).toLocaleString()}` : "₦0", icon: DollarSign, hint: `₦${Number(analytics.total_revenue_all || 0).toLocaleString()} lifetime` },
      { label: "Pending Photos", value: analytics.pending_photo_approvals ?? 0, icon: Camera },
      { label: "Counselling", value: analytics.total_counselling_sessions ?? 0, icon: CalendarCheck },
      { label: "Banned Users", value: analytics.banned_users ?? 0, icon: Ban, hint: `${((analytics.banned_users / (analytics.total_users || 1)) * 100).toFixed(1)}% of users` },
      { label: "Profile Completion", value: analytics.profile_completed ?? 0, icon: Star, hint: `${((analytics.profile_completed / (analytics.total_users || 1)) * 100).toFixed(0)}% completed` },
    ];
    if (role === "operations_admin") return [
      { label: "Total Users", value: (analytics.total_users ?? 0).toLocaleString(), icon: Users },
      { label: "Active Subs", value: analytics.active_subscriptions ?? 0, icon: DollarSign },
      { label: "Completed Payments", value: analytics.recent_payments ?? 0, icon: Activity, hint: `₦${Number(analytics.total_revenue_all || 0).toLocaleString()} total` },
    ];
    if (role === "moderator") return [
      { label: "Pending Approvals", value: analytics.pending_photo_approvals ?? 0, icon: Camera },
      { label: "Blocked Users", value: analytics.banned_users ?? 0, icon: Ban },
      { label: "Verified Users", value: analytics.verified_users ?? 0, icon: UserCheck },
    ];
    if (role === "counsellor") return [
      { label: "Total Sessions", value: analytics.total_sessions ?? 0, icon: CalendarCheck },
      { label: "Completed", value: analytics.completed_sessions ?? 0, icon: CheckCircle, hint: `${Math.round((analytics.completed_sessions / (analytics.total_sessions || 1)) * 100)}% rate` },
      { label: "Upcoming", value: analytics.upcoming_sessions ?? 0, icon: Clock },
      { label: "Cancelled", value: analytics.cancelled_sessions ?? 0, icon: XCircle },
    ];
    return [];
  }, [adminProfile, analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Mosaic color="var(--admin-loader)" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-display font-bold text-foreground">
              {getGreeting()}, {adminProfile?.role_display?.split(" ")[0] || "Admin"}
            </h1>
            <Zap className="h-5 w-5 text-amber-500 hidden sm:block" />
          </div>
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs font-semibold px-3 py-1.5 h-auto self-start", config.badgeClass)}>
          <config.icon className="h-3.5 w-3.5 mr-1.5" />
          {config.label}
        </Badge>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          <SectionCard title="Recent Users" icon={UserPlus} badge={analytics.total_users ?? 0}>
            <UsersTable users={dashboard?.recent_users} />
          </SectionCard>
        </motion.div>

        {/* Quick Actions + Access */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 space-y-6"
        >
          <SectionCard title="Quick Actions" icon={Zap}>
            <div className="space-y-2">
              {config.quickActions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(a.to)}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-muted group"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <a.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left">{a.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Access Overview" icon={Shield}>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="outline" className={cn("text-[10px] font-semibold", config.badgeClass)}>
                  {adminProfile?.role_display}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Modules</span>
                <span className="font-bold tabular-nums text-lg">{dashboard?.modules?.length || 0}</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {dashboard?.modules?.slice(0, 8).map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                      {m}
                    </span>
                  ))}
                  {(dashboard?.modules?.length || 0) > 8 && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                      +{dashboard.modules.length - 8}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </motion.div>
      </div>

      {/* Recent Matches */}
      {adminProfile?.role === "super_admin" && dashboard?.recent_matches && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionCard title="Recent Matches" icon={Heart} badge={analytics.total_matches ?? 0}>
            <MatchesTable matches={dashboard.recent_matches} />
          </SectionCard>
        </motion.div>
      )}

      {/* Signup Trend */}
      {adminProfile?.role === "super_admin" && dashboard?.signups_last_7_days && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SectionCard title="Signups (Last 7 Days)" icon={TrendingUp}>
            <div className="flex items-end gap-2.5 h-32">
              {dashboard.signups_last_7_days.map((day, i) => {
                const max = Math.max(...dashboard.signups_last_7_days.map(d => d.count), 1);
                const height = (day.count / max) * 100;
                const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                const dayName = days[new Date(day.date).getDay()];
                const isToday = i === dashboard.signups_last_7_days.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold tabular-nums text-foreground">{day.count}</span>
                    <div className="w-full rounded-lg relative flex-1 self-end" style={{ paddingBottom: 0 }}>
                      <div
                        className={cn(
                          "absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-500",
                          "bg-gradient-to-t from-primary to-primary/40",
                          isToday && "from-amber-500 to-amber-300",
                        )}
                        style={{ height: `${Math.max(height, 3)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium",
                      isToday ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                    )}>{dayName}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </motion.div>
      )}
    </div>
  );
}
