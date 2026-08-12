import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  User, Cross, GraduationCap, Heart, Camera, Shield,
  ChevronDown, Edit3, Check, X, Mail, Phone, MapPin, BookOpen,
  Trash2, Star, Crown,
} from "lucide-react";
import { FourSquare } from "react-loading-indicators";
import { useAuth } from "../../context/AuthContext";
import { api, getUserAccessToken } from "../../lib/api";
import { states, lgas, ethnicGroups } from "../../lib/nigeria";
import CoverCropModal from "../../components/CoverCropModal";

const QUALIFICATION_OPTIONS = ["SSCE", "OND", "HND", "B.Sc", "B.A", "B.Eng", "LLB", "MBBS", "Pharm.D", "M.Sc", "MBA", "M.Eng", "P.hd"];
const WEIGHT_OPTIONS = Array.from({length: 171}, (_, i) => i + 30);
const HEIGHT_OPTIONS = Array.from({length: 151}, (_, i) => i + 100);
const COMPLEXION_OPTIONS = ["Dark", "Brown", "Fair", "Light"];
const LOOKING_FOR_OPTIONS = ["Friendship", "Serious Relationship", "Relationship leading to Marriage"];
const ALCOHOL_OPTIONS = ["No", "Occasionally", "Socially", "Yes"];
const SMOKING_OPTIONS = ["No", "Occasionally", "Socially", "Yes"];

const sections = [
  { id: "personal", icon: User, label: "Personal Information" },
  { id: "faith", icon: Cross, label: "Faith & Beliefs" },
  { id: "education", icon: GraduationCap, label: "Education & Career" },
  { id: "about", icon: BookOpen, label: "About Me" },
  { id: "preferences", icon: Heart, label: "Marriage Preferences" },
  { id: "photos", icon: Camera, label: "My Photos" },
];

const AGE_OPTIONS = Array.from({length: 63}, (_, i) => i + 18);

function getSectionFields(sectionId, user) {
  const fields = {
    personal: [
      { key: "first_name", label: "First Name", type: "text" },
      { key: "last_name", label: "Last Name", type: "text" },
      { key: "email", label: "Email", type: "email", readonly: true },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "date_of_birth", label: "Date of Birth", type: "date" },
      { key: "gender", label: "Gender", type: "text" },
      { key: "city_state", label: "City / State", type: "city_state" },
      { key: "ethnic_group", label: "Ethnic Group", type: "select", options: ethnicGroups },
      { key: "weight", label: "Weight (kg)", type: "select", options: WEIGHT_OPTIONS },
      { key: "height", label: "Height (cm)", type: "select", options: HEIGHT_OPTIONS },
      { key: "complexion", label: "Complexion", type: "select", options: COMPLEXION_OPTIONS },
      { key: "looking_for", label: "Looking For", type: "select", options: LOOKING_FOR_OPTIONS },
    ],
    faith: [
      { key: "faith", label: "Faith", type: "text" },
      { key: "denomination", label: "Denomination", type: "denomination" },
    ],
    education: [
      { key: "highest_qualification", label: "Highest Qualification", type: "select", options: QUALIFICATION_OPTIONS },
      { key: "institution", label: "Institution", type: "text" },
      { key: "profession", label: "Profession", type: "text" },
    ],
    about: [
      { key: "short_bio", label: "Short Bio", type: "textarea" },
      { key: "interests", label: "Interests", type: "textarea" },
      { key: "hobbies", label: "Hobbies", type: "textarea" },
      { key: "personality_traits", label: "Personality Traits", type: "textarea" },
      { key: "languages_spoken", label: "Languages Spoken", type: "textarea" },
      { key: "about_self", label: "About Me", type: "textarea" },
      { key: "seeking_description", label: "What I Seek", type: "textarea" },
    ],
    preferences: [
      { key: "marital_status", label: "Marital Status", type: "select", options: ["Single", "Never Married", "Divorced", "Widowed"] },
      { key: "preferred_location", label: "Preferred Locations", type: "multiselect", options: states },
      { key: "preferred_tribe", label: "Preferred Tribes", type: "multiselect", options: ethnicGroups },
      { key: "preferred_age_min", label: "Preferred Age (Min)", type: "select", options: AGE_OPTIONS },
      { key: "preferred_age_max", label: "Preferred Age (Max)", type: "select", options: AGE_OPTIONS },
      { key: "preferred_height_min", label: "Preferred Height (Min, cm)", type: "select", options: HEIGHT_OPTIONS },
      { key: "preferred_height_max", label: "Preferred Height (Max, cm)", type: "select", options: HEIGHT_OPTIONS },
      { key: "willing_to_relocate", label: "Willing to Relocate", type: "yesno" },
      { key: "has_children", label: "Has Children", type: "yesno" },
      { key: "number_of_children", label: "Number of Children", type: "select", options: [1,2,3,4,5,6,7,8,9,10], hidden: user?.has_children !== true },
      { key: "alcohol", label: "Alcohol", type: "select", options: ALCOHOL_OPTIONS },
      { key: "smoking", label: "Smoking", type: "select", options: SMOKING_OPTIONS },
      { key: "deal_breakers", label: "Deal Breakers", type: "textarea" },
      { key: "genotype", label: "Genotype", type: "select", options: ["AA", "AS", "SS", "AC", "SC", "CC"] },
      { key: "blood_group", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { key: "love_language", label: "Love Language", type: "text" },
      { key: "is_verified", label: "Email Verified", type: "badge" },
      { key: "is_profile_completed", label: "Profile Completed", type: "badge" },
      { key: "date_joined", label: "Member Since", type: "date_readonly" },
    ],
  };
  return fields[sectionId] || [];
}

