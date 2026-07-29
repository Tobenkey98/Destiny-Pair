import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../../context/AdminContext";
import { useTheme } from "../ThemeProvider";
import { cn } from "../../lib/utils";
import {
  Menu, Bell, ChevronDown, LogOut, Settings,
  Plus, Users, Heart, MessageSquare, CalendarHeart, Shield,
  Sun, Moon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";

export function AdminTopbar({ onMobileMenu }) {
  const { adminProfile, roleDisplay, adminLogout } = useAdmin();
  const { theme, toggle } = useTheme();
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
  }, []);

  const quickActions = [
    { label: "Add User", icon: Users, to: "/admin/users" },
    { label: "Create Match", icon: Heart, to: "/admin/matches" },
    { label: "New Message", icon: MessageSquare, to: "/admin/messages" },
    { label: "Schedule Session", icon: CalendarHeart, to: "/admin/counselling" },
  ];

  const roleColorMap = {
    super_admin: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    operations_admin: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    moderator: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    counsellor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };

  const roleBadgeClass = roleColorMap[adminProfile?.role] || "bg-muted text-muted-foreground";

  function handleLogout() {
    adminLogout();
    navigate("/admin/login");
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onMobileMenu} className="lg:hidden h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center">
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0 h-5", roleBadgeClass)}>
              <Shield className="h-3 w-3 mr-1" />
              {roleDisplay}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden md:block text-xs text-muted-foreground mr-1">{dateStr}</span>

          <button
            onClick={toggle}
            className="h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="relative">
            <button
              onMouseEnter={() => setShowQuickCreate(true)}
              onMouseLeave={() => setShowQuickCreate(false)}
              className="h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition"
            >
              <Plus className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {showQuickCreate && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  onMouseEnter={() => setShowQuickCreate(true)}
                  onMouseLeave={() => setShowQuickCreate(false)}
                  className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-popover p-1 shadow-lg"
                >
                  {quickActions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => { setShowQuickCreate(false); navigate(a.to); }}
                      className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition"
                    >
                      <a.icon className="h-4 w-4" />
                      {a.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => navigate("/admin/notifications")}
            className="relative h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition"
          >
            <Bell className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-accent transition">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {(adminProfile?.role_display?.[0] || "A")}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">{adminProfile?.role_display || "Admin"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{adminProfile?.role_display || "Admin"}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">{roleDisplay}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                <Settings className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
