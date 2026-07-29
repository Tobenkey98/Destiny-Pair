import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Menu, X, Moon, Sun, Heart, User, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "../context/AuthContext";

const aboutLinks = [
  { to: "/about", label: "About" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/faq", label: "FAQ" },
];

const links = [
  { to: "/", label: "Home" },
  { to: "/membership", label: "Membership" },
  { to: "/faith-values", label: "Faith & Values" },
  { to: "/publications", label: "Publications" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); setMobileAboutOpen(false); }, [location.pathname]);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const solid = scrolled || !isHome;
  const initial = user ? (user.first_name?.[0] || user.email?.[0] || "U").toUpperCase() : null;
  const navLinks = user
    ? [...links, { to: "/discover", label: "Discover" }]
    : links;

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          solid ? "glass shadow-soft" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between h-18 py-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gold blur-md opacity-60 group-hover:opacity-100 transition" />
              <div className="relative bg-emerald rounded-xl p-2 shadow-soft">
                <Heart className="h-5 w-5 text-[color:var(--gold-royal)]" fill="currentColor" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-xl font-bold text-foreground">DestinyPair</span>
              <span className="text-[10px] tracking-[0.25em] uppercase text-gradient-gold font-semibold">.net</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.slice(0, 1).map(l => {
              const isActive = l.to === "/" ? location.pathname === "/" : location.pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`relative px-3.5 py-2 text-sm font-medium transition-colors group ${
                    isActive ? "text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {l.label}
                  <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-gold scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </Link>
              );
            })}

            {/* About dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-3.5 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors group">
                About
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
                <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-gold scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
              <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                <div className="w-52 rounded-2xl bg-background border border-border shadow-luxe overflow-hidden">
                  {aboutLinks.map(a => {
                    const isActive = location.pathname === a.to || location.pathname.startsWith(a.to + "/");
                    return (
                      <Link
                        key={a.to}
                        to={a.to}
                        className={`block px-5 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? "text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] bg-emerald/5"
                            : "text-foreground/80 hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        {a.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {navLinks.slice(1).map(l => {
              const isActive = l.to === "/" ? location.pathname === "/" : location.pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`relative px-3.5 py-2 text-sm font-medium transition-colors group ${
                    isActive ? "text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {l.label}
                  <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-gold scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              aria-label="Toggle theme"
              onClick={toggle}
              className="p-2 rounded-full hover:bg-secondary transition-colors text-foreground/80"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.25 }} className="block">
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </motion.span>
              </AnimatePresence>
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-semibold shadow-soft hover:shadow-glow transition"
                >
                  <span className="h-7 w-7 rounded-full bg-gold flex items-center justify-center text-xs font-bold text-[color:var(--emerald-deep)]">
                    {initial}
                  </span>
                  <span className="hidden md:inline text-sm">{user?.first_name || user?.email || ""}</span>
                  <ChevronDown className={`h-4 w-4 transition ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-2xl bg-background border border-border shadow-luxe overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold">{(user?.first_name || "") + " " + (user?.last_name || "")}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Link to="/dashboard/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-secondary transition">
                        <User className="h-4 w-4" /> Profile
                      </Link>
                      <button onClick={() => { logout(); setDropdownOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-secondary transition w-full text-left text-destructive">
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login" className="hidden md:inline-flex px-4 py-2 text-sm font-semibold text-foreground/90 hover:text-foreground transition">Sign in</Link>
                <Link to="/register" className="hidden md:inline-flex relative overflow-hidden px-5 py-2.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-semibold text-sm shadow-soft hover:shadow-glow transition-all">
                  <span className="relative z-10">Join Free</span>
                </Link>
              </>
            )}

            <button className="lg:hidden p-2 text-foreground" onClick={() => setOpen(true)} aria-label="Menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden" />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-[70] bg-background border-l border-border shadow-luxe p-6 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-display text-2xl font-bold text-gradient-luxury">DestinyPair</span>
                <button onClick={() => setOpen(false)} className="p-2"><X className="h-6 w-6" /></button>
              </div>
              <nav className="flex flex-col gap-1">
                {navLinks.slice(0, 1).map((l, i) => (
                  <motion.div key={l.to} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <Link to={l.to} className="block py-3 px-4 rounded-xl text-lg font-medium hover:bg-secondary transition">{l.label}</Link>
                  </motion.div>
                ))}
                {/* Mobile About expandable */}
                <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
                  <button
                    onClick={() => setMobileAboutOpen(!mobileAboutOpen)}
                    className="flex items-center justify-between w-full py-3 px-4 rounded-xl text-lg font-medium hover:bg-secondary transition"
                  >
                    About
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileAboutOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {mobileAboutOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 border-l border-border/50 pl-4 space-y-1 pb-2">
                          {aboutLinks.map(a => (
                            <Link
                              key={a.to}
                              to={a.to}
                              onClick={() => setOpen(false)}
                              className="block py-2.5 px-4 rounded-xl text-base font-medium text-foreground/70 hover:text-foreground hover:bg-secondary transition"
                            >
                              {a.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                {navLinks.slice(1).map((l, i) => (
                  <motion.div key={l.to} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: (i + 1) * 0.05 }}>
                    <Link to={l.to} className="block py-3 px-4 rounded-xl text-lg font-medium hover:bg-secondary transition">{l.label}</Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-border">
                {user ? (
                  <button onClick={() => { logout(); setOpen(false); }} className="text-center py-3 rounded-full border border-border font-semibold text-destructive">Logout</button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)} className="text-center py-3 rounded-full border border-border font-semibold">Sign in</Link>
                    <Link to="/register" onClick={() => setOpen(false)} className="text-center py-3 rounded-full bg-emerald text-[color:var(--gold-royal)] font-semibold shadow-soft">Join Free</Link>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