function formatValue(user, key) {
  if (key === "date_joined") return new Date(user.date_joined).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  if (key === "date_of_birth") return user.date_of_birth || "—";
  if (key === "is_verified" || key === "is_profile_completed" || key === "has_children" || key === "willing_to_relocate") {
    const val = user[key];
    if (val === null || val === undefined) return "—";
    return val ? "Yes" : "No";
  }
  if (key === "denomination") return user.denomination_name || "—";
  if (key === "weight" || key === "height" || key === "preferred_height_min" || key === "preferred_height_max" || key === "number_of_children") {
    const val = user[key];
    if (val === null || val === undefined) return "—";
    return val;
  }
  if (key === "preferred_tribe" || key === "preferred_location") {
    const val = user[key];
    if (!val) return "—";
    const items = val.split(", ").filter(Boolean);
    return items.length > 0 ? items.join(", ") : "—";
  }
  const val = user?.[key];
  if (val === null || val === undefined || val === "") return "—";
  return val;
}

function PhotoSection({ photos, onUpload, onDelete, onSetPrimary, uploading }) {
  const primary = photos.find((p) => p.is_primary);
  const others = photos.filter((p) => !p.is_primary);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer group">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
            className="hidden"
            disabled={uploading}
          />
          <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border/60 hover:border-gold-royal/50 flex flex-col items-center justify-center gap-1 transition group-hover:bg-foreground/5">
            {uploading ? (
              <span className="text-xs text-muted-foreground">Uploading...</span>
            ) : (
              <>
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Add Photo</span>
              </>
            )}
          </div>
        </label>

        {primary && (
          <div className="relative group">
              <div className="h-24 w-24 rounded-2xl overflow-hidden ring-2 ring-gold-royal shadow-luxe">
                <img src={primary.image} alt="Primary" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.parentElement.querySelector('.fallback')?.classList.remove('hidden'); }} />
              </div>
            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gold-royal flex items-center justify-center">
              <Star className="h-3 w-3 text-white" fill="currentColor" />
            </div>
            {primary.is_ai_generated === true && (
              <div className="absolute -bottom-1 left-0 right-0 mx-auto w-fit px-2 py-0.5 rounded-full bg-destructive/80 text-[9px] text-white font-semibold">
                AI
              </div>
            )}
            {primary.is_ai_generated === false && (
              <div className="absolute -bottom-1 left-0 right-0 mx-auto w-fit px-2 py-0.5 rounded-full bg-emerald/80 text-[9px] text-white font-semibold">
                Real
              </div>
            )}
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {others.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className="h-20 w-20 rounded-xl overflow-hidden border border-border/60">
                <img src={photo.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center gap-1">
                <button
                  onClick={() => onSetPrimary(photo.id)}
                  className="p-1 rounded-lg bg-gold/80 text-white hover:bg-gold transition"
                  title="Set as primary"
                >
                  <Star className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onDelete(photo.id)}
                  className="p-1 rounded-lg bg-destructive/80 text-white hover:bg-destructive transition"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {photo.is_ai_generated === true && (
                <div className="absolute -bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-destructive/80 text-[8px] text-white font-semibold">
                  AI
                </div>
              )}
              {photo.is_ai_generated === false && (
                <div className="absolute -bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-emerald/80 text-[8px] text-white font-semibold">
                  Real
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileSection({ section, isOpen, onToggle, user, onUpdate, photos, onUpload, onDelete, onSetPrimary, uploading, uploadError, denominations }) {
  const Icon = section.icon;
  const fields = getSectionFields(section.id, user);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editState, setEditState] = useState("");
  const [editLga, setEditLga] = useState("");
  const [editCustomDenom, setEditCustomDenom] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(key) {
    setSaving(true);
    try {
      if (key === "city_state") {
        const val = editLga && editState ? `${editLga}, ${editState}` : editState || editLga || "";
        await onUpdate({ city_state: val });
      } else if (key === "denomination") {
        if (editValue === "others") {
          await onUpdate({ denomination: 29, custom_denomination: editCustomDenom });
        } else if (editValue) {
          await onUpdate({ denomination: parseInt(editValue, 10) });
        } else {
          await onUpdate({ denomination: null });
        }
      } else if (editValue === "true" || editValue === "false") {
        await onUpdate({ [key]: editValue === "true" });
      } else if (["weight","height","number_of_children","preferred_height_min","preferred_height_max","preferred_age_min","preferred_age_max"].includes(key) && editValue !== "") {
        await onUpdate({ [key]: parseInt(editValue, 10) });
      } else {
        await onUpdate({ [key]: editValue });
      }
      setEditing(null);
    } catch {}
    setSaving(false);
  }

  function startEdit(key, currentValue) {
    setEditing(key);
    if (key === "city_state") {
      const parts = (currentValue || "").split(", ");
      const stateVal = parts.length > 1 ? parts[1] : parts[0] || "";
      const lgaVal = parts.length > 1 ? parts[0] : "";
      setEditState(stateVal);
      setEditLga(lgaVal);
      setEditValue("");
    } else if (key === "denomination") {
      setEditValue(currentValue ? String(currentValue) : "");
      setEditCustomDenom("");
    } else if (currentValue === true || currentValue === false) {
      setEditValue(currentValue ? "true" : "false");
    } else {
      setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : "");
    }
  }

  function toggleMultiOption(value) {
    const current = editValue ? editValue.split(", ") : [];
    const idx = current.indexOf(value);
    if (idx > -1) current.splice(idx, 1);
    else current.push(value);
    setEditValue(current.join(", "));
  }

  return (
    <motion.div
      layout
      className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/60 shadow-soft overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-foreground/5 transition"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-emerald/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">{section.label}</h3>
            <p className="text-xs text-muted-foreground">
              {section.id === "photos"
                ? `${photos.length} photo${photos.length !== 1 ? "s" : ""}`
                : `${fields.length} items ${isOpen ? "" : "— tap to expand"}`}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-1 border-t border-border/40 pt-4">
              {section.id === "photos" ? (
                <>
                  {uploadError && (
                    <p className="text-xs text-destructive px-1">{uploadError}</p>
                  )}
                  <PhotoSection
                    photos={photos}
                    onUpload={onUpload}
                    onDelete={onDelete}
                    onSetPrimary={onSetPrimary}
                    uploading={uploading}
                  />
                </>
              ) : (
                fields.map((field) => {
                  if (field.hidden) return null;
                  const currentValue = user?.[field.key];
                  const displayValue = formatValue(user, field.key);
                  const isEditing = editing === field.key;

                  if (field.type === "badge") {
                    return (
                      <div key={field.key} className="flex items-center justify-between p-3 rounded-2xl">
                        <div>
                          <p className="text-xs text-muted-foreground">{field.label}</p>
                          <p className={`text-sm font-semibold ${currentValue ? "text-emerald-deep dark:text-gold-royal" : "text-muted-foreground"}`}>
                            {displayValue}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={field.key} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-foreground/5 transition">
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          {field.type === "city_state" ? (
                            <div className="flex-1 flex gap-2">
                              <select value={editState} onChange={e => { setEditState(e.target.value); setEditLga(""); }} className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm">
                                <option value="">State</option>
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <select value={editLga} onChange={e => setEditLga(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm">
                                <option value="">LGA / City</option>
                                {(editState ? lgas[editState] || [] : []).map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          ) : field.type === "denomination" ? (
                            <div className="flex-1 space-y-2">
                              <select value={editValue} onChange={e => { setEditValue(e.target.value); if (e.target.value !== "others") setEditCustomDenom(""); }} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm">
                                <option value="">Select denomination</option>
                                {denominations.map(d => (
                                  <option key={d.id} value={d.id === 29 ? "others" : d.id}>{d.name}</option>
                                ))}
                              </select>
                              {editValue === "others" && (
                                <input type="text" value={editCustomDenom} onChange={e => setEditCustomDenom(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm" placeholder="Enter your denomination" />
                              )}
                            </div>
                          ) : field.type === "yesno" ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm"
                            >
                              <option value="">Select</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : field.type === "multiselect" ? (
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {(editValue ? editValue.split(", ").filter(Boolean) : []).map(v => (
                                  <span key={v} className="px-2 py-0.5 rounded-full bg-emerald/10 text-[10px] font-medium text-emerald-dark flex items-center gap-1">
                                    {v}
                                    <button type="button" onClick={() => toggleMultiOption(v)} className="hover:text-destructive">&times;</button>
                                  </span>
                                ))}
                              </div>
                              <select
                                value=""
                                onChange={(e) => { if (e.target.value) toggleMultiOption(e.target.value); e.target.value = ""; }}
                                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm"
                              >
                                <option value="">Add tribe...</option>
                                {field.options.filter(o => !editValue?.split(", ").includes(o)).map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          ) : field.type === "select" ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm"
                            >
                              <option value="">Select {field.label}</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === "textarea" ? (
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              rows={3}
                              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm"
                            />
                          ) : (
                            <input
                              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] outline-none text-sm"
                            />
                          )}
                          <button onClick={() => handleSave(field.key)} disabled={saving} className="p-1.5 rounded-lg bg-emerald/10 text-emerald-deep dark:text-gold-royal hover:bg-emerald/20 transition">
                            {saving ? "..." : <Check className="h-4 w-4" />}
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">{field.label}</p>
                            <p className="text-sm font-semibold text-foreground">{displayValue}</p>
                          </div>
                          {!field.readonly && (
                            <button
                              onClick={() => startEdit(field.key, currentValue)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-emerald/10 text-emerald-deep dark:text-gold-royal transition"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ProfileCenter() {
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  const [openSection, setOpenSection] = useState("personal");
  const [photos, setPhotos] = useState([]);
  const [denominations, setDenominations] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const coverInputRef = useRef(null);
  const coverRef = useRef(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [cropModal, setCropModal] = useState(null);
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    api.getCurrentSubscription().then(setMembership).catch(() => {});
  }, []);

  const plan = membership?.plan || null;
  const subActive = membership?.subscription?.status === "active";

  useEffect(() => {
    api.getPhotos().then((data) => setPhotos(Array.isArray(data) ? data : [])).catch(() => {});
    api.getDenominations().then(data => setDenominations(Array.isArray(data) ? data : [])).catch(() => {});
  }, [location.pathname]);

  async function handleUpload(file) {
    setUploading(true);
    setUploadError(null);
    try {
      const photo = await api.uploadPhoto(file);
      setPhotos((prev) => [photo, ...prev]);
    } catch (e) {
      setUploadError(e.message || 'Upload failed');
    }
    setUploading(false);
  }

  async function handleDelete(id) {
    try {
      await api.deletePhoto(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch {}
  }

  async function handleSetPrimary(id) {
    try {
      const updated = await api.setPrimaryPhoto(id);
      setPhotos((prev) => prev.map((p) => ({ ...p, is_primary: p.id === id })));
    } catch {}
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </div>
    );
  }

  const initial = (user.first_name?.[0] || user.email?.[0] || "U").toUpperCase();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "User";
  const primary = photos.find((p) => p.is_primary);
  const coverPhoto = user?.cover_photo;

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const rect = coverRef.current?.getBoundingClientRect();
    const ratio = rect && rect.height ? rect.width / rect.height : 4;
    setCropModal({ file, url, ratio });
  }

  async function handleCropSave(croppedBlob) {
    setCoverUploading(true);
    setCropModal(null);
    try {
      const fd = new FormData();
      fd.append('image', croppedBlob, 'cover.jpg');
      const token = getUserAccessToken();
      await fetch('/api/auth/cover-photo/', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: fd,
      });
      window.location.reload();
    } catch {}
    setCoverUploading(false);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cover + profile photo wrapper */}
      <div className="relative">
        {/* Cover photo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="rounded-[2.5rem] overflow-hidden">
            <div ref={coverRef} className="relative w-full bg-gradient-to-br from-emerald/30 to-gold/20">
              {coverPhoto ? (
                <img src={coverPhoto} alt="Cover" className="block w-full h-auto max-h-[200px] sm:max-h-[320px] md:max-h-[420px] object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-full h-[200px] sm:h-[320px] md:h-[420px] pattern-dots opacity-[0.08]" />
              )}

              {/* Cover upload / change button */}
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition backdrop-blur-sm"
              >
                {coverUploading ? (
                  <span className="text-xs">Uploading...</span>
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>
          </div>
        </motion.div>

        {/* Profile photo — overlapping bottom-left of cover */}
        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-6 md:left-8 z-50">
          {primary ? (
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl sm:rounded-[2rem] ring-4 ring-background shadow-luxe overflow-hidden">
              <img src={primary.image} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl sm:rounded-[2rem] ring-4 ring-background shadow-luxe bg-gradient-to-br from-emerald to-gold p-0.5">
              <div className="h-full w-full rounded-3xl sm:rounded-[2rem] bg-background flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-bold text-gradient-luxury">{initial}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for the overlapping photo */}
      <div className="h-14 sm:h-20" />

      {/* Name and info */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 mt-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground truncate">{fullName}</h1>
            <Link
              to="/membership"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm transition hover:scale-105 ${
                plan && subActive
                  ? "bg-gradient-to-r from-emerald to-gold-royal text-white"
                  : "bg-foreground/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crown className="h-3.5 w-3.5" />
              {plan && subActive ? `${plan.name} · Active` : plan ? `${plan.name} · Inactive` : "Free Member"}
            </Link>
          </div>
          <p className="text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /> {user.city_state || "Location not set"}</span>
            <span className="flex items-center gap-1 min-w-0"><Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{user.email}</span></span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <ProfileSection
            key={section.id}
            section={section}
            user={user}
            isOpen={openSection === section.id}
            onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
            onUpdate={updateProfile}
            photos={photos}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onSetPrimary={handleSetPrimary}
            uploading={uploading}
            uploadError={uploadError}
            denominations={denominations}
          />
        ))}
      </div>

      {cropModal && (
        <CoverCropModal
          src={cropModal.url}
          ratio={cropModal.ratio}
          onSave={handleCropSave}
          onClose={() => {
            URL.revokeObjectURL(cropModal.url);
            setCropModal(null);
          }}
        />
      )}
    </div>
  );
}
