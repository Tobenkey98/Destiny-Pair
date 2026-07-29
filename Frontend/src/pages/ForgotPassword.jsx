import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Mail, CheckCircle, ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { api } from "../lib/api";

const STEPS = ["Email", "Code", "Reset"];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [showOp, setShowOp] = useState(false);
  const [showNp, setShowNp] = useState(false);
  const [showNp2, setShowNp2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (step === 2 && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [step]);

  async function handleSendCode(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.forgotPassword(email);
      setStep(2);
    } catch (err) {
      setError(err.data?.error || err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(index, value) {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index, e) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = ["", "", "", "", "", ""];
    for (let i = 0; i < paste.length; i++) newCode[i] = paste[i];
    setCode(newCode);
    const next = Math.min(paste.length, 5);
    inputsRef.current[next]?.focus();
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.resetPassword({ email, code: code.join(""), old_password: oldPassword, new_password: newPassword, new_password2: newPassword2 });
      setSuccess(true);
    } catch (err) {
      setError(err.data?.error || err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen pt-28 pb-20 flex items-center justify-center bg-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-6 p-8 md:p-10 rounded-3xl glass shadow-luxe"
      >
        {!success ? (
          <>
            <div className="flex items-center gap-2 mb-6">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="p-1.5 rounded-xl hover:bg-foreground/5 text-muted-foreground">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1 flex justify-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className={`h-1.5 w-10 rounded-full transition ${i + 1 <= step ? "bg-emerald" : "bg-border"}`} />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="h-14 w-14 rounded-2xl bg-emerald/10 flex items-center justify-center mx-auto">
                    <Lock className="h-7 w-7 text-emerald-deep dark:text-gold-royal" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-center mt-4">Forgot Password</h2>
                  <p className="text-muted-foreground text-center text-sm mt-1">Enter your email to receive a reset code.</p>

                  {error && (
                    <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">{error}</div>
                  )}

                  <form onSubmit={handleSendCode} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Email</label>
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
                    </div>
                    <button type="submit" disabled={loading || !email} className="w-full py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition disabled:opacity-50">
                      {loading ? "Sending..." : "Send Reset Code"}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="h-14 w-14 rounded-2xl bg-emerald/10 flex items-center justify-center mx-auto">
                    <Mail className="h-7 w-7 text-emerald-deep dark:text-gold-royal" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-center mt-4">Enter Reset Code</h2>
                  <p className="text-muted-foreground text-center text-sm mt-1">6-digit code sent to <strong>{email}</strong></p>

                  {error && (
                    <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">{error}</div>
                  )}

                  <div className="mt-8 flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputsRef.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        className="w-11 h-13 sm:w-13 sm:h-14 rounded-xl bg-background border border-border text-center text-xl font-bold focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition"
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const fullCode = code.join("");
                      if (fullCode.length !== 6) return;
                      setStep(3);
                    }}
                    disabled={code.join("").length !== 6}
                    className="mt-8 w-full py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition disabled:opacity-50"
                  >
                    Continue
                  </button>

                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    <button onClick={handleSendCode} disabled={loading} className="font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] hover:underline">
                      Resend Code
                    </button>
                  </p>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="h-14 w-14 rounded-2xl bg-emerald/10 flex items-center justify-center mx-auto">
                    <Lock className="h-7 w-7 text-emerald-deep dark:text-gold-royal" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-center mt-4">Reset Password</h2>
                  <p className="text-muted-foreground text-center text-sm mt-1">Enter your remembered password and set a new one.</p>

                  {error && (
                    <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">{error}</div>
                  )}

                  <form onSubmit={handleReset} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Last Password You Remember</label>
                      <div className="relative">
                        <input type={showOp ? "text" : "password"} required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full px-4 py-3 pr-11 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
                        {oldPassword.length > 0 && (
                          <button type="button" onClick={() => setShowOp(!showOp)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition" tabIndex={-1}>
                            {showOp ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">New Password</label>
                      <div className="relative">
                        <input type={showNp ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 pr-11 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
                        {newPassword.length > 0 && (
                          <button type="button" onClick={() => setShowNp(!showNp)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition" tabIndex={-1}>
                            {showNp ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input type={showNp2 ? "text" : "password"} required value={newPassword2} onChange={e => setNewPassword2(e.target.value)} className="w-full px-4 py-3 pr-11 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none" />
                        {newPassword2.length > 0 && (
                          <button type="button" onClick={() => setShowNp2(!showNp2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition" tabIndex={-1}>
                            {showNp2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <button type="submit" disabled={loading || !oldPassword || !newPassword || !newPassword2} className="w-full py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition disabled:opacity-50">
                      {loading ? "Resetting..." : "Reset Password"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password? <Link to="/login" className="font-bold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-full bg-emerald flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-[color:var(--gold-royal)]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-center mt-6 text-gradient-gold">Password Reset!</h2>
            <p className="text-muted-foreground text-center mt-2">Your password has been reset successfully.</p>
            <Link
              to="/login"
              className="mt-6 block text-center px-8 py-3 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition"
            >
              Back to Sign In
            </Link>
          </>
        )}
      </motion.div>
    </section>
  );
}
