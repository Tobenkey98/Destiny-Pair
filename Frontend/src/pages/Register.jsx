import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Check, ArrowRight, ArrowLeft, Mail, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GoogleIcon, FacebookIcon } from "../lib/social-icons";
import { loginWithGoogle, loginWithFacebook, initGoogle, initFacebook } from "../lib/social";
import { states, lgas, ethnicGroups } from "../lib/nigeria";
import { api } from "../lib/api";
import AutocompleteInput from "../components/AutocompleteInput";

const steps = [
  { title: "Account", desc: "How we'll reach you" },
  { title: "Personal", desc: "About you" },
  { title: "Faith", desc: "Your tradition" },
  { title: "Education", desc: "Your background" },
  { title: "About You", desc: "Your story" },
  { title: "Consent", desc: "Verification" },
];

const QUALIFICATION_OPTIONS = ["SSCE", "OND", "HND", "B.Sc", "B.A", "B.Eng", "LLB", "MBBS", "Pharm.D", "M.Sc", "MBA", "M.Eng", "P.hd"];

const STEP_FIELDS = {
  1: ["first_name", "last_name", "email", "phone", "password", "password2"],
  2: ["gender", "dob_day", "dob_month", "dob_year", "state_of_residence", "lga_of_residence", "state_of_origin", "ethnic_group"],
  3: ["denomination"],
  4: ["highest_qualification", "profession"],
  5: ["about_self", "seeking_description"],
};

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  else if (/[a-zA-Z]/.test(pw)) score += 0.5;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const PASSWORD_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const PASSWORD_COLORS = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald"];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const currentYearDOB = new Date().getFullYear();
const DOB_YEARS = Array.from({length: 83}, (_, i) => currentYearDOB - 18 - i);
const DOB_DAYS = Array.from({length: 31}, (_, i) => i + 1);

function parseError(err) {
  if (!err.data) return err.message;
  const messages = [];
  for (const key of Object.keys(err.data)) {
    const val = err.data[key];
    if (Array.isArray(val)) messages.push(val[0]);
    else if (typeof val === "string") messages.push(val);
  }
  return messages.length ? messages.join(". ") : err.message;
}

