import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendVerification } = useAuth();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState(email ? "form" : "error");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const inputsRef = useRef([]);

  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  function handleChange(index, value) {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = ["", "", "", "", "", ""];
    for (let i = 0; i < paste.length; i++) {
      newCode[i] = paste[i];
    }
    setCode(newCode);
    const next = Math.min(paste.length, 5);
    inputsRef.current[next]?.focus();
  }

  async function handleVerify() {
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;
    setLoading(true);
    setMessage("");
    try {
      await verifyEmail(email, fullCode);
      setStatus("success");
      setMessage("Your email has been verified! You can now sign in.");
    } catch (err) {
      setMessage(err.data?.error || err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      setResent(false);
      await resendVerification(email);
      setResent(true);
      setCode(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } catch {}
  }

  return (
    <section className="min-h-screen pt-28 pb-20 flex items-center justify-center bg-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-6 p-8 md:p-10 rounded-3xl glass shadow-luxe text-center"
      >
        {status === "form" && (
          <>
            <div className="h-16 w-16 rounded-full bg-emerald flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-[color:var(--gold-royal)]" />
            </div>
            <h2 className="font-display text-2xl font-bold mt-6">Verify Your Email</h2>
            <p className="text-muted-foreground mt-2">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>

            {message && (
              <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {message}
              </div>
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
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-11 h-13 sm:w-13 sm:h-14 rounded-xl bg-background border border-border text-center text-xl font-bold focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition"
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || code.join("").length !== 6}
              className="mt-8 w-full py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <p className="mt-6 text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              <button
                onClick={handleResend}
                disabled={resent}
                className="font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] hover:underline"
              >
                {resent ? "Resent!" : "Resend"}
              </button>
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="h-16 w-16 rounded-full bg-emerald flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-[color:var(--gold-royal)]" />
            </div>
            <h2 className="font-display text-2xl font-bold mt-6 text-gradient-gold">Email Verified!</h2>
            <p className="text-muted-foreground mt-2">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block px-8 py-3 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition"
            >
              Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto border border-destructive/30">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-display text-2xl font-bold mt-6">Verification Failed</h2>
            <p className="text-muted-foreground mt-2">{message || "Invalid verification link."}</p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 px-8 py-3 rounded-full border border-border font-semibold"
            >
              Back to Sign In <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </motion.div>
    </section>
  );
}

export default VerifyEmail;
