import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart, Sparkles, Shield, Crown, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GoogleIcon, FacebookIcon } from "../lib/social-icons";
import { loginWithGoogle, loginWithFacebook, initGoogle, initFacebook } from "../lib/social";

function Login() {
  const navigate = useNavigate();
  const { login, socialAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    initGoogle();
    initFacebook();
  }, []);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNeedsVerification(false);
    try {
      const data = await login({ email, password, remember_me: rememberMe });
      const pending = sessionStorage.getItem("pending_profile");
      const checkoutIntent = sessionStorage.getItem("checkout_intent");
      if (checkoutIntent) {
        sessionStorage.removeItem("checkout_intent");
        navigate(checkoutIntent);
      } else if (pending) {
        navigate("/social-complete");
      } else {
        navigate(data.user?.public_id ? `/dashboard/profile/${data.user.public_id}` : "/dashboard");
      }
    } catch (err) {
      if (err.data?.needs_verification) {
        setNeedsVerification(true);
        setError("Please verify your email before signing in.");
      } else {
        setError(err.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(provider) {
    setLoading(true);
    setError("");
    try {
      let payload;
      if (provider === "google") {
        payload = await loginWithGoogle();
      } else {
        payload = await loginWithFacebook();
      }
      const result = await socialAuth(payload);
      const checkoutIntent = sessionStorage.getItem("checkout_intent");
      if (checkoutIntent) {
        sessionStorage.removeItem("checkout_intent");
        navigate(checkoutIntent);
      } else {
        navigate(result.created ? "/social-complete" : (result.user?.public_id ? `/dashboard/profile/${result.user.public_id}` : "/dashboard"));
      }
    } catch (err) {
      setError(err.data?.error || err.message || `${provider} sign in failed.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen pt-24 grid lg:grid-cols-2">
      <div className="relative hidden lg:block overflow-hidden bg-luxury">
        <div className="absolute inset-0 pattern-dots opacity-20" />
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-20 left-16 h-24 w-24 rounded-3xl glass flex items-center justify-center">
          <Crown className="h-10 w-10 text-[color:var(--gold-royal)]" />
        </motion.div>
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity }} className="absolute bottom-32 right-20 h-20 w-20 rounded-2xl glass flex items-center justify-center">
          <Shield className="h-9 w-9 text-[color:var(--gold-royal)]" />
        </motion.div>
        <div className="absolute inset-0 flex flex-col justify-center px-16 text-[color:var(--cream-soft)]">
          <Sparkles className="h-12 w-12 text-[color:var(--gold-royal)] mb-6" />
          <h2 className="font-display text-5xl font-bold leading-tight">Welcome back to <span className="text-gradient-gold italic">your journey</span>.</h2>
          <p className="mt-5 opacity-80 text-lg">Continue where destiny left off. Your matches, your conversations, your forever.</p>
          <div className="mt-10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gold flex items-center justify-center"><Heart className="h-5 w-5 text-[color:var(--emerald-deep)]" fill="currentColor" /></div>
            <p className="text-sm opacity-80">3,000+ unions facilitated &mdash; yours awaits.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
          <h1 className="font-display text-4xl font-bold">Sign in</h1>
          <p className="mt-2 text-muted-foreground">Welcome back to DestinyPair.</p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
              {needsVerification && (
                <Link to={`/verify-email?email=${encodeURIComponent(email)}`} className="block mt-2 font-semibold underline">
                  Resend verification
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="mt-8 space-y-5">
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
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded" /> Remember me</label>
              <Link to="/forgot-password" className="font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-3 text-muted-foreground">Or continue with</span></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => handleSocial("google")} disabled={loading} className="flex items-center justify-center gap-2 py-3 rounded-full border border-border font-semibold hover:bg-secondary transition">
              <GoogleIcon className="h-5 w-5" /> Google
            </button>
            <button onClick={() => handleSocial("facebook")} disabled={loading} className="flex items-center justify-center gap-2 py-3 rounded-full border border-border font-semibold hover:bg-secondary transition">
              <FacebookIcon className="h-5 w-5 text-[#1877F2]" /> Facebook
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New to DestinyPair? <Link to="/register" className="font-bold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Create an account</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default Login;