function Register() {
  const navigate = useNavigate();
  const { signup, socialAuth } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [denominations, setDenominations] = useState([]);
  const [form, setForm] = useState({
    email: "", phone: "", password: "", password2: "",
    first_name: "", last_name: "", date_of_birth: "", gender: "",
    dob_day: "", dob_month: "", dob_year: "",
    state_of_residence: "", lga_of_residence: "",
    state_of_origin: "", lga_of_origin: "",
    faith: "", denomination: "", custom_denomination: "",
    highest_qualification: "", profession: "",
    ethnic_group: "",
    about_self: "", seeking_description: "",
    consent1: false, consent2: false, consent3: false,
  });
  const progress = (step / steps.length) * 100;

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: "" }));
  }

  function validateStep(s) {
    const fields = STEP_FIELDS[s];
    if (!fields) return true;
    const errors = {};
    for (const f of fields) {
      if (!form[f] || !form[f].toString().trim()) {
        errors[f] = "This field is required";
      }
    }
    if (s === 1) {
      if (form.password !== form.password2) errors.password2 = "Passwords do not match";
      if (form.password.length < 8) errors.password = "At least 8 characters";
      if (!/[a-zA-Z]/.test(form.password)) errors.password = "At least one letter";
      if (!/[0-9]/.test(form.password)) errors.password = "At least one number";
      if (!/[^a-zA-Z0-9]/.test(form.password)) errors.password = "At least one special character";
    }
    if (s === 2) {
      if (!form.lga_of_residence && form.state_of_residence) errors.lga_of_residence = "Select your LGA";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleContinue() {
    setError("");
    if (validateStep(step)) setStep(s => s + 1);
  }

  async function handleEmailSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    if (step === 6 && (!form.consent1 || !form.consent2 || !form.consent3)) {
      setFieldErrors({ consent: "Please check all boxes to continue" });
      return;
    }
    if (!validateStep(step)) return;
    setLoading(true);
    setError("");
    try {
      await signup({
        email: form.email,
        password: form.password,
        password2: form.password2,
        first_name: form.first_name.trim() || "User",
        consent_terms: form.consent2 && form.consent3,
        consent_privacy: form.consent2 && form.consent3,
      });
      const denominationId = form.denomination === "others" ? 29 : (form.denomination || "");
      const pending = {
        last_name: form.last_name, phone: form.phone,
        dob_day: form.dob_day, dob_month: form.dob_month, dob_year: form.dob_year,
        gender: form.gender,
        state_of_residence: form.state_of_residence, lga_of_residence: form.lga_of_residence,
        state_of_origin: form.state_of_origin, lga_of_origin: form.lga_of_origin,
        faith: "Christianity", denomination: denominationId,
        custom_denomination: form.denomination === "others" ? form.custom_denomination : "",
        highest_qualification: form.highest_qualification,
        profession: form.profession,
        ethnic_group: form.ethnic_group,
        about_self: form.about_self, seeking_description: form.seeking_description,
      };
      sessionStorage.setItem("pending_profile", JSON.stringify(pending));
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(parseError(err));
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
      navigate(result.created ? "/social-complete" : (result.user?.public_id ? `/dashboard/profile/${result.user.public_id}` : "/dashboard"));
    } catch (err) {
      setError(err.data?.error || err.message || `${provider} sign up failed.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initGoogle();
    initFacebook();
    api.getDenominations().then(data => setDenominations(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const pwStrength = getPasswordStrength(form.password);

  return (
    <section className="min-h-screen pt-28 pb-20 bg-hero">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gradient-luxury">Begin Your Journey</h1>
          <p className="mt-3 text-muted-foreground">
            {step === 0 && "Choose how to create your account"}
            {step > 0 && `Step ${step} of ${steps.length} — ${steps[step - 1].desc}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {step === 0 ? (
          <div className="space-y-4 max-w-md mx-auto">
            <button onClick={() => { setStep(1); }} disabled={loading} className="w-full flex items-center gap-4 p-5 rounded-2xl bg-background border border-border shadow-soft hover:shadow-luxe transition group">
              <div className="h-12 w-12 rounded-xl bg-emerald flex items-center justify-center shrink-0">
                <Mail className="h-6 w-6 text-[color:var(--gold-royal)]" />
              </div>
              <div className="text-left flex-1">
                <div className="font-display text-lg font-semibold">Sign up with Email</div>
                <div className="text-sm text-muted-foreground">Create an account with your email address</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition" />
            </button>

            <button onClick={() => handleSocial("google")} disabled={loading} className="w-full flex items-center gap-4 p-5 rounded-2xl bg-background border border-border shadow-soft hover:shadow-luxe transition group">
              <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                <GoogleIcon className="h-6 w-6" />
              </div>
              <div className="text-left flex-1">
                <div className="font-display text-lg font-semibold">Sign up with Google</div>
                <div className="text-sm text-muted-foreground">Quick sign-in with your Google account</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition" />
            </button>

            <button onClick={() => handleSocial("facebook")} disabled={loading} className="w-full flex items-center gap-4 p-5 rounded-2xl bg-background border border-border shadow-soft hover:shadow-luxe transition group">
              <div className="h-12 w-12 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0">
                <FacebookIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-display text-lg font-semibold">Sign up with Facebook</div>
                <div className="text-sm text-muted-foreground">Quick sign-in with your Facebook account</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition" />
            </button>

            <p className="text-center text-sm text-muted-foreground pt-4">
              Already a member? <Link to="/login" className="font-bold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Sign in</Link>
            </p>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div className="h-full bg-gold" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
              </div>
              <div className="mt-4 hidden md:flex justify-between">
                {steps.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition ${i < step || (step >= steps.length && i === steps.length - 1) ? "bg-emerald text-[color:var(--gold-royal)]" : i === step ? "bg-gold text-[color:var(--emerald-deep)] shadow-glow" : "bg-secondary text-muted-foreground"}`}>
                      {i < step || (step >= steps.length && i === steps.length - 1) ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold ${i === step || (step >= steps.length && i === steps.length - 1) ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleEmailSubmit}>
              <div className="p-8 md:p-10 rounded-3xl glass shadow-luxe">
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                    {step === 1 && (
                      <div className="grid sm:grid-cols-2 gap-5">
                        <Input label="First Name" value={form.first_name} onChange={v => set("first_name", v)} error={fieldErrors.first_name} />
                        <Input label="Last Name" value={form.last_name} onChange={v => set("last_name", v)} error={fieldErrors.last_name} />
                        <Input label="Email" type="email" value={form.email} onChange={v => set("email", v)} error={fieldErrors.email} />
                        <Input label="Phone" type="tel" value={form.phone} onChange={v => set("phone", v)} error={fieldErrors.phone} />
                        <PasswordInput label="Password" value={form.password} onChange={v => set("password", v)} error={fieldErrors.password}>
                          {form.password && (
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className={`h-full ${PASSWORD_COLORS[pwStrength]} transition-all`} style={{ width: `${(pwStrength / 4) * 100}%` }} />
                              </div>
                              <p className={`text-xs font-medium ${pwStrength >= 3 ? "text-emerald-deep dark:text-gold-royal" : "text-muted-foreground"}`}>
                                {PASSWORD_LABELS[pwStrength]} — at least 8 chars, 1 letter, 1 number, 1 special character
                              </p>
                            </div>
                          )}
                        </PasswordInput>
                        <PasswordInput label="Confirm Password" value={form.password2} onChange={v => set("password2", v)} error={fieldErrors.password2} />
                      </div>
                    )}
                    {step === 2 && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-display text-lg font-semibold mb-3 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Personal Details</h3>
                          <div className="grid sm:grid-cols-2 gap-5">
                            <Input label="First Name" value={form.first_name} onChange={v => set("first_name", v)} error={fieldErrors.first_name} />
                            <div>
                              <label className="block text-sm font-semibold mb-2">Date of Birth</label>
                              <div className="grid grid-cols-3 gap-2">
                                <select value={form.dob_day} onChange={e => set("dob_day", e.target.value)} className={`w-full px-4 py-3 rounded-xl bg-background border ${fieldErrors.dob_day ? "border-destructive" : "border-border"} focus:border-[color:var(--gold-royal)] outline-none`}>
                                  <option value="">Day</option>
                                  {DOB_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select value={form.dob_month} onChange={e => set("dob_month", e.target.value)} className={`w-full px-4 py-3 rounded-xl bg-background border ${fieldErrors.dob_month ? "border-destructive" : "border-border"} focus:border-[color:var(--gold-royal)] outline-none`}>
                                  <option value="">Month</option>
                                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select value={form.dob_year} onChange={e => set("dob_year", e.target.value)} className={`w-full px-4 py-3 rounded-xl bg-background border ${fieldErrors.dob_year ? "border-destructive" : "border-border"} focus:border-[color:var(--gold-royal)] outline-none`}>
                                  <option value="">Year</option>
                                  {DOB_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                              {(fieldErrors.dob_day || fieldErrors.dob_month || fieldErrors.dob_year) && <p className="text-xs text-destructive mt-1">Select your date of birth</p>}
                            </div>
                            <Select label="Gender" value={form.gender} onChange={v => set("gender", v)} options={["Male", "Female"]} error={fieldErrors.gender} />
                          </div>
                        </div>
                        <hr className="border-border" />
                        <div>
                          <h3 className="font-display text-lg font-semibold mb-3 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">State of Residence</h3>
                          <div className="grid sm:grid-cols-2 gap-5">
                            <Select label="State" value={form.state_of_residence} onChange={v => { set("state_of_residence", v); set("lga_of_residence", ""); }} options={states} placeholder="Select state" error={fieldErrors.state_of_residence} />
                            <Select label="LGA / City" value={form.lga_of_residence} onChange={v => set("lga_of_residence", v)} options={form.state_of_residence ? lgas[form.state_of_residence] : []} placeholder={form.state_of_residence ? "Select LGA" : "Select a state first"} error={fieldErrors.lga_of_residence} />
                          </div>
                        </div>
                        <hr className="border-border" />
                        <div>
                          <h3 className="font-display text-lg font-semibold mb-3 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">State of Origin</h3>
                          <div className="grid sm:grid-cols-2 gap-5">
                            <Select label="State" value={form.state_of_origin} onChange={v => { set("state_of_origin", v); set("lga_of_origin", ""); }} options={states} placeholder="Select state" error={fieldErrors.state_of_origin} />
                            <Select label="LGA / City" value={form.lga_of_origin} onChange={v => set("lga_of_origin", v)} options={form.state_of_origin ? lgas[form.state_of_origin] : []} placeholder={form.state_of_origin ? "Select LGA" : "Select a state first"} error={fieldErrors.lga_of_origin} />
                          </div>
                        </div>
                        <hr className="border-border" />
                        <div>
                          <h3 className="font-display text-lg font-semibold mb-3 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Ethnic Group</h3>
                          <Select label="Ethnic Group" value={form.ethnic_group} onChange={v => set("ethnic_group", v)} options={ethnicGroups} placeholder="Select ethnic group" error={fieldErrors.ethnic_group} />
                        </div>
                      </div>
                    )}
                    {step === 3 && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold mb-2">Faith</label>
                          <p className="px-4 py-3 rounded-xl bg-background border border-border text-sm font-semibold text-foreground">
                            Christianity
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2">Denomination</label>
                          <select value={form.denomination} onChange={e => { set("denomination", e.target.value); if (e.target.value !== "others") set("custom_denomination", ""); }} className={`w-full px-4 py-3 rounded-xl bg-background border ${fieldErrors.denomination ? "border-destructive" : "border-border"} focus:border-[color:var(--gold-royal)] outline-none`}>
                            <option value="">Select denomination</option>
                            {denominations.map(d => (
                              <option key={d.id} value={d.id === 29 ? "others" : d.id}>{d.name}</option>
                            ))}
                          </select>
                          {fieldErrors.denomination && <p className="text-xs text-destructive mt-1">{fieldErrors.denomination}</p>}
                        </div>
                        {form.denomination === "others" && (
                          <div>
                            <label className="block text-sm font-semibold mb-2">Enter your denomination</label>
                            <input type="text" value={form.custom_denomination} onChange={e => set("custom_denomination", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none" placeholder="Type your denomination name" />
                          </div>
                        )}
                      </div>
                    )}
                    {step === 4 && (
                      <div className="grid sm:grid-cols-2 gap-5">
                        <Select label="Highest qualification" value={form.highest_qualification} onChange={v => set("highest_qualification", v)} options={QUALIFICATION_OPTIONS} placeholder="Select qualification" />
                        <AutocompleteInput label="Profession" field="profession" value={form.profession} onChange={v => set("profession", v)} />
                      </div>
                    )}
                    {step === 5 && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold mb-2">Tell us about yourself</label>
                          <textarea rows={4} value={form.about_self} onChange={e => set("about_self", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none" />
                          {fieldErrors.about_self && <p className="text-xs text-destructive mt-1">{fieldErrors.about_self}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2">What you seek in a partner</label>
                          <textarea rows={4} value={form.seeking_description} onChange={e => set("seeking_description", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none" />
                          {fieldErrors.seeking_description && <p className="text-xs text-destructive mt-1">{fieldErrors.seeking_description}</p>}
                        </div>
                      </div>
                    )}
                    {step === 6 && (
                      <div className="space-y-5">
                        <p className="text-muted-foreground">To create your account, please review and accept the following:</p>
                        <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1" checked={form.consent1} onChange={e => set("consent1", e.target.checked)} /> <span className="text-sm">I confirm that I am single and legally eligible to use DestinyPair.</span></label>
                        <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1" checked={form.consent2} onChange={e => set("consent2", e.target.checked)} /> <span className="text-sm">I agree to the <Link to="/terms-of-use" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Terms of Use</Link> and <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Privacy Policy</Link>.</span></label>
                        <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1" checked={form.consent3} onChange={e => set("consent3", e.target.checked)} /> <span className="text-sm">I consent to the processing of my personal data as described in the <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Privacy Policy</Link>.</span></label>
                        {fieldErrors.consent && <p className="text-xs text-destructive">{fieldErrors.consent}</p>}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-6 flex justify-between gap-3">
                <button type="button" disabled={step === 1} onClick={() => setStep(s => s - 1)} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border font-semibold disabled:opacity-40">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                {step < 6 ? (
                  <button type="button" onClick={handleContinue} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition">
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={handleEmailSubmit} disabled={loading} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gold text-[color:var(--emerald-deep)] font-bold shadow-glow disabled:opacity-50">
                    {loading ? "Creating..." : "Sign Up"} <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already a member? <Link to="/login" className="font-bold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Input({ label, type = "text", value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className={`w-full px-4 py-3 rounded-xl bg-background border ${error ? "border-destructive" : "border-border"} focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition`} />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function PasswordInput({ label, value, onChange, error, children }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} className={`w-full px-4 py-3 pr-11 rounded-xl bg-background border ${error ? "border-destructive" : "border-border"} focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition`} />
        {value.length > 0 && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition" tabIndex={-1}>
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {children}
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder = "Select...", error }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={`w-full px-4 py-3 rounded-xl bg-background border ${error ? "border-destructive" : "border-border"} focus:border-[color:var(--gold-royal)] outline-none`}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export default Register;
