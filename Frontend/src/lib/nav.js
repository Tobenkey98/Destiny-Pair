import {
  LayoutDashboard, Users, UserRound, Heart, ThumbsUp, MessageSquare,
  CalendarHeart, CreditCard, Wallet, FileBarChart2, ShieldAlert, Bell,
  FileText, Quote, Newspaper, CalendarDays, LifeBuoy, ScrollText,
  KeyRound, Settings, UserCircle, ClipboardCheck, Puzzle, Search,
  Mail, Headphones, Church, ListChecks,
} from "lucide-react";

export const NAV = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, group: "Overview", roles: "*" },
  { label: "Users", to: "/admin/users", icon: Users, group: "Community", roles: ["super_admin", "operations_admin", "moderator"] },
  { label: "Matches", to: "/admin/matches", icon: Heart, group: "Community", badge: "48", roles: ["super_admin", "operations_admin"] },
  { label: "Messages", to: "/admin/messages", icon: MessageSquare, group: "Community", roles: ["super_admin", "operations_admin", "moderator"] },
  { label: "Counselling", to: "/admin/counselling", icon: CalendarHeart, group: "Community", roles: ["super_admin", "counsellor"] },
  { label: "Subscriptions", to: "/admin/subscriptions", icon: CreditCard, group: "Operations", roles: ["super_admin", "operations_admin"] },
  { label: "Payments", to: "/admin/payments", icon: Wallet, group: "Operations", roles: ["super_admin", "operations_admin"] },
  { label: "Reports", to: "/admin/reports", icon: FileBarChart2, group: "Operations", roles: ["super_admin", "operations_admin", "moderator"] },
  { label: "Moderation", to: "/admin/moderation", icon: ShieldAlert, group: "Operations", badge: "12", roles: ["super_admin", "moderator"] },
  { label: "Notifications", to: "/admin/notifications", icon: Bell, group: "Operations", roles: ["super_admin", "operations_admin"] },
  { label: "Denominations", to: "/admin/denominations", icon: Church, group: "Operations", roles: ["super_admin", "operations_admin"] },
  { label: "Pending Denominations", to: "/admin/pending-denominations", icon: ListChecks, group: "Operations", roles: ["super_admin", "operations_admin"] },
  { label: "Analytics", to: "/admin/analytics", icon: FileBarChart2, group: "Content", roles: ["super_admin"] },
  { label: "Content", to: "/admin/content", icon: FileText, group: "Content", roles: ["super_admin"] },
  { label: "Support", to: "/admin/support", icon: Headphones, group: "System", roles: ["super_admin", "operations_admin"] },
  { label: "Audit Logs", to: "/admin/audit", icon: ScrollText, group: "System", roles: ["super_admin"] },
  { label: "Roles", to: "/admin/roles", icon: KeyRound, group: "System", roles: ["super_admin"] },
  { label: "Admins", to: "/admin/admins", icon: UserCircle, group: "System", roles: ["super_admin"] },
  { label: "Settings", to: "/admin/settings", icon: Settings, group: "System", roles: ["super_admin"] },
  { label: "Emails", to: "/admin/emails", icon: Mail, group: "Content", roles: ["super_admin"] },
  { label: "SEO", to: "/admin/seo", icon: Search, group: "Content", roles: ["super_admin"] },
  { label: "Logs", to: "/admin/logs", icon: ClipboardCheck, group: "System", roles: ["super_admin"] },
  { label: "Integrations", to: "/admin/integrations", icon: Puzzle, group: "System", roles: ["super_admin"] },
];

export const NAV_GROUPS = ["Overview", "Community", "Operations", "Content", "System"];
