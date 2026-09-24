import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  User, Heart, Sparkles, Camera, MapPin, Mail, Crown, Check, X, Trash2, Star,
  ChevronLeft, ChevronRight, Search, Save, Award, Calendar, Globe, Users, BookOpen, Cross, Zap, Scale, Languages
} from "lucide-react";
import { FourSquare } from "react-loading-indicators";
import { useAuth } from "../../context/AuthContext";
import { api, getUserAccessToken } from "../../lib/api";
import { states } from "../../lib/nigeria";
import CoverCropModal from "../../components/CoverCropModal";

const GENOTYPE_OPTIONS = ["AA","AS","SS","AC","SC","CC"];
const BLOOD_OPTIONS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const GENDER_OPTIONS = ["Male","Female"];
const MARITAL_OPTIONS = ["Single","Never Married","Divorced","Widowed","Separated"];
const NATIONALITIES = ["Nigerian","Ghanaian","Cameroonian","South African","British","American","Other"];
const RELATIONSHIP_INTENTIONS = ["Serious Relationship", "Relationship leading to Marriage", "Friendship"];
const DESCRIBE_TAGS = ["Easygoing","Family-Oriented","Outgoing","Thoughtful","Patient","Confident","Creative","Supportive","Ambitious","Faith-Focused"];

const HOBBY_CATEGORIES = {
  "Creative": ["Drawing & Painting","Photography","Writing","Music","Singing","Dancing","Creative"],
  "Entertainment": ["Movies & Series","Gaming","Music","Board Games","Podcasts","Reading"],
  "Lifestyle": ["Cooking","Baking","Fashion","Gardening","Volunteering","Fitness & Gym"],
  "Fitness": ["Football","Basketball","Fitness & Gym","Cycling","Swimming","Hiking","Dancing"],
  "Travel": ["Travelling","Road Trips","Exploring New Places","Hiking","Photography"],
  "Learning": ["Reading","Learning New Skills","Technology","Entrepreneurship","Writing"],
  "Faith & Community": ["Bible Study","Church Activities","Volunteering","Supportive"]
};

function getHobbyCategory(name){
  for(const [cat, list] of Object.entries(HOBBY_CATEGORIES)){
    if(list.some(v=> v.toLowerCase()===name.toLowerCase())) return cat;
  }
  return "Lifestyle";
}

const FALLBACK_VIBES = ["Faith-Focused","Caring","Cheerful","Communicative","Ambitious","Supportive","Family-Oriented","Adventurous","Creative","Loves Learning","Easygoing","Thoughtful","Patient","Outgoing","Confident"].map((name,i)=> ({id: 9000+i, name, slug: name.toLowerCase().replace(/\s+/g,'-'), is_active:true}));
const FALLBACK_HOBBIES = ["Reading","Cooking","Baking","Football","Basketball","Gaming","Music","Movies & Series","Photography","Travelling","Fitness & Gym","Dancing","Singing","Writing","Drawing & Painting","Cycling","Swimming","Hiking","Volunteering","Bible Study","Church Activities","Technology","Entrepreneurship","Learning New Skills","Podcasts","Gardening","Fashion","Road Trips","Exploring New Places","Board Games","Other"].map((name,i)=> ({id: 9100+i, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), is_active:true}));
const FALLBACK_LANGUAGES = ["English","Pidgin English","Yoruba","Igbo","Hausa","Efik","Ibibio","Edo","Urhobo","Itsekiri","Ijaw","Tiv","Nupe","Idoma","Igala","Kanuri","Fulfulde","Ebira","French","Arabic","Spanish","German","Other"].map((name,i)=> ({id: 9200+i, name, slug: name.toLowerCase().replace(/\s+/g,'-'), is_active:true}));
const FALLBACK_LOCATIONS = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT (Abuja)","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara","Anywhere in Nigeria","Outside Nigeria"].map((name,i)=> ({id: 9300+i, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), category: name.includes("Anywhere")?"anywhere_nigeria":name.includes("Outside")?"outside_nigeria":"state", is_active:true}));

function ProgressBar({ pct }){
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">Profile Completion</span>
        <span className="text-sm font-bold text-[color:var(--gold-royal)]">{pct}%</span>
      </div>
      <div className="h-3 w-full bg-foreground/10 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-[#611C2B] to-[#D3A345] rounded-full" initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8, ease:"easeOut"}} />
      </div>
    </div>
  );
}

