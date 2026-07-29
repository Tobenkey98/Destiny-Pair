import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";

export default function AutocompleteInput({ label, field, value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (value.length < 1) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const data = await api.suggestions(field, value);
        setSuggestions(data.suggestions || []);
        setOpen(data.suggestions?.length > 0);
      } catch { setSuggestions([]); }
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, field]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(s) {
    onChange(s);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { setFocused(true); if (suggestions.length) setOpen(true); }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-[color:var(--gold-royal)] focus:ring-2 focus:ring-[color:var(--gold-royal)]/20 outline-none transition"
      />
      {open && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-luxe max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => select(s)}
              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-emerald/10 hover:text-[color:var(--emerald-deep)] dark:hover:text-[color:var(--gold-royal)] transition first:rounded-t-xl last:rounded-b-xl"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
