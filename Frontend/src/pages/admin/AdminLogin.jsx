import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";

function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await adminLogin(email, password, rememberMe);
      navigate("/admin");
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block overflow-hidden bg-[color:var(--emerald-deep)]">
        <div className="absolute inset-0 pattern-dots opacity-20" />
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-20 left-16 h-24 w-24 rounded-3xl glass flex items-center justify-center">
          <Shield className="h-10 w-10 text-[color:var(--gold-royal)]" />
        </motion.div>
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity }} className="absolute bottom-32 right-20 h-20 w-20 rounded-2xl glass flex items-center justify-center">
          <Lock className="h-9 w-9 text-[color:var(--gold-royal)]" />
        </motion.div>
        <div className="absolute inset-0 flex flex-col justify-center px-16 text-[color:var(--cream-soft)]">
          <Shield className="h-12 w-12 text-[color:var(--gold-royal)] mb-6" />
          <h2 className="font-display text-5xl font-bold leading-tight">Admin Portal</h2>
          <p className="mt-5 opacity-80 text-lg">Secure access for DestinyPair administrators.</p>
          <div className="mt-10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gold flex items-center justify-center"><Lock className="h-5 w-5 text-[color:var(--emerald-deep)]" /></div>
            <p className="text-sm opacity-80">Authorized personnel only.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
          <h1 className="font-display text-4xl font-bold">Admin Sign In</h1>
          <p className="mt-2 text-muted-foreground">Sign in to the administration panel.</p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 pr-11 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
                {password.length > 0 && (
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition" tabIndex={-1}>
                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-border accent-[color:var(--emerald-deep)]" />
              <span className="text-sm text-muted-foreground">Remember me <span className="text-[10px] opacity-60">(30 days)</span></span>
            </label>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            First time? <Link to="/admin/signup" className="font-bold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Create admin account</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default AdminLogin;
