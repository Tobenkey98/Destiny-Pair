import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, CreditCard, Loader2, Lock, ShieldCheck, X,
} from "lucide-react";
import { api } from "../lib/api";
import { encryptCard, generateNonce, getEncryptionKey } from "../lib/encryption";
import { FlutterwaveIcon } from "../lib/payment-icons";

function formatCardNumber(value) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function CheckoutForm({ plan, onSuccess, onPinSubmit, requireConsent }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [pin, setPin] = useState("");
  const [consentChecked, setConsentChecked] = useState(!requireConsent);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const encryptionKey = getEncryptionKey();
  const amount = plan ? (plan.price_display || `\u20A6${Number(plan.price).toLocaleString()}`) : "";
  const ready = Boolean(encryptionKey && consentChecked && phase === "idle");

  function handleGatewayResponse(data) {
    const status = data?.status || "";
    const nextAction = data?.data?.next_action || {};
    const auth = data?.meta?.authorization || {};

    if (status === "successful") {
      setPhase("success");
      if (typeof onSuccess === "function") onSuccess(data);
      return;
    }

    if (auth.mode === "redirect" || nextAction.type === "redirect") {
      const url = auth.redirect || nextAction.redirect_url || "";
      if (url) {
        setPhase("redirecting");
        window.location.href = url;
        return;
      }
    }

    if (auth.mode === "pin" || nextAction.type === "requires_pin") {
      setPhase("pin");
      return;
    }

    setError(
      data?.data?.message ||
        data?.message ||
        "Your card could not be charged. Please check the details and try again.",
    );
    setPhase("error");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const [year, month] = expiry.replace(/\D/g, "").match(/.{1,2}/g) || [];
    if (cardNumber.replace(/\D/g, "").length < 13 || !month || !year || cvv.replace(/\D/g, "").length < 3) {
      setError("Please enter a valid card number, expiry date and CVV.");
      return;
    }
    setError("");
    setPhase("charging");
    try {
      const payload = await encryptCard(
        {
          card_number: cardNumber.replace(/\D/g, ""),
          expiry_month: month,
          expiry_year: year,
          cvv: cvv.replace(/\D/g, ""),
        },
        encryptionKey,
        generateNonce(),
      );
      const data = await api.chargeCard({ ...payload, plan_slug: plan?.slug });
      setResult(data);
      handleGatewayResponse(data);
    } catch (err) {
      setError(err.data?.error || err.message || "Could not process your card.");
      setPhase("error");
    }
  }

  async function handlePinSubmit(e) {
    e.preventDefault();
    if (typeof onPinSubmit !== "function") {
      setError("Complete the PIN prompt in the secure checkout window, then verify your payment.");
      return;
    }
    setError("");
    setPhase("charging");
    try {
      const data = await onPinSubmit(pin, result);
      setResult(data);
      handleGatewayResponse(data);
    } catch (err) {
      setError(err.data?.error || err.message || "Could not complete the PIN charge.");
      setPhase("pin");
    }
  }

  if (phase === "success") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-border bg-background p-10 text-center shadow-soft">
        <div className="h-16 w-16 rounded-full bg-emerald/15 mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-9 w-9 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
        </div>
        <h3 className="mt-5 font-display text-3xl font-bold text-gradient-luxury">Payment confirmed</h3>
        <p className="mt-3 text-muted-foreground">
          Your card was charged successfully{plan ? <> for the <strong>{plan.name}</strong> plan</> : null}.
          {result?.data?.id ? (
            <span className="mt-4 block text-xs text-muted-foreground/80">
              Transaction id: <span className="font-semibold text-foreground">{result.data.id}</span>
            </span>
          ) : null}
        </p>
        <Link to="/dashboard" className="mt-8 inline-block px-10 py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition">
          Go to dashboard
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-background p-8 sm:p-10 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 bg-secondary">
          <FlutterwaveIcon />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold">Pay with card</h3>
          <p className="text-sm text-muted-foreground">
            {amount ? <>Charge <strong className="text-foreground">{amount}</strong> </> : "Charge "}
            to your card — details are encrypted in your browser, we never see them.
          </p>
        </div>
        <CreditCard className="h-6 w-6 text-[color:var(--gold-royal)]" />
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <div>
          <label htmlFor="card_number" className="block text-sm font-semibold">Card number</label>
          <input
            id="card_number"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            disabled={phase !== "idle"}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-royal)] focus:ring-[color:var(--gold-royal)] outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="card_expiry" className="block text-sm font-semibold">Expiry</label>
            <input
              id="card_expiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              disabled={phase !== "idle"}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-royal)] focus:ring-[color:var(--gold-royal)] outline-none"
            />
          </div>
          <div>
            <label htmlFor="card_cvv" className="block text-sm font-semibold">CVV</label>
            <input
              id="card_cvv"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="•••"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              disabled={phase !== "idle"}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-royal)] focus:ring-[color:var(--gold-royal)] outline-none"
            />
          </div>
        </div>

        {!encryptionKey && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>Card payments are not configured yet (encryption key missing). Please use the hosted checkout or come back later.</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {requireConsent && (
          <div className={`p-4 rounded-2xl border transition ${consentChecked ? "border-[color:var(--gold-royal)]/40 bg-gold/5" : "border-border bg-background"}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                aria-required="true"
                className="mt-1 h-4 w-4 rounded border-border text-[color:var(--emerald-deep)] focus:ring-[color:var(--gold-royal)]"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                By subscribing to this plan, you agree to the{" "}
                <Link to="/terms-of-use" target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] underline underline-offset-2 hover:opacity-80">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link to="/refund-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] underline underline-offset-2 hover:opacity-80">
                  Refund &amp; Cancellation Policy
                </Link>.
              </span>
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={!ready}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald px-8 py-3.5 font-bold text-[color:var(--gold-royal)] shadow-soft hover:shadow-glow transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {phase === "charging" || phase === "redirecting" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {phase === "redirecting" ? "Opening secure checkout…" : "Encrypting card details…"}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" /> Pay now
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-secondary/60 text-sm text-muted-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
        <p>
          <strong className="text-foreground">Secure by design.</strong> Your card details are AES-256-GCM encrypted
          in your browser before anything is sent, and are decrypted only by the gateway. We never see or store them.
        </p>
      </div>

      {phase === "pin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.form initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            onSubmit={handlePinSubmit}
            className="w-full max-w-sm rounded-3xl border border-border bg-background p-8 shadow-luxe">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-xl font-bold">Enter your card PIN</h4>
              <button
                type="button"
                onClick={() => setPhase("idle")}
                aria-label="Close PIN prompt"
                className="rounded-full border border-border p-2 hover:bg-secondary transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Your bank requires a PIN to authorise this charge. It is sent straight to Flutterwave — we never see it.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Enter PIN"
              className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] text-foreground placeholder:text-muted-foreground/40 focus:border-[color:var(--gold-royal)] focus:ring-[color:var(--gold-royal)] outline-none"
            />
            {error && (
              <p className="mt-3 text-sm text-destructive flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pin.length < 4}
              className="mt-5 w-full rounded-full bg-emerald px-8 py-3.5 font-bold text-[color:var(--gold-royal)] shadow-soft hover:shadow-glow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Confirm PIN
            </button>
          </motion.form>
        </div>
      )}
    </div>
  );
}

export default CheckoutForm;