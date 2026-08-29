import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Check, CheckCircle2, CreditCard, Loader2,
  ShieldCheck, Sparkles, AlertTriangle, XCircle,
} from "lucide-react";
import { PageHero, Reveal } from "../components/Section";
import { api, getUserAccessToken } from "../lib/api";
import { PLAN_FALLBACK, planFeatures, planMeta } from "../lib/plans";
import { DOCUMENT_VERSIONS } from "../legalContent/versions";
import { FlutterwaveIcon } from "../lib/payment-icons";

const GATEWAYS = [
  {
    id: "flutterwave",
    name: "Flutterwave",
    tagline: "Card, bank transfer, USSD & mobile money",
    note: "Pay by card, bank transfer, USSD or mobile money through Flutterwave's secure checkout.",
    icon: FlutterwaveIcon,
    ring: "hover:border-[color:var(--emerald-deep)] dark:hover:border-[color:var(--gold-royal)]",
  },
];

function Checkout() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  const reference = searchParams.get("reference") || "";
  const txRef = searchParams.get("tx_ref") || "";
  const transactionReference = searchParams.get("transactionReference") || "";
  const transactionId = searchParams.get("transaction_id") || "";
  const flwStatus = searchParams.get("status") || "";
  const returnReference = reference || txRef || transactionReference || "";
  // Flutterwave returns via tx_ref (and no explicit gateway param), so infer it.
  const returningGateway = txRef ? "flutterwave" : (searchParams.get("gateway") || "flutterwave");
  const returning = Boolean(reference || txRef || transactionReference || searchParams.get("status"));

  const [plans, setPlans] = useState(PLAN_FALLBACK);
  const [phase, setPhase] = useState("idle"); // idle | loading | redirecting | verifying | success | error
  const [error, setError] = useState("");
  const [activePlanSlug, setActivePlanSlug] = useState(null);
  const [verifyingGateway, setVerifyingGateway] = useState(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const plan = useMemo(() => plans.find(p => p.slug === slug) || null, [plans, slug]);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => setPlans(PLAN_FALLBACK));
  }, []);

  // Gate: must be signed in to pay.
  useEffect(() => {
    if (!getUserAccessToken()) {
      sessionStorage.setItem("checkout_intent", `/checkout/${slug}`);
      navigate("/login", { replace: true });
    }
  }, [navigate, slug]);

  // Redirects for unusable plans.
  useEffect(() => {
    if (plan && plan.slug === "free") navigate("/register", { replace: true });
    if (plan && !returning) api.getCurrentSubscription()
      .then(d => {
        if (d?.subscription?.status === "active" && d?.plan?.slug === plan.slug) {
          setActivePlanSlug(plan.slug);
        }
      })
      .catch(() => {});
  }, [plan, navigate, returning]);

  // Coming back from the gateway: verify server-side, then activate.
  // Retries a couple of times because OPay/Flutterwave can take a moment to
  // finalise the transaction after the user returns.
  useEffect(() => {
    if (!returning || !plan || phase !== "idle") return;
    const gateway = returningGateway;
    setVerifyingGateway(gateway);
    setPhase("verifying");

      const attempt = (triesLeft) =>
        api.verifyPayment({
          gateway,
          reference: returnReference || undefined,
          transaction_id: transactionId || undefined,
          flw_status: flwStatus || undefined,
        })
        .then(() => {
          setPhase("success");
          sessionStorage.removeItem("checkout_intent");
        })
        .catch((err) => {
          const code = err.data?.error;
          if (triesLeft > 0 && (code === "PAYMENT_NOT_SUCCESSFUL" || code === "GATEWAY_UNAVAILABLE")) {
            setTimeout(() => attempt(triesLeft - 1), 3000);
            return;
          }
          setError(code || err.message || "We could not confirm your payment.");
          // A definitively unsuccessful / mismatched payment is shown as "declined".
          if (code === "PAYMENT_NOT_SUCCESSFUL" || code === "AMOUNT_MISMATCH") {
            setPhase("declined");
          } else {
            setPhase("error");
          }
        });

    attempt(2);
  }, [returning, plan, phase, searchParams, returnReference, transactionId]);

  async function launchFlutterwave(data) {
    let FlutterwaveCheckout = window.FlutterwaveCheckout;
    if (!FlutterwaveCheckout) {
      FlutterwaveCheckout = await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.id = "flw-checkout-script";
        s.src = "https://checkout.flutterwave.com/v3.js";
        s.async = true;
        s.onload = () => resolve(window.FlutterwaveCheckout);
        s.onerror = () => reject(new Error("Could not load the Flutterwave checkout."));
        document.body.appendChild(s);
      });
    }
    const goBack = (status, txRef, txId) => {
      try {
        const url = new URL(data.redirect_url);
        if (status) url.searchParams.set('status', status);
        if (txRef) url.searchParams.set('tx_ref', txRef);
        if (txId) url.searchParams.set('transaction_id', txId);
        window.location.href = url.toString();
      } catch {
        setPhase("idle");
      }
    };
    FlutterwaveCheckout({
      public_key: data.public_key,
      tx_ref: data.tx_ref,
      amount: data.amount,
      currency: data.currency,
      customer: {
        email: data.customer_email,
        name: data.customer_name,
        phonenumber: data.customer_phone,
      },
      payment_options: data.payment_options || 'card, account, ussd, mobilemoney, banktransfer',
      redirect_url: data.redirect_url,
      callback: (response) => {
        const r = response || {};
        const txId =
          r.transaction_id ||
          (r.data && r.data.transaction_id) ||
          r.id ||
          (r.data && r.data.id) ||
          '';
        goBack(r.status || 'successful', r.tx_ref || data.tx_ref, txId);
      },
      onclose: () => {
        // User dismissed the modal without completing the payment.
        goBack('cancelled', data.tx_ref, '');
      },
    });
  }

  async function startCheckout(gateway) {
    if (!plan) return;
    if (!consentChecked) {
      setError("Please review and accept the Terms of Use and the Refund & Cancellation Policy to continue.");
      return;
    }
    setError("");
    setPhase("loading");
    setVerifyingGateway(gateway);
    try {
      // Record consent for the current document versions (best effort —
      // the backend refuses checkout without it regardless).
      const versions = await api.getLegalVersions().catch(() => DOCUMENT_VERSIONS);
      await Promise.all(
        ["TERMS_OF_USE", "REFUND_POLICY"].map((type) =>
          api.recordConsent({ consent_type: type, accepted: true, document_version: versions?.[type] || DOCUMENT_VERSIONS[type] }).catch(() => {}),
        ),
      );

      const data = await api.initPayment({ plan_slug: plan.slug, gateway });
      if (!data.tx_ref || !data.public_key) {
        throw new Error("Flutterwave is not fully configured (missing public key).");
      }
      setPhase("redirecting");
      await launchFlutterwave(data);
    } catch (err) {
      if (err.data?.error === "CONSENT_REQUIRED") {
        setError("Please review and accept the Terms of Use and the Refund & Cancellation Policy to continue.");
      } else if (err.data?.error === "GATEWAY_UNAVAILABLE") {
        setError("This payment method is temporarily unavailable. Please try the other one or come back later.");
      } else {
        setError(err.data?.error || err.message || "Could not start checkout.");
      }
      setPhase("idle");
    }
  }

  const meta = plan ? planMeta(plan.slug) : { featured: false, icon: Sparkles, per: "/month" };
  const Icon = meta.icon;

  return (
    <>
      <PageHero
        eyebrow="Checkout"
        title="One step from the rest of forever."
        subtitle="Review your plan, pick a payment method, and let the gateway handle the rest — securely."
      />

      <section className="py-16 pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <Link to="/membership" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to membership
          </Link>

          {!plan ? (
            <div className="mt-10 rounded-3xl border border-border bg-background p-12 text-center shadow-soft">
              <p className="text-muted-foreground">Loading plan details…</p>
            </div>
          ) : (
            <div className="mt-8 grid lg:grid-cols-5 gap-8 items-start">
              {/* Plan summary */}
              <div className="lg:col-span-2">
                <Reveal>
                  <motion.div whileHover={{ y: -6 }} className={`relative p-8 rounded-3xl transition-all ${meta.featured ? "bg-luxury text-[color:var(--cream-soft)] shadow-luxe" : "bg-background border border-border shadow-soft"}`}>
                    {meta.featured && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gold text-[color:var(--emerald-deep)] text-xs font-bold tracking-wider shadow-glow">MOST POPULAR</div>
                    )}
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-5 ${meta.featured ? "bg-gold" : "bg-emerald"}`}>
                      <Icon className={`h-7 w-7 ${meta.featured ? "text-[color:var(--emerald-deep)]" : "text-[color:var(--gold-royal)]"}`} />
                    </div>
                    <h2 className={`font-display text-3xl font-bold ${meta.featured ? "text-gradient-gold" : ""}`}>{plan.name}</h2>
                    <div className="mt-5 flex items-end gap-2">
                      <span className={`font-display text-5xl font-bold ${meta.featured ? "text-gradient-gold" : "text-gradient-luxury"}`}>{plan.price_display || `\u20A6${Number(plan.price).toLocaleString()}`}</span>
                      <span className={`text-sm pb-1.5 ${meta.featured ? "text-[color:var(--cream-soft)]/70" : "text-muted-foreground"}`}>{meta.per}</span>
                    </div>
                    <ul className="mt-7 space-y-3">
                      {planFeatures(plan).slice(0, 8).map(f => (
                        <li key={f} className="flex gap-3 items-start">
                          <Check className={`h-5 w-5 shrink-0 mt-0.5 ${meta.featured ? "text-[color:var(--gold-royal)]" : "text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]"}`} />
                          <span className="text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </Reveal>
              </div>

              {/* Payment */}
              <div className="lg:col-span-3">
                <Reveal delay={0.1}>
                  {activePlanSlug === plan.slug && phase === "idle" ? (
                    <div className="rounded-3xl border border-border bg-background p-10 text-center shadow-soft">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
                      <h3 className="mt-4 font-display text-2xl font-bold">Your {plan.name} plan is already active</h3>
                      <p className="mt-2 text-muted-foreground">No need to pay again — head back to your dashboard and enjoy the benefits.</p>
                      <Link to="/dashboard" className="mt-8 inline-block px-10 py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition">Go to dashboard</Link>
                    </div>
                  ) : phase === "success" ? (
                    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-border bg-background p-10 text-center shadow-soft">
                      <div className="h-16 w-16 rounded-full bg-emerald/15 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="h-9 w-9 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
                      </div>
                      <h3 className="mt-5 font-display text-3xl font-bold text-gradient-luxury">Payment confirmed</h3>
                      <p className="mt-3 text-muted-foreground">Your <strong>{plan.name}</strong> plan is now active. Welcome to the next chapter of your journey.</p>
                      {returnReference && (
                        <p className="mt-4 text-xs text-muted-foreground/80">Transaction reference: <span className="font-semibold text-foreground">{returnReference}</span></p>
                      )}
                      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/dashboard" className="px-8 py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition">Go to dashboard</Link>
                        <Link to="/membership" className="px-8 py-3.5 rounded-full border border-border font-bold hover:bg-secondary transition">View plans</Link>
                      </div>
                    </motion.div>
                  ) : phase === "declined" ? (
                    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-border bg-background p-10 text-center shadow-soft">
                      <div className="h-16 w-16 rounded-full bg-destructive/15 mx-auto flex items-center justify-center">
                        <XCircle className="h-9 w-9 text-destructive" />
                      </div>
                      <h3 className="mt-5 font-display text-3xl font-bold">Payment not successful</h3>
                      <p className="mt-3 text-muted-foreground">Your payment was declined or could not be confirmed with the provider. No charge has been applied to your account.</p>
                      {returnReference && (
                        <p className="mt-4 text-xs text-muted-foreground/80">Reference: <span className="font-semibold text-foreground">{returnReference}</span></p>
                      )}
                      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <button onClick={() => { setPhase("idle"); setError(""); }} className="px-8 py-3.5 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition">Try again</button>
                        <Link to="/membership" className="px-8 py-3.5 rounded-full border border-border font-bold hover:bg-secondary transition">View plans</Link>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="rounded-3xl border border-border bg-background p-8 sm:p-10 shadow-soft">
                      <h3 className="font-display text-2xl font-bold">Choose how to pay</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground">Select a payment method to continue. You will leave DestinyPair briefly to complete the payment on the gateway&rsquo;s secure page.</p>

                      <div className="mt-7 space-y-4">
                        {GATEWAYS.map(gw => {
                          const GwIcon = gw.icon;
                          const busy = phase !== "idle" && verifyingGateway === gw.id;
                          return (
                            <button
                              key={gw.id}
                              onClick={() => startCheckout(gw.id)}
                              disabled={phase !== "idle" || !consentChecked}
                              className={`w-full text-left p-5 rounded-2xl border border-border bg-background transition hover:shadow-soft disabled:opacity-60 ${gw.ring} group ${!consentChecked ? "disabled:cursor-not-allowed" : ""}`}
                            >
                              <div className="flex items-center gap-4">
                               <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 bg-secondary">
                                 <GwIcon />
                               </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-display text-lg font-bold">{gw.name}</span>
                                    <span className="hidden sm:block text-xs px-3 py-1 rounded-full bg-secondary font-semibold">{gw.tagline}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{gw.note}</p>
                                </div>
                                {busy ? (
                                  <Loader2 className="h-6 w-6 animate-spin text-[color:var(--gold-royal)]" />
                                ) : phase === "redirecting" ? null : (
                                  <span className="rounded-full border border-border p-2 group-hover:bg-secondary transition">
                                    <ArrowLeft className="h-4 w-4 rotate-180" />
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {phase === "loading" && (
                        <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Preparing your secure checkout…
                        </p>
                      )}
                      {phase === "redirecting" && (
                        <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Opening Flutterwave&rsquo;s secure checkout…
                        </p>
                      )}
                      {phase === "verifying" && (
                        <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment with {verifyingGateway}…
                        </p>
                      )}

                      {/* Subscription consent */}
                      <div className={`mt-7 p-4 rounded-2xl border transition ${consentChecked ? "border-[color:var(--gold-royal)]/40 bg-gold/5" : "border-border bg-background"}`}>
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
                        {!consentChecked && (
                          <p className="mt-2 pl-7 text-xs text-muted-foreground/80">
                            Payment options are enabled once you accept.
                          </p>
                        )}
                      </div>

                      {error && (
                        <div className="mt-5 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex gap-3 items-start">
                          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                          <div>
                            <p>{error}</p>
                            {phase === "error" && (
                              <button onClick={() => { setPhase("idle"); setError(""); }} className="mt-2 font-bold underline">
                                Retry verification
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-7 flex items-start gap-3 p-4 rounded-2xl bg-secondary/60 text-sm text-muted-foreground">
                        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
                        <p>
                          <strong className="text-foreground">Secure by design.</strong> Prices are set by DestinyPair and re-verified by the gateway before your plan activates. Your card details are handled only by your chosen payment provider — we never see or store them.
                        </p>
                      </div>
                    </div>
                  )}
                </Reveal>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default Checkout;