function Badge({ active, onClick, children, disabled }){
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-full text-sm font-medium border transition-all shrink-0 ${active?"bg-[#611C2B] text-white border-[#611C2B] shadow dark:bg-[#D3A345] dark:text-[#2D2323] dark:border-[#D3A345]": "bg-card text-card-foreground border-border hover:border-[#611C2B]/40 hover:bg-accent dark:hover:bg-accent"} ${disabled&&!active?"opacity-40 cursor-not-allowed":""}`}>
      {children}
    </button>
  );
}

function RangeSlider({ min, max, minVal, maxVal, onMinChange, onMaxChange, unit }){
  // dual slider via two range inputs
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[#611C2B] text-white">{minVal} {unit} – {maxVal} {unit}</span>
        <span className="text-xs text-muted-foreground">{min} – {max} {unit}</span>
      </div>
      <div className="relative h-8 flex items-center">
        <div className="absolute left-0 right-0 h-2 bg-foreground/10 rounded-full"/>
        <div className="absolute h-2 bg-[#D3A345] rounded-full" style={{left:`${((minVal-min)/(max-min))*100}%`, right:`${100-((maxVal-min)/(max-min))*100}%`}}/>
        <input type="range" min={min} max={max} value={minVal} onChange={e=>{ const v=Number(e.target.value); if(v<=maxVal) onMinChange(v); }} className="absolute w-full appearance-none bg-transparent h-8 accent-[#611C2B]"/>
        <input type="range" min={min} max={max} value={maxVal} onChange={e=>{ const v=Number(e.target.value); if(v>=minVal) onMaxChange(v); }} className="absolute w-full appearance-none bg-transparent h-8 accent-[#D3A345]"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Min</label>
          <input type="number" min={min} max={max} value={minVal} onChange={e=> onMinChange(Number(e.target.value)||min)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:border-[#D3A345] outline-none"/>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Max</label>
          <input type="number" min={min} max={max} value={maxVal} onChange={e=> onMaxChange(Number(e.target.value)||max)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:border-[#D3A345] outline-none"/>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {id:1, title:"About You", desc:"Basic information to get to know you"},
  {id:2, title:"Your Faith", desc:"Share your faith background"},
  {id:3, title:"Vibes", desc:"Choose up to 5 that best describe you"},
  {id:4, title:"Hobbies", desc:"Choose up to 7 interests"},
  {id:5, title:"Languages", desc:"Select the languages you speak comfortably"},
  {id:6, title:"Describe Yourself", desc:"Tags + a short bio (max 300 chars)"},
  {id:7, title:"What You're Looking For", desc:"Your relationship preferences"},
  {id:8, title:"Compatibility", desc:"Health and physical info for matching"},
];

export default function ProfileCenter({ setupMode = false, onComplete } = {}){
  const { user, loading: authLoading, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [denominations, setDenominations] = useState([]);
  const [vibes, setVibes] = useState([]);
  const [hobbies, setHobbies] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [locations, setLocations] = useState([]);
  const [completion, setCompletion] = useState(user?.profile_completion || null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [searchHobby, setSearchHobby] = useState("");
  const [searchLang, setSearchLang] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [cropModal, setCropModal] = useState(null);
  const coverInputRef = useRef(null);
  const coverRef = useRef(null);
  const stepsRef = useRef(null);
  const [form, setForm] = useState({});

  useEffect(()=>{
    api.getPhotos().then(d=> setPhotos(Array.isArray(d)?d:[])).catch(()=>{});
    api.getDenominations().then(d=> setDenominations(Array.isArray(d)?d:[])).catch(()=>{});
    api.getVibes().then(d=>{ const arr=Array.isArray(d)?d: Array.isArray(d?.results)?d.results:[]; setVibes(arr.length?arr:FALLBACK_VIBES); }).catch(()=> setVibes(FALLBACK_VIBES));
    api.getHobbies().then(d=>{ const arr=Array.isArray(d)?d: Array.isArray(d?.results)?d.results:[]; setHobbies(arr.length?arr:FALLBACK_HOBBIES); }).catch(()=> setHobbies(FALLBACK_HOBBIES));
    api.getLanguages().then(d=>{ const arr=Array.isArray(d)?d: Array.isArray(d?.results)?d.results:[]; setLanguages(arr.length?arr:FALLBACK_LANGUAGES); }).catch(()=> setLanguages(FALLBACK_LANGUAGES));
    api.getLocations().then(d=>{ const arr=Array.isArray(d)?d: Array.isArray(d?.results)?d.results:[]; setLocations(arr.length?arr:FALLBACK_LOCATIONS); }).catch(()=> setLocations(FALLBACK_LOCATIONS));
  },[]);

  const refreshCompletion = async()=>{
    try{ const d= await api.getProfileCompletion(); setCompletion(d);}catch{}
  };
  useEffect(()=>{ if(user?.profile_completion) setCompletion(user.profile_completion); else refreshCompletion(); },[user]);

  useEffect(()=>{
    if(user){
      setForm({
        first_name: user.first_name||"",
        last_name: user.last_name||"",
        phone: user.phone||"",
        date_of_birth: user.date_of_birth||"",
        gender: user.gender||"",
        state_of_residence: user.state_of_residence||"",
        marital_status: user.marital_status||"",
        nationality: user.nationality||"",
        denomination: user.denomination||"",
        custom_denomination: "",
        genotype: user.genotype||"",
        blood_group: user.blood_group||"",
        height_cm: user.height_cm || user.height || "",
        weight_kg: user.weight_kg || user.weight || "",
        preferred_age_min: user.preferred_age_min ?? 22,
        preferred_age_max: user.preferred_age_max ?? 35,
        preferred_height_min: user.preferred_height_min ?? 160,
        preferred_height_max: user.preferred_height_max ?? 185,
        preferred_weight_min: user.preferred_weight_min ?? 50,
        preferred_weight_max: user.preferred_weight_max ?? 80,
        about_self: user.about_self||"",
        seeking_description: user.seeking_description||user.looking_for||"",
        custom_hobby: user.custom_hobby||"",
        vibes: (user.vibes||[]).map(v=> typeof v==='object'?v.id:v),
        hobbies_m2m: (user.hobbies_m2m||[]).map(h=> typeof h==='object'?h.id:h),
        languages_m2m: (user.languages_m2m||[]).map(l=> typeof l==='object'?l.id:l),
        preferred_locations: (user.preferred_locations||[]).map(l=> typeof l==='object'?l.id:l),
        describe_tags: (user.vibes||[]).slice(0,5).map(v=> typeof v==='object'?v.id:v),
      });
    }
  },[user]);

  const pct = completion?.percentage ?? 0;
  const isComplete = completion?.is_complete || false;
  const missing = completion?.missing_fields || [];

  useEffect(() => {
    if (setupMode && isComplete && onComplete) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [setupMode, isComplete, onComplete]);

  async function saveStep(fields){
    setSaving(true); setSaveMsg("");
    try{
      const payload={};
      fields.forEach(k=> payload[k]=form[k]);
      // numbers
      ["preferred_age_min","preferred_age_max","preferred_height_min","preferred_height_max","preferred_weight_min","preferred_weight_max","height_cm","weight_kg"].forEach(k=>{
        if(k in payload && payload[k]==="") payload[k]=null;
        if(k in payload && payload[k]!=null && payload[k]!=="") payload[k]=Number(payload[k]);
      });
      if(payload.denomination==="others"){
        payload.denomination = denominations.find(d=> d.name?.toLowerCase()==="others")?.id || 29;
        payload.custom_denomination = form.custom_denomination;
      }
      // For describe tags, save as vibes as well (reuse)
      if(payload.describe_tags){
        // merge with vibes? keep vibes as describe tags for now
        payload.vibes = payload.describe_tags;
        delete payload.describe_tags;
      }
      await updateProfile(payload);
      await refreshCompletion();
      setSaveMsg("Saved");
      setTimeout(()=> setSaveMsg(""),1500);
      return true;
    }catch(e){
      setSaveMsg(e.message||"Failed");
      return false;
    }finally{ setSaving(false); }
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

  if(authLoading) return <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-3"><FourSquare color="var(--primary)" size="medium" text="" textColor=""/><p className="text-sm text-muted-foreground">Loading your profile...</p></div>;
  if(!user) return (
    <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center"><User className="h-8 w-8 text-amber-600"/></div>
      <h2 className="font-display text-xl font-bold">Please log in</h2>
      <p className="text-sm text-muted-foreground">You need to be logged in to view your profile.</p>
      <Link to="/login" className="px-6 py-2.5 rounded-full bg-[#611C2B] text-white text-sm font-bold">Go to Login</Link>
    </div>
  );

  const primary=photos.find(p=>p.is_primary);
  const coverPhoto=user?.cover_photo;
  const filteredHobbies = hobbies.filter(h=> !searchHobby || h.name.toLowerCase().includes(searchHobby.toLowerCase()));
  const filteredLangs = languages.filter(l=> !searchLang || l.name.toLowerCase().includes(searchLang.toLowerCase()));
  const filteredLocs = locations.filter(l=> !searchLocation || l.name.toLowerCase().includes(searchLocation.toLowerCase()));

  const groupedHobbies = {};
  filteredHobbies.forEach(h=>{
    const cat=getHobbyCategory(h.name);
    if(!groupedHobbies[cat]) groupedHobbies[cat]=[];
    groupedHobbies[cat].push(h);
  });

  return (
    <div className="max-w-xl mx-auto px-4 pb-24">
      {/* Header progress */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-4 pb-3 bg-background/80 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between mb-3">
          {setupMode ? (
            <span className="text-sm font-semibold text-muted-foreground">Profile Setup</span>
          ) : (
            <Link to="/dashboard" className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><ChevronLeft className="h-4 w-4"/>Overview</Link>
          )}
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-card border shadow-sm text-card-foreground">{step}/{STEPS.length}</span>
        </div>
        <ProgressBar pct={pct}/>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {isComplete ? "✓ Profile Complete — Your profile is ready. You can now discover meaningful connections." : "Complete the remaining information to start discovering Christian singles."}
        </p>
      </div>

      {setupMode && user && !user.is_verified && (
        <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm flex gap-3 items-start">
          <Mail className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">Verify your email to continue setup.</p>
            <p className="text-muted-foreground mt-0.5">Check your inbox for the 6-digit code, then come back here.</p>
            <Link to={`/verify-email?email=${encodeURIComponent(user.email || "")}`} className="mt-2 inline-block font-bold text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] underline underline-offset-2">
              Go to verification
            </Link>
          </div>
        </div>
      )}

      {/* Cover + avatar quick */}
      <div className="mt-6 rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft">
        <div ref={coverRef} className="relative h-32 w-full bg-gradient-to-br from-[#611C2B]/20 to-[#D3A345]/20">
          {coverPhoto && <img src={coverPhoto} alt="Cover" className="absolute inset-0 h-full w-full object-cover"/>}
          <button onClick={()=> coverInputRef.current?.click()} disabled={coverUploading} className="absolute top-3 right-3 p-2 rounded-xl bg-black/40 text-white backdrop-blur text-xs">{coverUploading?"...":<Camera className="h-4 w-4"/>}</button>
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden"/>
        </div>
        <div className="px-5 pb-5 flex gap-4 -mt-8 relative">
          <div className="h-20 w-20 rounded-2xl ring-4 ring-background shadow overflow-hidden bg-gradient-to-br from-[#611C2B] to-[#D3A345] shrink-0">
            {primary? <img src={primary.image} alt="" className="h-full w-full object-cover"/> : <div className="h-full w-full grid place-items-center text-white font-bold text-xl">{(user.first_name?.[0]||user.email[0]||"U").toUpperCase()}</div>}
          </div>
          <div className="pt-8 flex-1 min-w-0">
            <h2 className="font-display font-bold truncate">{[user.first_name,user.last_name].filter(Boolean).join(" ")||user.email}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3"/>{user.email}</p>
          </div>
        </div>
      </div>

      {/* Step pills - carousel with next/previous when overflowing */}
      <div className="relative mt-6">
        <button
          onClick={()=> stepsRef.current?.scrollBy({left: -160, behavior: 'smooth'})}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-soft flex items-center justify-center hover:bg-accent"
          aria-label="Previous steps"
        >
          <ChevronLeft className="h-4 w-4"/>
        </button>
        <button
          onClick={()=> stepsRef.current?.scrollBy({left: 160, behavior: 'smooth'})}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-soft flex items-center justify-center hover:bg-accent"
          aria-label="Next steps"
        >
          <ChevronRight className="h-4 w-4"/>
        </button>
        <div ref={stepsRef} className="flex gap-2 overflow-x-auto scrollbar-none pb-2 scroll-smooth snap-x snap-mandatory px-0 sm:px-8">
          {STEPS.map(s=> {
            const locked = setupMode && s.id > maxStep;
            return (
              <button key={s.id} disabled={locked} onClick={()=> { if (!locked) setStep(s.id); }} className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${step===s.id?"bg-[#2D2323] text-white border-[#2D2323] dark:bg-[#D3A345] dark:text-[#2D2323] dark:border-[#D3A345]":"bg-card text-muted-foreground border-border hover:bg-accent"} ${locked?"opacity-40 cursor-not-allowed":""}`}>
                {s.id}. {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{opacity:0, x:12}} animate={{opacity:1,x:0}} exit={{opacity:0, x:-12}} transition={{duration:0.2}} className="mt-6 rounded-3xl bg-card border border-border/60 shadow-soft p-5 sm:p-6">
          
          {step===1 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-lg font-bold">About You</h3>
                <p className="text-xs text-muted-foreground">Tell us who you are</p>
              </div>

              {/* Primary photo */}
              <div>
                <label className="text-sm font-semibold">Primary photo *</label>
                <div className="mt-2 flex gap-3 flex-wrap">
                  <label className="h-20 w-20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#D3A345]">
                    <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleUpload(f); e.target.value='';}} className="hidden" disabled={uploading}/>
                    <Camera className="h-5 w-5 text-muted-foreground"/>
                    <span className="text-[10px]">{uploading?"Uploading":"Add"}</span>
                  </label>
                  {photos.map(p=> (
                    <div key={p.id} className={`relative h-20 w-20 rounded-2xl overflow-hidden border ${p.is_primary?"ring-2 ring-[#D3A345]":"border-border"}`}>
                      <img src={p.image} alt="" className="h-full w-full object-cover"/>
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center gap-1 transition">
                        <button onClick={()=> handleSetPrimary(p.id)} className="p-1 rounded bg-white/90"><Star className="h-3 w-3"/></button>
                        <button onClick={()=> handleDelete(p.id)} className="p-1 rounded bg-white/90"><Trash2 className="h-3 w-3"/></button>
                      </div>
                      {p.is_primary && <span className="absolute bottom-1 left-1 text-[8px] bg-[#D3A345] text-white px-1.5 py-0.5 rounded-full">Primary</span>}
                    </div>
                  ))}
                </div>
                {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
                {!photos.find(p=>p.is_primary)&& <p className="text-xs text-amber-600 mt-1">Add a primary photo to complete your profile</p>}
              </div>

              <div className="grid gap-4">
                <Field label="Date of birth *"><input type="date" value={form.date_of_birth||""} onChange={e=> setForm({...form,date_of_birth:e.target.value})} className="input"/></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Gender *"><select value={form.gender} onChange={e=> setForm({...form,gender:e.target.value})} className="input"><option value="">Select</option>{GENDER_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                  <Field label="Relationship status *"><select value={form.marital_status} onChange={e=> setForm({...form,marital_status:e.target.value})} className="input"><option value="">Select</option>{MARITAL_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                </div>
                <Field label="State of residence *"><select value={form.state_of_residence} onChange={e=> setForm({...form,state_of_residence:e.target.value})} className="input"><option value="">Select state</option>{states.map(s=> <option key={s} value={s}>{s}</option>)}</select></Field>
                <Field label="Nationality *"><select value={form.nationality} onChange={e=> setForm({...form,nationality:e.target.value})} className="input"><option value="">Select</option>{NATIONALITIES.map(n=> <option key={n} value={n}>{n}</option>)}</select></Field>
              </div>
            </div>
          )}

          {step===2 && (
            <div className="space-y-5">
              <h3 className="font-display text-lg font-bold flex items-center gap-2"><Cross className="h-5 w-5 text-[#611C2B]"/> Your Faith</h3>
              <Field label="Denomination *">
                <select value={form.denomination} onChange={e=> setForm({...form,denomination:e.target.value})} className="input">
                  <option value="">Select denomination</option>
                  {denominations.filter(d=> d.name?.toLowerCase()!=="others").map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
                  <option value="others">Others</option>
                </select>
                {form.denomination==="others" && <input value={form.custom_denomination} onChange={e=> setForm({...form,custom_denomination:e.target.value})} placeholder="Enter denomination" className="input mt-2"/>}
              </Field>
            </div>
          )}

          {step===3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold">Vibes</h3>
                <p className="text-xs text-muted-foreground">Choose up to 5</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {vibes.map(v=>{
                  const active=form.vibes?.includes(v.id);
                  const disabled=!active && (form.vibes?.length||0)>=5;
                  return <Badge key={v.id} active={active} disabled={disabled} onClick={()=>{
                    const cur=[...(form.vibes||[])];
                    if(active) setForm({...form, vibes:cur.filter(id=>id!==v.id)});
                    else if(cur.length<5) setForm({...form, vibes:[...cur, v.id]});
                  }}>{v.name}</Badge>
                })}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{form.vibes?.length||0}/5 selected</span>
                {(form.vibes?.length||0)>=5 && <span className="text-amber-600 font-medium">Maximum 5 vibes allowed.</span>}
              </div>
            </div>
          )}

          {step===4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Hobbies</h3>
                  <p className="text-xs text-muted-foreground">Choose up to 7</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                  <input value={searchHobby} onChange={e=> setSearchHobby(e.target.value)} placeholder="Search hobbies" className="pl-8 pr-3 py-2 rounded-full border border-border bg-background text-foreground text-sm w-32 focus:w-40 transition-all focus:border-[#D3A345] outline-none"/>
                </div>
              </div>
              {Object.entries(groupedHobbies).map(([cat, list])=>(
                <div key={cat}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map(h=>{
                      const active=form.hobbies_m2m?.includes(h.id);
                      const disabled=!active && (form.hobbies_m2m?.length||0)>=7;
                      return <Badge key={h.id} active={active} disabled={disabled} onClick={()=>{
                        const cur=[...(form.hobbies_m2m||[])];
                        if(active) setForm({...form, hobbies_m2m:cur.filter(id=>id!==h.id)});
                        else if(cur.length<7) setForm({...form, hobbies_m2m:[...cur, h.id]});
                      }}>{h.name}</Badge>
                    })}
                  </div>
                </div>
              ))}
              {filteredHobbies.length===0 && <p className="text-sm text-muted-foreground text-center py-4">No hobbies found</p>}
              {(()=>{
                const otherId=hobbies.find(h=> h.name==="Other")?.id;
                if(otherId && form.hobbies_m2m?.includes(otherId)){
                  return <input value={form.custom_hobby} onChange={e=> setForm({...form,custom_hobby:e.target.value})} placeholder="Your custom hobby" className="input mt-2"/>
                }
                return null;
              })()}
              <p className="text-xs text-muted-foreground">{form.hobbies_m2m?.length||0}/7 • { (form.hobbies_m2m?.length||0)>=7 && <span className="text-amber-600">Maximum 7 hobbies allowed.</span>}</p>
            </div>
          )}

          {step===5 && (
            <div className="space-y-4">
              <h3 className="font-display text-lg font-bold flex items-center gap-2"><Languages className="h-5 w-5"/> Languages</h3>
              <p className="text-xs text-muted-foreground">Select the languages you speak comfortably.</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <input value={searchLang} onChange={e=> setSearchLang(e.target.value)} placeholder="Search languages" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:border-[#D3A345] outline-none"/>
              </div>
              <div className="flex flex-wrap gap-2">
                {filteredLangs.map(l=>{
                  const active=form.languages_m2m?.includes(l.id);
                  return <Badge key={l.id} active={active} onClick={()=>{
                    const cur=[...(form.languages_m2m||[])];
                    if(active) setForm({...form, languages_m2m:cur.filter(id=>id!==l.id)});
                    else setForm({...form, languages_m2m:[...cur, l.id]});
                  }}>{l.name}</Badge>
                })}
              </div>
            </div>
          )}

          {step===6 && (
            <div className="space-y-5">
              <h3 className="font-display text-lg font-bold">Describe Yourself</h3>
              <div>
                <label className="text-sm font-semibold">Select up to 5 descriptive tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DESCRIBE_TAGS.map(tag=>{
                    const v = vibes.find(v=> v.name.toLowerCase()===tag.toLowerCase()) || {id: tag, name: tag};
                    const id = typeof v.id==='number'? v.id : tag;
                    const active = (form.describe_tags||[]).includes(id) || (form.vibes||[]).includes(v.id);
                    // Use vibes ids if available, else string tag fallback
                    return <Badge key={tag} active={active} disabled={!active && ((form.describe_tags?.length||0)>=5)} onClick={()=>{
                      const cur=[...(form.describe_tags||[])];
                      if(cur.includes(id)) setForm({...form, describe_tags:cur.filter(x=>x!==id)});
                      else if(cur.length<5) setForm({...form, describe_tags:[...cur, id]});
                    }}>{tag}</Badge>
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{form.describe_tags?.length||0}/5</p>
              </div>
              <Field label="Tell us a little more about yourself">
                <textarea value={form.about_self} onChange={e=> setForm({...form,about_self:e.target.value.slice(0,300)})} rows={4} placeholder="Share a few things that make you unique, what you enjoy, and what matters to you." className="input min-h-[120px] resize-none"/>
                <div className="text-xs text-muted-foreground text-right mt-1">{(form.about_self||"").length}/300</div>
              </Field>
              <Field label="What you seek (optional)">
                <textarea value={form.seeking_description} onChange={e=> setForm({...form,seeking_description:e.target.value.slice(0,300)})} rows={3} placeholder="What are you looking for in a partner?" className="input min-h-[90px] resize-none"/>
                <div className="text-xs text-muted-foreground text-right mt-1">{(form.seeking_description||"").length}/300</div>
              </Field>
            </div>
          )}

          {step===7 && (
            <div className="space-y-6">
              <h3 className="font-display text-lg font-bold">What You're Looking For</h3>
              <Field label="Relationship intention"><select value={form.marital_status} onChange={e=> setForm({...form,marital_status:e.target.value})} className="input"><option value="">Select</option>{RELATIONSHIP_INTENTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
              <div>
                <label className="text-sm font-semibold">Preferred Age</label>
                <p className="text-xs text-muted-foreground mb-2">20 – 80 years</p>
                <RangeSlider min={18} max={80} minVal={Number(form.preferred_age_min)||22} maxVal={Number(form.preferred_age_max)||35} onMinChange={v=> setForm({...form,preferred_age_min:v})} onMaxChange={v=> setForm({...form,preferred_age_max:v})} unit="years"/>
                {(Number(form.preferred_age_min)>Number(form.preferred_age_max)) && <p className="text-xs text-destructive mt-1">Maximum age cannot be lower than minimum age.</p>}
              </div>
              <div>
                <label className="text-sm font-semibold">Preferred Height</label>
                <RangeSlider min={140} max={210} minVal={Number(form.preferred_height_min)||160} maxVal={Number(form.preferred_height_max)||185} onMinChange={v=> setForm({...form,preferred_height_min:v})} onMaxChange={v=> setForm({...form,preferred_height_max:v})} unit="cm"/>
              </div>
              <div>
                <label className="text-sm font-semibold">Preferred Weight</label>
                <RangeSlider min={30} max={150} minVal={Number(form.preferred_weight_min)||50} maxVal={Number(form.preferred_weight_max)||80} onMinChange={v=> setForm({...form,preferred_weight_min:v})} onMaxChange={v=> setForm({...form,preferred_weight_max:v})} unit="kg"/>
              </div>
              <div>
                <label className="text-sm font-semibold">Preferred Location</label>
                <p className="text-xs text-muted-foreground mb-2">Where are you open to meeting someone?</p>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                  <input value={searchLocation} onChange={e=> setSearchLocation(e.target.value)} placeholder="Search locations" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:border-[#D3A345] outline-none"/>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                  {filteredLocs.map(loc=>{
                    const active=form.preferred_locations?.includes(loc.id);
                    return <Badge key={loc.id} active={active} onClick={()=>{
                      const cur=[...(form.preferred_locations||[])];
                      if(active) setForm({...form, preferred_locations:cur.filter(id=>id!==loc.id)});
                      else setForm({...form, preferred_locations:[...cur, loc.id]});
                    }}>{loc.name}</Badge>
                  })}
                </div>
                {(form.preferred_locations?.length||0)===0 && <p className="text-xs text-amber-600 mt-2">Please select at least one preferred location.</p>}
              </div>
            </div>
          )}

          {step===8 && (
            <div className="space-y-5">
              <h3 className="font-display text-lg font-bold flex items-center gap-2"><Award className="h-5 w-5"/> Compatibility Information</h3>
              <p className="text-xs text-muted-foreground">Used for matching and kept private until you share.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Genotype *"><select value={form.genotype} onChange={e=> setForm({...form,genotype:e.target.value})} className="input"><option value="">Select</option>{GENOTYPE_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                <Field label="Blood Group *"><select value={form.blood_group} onChange={e=> setForm({...form,blood_group:e.target.value})} className="input"><option value="">Select</option>{BLOOD_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}</select></Field>
                <Field label="Your Height (cm)"><select value={form.height_cm} onChange={e=> setForm({...form,height_cm:e.target.value})} className="input"><option value="">Select</option>{Array.from({length:51},(_,i)=> 140+i).map(v=> <option key={v} value={v}>{v} cm</option>)}</select></Field>
                <Field label="Your Weight (kg)"><select value={form.weight_kg} onChange={e=> setForm({...form,weight_kg:e.target.value})} className="input"><option value="">Select</option>{Array.from({length:71},(_,i)=> 40+i).map(v=> <option key={v} value={v}>{v} kg</option>)}</select></Field>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Save bar */}
      <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-xl border-t border-border/50 flex items-center justify-between gap-3 supports-[backdrop-filter]:bg-background/80">
        <button onClick={()=> setStep(s=> Math.max(1, s-1))} disabled={step===1} className="px-5 py-2.5 rounded-full border border-border bg-card text-card-foreground text-sm font-semibold disabled:opacity-40 flex items-center gap-1"><ChevronLeft className="h-4 w-4"/>Back</button>
        <div className="flex items-center gap-2">
          {saveMsg && <span className="text-xs font-medium text-emerald-700 hidden sm:block">{saveMsg}</span>}
          {step < STEPS.length ? (
            <button onClick={async()=>{
              const map={1:["first_name","last_name","phone","date_of_birth","gender","state_of_residence","marital_status","nationality"], 2:["denomination"], 3:["vibes"], 4:["hobbies_m2m","custom_hobby"], 5:["languages_m2m"], 6:["about_self","seeking_description"], 7:["marital_status","preferred_age_min","preferred_age_max","preferred_height_min","preferred_height_max","preferred_weight_min","preferred_weight_max","preferred_locations"], 8:["genotype","blood_group","height_cm","weight_kg"]};
              const fields=map[step]||[];
              // simple validation
              if(setupMode && step===1 && !photos.find(p=>p.is_primary)){ alert("Please upload a profile photo and set it as your primary photo to continue."); return; }
              if(step===3 && (form.vibes?.length||0)>5){ alert("Maximum 5 vibes allowed."); return; }
              if(step===4 && (form.hobbies_m2m?.length||0)>7){ alert("Maximum 7 hobbies allowed."); return; }
              if(step===7 && Number(form.preferred_age_min)>Number(form.preferred_age_max)){ alert("Maximum age cannot be lower than minimum age."); return; }
              if(step===7 && Number(form.preferred_height_min)>Number(form.preferred_height_max)){ alert("Please select a valid height range."); return; }
              if(step===7 && Number(form.preferred_weight_min)>Number(form.preferred_weight_max)){ alert("Please select a valid weight range."); return; }
              const ok=await saveStep(fields);
              if(ok) { setMaxStep(m=> Math.max(m, step+1)); setStep(s=> s+1); }
            }} disabled={saving} className="px-6 py-2.5 rounded-full bg-[#611C2B] text-white text-sm font-bold shadow hover:shadow-glow transition disabled:opacity-50 flex items-center gap-2">
              {saving?"Saving...":<><Save className="h-4 w-4"/>Save & Continue <ChevronRight className="h-4 w-4"/></>}
            </button>
          ) : (
            <button onClick={async()=>{
              const ok=await saveStep(["genotype","blood_group","height_cm","weight_kg"]);
              if(ok){ await refreshCompletion(); setMaxStep(9); setStep(9); }
            }} disabled={saving} className="px-6 py-2.5 rounded-full bg-[#611C2B] text-white text-sm font-bold">{saving?"Saving...":"Finish"}</button>
          )}
        </div>
      </div>

      {/* Final review */}
      {step===9 && (
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="mt-6 rounded-3xl bg-card border border-border/60 shadow-soft p-6">
          <h3 className="font-display text-lg font-bold">Review Your Profile</h3>
          <div className="mt-4 space-y-3 text-sm">
            <ReviewRow label="Photo" value={photos.find(p=>p.is_primary)?"✓ Primary set":"Missing"} onEdit={()=> setStep(1)}/>
            <ReviewRow label="Basic" value={`${form.gender||"—"}, ${form.state_of_residence||"—"}, ${form.nationality||"—"}`} onEdit={()=> setStep(1)}/>
            <ReviewRow label="Faith" value={denominations.find(d=> String(d.id)===String(form.denomination))?.name || "—"} onEdit={()=> setStep(2)}/>
            <ReviewRow label="Vibes" value={`${form.vibes?.length||0}/5`} onEdit={()=> setStep(3)}/>
            <ReviewRow label="Hobbies" value={`${form.hobbies_m2m?.length||0}/7`} onEdit={()=> setStep(4)}/>
            <ReviewRow label="Languages" value={`${form.languages_m2m?.length||0} selected`} onEdit={()=> setStep(5)}/>
            <ReviewRow label="About" value={form.about_self? `${form.about_self.slice(0,60)}...` : "Missing"} onEdit={()=> setStep(6)}/>
            <ReviewRow label="Preferences" value={`${form.preferred_age_min}-${form.preferred_age_max} years, ${form.preferred_height_min}-${form.preferred_height_max} cm`} onEdit={()=> setStep(7)}/>
            <ReviewRow label="Compatibility" value={`${form.genotype||"—"} / ${form.blood_group||"—"}`} onEdit={()=> setStep(8)}/>
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-muted border border-border text-center">
            {isComplete ? (
              <>
                <p className="font-bold text-emerald-700">✓ Your profile is complete.</p>
                {setupMode ? (
                  <button onClick={() => onComplete && onComplete()} className="mt-3 inline-flex px-6 py-2.5 rounded-full bg-[#611C2B] text-white text-sm font-bold">Go to Dashboard</button>
                ) : (
                  <Link to="/dashboard/discover" className="mt-3 inline-flex px-6 py-2.5 rounded-full bg-[#611C2B] text-white text-sm font-bold">Go to Discover</Link>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Remaining: {missing.join(", ").replace(/_/g," ")}</p>
                <button onClick={()=> setStep(1)} className="mt-3 px-6 py-2.5 rounded-full bg-card border border-border text-card-foreground text-sm font-bold hover:bg-accent">Complete Profile</button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {cropModal && <CoverCropModal src={cropModal.url} ratio={cropModal.ratio} onSave={handleCropSave} onClose={()=>{ URL.revokeObjectURL(cropModal.url); setCropModal(null);}}/>}
      <style>{`.input{width:100%; padding:0.65rem 0.85rem; border-radius:1rem; background:hsl(var(--background)); color:hsl(var(--foreground)); border:1px solid hsl(var(--border)); font-size:0.9rem; outline:none} .input:focus{border-color:#D3A345} .input::placeholder{color:hsl(var(--muted-foreground))}`}</style>
    </div>
  );
}

function Field({label, children}){ return <label className="block space-y-1.5"><span className="text-sm font-semibold">{label}</span>{children}</label> }
function ReviewRow({label, value, onEdit}){ return <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"><div><p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div><button onClick={onEdit} className="text-xs font-bold text-[#611C2B] border border-[#611C2B]/20 px-3 py-1 rounded-full hover:bg-[#F4EFEA]">Edit</button></div> }
