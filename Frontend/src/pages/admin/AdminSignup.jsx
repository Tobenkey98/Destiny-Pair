import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Shield, Eye, EyeOff, CheckCircle } from "lucide-react";
import { api } from "../../lib/api";

const ADMIN_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "operations_admin", label: "Operations Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "counsellor", label: "Counsellor" },
];

function AdminSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
    role: "",
    invitation_token: "",
  });

  const [invitationRole, setInvitationRole] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setForm(prev => ({ ...prev, invitation_token: token }));
      api.adminInvitationLookup(token).then(data => {
        if (data.role) {
          setForm(prev => ({ ...prev, email: data.email, role: data.role }));
          setInvitationRole(data.role_display);
        }
      }).catch(() => {});
    }
  }, [searchParams]);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const hasTokenFromUrl = !!searchParams.get("token");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);
    try {
      const data = await api.adminSignup({
        email: form.email,
        password: form.password,
        password2: form.password2,
        first_name: form.first_name,
        last_name: form.last_name,
        role: hasTokenFromUrl ? "" : "super_admin",
        invitation_token: form.invitation_token,
      });
      if (data.tokens) {
        const label = hasTokenFromUrl ? "Admin" : "Super Admin";
        setSuccess(`${label} account created. Redirecting...`);
        setTimeout(() => navigate("/admin"), 1500);
      } else if (data.status === "pending") {
        setSuccess(data.message || "Account created. Awaiting Super Admin approval.");
      }
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
        <div className="absolute inset-0 flex flex-col justify-center px-16 text-[color:var(--cream-soft)]">
          <Shield className="h-12 w-12 text-[color:var(--gold-royal)] mb-6" />
          <h2 className="font-display text-5xl font-bold leading-tight">Create Admin Account</h2>
          <p className="mt-5 opacity-80 text-lg">Set up administrator access for DestinyPair.</p>
          <div className="mt-10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gold flex items-center justify-center"><Shield className="h-5 w-5 text-[color:var(--emerald-deep)]" /></div>
            <p className="text-sm opacity-80">Requires a valid invitation token unless bootstrapping.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
          <h1 className="font-display text-4xl font-bold">Admin Sign Up</h1>
          <p className="mt-2 text-muted-foreground">Create an administrator account.</p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald-deep text-sm text-center">
              <CheckCircle className="h-5 w-5 inline-block mr-2" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">First Name</label>
                <input type="text" value={form.first_name} onChange={e => set("first_name", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Last Name</label>
                <input type="text" value={form.last_name} onChange={e => set("last_name", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input type="email" required value={form.email} onChange={e => set("email", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} required value={form.password} onChange={e => set("password", e.target.value)} className="w-full px-4 py-3 pr-11 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
                {form.password.length > 0 && (
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition" tabIndex={-1}>
                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Confirm Password</label>
              <div className="relative">
                <input type={showPw2 ? "text" : "password"} required value={form.password2} onChange={e => set("password2", e.target.value)} className="w-full px-4 py-3 pr-11 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
                {form.password2.length > 0 && (
                  <button type="button" onClick={() => setShowPw2(!showPw2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition" tabIndex={-1}>
                    {showPw2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-border accent-[color:var(--emerald-deep)]" />
              <span className="text-sm text-muted-foreground">Remember me</span>
            </label>
            {hasTokenFromUrl ? (
              <div>
                <label className="block text-sm font-semibold mb-2">Role</label>
                <p className="px-4 py-3 rounded-xl bg-background border border-border text-muted-foreground text-sm font-semibold">
                  {invitationRole || "Assigned from invitation"}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold mb-2">Role</label>
                <p className="px-4 py-3 rounded-xl bg-background border border-border text-muted-foreground text-sm font-semibold">
                  Super Admin
                </p>
              </div>
            )}
            <button type="submit" disabled={loading || success} className="w-full py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition disabled:opacity-50">
              {loading ? "Creating..." : "Create Admin Account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/admin/login" className="font-bold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default AdminSignup;
