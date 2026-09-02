import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FourSquare } from "react-loading-indicators";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ethnicGroups } from "../lib/nigeria";
import { api } from "../lib/api";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const curYear = new Date().getFullYear();
const DOB_YEARS = Array.from({length: 83}, (_, i) => curYear - 18 - i);
const DOB_DAYS = Array.from({length: 31}, (_, i) => i + 1);

function SocialComplete() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [denominations, setDenominations] = useState([]);
  const QUALIFICATION_OPTIONS = ["SSCE", "OND", "HND", "B.Sc", "B.A", "B.Eng", "LLB", "MBBS", "Pharm.D", "M.Sc", "MBA", "M.Eng", "P.hd"];

  const [form, setForm] = useState({
    phone: "", gender: "",
    dob_day: "", dob_month: "", dob_year: "",
    faith: "", denomination: "", custom_denomination: "",
    highest_qualification: "", profession: "",
    ethnic_group: "",
  });

  useEffect(() => {
    api.getDenominations().then(data => setDenominations(Array.isArray(data) ? data : [])).catch(() => {});
    const raw = sessionStorage.getItem("pending_profile");
    if (raw) {
      try {
        const pending = JSON.parse(raw);
        setForm(prev => ({ ...prev, ...pending }));
        sessionStorage.removeItem("pending_profile");
      } catch {}
    }
  }, []);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const monthIndex = form.dob_month ? String(MONTHS.indexOf(form.dob_month) + 1).padStart(2, "0") : "";
      const dobStr = form.dob_year && monthIndex && form.dob_day
        ? `${form.dob_year}-${monthIndex}-${String(form.dob_day).padStart(2, "0")}`
        : "";
      const othersId = (denominations.find(d => d.name?.trim().toLowerCase() === "others") || {}).id || 29;
      const denominationId = form.denomination === "others" ? othersId : (form.denomination || "");
      const payload = {
        ...form,
        faith: "Christianity",
        denomination: denominationId,
        custom_denomination: form.denomination === "others" ? form.custom_denomination : "",
        date_of_birth: dobStr,
      };
      await updateProfile(payload);
      navigate(user?.public_id ? `/dashboard/profile/${user.public_id}` : "/dashboard");
    } catch (err) {
      setError(err.data?.error || err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <section className="min-h-screen pt-28 pb-20 flex items-center justify-center bg-hero">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </section>
    );
  }

  const steps = [
    {
      title: "Personal Details",
      content: (
        <div className="grid sm:grid-cols-2 gap-5">
          <Input label="First Name" value={user.first_name || ""} readonly />
          <Input label="Last Name" value={user.last_name || ""} readonly />
          <Input label="Email" value={user.email || ""} readonly />
          <Input label="Phone" type="tel" value={form.phone} onChange={v => set("phone", v)} />
          <div>
            <label className="block text-sm font-semibold mb-2">Date of Birth</label>
            <div className="grid grid-cols-3 gap-2">
              <select value={form.dob_day} onChange={e => set("dob_day", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none">
                <option value="">Day</option>
                {DOB_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={form.dob_month} onChange={e => set("dob_month", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none">
                <option value="">Month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={form.dob_year} onChange={e => set("dob_year", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none">
                <option value="">Year</option>
                {DOB_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <Select label="Gender" value={form.gender} onChange={v => set("gender", v)} options={["Male", "Female"]} />
          <Select label="Ethnic Group" value={form.ethnic_group} onChange={v => set("ethnic_group", v)} options={ethnicGroups} />
        </div>
      ),
    },
    {
      title: "Faith & Beliefs",
      content: (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2">Faith</label>
            <p className="px-4 py-3 rounded-xl bg-background border border-border text-sm font-semibold text-foreground">
              Christianity
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Denomination</label>
            <select value={form.denomination} onChange={e => { set("denomination", e.target.value); if (e.target.value !== "others") set("custom_denomination", ""); }} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none">
              <option value="">Select denomination</option>
              {denominations.filter(d => d.name?.trim().toLowerCase() !== "others").map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
              <option value="others">Others</option>
            </select>
          </div>
          {form.denomination === "others" && (
            <div>
              <label className="block text-sm font-semibold mb-2">Enter your denomination</label>
              <input type="text" value={form.custom_denomination} onChange={e => set("custom_denomination", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none" placeholder="Type your denomination name" />
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Education & Career",
      content: (
        <div className="grid sm:grid-cols-2 gap-5">
          <Select label="Highest qualification" value={form.highest_qualification} onChange={v => set("highest_qualification", v)} options={QUALIFICATION_OPTIONS} />
          <Input label="Profession" value={form.profession} onChange={v => set("profession", v)} />
        </div>
      ),
    },
  ];

  return (
    <section className="min-h-screen pt-28 pb-20 flex items-center justify-center bg-hero">
      <div className="w-full max-w-2xl mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-gradient-luxury">Complete Your Profile</h1>
          <p className="mt-3 text-muted-foreground">
            Just a few more details before you get started.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <div className="mb-8 flex justify-center gap-2">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
                i === step
                  ? "bg-emerald text-[color:var(--gold-royal)] shadow-soft"
                  : i < step
                  ? "bg-emerald/10 text-emerald-deep dark:text-gold-royal"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              {s.title}
            </button>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-8 md:p-10 rounded-3xl glass shadow-luxe"
        >
          {steps[step].content}
        </motion.div>

        <div className="mt-6 flex justify-between gap-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
            className="px-6 py-3 rounded-full border border-border font-semibold disabled:opacity-40 transition"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald text-[color:var(--gold-royal)] font-bold shadow-soft hover:shadow-glow transition"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gold text-[color:var(--emerald-deep)] font-bold shadow-glow disabled:opacity-50 transition"
            >
              {loading ? "Saving..." : "Complete & Go to Dashboard"} <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Input({ label, type = "text", value, onChange, readonly }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readonly}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        className={`w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition ${readonly ? "opacity-60 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder = "Select..." }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default SocialComplete;
