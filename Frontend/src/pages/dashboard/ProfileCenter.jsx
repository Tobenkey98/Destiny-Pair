import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  User, Heart, Sparkles, Camera, MapPin, Mail, Crown, Check, X, Trash2, Star,
  Shield, BookOpen, Cross, Scale, Dumbbell, Languages, Zap, Award, AlertCircle, ChevronRight, Edit3,
  Globe, Calendar, Users, Search, Save
} from "lucide-react";
import { FourSquare } from "react-loading-indicators";
import { useAuth } from "../../context/AuthContext";
import { api, getUserAccessToken } from "../../lib/api";
import { states, lgas, ethnicGroups } from "../../lib/nigeria";
import CoverCropModal from "../../components/CoverCropModal";

const AGE_OPTIONS = Array.from({length: 63}, (_, i)=> i+18);
const HEIGHT_OPTIONS = Array.from({length: 151}, (_, i)=> i+100);
const WEIGHT_OPTIONS = Array.from({length: 71}, (_, i)=> i+30);
const GENDER_OPTIONS = ["Male","Female"];
const MARITAL_OPTIONS = ["Single","Never Married","Divorced","Widowed","Separated"];
const GENOTYPE_OPTIONS = ["AA","AS","SS","AC","SC","CC"];
const BLOOD_OPTIONS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const NATIONALITIES = ["Nigerian","Ghanaian","Other"];

function CompletionRing({ pct }) {
  const r=44; const c= 2*Math.PI*r; const offset = c - (pct/100)*c;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="currentColor" className="text-foreground/10" strokeWidth="8" fill="none"/>
        <motion.circle cx="50" cy="50" r={r} stroke="url(#g)" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{strokeDashoffset:c}} animate={{strokeDashoffset:offset}} transition={{duration:1, ease:"easeOut"}} />
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#611C2B"/><stop offset="100%" stopColor="#D3A345"/></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-2xl font-bold text-foreground">{pct}%</span>
      </div>
    </div>
  );
}

const SECTIONS = [
  {id:"overview", label:"Overview", icon: Sparkles},
  {id:"basic", label:"Basic", icon: User},
  {id:"faith", label:"Faith", icon: Cross},
  {id:"personality", label:"Personality", icon: Zap},
  {id:"about", label:"About", icon: BookOpen},
  {id:"preferences", label:"Preferences", icon: Search},
  {id:"compatibility", label:"Health", icon: Scale},
  {id:"photos", label:"Photos", icon: Camera},
];

