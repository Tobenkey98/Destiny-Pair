import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { FourSquare } from "react-loading-indicators";
import {
  Compass, User, Heart, MessageCircle, BookOpen, Bell, LogOut, Menu, Crown, Sparkles, Moon, Sun, Home, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../components/ThemeProvider";
import { Footer } from "../../components/Footer";
import { api } from "../../lib/api";

const navItems = [
  { to: "/dashboard", icon: Compass, label: "Journey", exact: true },
  { to: "/dashboard/profile", icon: User, label: "Profile" },
  { to: "/dashboard/discover", icon: Sparkles, label: "Discover" },
  { to: "/dashboard/matches", icon: Heart, label: "Connections" },
  { to: "/dashboard/chat", icon: MessageCircle, label: "Chat" },
  { to: "/dashboard/counselling", icon: BookOpen, label: "Counselling" },
  { to: "/dashboard/notifications", icon: Bell, label: "Activity" },
];

const initial = (user) =>
  (user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase();

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [primaryPhoto, setPrimaryPhoto] = useState(null);
  const [sidebarImgError, setSidebarImgError] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      setPageLoading(true);
      prevPath.current = location.pathname;
    }
    const timer = setTimeout(() => setPageLoading(false), 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    api.getUnreadCount().then(d => setUnreadCount(d.count || 0)).catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadCount().then(d => setUnreadCount(d.count || 0)).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSidebarImgError(false);
    api.getPhotos().then((p) => {
      setPhotos(p);
      const primary = p.find((ph) => ph.is_primary);
      if (primary) setPrimaryPhoto(primary.image);
    }).catch(() => {});
  }, []);

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] h-[60vh] w-[60vh] rounded-full bg-emerald opacity-[0.05] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vh] rounded-full bg-gold opacity-[0.06] blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] h-[30vh] w-[30vh] rounded-full bg-[color:var(--burgundy)] opacity-[0.04] blur-[80px]" />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        className={`fixed top-0 left-0 bottom-0 z-[60] w-72 bg-background/90 backdrop-blur-2xl border-r border-border/50 shadow-luxe transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gold blur-md opacity-60 group-hover:opacity-100 transition" />
                <div className="relative bg-emerald rounded-xl p-2.5 shadow-soft">
                  <Heart className="h-5 w-5 text-[color:var(--gold-royal)]" fill="currentColor" />
                </div>
              </div>
              <div>
                <span className="font-display text-lg font-bold text-foreground">DestinyPair</span>
                <span className="block text-[8px] tracking-[0.25em] uppercase text-gradient-gold font-semibold">Dashboard</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="lg:hidden p-2 rounded-xl hover:bg-foreground/5 text-foreground/60 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all group ${
                    isActive
                      ? "bg-emerald/10 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]"
                      : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div layoutId="nav-pill" className="ml-auto h-2 w-2 rounded-full bg-gold shadow-glow" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mb-4">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all group"
            >
              <Home className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl shrink-0 overflow-hidden shadow-soft">
                {primaryPhoto && !sidebarImgError ? (
                  <img src={primaryPhoto} alt="" className="h-full w-full object-cover" onError={() => setSidebarImgError(true)} />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-emerald to-gold flex items-center justify-center text-sm font-bold text-white">
                    {initial(user)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.first_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-medium text-foreground/60 hover:text-destructive hover:bg-destructive/5 transition"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </motion.aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 glass border-b border-border/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-foreground/5 text-foreground/60"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald/5 text-xs font-semibold text-emerald-deep dark:text-gold-royal"
              >
                <Crown className="h-3.5 w-3.5 text-gold-royal" />
                Premium Plus
              </motion.div>
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label="Toggle theme"
                onClick={toggle}
                className="p-2 rounded-xl hover:bg-foreground/5 text-foreground/60 transition"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <Link to="/dashboard/notifications" className="relative p-2 rounded-xl hover:bg-foreground/5 text-foreground/60 transition">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <Outlet context={{ photos, setPhotos }} />
        </div>
        <Footer />
      </div>
    </div>
  );
}