export default function ProfileCenter(){
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  const [active, setActive] = useState("overview");
  const [photos, setPhotos] = useState([]);
  const [denominations, setDenominations] = useState([]);
  const [vibes, setVibes] = useState([]);
  const [hobbies, setHobbies] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [locations, setLocations] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [form, setForm] = useState({});
  const [coverUploading, setCoverUploading] = useState(false);
  const [cropModal, setCropModal] = useState(null);
  const [membership, setMembership] = useState(null);
  const coverInputRef = useRef(null);
  const coverRef = useRef(null);

  useEffect(()=>{ api.getCurrentSubscription().then(setMembership).catch(()=>{}); },[]);
  useEffect(()=>{
    api.getPhotos().then(d=> setPhotos(Array.isArray(d)?d:[])).catch(()=>{});
    api.getDenominations().then(d=> setDenominations(Array.isArray(d)?d:[])).catch(()=>{});
    api.getVibes().then(d=> setVibes(Array.isArray(d)?d: Array.isArray(d?.results)?d.results:[])).catch(()=>{});
    api.getHobbies().then(d=> setHobbies(Array.isArray(d)?d: Array.isArray(d?.results)?d.results:[])).catch(()=>{});
    api.getLanguages().then(d=> setLanguages(Array.isArray(d)?d: Array.isArray(d?.results)?d.results:[])).catch(()=>{});
    api.getLocations().then(d=> setLocations(Array.isArray(d)?d: Array.isArray(d?.results)?d.results:[])).catch(()=>{});
  },[location.pathname]);

  useEffect(()=>{
    if(user){
      setForm({
        first_name: user.first_name||"",
        last_name: user.last_name||"",
        phone: user.phone||"",
        date_of_birth: user.date_of_birth||"",
        gender: user.gender||"",
        city_state: user.city_state||"",
        state_of_residence: user.state_of_residence||"",
        marital_status: user.marital_status||"",
        nationality: user.nationality||"",
        denomination: user.denomination||"",
        custom_denomination: "",
        genotype: user.genotype||"",
        blood_group: user.blood_group||"",
        height_cm: user.height_cm|| user.height||"",
        weight_kg: user.weight_kg|| user.weight||"",
        preferred_age_min: user.preferred_age_min||"",
        preferred_age_max: user.preferred_age_max||"",
        preferred_height_min: user.preferred_height_min||"",
        preferred_height_max: user.preferred_height_max||"",
        preferred_weight_min: user.preferred_weight_min||"",
        preferred_weight_max: user.preferred_weight_max||"",
        about_self: user.about_self||"",
        seeking_description: user.seeking_description||"",
        custom_hobby: user.custom_hobby||"",
        vibes: (user.vibes||[]).map(v=> typeof v==='object'?v.id:v),
        hobbies_m2m: (user.hobbies_m2m||[]).map(h=> typeof h==='object'?h.id:h),
        languages_m2m: (user.languages_m2m||[]).map(l=> typeof l==='object'?l.id:l),
        preferred_locations: (user.preferred_locations||[]).map(l=> typeof l==='object'?l.id:l),
      });
      // Also hydrate completion from embedded profile_completion if available
      if(user.profile_completion) setCompletion(user.profile_completion);
    }
  },[user]);

  const refreshCompletion = async()=>{
    try{ const data = await api.getProfileCompletion(); setCompletion(data);}catch{}
  };
  useEffect(()=>{ refreshCompletion(); },[user]);

  const pct = completion?.percentage ?? 0;
  const missing = completion?.missing_fields || [];
  const isComplete = completion?.is_complete || false;

  async function handleSave(fields){
    setSaving(true); setSaveMsg(null);
    try{
      const payload = {};
      fields.forEach(k=> payload[k]=form[k]);
      // handle numbers: empty string -> null
      ["preferred_age_min","preferred_age_max","preferred_height_min","preferred_height_max","preferred_weight_min","preferred_weight_max","height_cm","weight_kg"].forEach(k=>{
        if(k in payload && payload[k]==="") payload[k]=null;
        if(k in payload && payload[k]!==null && payload[k]!=="") payload[k]= Number(payload[k]);
      });
      // denomination handle others
      if(payload.denomination==="others"){
        payload.denomination = denominations.find(d=> d.name?.toLowerCase()==="others")?.id || 29;
        payload.custom_denomination = form.custom_denomination;
      }
      await updateProfile(payload);
      await refreshCompletion();
      setSaveMsg("Saved successfully");
      setTimeout(()=> setSaveMsg(null),2500);
    }catch(e){
      setSaveMsg(e.message||"Failed to save");
    }
    setSaving(false);
  }

  async function handleUpload(file){
    setUploading(true); setUploadError(null);
    try{ const photo = await api.uploadPhoto(file); setPhotos(prev=>[photo,...prev]); await refreshCompletion(); }catch(e){ setUploadError(e.message||"Upload failed"); }
    setUploading(false);
  }
  async function handleDelete(id){ try{ await api.deletePhoto(id); setPhotos(prev=>prev.filter(p=>p.id!==id));}catch{} }
  async function handleSetPrimary(id){ try{ await api.setPrimaryPhoto(id); setPhotos(prev=>prev.map(p=>({...p,is_primary:p.id===id})));}catch{} }

  async function handleCoverUpload(e){
    const file = e.target.files?.[0]; if(!file) return;
    const url = URL.createObjectURL(file);
    const rect = coverRef.current?.getBoundingClientRect();
    const ratio = rect && rect.height ? rect.width/rect.height : 4;
    setCropModal({file, url, ratio});
  }
  async function handleCropSave(blob){
    setCoverUploading(true); setCropModal(null);
    try{
      const fd=new FormData(); fd.append('image', blob, 'cover.jpg');
      const token=getUserAccessToken();
      await fetch('/api/auth/cover-photo/',{method:'POST', headers: token?{Authorization:`Bearer ${token}`}:{}, body:fd});
      window.location.reload();
    }catch{} setCoverUploading(false);
  }

  if(!user) return <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]"><FourSquare color="var(--primary)" size="medium" text="" textColor=""/></div>;

  const fullName=[user.first_name,user.last_name].filter(Boolean).join(" ")||"User";
  const initial=(user.first_name?.[0]||user.email?.[0]||"U").toUpperCase();
  const primary=photos.find(p=>p.is_primary);
  const coverPhoto=user?.cover_photo;
  const plan=membership?.plan||null;
  const subActive=membership?.subscription?.status==="active";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Hero */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="relative overflow-hidden rounded-[2rem] bg-background border border-border/60 shadow-soft">
        <div ref={coverRef} className="relative h-[220px] sm:h-[280px] w-full overflow-hidden">
          {coverPhoto? <img src={coverPhoto} alt="Cover" className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 bg-gradient-to-br from-emerald/30 via-gold/20 to-emerald/10 pattern-dots opacity-40"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"/>
          <button onClick={()=>coverInputRef.current?.click()} disabled={coverUploading} className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 text-white/90 backdrop-blur hover:bg-black/60 transition">
            <Camera className="h-4 w-4"/>{coverUploading&&<span className="ml-1 text-xs">...</span>}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden"/>
          <div className="absolute bottom-4 left-4 sm:left-6 flex items-end gap-4">
            <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-3xl ring-4 ring-white/90 shadow-luxe overflow-hidden bg-white">
              {primary? <img src={primary.image} alt="" className="h-full w-full object-cover"/> : <div className="h-full w-full grid place-items-center bg-gradient-to-br from-emerald to-gold text-white text-3xl font-bold">{initial}</div>}
            </div>
            <div className="pb-1">
              <h1 className="font-display text-xl sm:text-3xl font-bold text-white drop-shadow">{fullName}</h1>
              <p className="text-white/90 text-sm flex items-center gap-2"><Mail className="h-3 w-3"/>{user.email} <span className="hidden sm:inline">•</span> <MapPin className="h-3 w-3"/>{user.city_state||user.state_of_residence||"Add location"}</p>
            </div>
          </div>
          <div className="absolute top-4 left-4 sm:static sm:absolute sm:top-6 sm:right-6 sm:left-auto hidden sm:flex">
            <Link to="/membership" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow ${plan&&subActive?"bg-gradient-to-r from-emerald to-gold-royal text-white":"bg-white/90 text-foreground"}`}>
              <Crown className="h-3.5 w-3.5"/>{plan&&subActive?`${plan.name} • Active`:"Free Member"}
            </Link>
          </div>
        </div>

        {/* Completion bar */}
        <div className="p-5 sm:p-6 bg-background flex flex-col lg:flex-row gap-6 items-center">
          <CompletionRing pct={pct}/>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold">Profile Completion</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isComplete?"bg-emerald/15 text-emerald-700":"bg-amber-100 text-amber-700"}`}>{isComplete?"Complete":"Incomplete"}</span>
            </div>
            <div className="mt-2 h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-emerald to-gold-royal" initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1}}/>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isComplete? "Your profile is ready for Discover! You can now be matched." : `Complete ${missing.length} more ${missing.length===1?"field":"fields"} to unlock Discover.`}
            </p>
            {!isComplete && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {missing.map(f=> <span key={f} className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">{f.replace(/_/g," ")}</span>)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <div className="text-sm text-muted-foreground hidden sm:block">{completion?.completed_count||0}/{completion?.total_fields||20} completed</div>
            <button onClick={()=> setActive("basic")} className="px-5 py-2.5 rounded-full bg-emerald text-white font-bold text-sm hover:shadow-glow transition flex items-center justify-center gap-2"><Edit3 className="h-4 w-4"/>Complete Profile</button>
            <Link to="/dashboard/discover" className={`px-5 py-2.5 rounded-full border text-sm font-bold text-center transition ${isComplete?"border-emerald text-emerald hover:bg-emerald/10":"border-border text-muted-foreground cursor-not-allowed opacity-60"}`}>Go to Discover {isComplete?"→":"(locked)"}</Link>
          </div>
        </div>
      </motion.div>

      {/* Section tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SECTIONS.map(s=>{
          const Icon=s.icon; const isActive=active===s.id;
          return (
            <button key={s.id} onClick={()=> setActive(s.id)} className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition border ${isActive?"bg-foreground text-background border-foreground shadow":"bg-background border-border hover:border-foreground/20 text-muted-foreground"}`}>
              <Icon className="h-4 w-4"/>{s.label}
              {s.id!=="overview" && s.id!=="photos" && missing.includes(
                s.id==="basic"? "nationality" : s.id==="faith"? "denomination" : s.id==="personality"? "vibes" : s.id==="about"? "describe_yourself" : s.id==="preferences"? "preferred_age" : "genotype"
              ) && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse"/>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}} className="rounded-3xl bg-background border border-border/60 shadow-soft overflow-hidden">
              {active==="overview" && (
                <div className="p-6 sm:p-8">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold-royal"/> Journey Overview</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your profile powers matching. Complete all required fields to appear in Discover.</p>
                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-foreground/5 border border-border/50">
                      <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Basic Info</p>
                      <p className="text-sm mt-1">{form.date_of_birth?"✓":"○"} DOB • {form.gender?"✓":"○"} Gender • {form.state_of_residence?"✓":"○"} Residence • {form.marital_status?"✓":"○"} Status • {form.nationality?"✓":"○"} Nationality</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-foreground/5 border border-border/50">
                      <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Matching Prefs</p>
                      <p className="text-sm mt-1">{form.preferred_age_min?"✓":"○"} Age • {form.preferred_height_min?"✓":"○"} Height • {form.preferred_weight_min?"✓":"○"} Weight • {form.preferred_locations?.length?"✓":"○"} Locations</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-foreground/5 border border-border/50">
                      <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Personality</p>
                      <p className="text-sm mt-1">{form.vibes?.length||0}/5 Vibes • {form.hobbies_m2m?.length||0}/7 Hobbies • {form.languages_m2m?.length||0} Languages</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-foreground/5 border border-border/50">
                      <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Photos</p>
                      <p className="text-sm mt-1">{photos.length} uploaded • {photos.find(p=>p.is_primary)?"✓ Primary set":"○ No primary"}</p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 rounded-2xl bg-gold/10 border border-gold/20 flex gap-3">
                    <Shield className="h-5 w-5 text-gold-royal shrink-0 mt-0.5"/><p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Secure & purposeful:</span> Your height, weight and preferences are used only for matching (SQL hard filters + scoring). We never share raw values publicly.</p>
                  </div>
                </div>
              )}

              {active==="basic" && (
                <div className="p-6 sm:p-8 space-y-5">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><User className="h-5 w-5"/> Basic Information</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="First Name"><input value={form.first_name} onChange={e=> setForm({...form, first_name:e.target.value})} className="input"/></Field>
                    <Field label="Last Name"><input value={form.last_name} onChange={e=> setForm({...form, last_name:e.target.value})} className="input"/></Field>
                    <Field label="Phone"><input value={form.phone} onChange={e=> setForm({...form, phone:e.target.value})} className="input" placeholder="+234..."/></Field>
                    <Field label="Date of Birth *"><input type="date" value={form.date_of_birth} onChange={e=> setForm({...form,date_of_birth:e.target.value})} className="input"/></Field>
                    <Field label="Gender *"><select value={form.gender} onChange={e=> setForm({...form,gender:e.target.value})} className="input"><option value="">Select</option>{GENDER_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                    <Field label="State of Residence *"><select value={form.state_of_residence} onChange={e=> setForm({...form,state_of_residence:e.target.value})} className="input"><option value="">Select state</option>{states.map(s=> <option key={s} value={s}>{s}</option>)}</select></Field>
                    <Field label="City / State (legacy)"><input value={form.city_state} onChange={e=> setForm({...form,city_state:e.target.value})} className="input" placeholder="e.g. Ikeja, Lagos"/></Field>
                    <Field label="Relationship Status *"><select value={form.marital_status} onChange={e=> setForm({...form,marital_status:e.target.value})} className="input"><option value="">Select</option>{MARITAL_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                    <Field label="Nationality *"><select value={form.nationality} onChange={e=> setForm({...form,nationality:e.target.value})} className="input"><option value="">Select</option>{NATIONALITIES.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                    <Field label="Ethnic Group"><select value={form.ethnic_group||""} onChange={e=> setForm({...form, ethnic_group:e.target.value})} className="input"><option value="">Select</option>{ethnicGroups.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                    <Field label="Height (cm) *"><select value={form.height_cm} onChange={e=> setForm({...form,height_cm:e.target.value})} className="input"><option value="">Select</option>{HEIGHT_OPTIONS.map(o=> <option key={o} value={o}>{o} cm</option>)}</select></Field>
                    <Field label="Weight (kg) *"><select value={form.weight_kg} onChange={e=> setForm({...form,weight_kg:e.target.value})} className="input"><option value="">Select</option>{WEIGHT_OPTIONS.map(o=> <option key={o} value={o}>{o} kg</option>)}</select></Field>
                  </div>
                  <SaveBar saving={saving} msg={saveMsg} onSave={()=> handleSave(["first_name","last_name","phone","date_of_birth","gender","city_state","state_of_residence","marital_status","nationality","height_cm","weight_kg"])} />
                </div>
              )}

              {active==="faith" && (
                <div className="p-6 sm:p-8 space-y-5">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><Cross className="h-5 w-5"/> Faith & Beliefs</h2>
                  <Field label="Denomination *">
                    <select value={form.denomination} onChange={e=> setForm({...form,denomination:e.target.value})} className="input">
                      <option value="">Select denomination</option>
                      {denominations.filter(d=> d.name?.toLowerCase()!=="others").map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
                      <option value="others">Others</option>
                    </select>
                    {form.denomination==="others" && <input value={form.custom_denomination} onChange={e=> setForm({...form,custom_denomination:e.target.value})} placeholder="Enter denomination" className="input mt-2"/>}
                  </Field>
                  <SaveBar saving={saving} msg={saveMsg} onSave={()=> handleSave(["denomination","custom_denomination"])}/>
                </div>
              )}

              {active==="personality" && (
                <div className="p-6 sm:p-8 space-y-6">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><Zap className="h-5 w-5"/> Personality & Interests</h2>
                  <div>
                    <label className="text-sm font-semibold">Vibes * (max 5)</label>
                    <p className="text-xs text-muted-foreground mb-2">Choose phrases that describe you</p>
                    <div className="flex flex-wrap gap-2">
                      {vibes.map(v=>{
                        const active = form.vibes?.includes(v.id);
                        return <button key={v.id} onClick={()=>{
                          const cur=[...(form.vibes||[])]; if(active) setForm({...form, vibes:cur.filter(id=>id!==v.id)}); else if(cur.length<5) setForm({...form, vibes:[...cur, v.id]});
                        }} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${active?"bg-foreground text-background border-foreground":"bg-background border-border hover:border-foreground/30"}`}>{v.name}</button>
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{form.vibes?.length||0}/5 selected</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Hobbies * (max 7)</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {hobbies.map(h=>{
                        const active = form.hobbies_m2m?.includes(h.id);
                        return <button key={h.id} onClick={()=>{
                          const cur=[...(form.hobbies_m2m||[])]; if(active) setForm({...form, hobbies_m2m:cur.filter(id=>id!==h.id)}); else if(cur.length<7) setForm({...form, hobbies_m2m:[...cur, h.id]});
                        }} className={`px-3 py-1.5 rounded-full text-sm border ${active?"bg-emerald text-white border-emerald":"bg-background border-border hover:bg-foreground/5"}`}>{h.name}</button>
                      })}
                    </div>
                    {form.hobbies_m2m?.includes(hobbies.find(h=> h.name==="Other")?.id) && (
                      <input value={form.custom_hobby} onChange={e=> setForm({...form,custom_hobby:e.target.value})} placeholder="Your custom hobby" className="input mt-3"/>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{form.hobbies_m2m?.length||0}/7 • {form.custom_hobby?"Other: "+form.custom_hobby:"Choose Other to add custom"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Languages *</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {languages.map(l=>{
                        const active = form.languages_m2m?.includes(l.id);
                        return <button key={l.id} onClick={()=>{
                          const cur=[...(form.languages_m2m||[])];
                          if(active) setForm({...form, languages_m2m:cur.filter(id=>id!==l.id)}); else setForm({...form, languages_m2m:[...cur, l.id]});
                        }} className={`px-3 py-1.5 rounded-full text-sm border ${active?"bg-gold text-white border-gold":"bg-background border-border"}`}>{l.name}</button>
                      })}
                    </div>
                  </div>
                  <SaveBar saving={saving} msg={saveMsg} onSave={()=> handleSave(["vibes","hobbies_m2m","languages_m2m","custom_hobby"])}/>
                </div>
              )}

              {active==="about" && (
                <div className="p-6 sm:p-8 space-y-5">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5"/> About You</h2>
                  <Field label="Describe yourself *"><textarea value={form.about_self} onChange={e=> setForm({...form,about_self:e.target.value})} rows={4} placeholder="Tell us about your faith, values, and personality..." className="input min-h-[110px]"/></Field>
                  <Field label="What you seek *"><textarea value={form.seeking_description} onChange={e=> setForm({...form,seeking_description:e.target.value})} rows={4} placeholder="Describe your ideal partner and relationship vision..." className="input min-h-[110px]"/></Field>
                  <SaveBar saving={saving} msg={saveMsg} onSave={()=> handleSave(["about_self","seeking_description"])}/>
                </div>
              )}

              {active==="preferences" && (
                <div className="p-6 sm:p-8 space-y-6">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><Search className="h-5 w-5"/> Matching Preferences</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Preferred Age Min *"><select value={form.preferred_age_min} onChange={e=> setForm({...form,preferred_age_min:e.target.value})} className="input"><option value="">Min</option>{AGE_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                    <Field label="Preferred Age Max *"><select value={form.preferred_age_max} onChange={e=> setForm({...form,preferred_age_max:e.target.value})} className="input"><option value="">Max</option>{AGE_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                    <Field label="Preferred Height Min (cm) *"><select value={form.preferred_height_min} onChange={e=> setForm({...form,preferred_height_min:e.target.value})} className="input"><option value="">Min</option>{HEIGHT_OPTIONS.map(o=> <option key={o} value={o}>{o} cm</option>)}</select></Field>
                    <Field label="Preferred Height Max (cm) *"><select value={form.preferred_height_max} onChange={e=> setForm({...form,preferred_height_max:e.target.value})} className="input"><option value="">Max</option>{HEIGHT_OPTIONS.map(o=> <option key={o} value={o}>{o} cm</option>)}</select></Field>
                    <Field label="Preferred Weight Min (kg) *"><select value={form.preferred_weight_min} onChange={e=> setForm({...form,preferred_weight_min:e.target.value})} className="input"><option value="">Min</option>{WEIGHT_OPTIONS.map(o=> <option key={o} value={o}>{o} kg</option>)}</select></Field>
                    <Field label="Preferred Weight Max (kg) *"><select value={form.preferred_weight_max} onChange={e=> setForm({...form,preferred_weight_max:e.target.value})} className="input"><option value="">Max</option>{WEIGHT_OPTIONS.map(o=> <option key={o} value={o}>{o} kg</option>)}</select></Field>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Preferred Locations *</label>
                    <p className="text-xs text-muted-foreground mb-2">Choose specific states, Anywhere in Nigeria, or Outside Nigeria</p>
                    <div className="flex flex-wrap gap-2">
                      {locations.map(loc=>{
                        const active = form.preferred_locations?.includes(loc.id);
                        return <button key={loc.id} onClick={()=>{
                          const cur=[...(form.preferred_locations||[])];
                          if(active) setForm({...form, preferred_locations:cur.filter(id=>id!==loc.id)}); else setForm({...form, preferred_locations:[...cur, loc.id]});
                        }} className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1 ${active?"bg-foreground text-background":"bg-background border-border"}`}>{loc.name} {loc.category!=="state" && <span className="text-[10px] opacity-60">({loc.category})</span>}</button>
                      })}
                    </div>
                  </div>
                  <SaveBar saving={saving} msg={saveMsg} onSave={()=> handleSave(["preferred_age_min","preferred_age_max","preferred_height_min","preferred_height_max","preferred_weight_min","preferred_weight_max","preferred_locations"])}/>
                </div>
              )}

              {active==="compatibility" && (
                <div className="p-6 sm:p-8 space-y-5">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><Award className="h-5 w-5"/> Compatibility • Health</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Genotype *"><select value={form.genotype} onChange={e=> setForm({...form,genotype:e.target.value})} className="input"><option value="">Select</option>{GENOTYPE_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                    <Field label="Blood Group *"><select value={form.blood_group} onChange={e=> setForm({...form,blood_group:e.target.value})} className="input"><option value="">Select</option>{BLOOD_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald/10 border border-emerald/20 flex gap-3">
                    <Languages className="h-5 w-5 text-emerald-700 shrink-0"/><p className="text-sm text-muted-foreground">Genotype & blood group are used for compatibility scoring only. Kept private until you choose to share.</p>
                  </div>
                  <SaveBar saving={saving} msg={saveMsg} onSave={()=> handleSave(["genotype","blood_group"])}/>
                </div>
              )}

              {active==="photos" && (
                <div className="p-6 sm:p-8">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><Camera className="h-5 w-5"/> Photos • <span className="text-destructive text-sm">Primary required *</span></h2>
                  {uploadError && <p className="text-xs text-destructive mt-2">{uploadError}</p>}
                  <div className="mt-4">
                    <PhotoGrid photos={photos} onUpload={handleUpload} onDelete={handleDelete} onSetPrimary={handleSetPrimary} uploading={uploading}/>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-background border border-border/60 shadow-soft p-6">
            <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-gold-royal"/> Tips</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><Check className="h-4 w-4 text-emerald shrink-0"/>Use a clear primary photo (face visible)</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-emerald shrink-0"/>Be honest about height/weight for better matches</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-emerald shrink-0"/>Write 2-3 sentences about your faith journey</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-emerald shrink-0"/>Pick vibes that truly describe you (max 5)</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-emerald to-gold-royal p-6 text-white shadow-luxe">
            <h3 className="font-display text-lg font-bold">Why complete profile?</h3>
            <p className="text-sm text-white/90 mt-2">Matching uses SQL hard filters + scoring on age, height, weight, location, vibes, hobbies, languages, genotype. Incomplete profiles are hidden from Discover to keep the community serious.</p>
            <Link to="/dashboard/discover" className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-white ${isComplete?"text-emerald":"text-muted-foreground opacity-60 pointer-events-none"}`}>Discover <ChevronRight className="h-4 w-4"/></Link>
          </div>
        </div>
      </div>

      {cropModal && <CoverCropModal src={cropModal.url} ratio={cropModal.ratio} onSave={handleCropSave} onClose={()=>{ URL.revokeObjectURL(cropModal.url); setCropModal(null);}}/>}

      <style>{`.input{width:100%; padding:0.7rem 0.9rem; border-radius:1rem; background: var(--background); border:1px solid hsl(var(--border)); font-size:0.9rem; outline:none; transition:0.2s} .input:focus{border-color:#D3A345}`}</style>
    </div>
  );
}

function Field({label, children}){ return <label className="block space-y-1"><span className="text-sm font-semibold text-foreground">{label}</span>{children}</label> }
function SaveBar({saving, msg, onSave}){ return <div className="flex items-center gap-3 pt-2"><button onClick={onSave} disabled={saving} className="px-6 py-2.5 rounded-full bg-foreground text-background font-bold text-sm hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50">{saving?"Saving...":<><Save className="h-4 w-4"/>Save</>}</button>{msg && <span className="text-sm text-emerald-700 font-medium">{msg}</span>}</div> }
function PhotoGrid({photos, onUpload, onDelete, onSetPrimary, uploading}){
  const primary=photos.find(p=>p.is_primary); const others=photos.filter(p=>!p.is_primary);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer group">
          <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) onUpload(f); e.target.value='';}} className="hidden" disabled={uploading}/>
          <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border/60 hover:border-gold-royal/50 flex flex-col items-center justify-center gap-1 transition group-hover:bg-foreground/5">
            {uploading? <span className="text-xs text-muted-foreground">Uploading...</span> : <><Camera className="h-6 w-6 text-muted-foreground"/><span className="text-[10px] text-muted-foreground">Add Photo</span></>}
          </div>
        </label>
        {primary && (
          <div className="relative">
            <div className="h-24 w-24 rounded-2xl overflow-hidden ring-2 ring-gold-royal shadow-luxe"><img src={primary.image} alt="Primary" className="h-full w-full object-cover"/></div>
            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gold-royal flex items-center justify-center"><Star className="h-3 w-3 text-white" fill="currentColor"/></div>
          </div>
        )}
      </div>
      {others.length>0 && (
        <div className="flex flex-wrap gap-3">
          {others.map(photo=> (
            <div key={photo.id} className="relative group">
              <div className="h-20 w-20 rounded-xl overflow-hidden border border-border/60"><img src={photo.image} alt="" className="h-full w-full object-cover"/></div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center gap-1">
                <button onClick={()=> onSetPrimary(photo.id)} className="p-1 rounded-lg bg-gold/80 text-white"><Star className="h-3 w-3"/></button>
                <button onClick={()=> onDelete(photo.id)} className="p-1 rounded-lg bg-destructive/80 text-white"><Trash2 className="h-3 w-3"/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
