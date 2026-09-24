import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Heart, Send, ArrowLeft, Check, Phone, PhoneOff, Video, Mic,
  Volume2, ShieldAlert, Search, Pause, Trash2, ChevronLeft,
} from "lucide-react";
import { FourSquare } from "react-loading-indicators";
import { useAuth } from "../../context/AuthContext";
import { api, getUserAccessToken } from "../../lib/api";

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat/`;
const WS_PRESENCE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/presence/`;
const wsAuth = (t) => [`Bearer.${t}`, 'dp'];
const LAST_CONV_KEY = 'dp_last_conversation';

const CALL_REASON_TEXT = {
  NOT_MUTUAL_MATCH: "Both of you must like each other (a mutual match) before you can call.",
  EMAIL_NOT_VERIFIED: "Please verify your email address before making calls.",
  INSUFFICIENT_MESSAGES: "Send a few messages first — you need an active conversation before calling.",
  MESSAGE_LIMIT_REACHED: "Your message limit is exhausted for this period.",
  CONVERSATION_LIMIT_REACHED: "Your conversation limit is reached for this period.",
  CONVERSATION_NOT_FOUND: "This conversation is no longer available.",
};

const callErrorMessage = (err) =>
  err?.data?.detail ||
  CALL_REASON_TEXT[err?.data?.reason] ||
  err?.data?.error ||
  err?.message ||
  "Call could not be started. Please check your plan and message balance.";

const fmtClock = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDur = (s) => {
  if (s == null || Number.isNaN(s) || !Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const timeAgo = (ts) => {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return new Date(ts).toLocaleDateString([], { weekday: 'short' });
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const dayLabel = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
};

const previewText = (lastMsg) => {
  if (!lastMsg) return "No messages yet";
  const t = lastMsg.text || lastMsg.message || "";
  return t === '[Voice Note]' ? "Voice note" : t;
};

const pickAudioMime = () => {
  if (typeof window === 'undefined' || !window.MediaRecorder) return { mime: "", ext: "webm" };
  const candidates = [
    { mime: 'audio/webm;codecs=opus', ext: 'webm' },
    { mime: 'audio/webm', ext: 'webm' },
    { mime: 'audio/mp4', ext: 'm4a' },
    { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  ];
  for (const c of candidates) {
    try {
      if (window.MediaRecorder.isTypeSupported(c.mime)) return c;
    } catch { /* try next */ }
  }
  return { mime: "", ext: "webm" };
};

function Avatar({ name, size = "md", online }) {
  const initial = (name?.[0] || "U").toUpperCase();
  const dims = size === "lg" ? "h-12 w-12 text-lg" : size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";
  return (
    <div className="relative shrink-0">
      <div className={`${dims} rounded-2xl bg-gradient-to-br from-[#611C2B] to-[#D3A345] flex items-center justify-center font-bold text-white shadow`}>
        {initial}
      </div>
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${online ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
      )}
    </div>
  );
}

function ConversationRow({ conv, active, online, currentUserId, onSelect }) {
  const other = conv.other_user || {};
  const name = other.first_name || "User";
  return (
    <motion.button
      layout
      onClick={() => onSelect(conv.id)}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left p-3 rounded-2xl transition flex items-center gap-3 ${
        active
          ? "bg-gradient-to-r from-[#611C2B]/10 to-[#D3A345]/10 border border-[#D3A345]/30 shadow-soft"
          : "border border-transparent hover:bg-muted/70"
      }`}
    >
      <Avatar name={name} online={online} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-sm truncate">{name}</span>
          {conv.last_message && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {timeAgo(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {conv.last_message ? (
            <>
              {String(conv.last_message.sender) === String(currentUserId) && (
                <span className="font-semibold">You: </span>
              )}
              {previewText(conv.last_message)}
            </>
          ) : (
            <span className="italic">Say hello to start chatting</span>
          )}
        </p>
      </div>
    </motion.button>
  );
}

function AudioBubble({ src, isOwn }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(null);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
  };

  return (
    <div className="flex items-center gap-2.5 min-w-[190px] max-w-[230px]">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition active:scale-90 ${
          isOwn ? "bg-white/25 hover:bg-white/35 text-white" : "bg-[#611C2B] hover:bg-[#7A2E3F] text-white"
        }`}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1.5 rounded-full overflow-hidden ${isOwn ? "bg-white/25" : "bg-foreground/10"}`}>
          <div
            className={`h-full rounded-full transition-none ${isOwn ? "bg-white" : "bg-[#D3A345]"}`}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
        <span className={`block text-[10px] mt-1 tabular-nums ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
          {fmtDur(duration)}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
      />
    </div>
  );
}

function MessageBubble({ msg, isOwn, showAvatar, avatarName }) {
  const src = msg.audio_url || msg.audio || null;
  const isAudio = Boolean(src) || msg.text === '[Voice Note]';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {!isOwn && showAvatar && (
        <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-[#611C2B] to-[#D3A345] flex items-center justify-center text-[11px] font-bold text-white shrink-0 mb-4">
          {(avatarName?.[0] || "U").toUpperCase()}
        </div>
      )}
      {!isOwn && !showAvatar && <div className="w-7 shrink-0" />}
      <div
        className={`max-w-[78%] sm:max-w-[70%] px-4 py-2.5 shadow-soft ${
          isOwn
            ? "bg-gradient-to-br from-[#611C2B] to-[#7A2E3F] text-white rounded-3xl rounded-br-lg"
            : "bg-card border border-border/60 text-foreground rounded-3xl rounded-bl-lg"
        }`}
      >
        {isAudio && src ? (
          <AudioBubble src={src} isOwn={isOwn} />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
        )}
        <span className={`mt-1 flex items-center gap-1 text-[10px] tabular-nums ${isOwn ? "text-white/65 justify-end" : "text-muted-foreground"}`}>
          {fmtClock(msg.created_at)}
          {isOwn && <Check className="h-3 w-3" />}
        </span>
      </div>
    </motion.div>
  );
}

function VoiceRecorder({ onSend, onCancel, uploading }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);

  const cleanup = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    mediaRecorder.current = null;
  };

  useEffect(() => cleanup, []);

  const startRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert("Voice recording is not supported on this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mime, ext } = pickAudioMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ext = ext;
      mediaRecorder.current = recorder;
      chunks.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        clearInterval(timer.current);
        const wasCancelled = cancelledRef.current;
        const blob = new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' });
        cleanup();
        setRecording(false);
        setDuration(0);
        if (!wasCancelled && blob.size > 0) onSend(blob, recorder.ext || 'webm');
      };

      recorder.start();
      setRecording(true);
      timer.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      cleanup();
      alert("Microphone access denied. Please allow microphone access to send a voice note.");
    }
  };

  const stopAndSend = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    } else {
      cleanup();
      setRecording(false);
      setDuration(0);
    }
    onCancel();
  };

  useEffect(() => {
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bars = [0.5, 0.9, 0.65, 1, 0.75, 0.55, 0.95, 0.7, 0.85, 0.6, 1, 0.5, 0.8, 0.65, 0.9, 0.55];

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <button
        onClick={cancel}
        aria-label="Cancel recording"
        className="h-9 w-9 shrink-0 rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 flex items-center justify-center transition"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center gap-2.5 rounded-2xl bg-destructive/5 border border-destructive/20 px-3 py-2 min-w-0">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse shrink-0" />
        <span className="text-sm font-bold tabular-nums text-destructive shrink-0">
          {fmtDur(duration)}
        </span>
        <div className="flex-1 flex items-center gap-[3px] h-6 overflow-hidden" aria-hidden>
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-destructive/60 animate-pulse"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.09}s`, animationDuration: "0.9s" }}
            />
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:block shrink-0">Recording…</span>
      </div>
      <button
        onClick={stopAndSend}
        disabled={uploading}
        aria-label="Send voice note"
        className="h-10 w-10 shrink-0 rounded-full bg-[#611C2B] text-white flex items-center justify-center hover:bg-[#7A2E3F] transition disabled:opacity-50 shadow"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}

function VideoCallOverlay({ localStream, remoteStream, onEnd, onToggleMute, onToggleVideo, muted, videoOff, incomingCall, callerName, callerPhoto, onAccept, onReject, callType }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const isAudio = callType === 'audio';
  const callLabel = isAudio ? "Audio call" : "Video call";

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (incomingCall || (!isAudio && !remoteStream)) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [incomingCall, remoteStream, isAudio]);

  if (incomingCall) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="w-full max-w-xs rounded-[2rem] bg-card border border-border/60 p-8 text-center shadow-luxe"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[#611C2B] to-[#D3A345] flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white shadow-luxe"
          >
            {callerName?.[0]?.toUpperCase() || "U"}
          </motion.div>
          <h3 className="font-display text-xl font-bold">{callerName || "Someone"} is calling…</h3>
          <p className="text-sm text-muted-foreground mt-1">{callLabel}</p>
          <div className="flex items-center justify-center gap-5 mt-8">
            <button onClick={onReject} aria-label="Decline call" className="h-14 w-14 rounded-full bg-destructive text-white flex items-center justify-center hover:brightness-110 active:scale-90 transition shadow-luxe">
              <PhoneOff className="h-6 w-6" />
            </button>
            <button onClick={onAccept} aria-label="Accept call" className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:brightness-110 active:scale-90 transition shadow-luxe">
              <Phone className="h-6 w-6" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (isAudio) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-[#2D2323] via-[#611C2B] to-[#2D2323] flex flex-col items-center justify-center px-6"
      >
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="relative"
        >
          <div className="h-28 w-28 rounded-[2rem] bg-gradient-to-br from-[#D3A345] to-[#F4EFEA] flex items-center justify-center text-4xl font-bold text-[#611C2B] shadow-luxe">
            {callerName?.[0]?.toUpperCase() || "U"}
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 border-4 border-[#2D2323]" />
          </span>
        </motion.div>
        <p className="text-white font-display text-2xl font-bold mt-6">{callerName || "Call"}</p>
        <p className="text-white/60 text-sm mt-1 tabular-nums">{callLabel} · {fmtDur(elapsed)}</p>
        <div className="mt-12 flex items-center gap-4">
          <button
            onClick={onToggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className={`h-13 w-13 p-3.5 rounded-full flex items-center justify-center transition shadow ${muted ? "bg-white text-[#611C2B]" : "bg-white/15 text-white hover:bg-white/25"}`}
          >
            {muted ? <VolumeXIcon /> : <Mic className="h-5 w-5" />}
          </button>
          <button onClick={onEnd} aria-label="End call" className="h-16 w-16 rounded-full bg-destructive text-white flex items-center justify-center hover:brightness-110 active:scale-90 transition shadow-luxe">
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={onToggleVideo}
            aria-label="Switch to video"
            className="h-13 w-13 p-3.5 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center transition shadow"
          >
            <Video className="h-5 w-5" />
          </button>
        </div>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      <div className="relative h-full w-full">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#2D2323] to-black">
            <div className="h-24 w-24 rounded-[1.75rem] bg-gradient-to-br from-[#611C2B] to-[#D3A345] flex items-center justify-center text-4xl font-bold text-white animate-pulse">
              {callerName?.[0]?.toUpperCase() || "U"}
            </div>
            <p className="text-white/70 text-sm">Connecting…</p>
          </div>
        )}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/55 text-white text-xs font-semibold backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          {callerName || "Call"} · <span className="tabular-nums">{fmtDur(elapsed)}</span>
        </div>
        <div className="absolute top-4 right-4 h-36 w-28 sm:h-44 sm:w-36 rounded-2xl overflow-hidden shadow-luxe border-2 border-white/30 bg-neutral-900">
          {localStream && !videoOff ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white/60 text-xs font-semibold">Camera off</div>
          )}
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button
            onClick={onToggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition shadow-luxe ${muted ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"}`}
          >
            {muted ? <VolumeXIcon /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            onClick={onToggleVideo}
            aria-label={videoOff ? "Turn camera on" : "Turn camera off"}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition shadow-luxe ${videoOff ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"}`}
          >
            {videoOff ? <VideoOffIcon /> : <Video className="h-5 w-5" />}
          </button>
          <button onClick={onEnd} aria-label="End call" className="h-14 w-14 rounded-full bg-destructive text-white flex items-center justify-center hover:brightness-110 active:scale-90 transition shadow-luxe">
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
      <style>{`.mirror{transform:scaleX(-1)}`}</style>
    </motion.div>
  );
}

function VolumeXIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <line x1="22" x2="16" y1="9" y2="15" />
      <line x1="16" x2="22" y1="9" y2="15" />
    </svg>
  );
}

function VideoOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
      <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10z" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export default function Chat() {
  const { id: urlConvId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [convsLoaded, setConvsLoaded] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [ws, setWs] = useState(null);
  const [wsOnline, setWsOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showVoice, setShowVoice] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [policyNotice, setPolicyNotice] = useState(null);
  const [convSearch, setConvSearch] = useState("");

  // Call state
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState('video');
  const [callSessionId, setCallSessionId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const peerRef = useRef(null);
  const pendingCandidates = useRef([]);

  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = getUserAccessToken();
    setToken(t || "");
  }, []);

  useEffect(() => {
    api.getConversations()
      .then((list) => setConversations(Array.isArray(list) ? list : []))
      .catch(() => {})
      .finally(() => { setConvsLoaded(true); setLoading(false); });
  }, []);

  const selectConversation = useCallback((id) => {
    setActiveConvId(id);
    setMessages([]);
    setShowVoice(false);
    setPolicyNotice(null);
    if (id != null) {
      try { localStorage.setItem(LAST_CONV_KEY, String(id)); } catch { /* ignore */ }
    }
  }, []);

  // Open the last chat: URL id wins, then the stored conversation, then the
  // most recent conversation. Runs once the list is loaded so returning users
  // land straight in their latest chat.
  useEffect(() => {
    if (!convsLoaded) return;
    if (urlConvId) {
      selectConversation(urlConvId);
      return;
    }
    let last = null;
    try { last = localStorage.getItem(LAST_CONV_KEY); } catch { /* ignore */ }
    if (last && conversations.some((c) => String(c.id) === String(last))) {
      setActiveConvId(last);
      setMessages([]);
    } else if (conversations.length > 0) {
      const first = conversations[0].id;
      setActiveConvId(first);
      setMessages([]);
      try { localStorage.setItem(LAST_CONV_KEY, String(first)); } catch { /* ignore */ }
    } else {
      setActiveConvId(null);
      setMessages([]);
    }
  }, [urlConvId, convsLoaded, selectConversation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeConvId) return;
    api.getMessages(activeConvId).then((list) => setMessages(Array.isArray(list) ? list : [])).catch(() => {});
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // Keep the conversation list's last-message preview in sync in real time.
  const updateConversationPreview = useCallback((lastMessage) => {
    if (!activeConvId) return;
    setConversations(prev => {
      const updated = prev.map(c => String(c.id) === String(activeConvId)
        ? { ...c, last_message: lastMessage }
        : c);
      const match = updated.find(c => String(c.id) === String(activeConvId));
      if (!match) return updated;
      return [match, ...updated.filter(c => String(c.id) !== String(activeConvId))];
    });
  }, [activeConvId]);

  // Shared WebSocket message handler — always reads the latest closures.
  const wsMessageRef = useRef(() => {});
  useEffect(() => {
    wsMessageRef.current = (data) => {
      switch (data.type) {
        case 'message':
          setMessages(prev => [...prev, {
            id: data.id,
            sender: data.sender_id,
            sender_name: data.sender_name,
            text: data.text,
            created_at: data.created_at,
          }]);
          updateConversationPreview({
            id: data.id,
            text: data.text,
            sender: data.sender_id,
            sender_name: data.sender_name,
            created_at: data.created_at,
          });
          break;
        case 'audio':
          setMessages(prev => [...prev, {
            id: data.id,
            sender: data.sender_id,
            text: '[Voice Note]',
            audio_url: data.audio_url,
            audio: data.audio_url,
            created_at: data.created_at,
          }]);
          updateConversationPreview({
            id: data.id,
            text: '[Voice Note]',
            sender: data.sender_id,
            sender_name: data.sender_name,
            created_at: data.created_at,
          });
          break;
        case 'policy_block':
          setPolicyNotice(data.reason || 'This message was not sent.');
          break;
        case 'online':
          setOnlineUsers(prev => new Set([...prev, data.user_id]));
          break;
        case 'offline':
          setOnlineUsers(prev => { const n = new Set(prev); n.delete(data.user_id); return n; });
          break;
        case 'presence_snapshot':
          setOnlineUsers(prev => new Set([...prev, ...(data.online || [])]));
          break;
        case 'typing':
          setTypingUsers(prev => {
            const n = new Set(prev);
            if (data.is_typing) n.add(data.user_id);
            else n.delete(data.user_id);
            return n;
          });
          break;
        case 'call_offer':
          setIncomingCall({ senderId: data.sender_id, senderName: data.sender_name, offer: data.offer, callType: data.call_type || 'video' });
          break;
        case 'call_answer':
          handleAnswer(data.answer);
          break;
        case 'ice_candidate':
          handleIceCandidate(data.candidate);
          break;
        case 'call_end':
          endCall();
          break;
        default:
          break;
      }
    };
  });

  // Presence socket — stays connected for the lifetime of the chat page so
  // online/offline status is always known, even before opening a conversation.
  useEffect(() => {
    if (!token) return;
    let socket = null;
    let disposed = false;
    let retries = 0;

    const connectPresence = () => {
      if (disposed) return;
      socket = new WebSocket(WS_PRESENCE, wsAuth(token));
      socket.onopen = () => { retries = 0; };
      socket.onmessage = (event) => {
        try { wsMessageRef.current(JSON.parse(event.data)); } catch { /* ignore malformed frames */ }
      };
      socket.onclose = () => {
        if (disposed) return;
        const delay = Math.min(1000 * 2 ** retries, 15000);
        retries += 1;
        setTimeout(connectPresence, delay);
      };
    };

    connectPresence();
    return () => { disposed = true; if (socket) socket.close(); };
  }, [token]);

  // Conversation socket — bound to the active conversation for messaging.
  // Auto-reconnects with exponential backoff so chat stays real-time without
  // ever requiring a page reload (survives brief network/server hiccups).
  useEffect(() => {
    if (!activeConvId || !token) return;
    let socket = null;
    let disposed = false;
    let retries = 0;

    const connectConv = () => {
      if (disposed) return;
      socket = new WebSocket(`${WS_BASE}${activeConvId}/`, wsAuth(token));
      socket.onopen = () => { retries = 0; setWsOnline(true); };
      socket.onmessage = (event) => {
        try { wsMessageRef.current(JSON.parse(event.data)); } catch { /* ignore malformed frames */ }
      };
      socket.onclose = () => {
        setWsOnline(false);
        if (disposed) return;
        const delay = Math.min(1000 * 2 ** retries, 15000);
        retries += 1;
        setTimeout(connectConv, delay);
      };
      setWs(socket);
    };

    connectConv();
    return () => { disposed = true; if (socket) socket.close(); };
  }, [activeConvId, token]);

  const sendWs = useCallback((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  }, [ws]);

  const handleSend = () => {
    const msg = text.trim();
    if (!msg) return;
    sendWs({ type: 'message', text: msg });
    setText("");
    sendWs({ type: 'typing', is_typing: false });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    sendWs({ type: 'typing', is_typing: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendWs({ type: 'typing', is_typing: false }), 2000);
  };

  const handleVoiceSend = async (blob, ext = 'webm') => {
    setShowVoice(false);
    if (!activeConvId) return;
    setVoiceUploading(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, `voice.${ext}`);
      formData.append('conversation_id', activeConvId);
      const result = await api.uploadAudio(formData);
      const url = result.audio_url || result.audio || '';
      sendWs({ type: 'audio', id: result.id, audio_url: url, created_at: result.created_at || new Date().toISOString() });
    } catch {
      setPolicyNotice("Voice note could not be sent. Please try again.");
    } finally {
      setVoiceUploading(false);
    }
  };

  // WebRTC
  const getPeerConnection = () => {
    if (peerRef.current) return peerRef.current;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) sendWs({ type: 'ice_candidate', candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    peerRef.current = pc;
    return pc;
  };

  const applyLocalFlags = (stream) => {
    stream.getAudioTracks().forEach((t) => { t.enabled = !muted; });
    stream.getVideoTracks().forEach((t) => { t.enabled = !videoOff; });
  };

  const startCall = async (type = 'video') => {
    if (!activeConvId) return;
    setPolicyNotice(null);
    let session = null;
    try {
      session = await api.startCall(activeConvId, type);
    } catch (err) {
      setPolicyNotice(callErrorMessage(err));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      setCallType(type);
      setVideoOff(type !== 'video');
      setMuted(false);
      setLocalStream(stream);
      setInCall(true);
      setCallSessionId(session?.id ?? null);

      const pc = getPeerConnection();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendWs({ type: 'call_offer', offer: pc.localDescription, call_type: type });

      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates.current = [];
    } catch {
      if (session?.id) api.endCall(session.id).catch(() => {});
      alert("Camera/mic access denied");
    }
  };

  const handleAnswer = async (answer) => {
    const pc = peerRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates.current = [];
    } catch {}
  };

  const handleIceCandidate = async (candidate) => {
    const pc = peerRef.current;
    if (pc && pc.remoteDescription) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    } else {
      pendingCandidates.current.push(candidate);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    setPolicyNotice(null);
    const type = incomingCall.callType || 'video';
    let session = null;
    try {
      session = await api.startCall(activeConvId, type);
    } catch (err) {
      sendWs({ type: 'call_end' });
      setIncomingCall(null);
      setPolicyNotice(callErrorMessage(err));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      setCallType(type);
      setVideoOff(type !== 'video');
      setMuted(false);
      setLocalStream(stream);
      setInCall(true);
      setCallSessionId(session?.id ?? null);
      setIncomingCall(null);

      const pc = getPeerConnection();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendWs({ type: 'call_answer', answer: pc.localDescription });

      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates.current = [];
    } catch {
      if (session?.id) api.endCall(session.id).catch(() => {});
      alert("Camera/mic access denied");
    }
  };

  const rejectCall = () => {
    setIncomingCall(null);
    sendWs({ type: 'call_end' });
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStream?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  };

  const toggleVideo = () => {
    setVideoOff((v) => {
      const next = !v;
      localStream?.getVideoTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  };

  const endCall = () => {
    const sid = callSessionId;
    if (sid) api.endCall(sid).catch(() => {});
    setCallSessionId(null);
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    setMuted(false);
    setVideoOff(false);
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    sendWs({ type: 'call_end' });
  };

  const switchToVideo = async () => {
    if (!localStream || callType === 'video') return;
    setVideoOff(false);
    setCallType('video');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getAudioTracks().forEach((t) => { t.enabled = !muted; });
      const pc = getPeerConnection();
      localStream.getTracks().forEach((t) => t.stop());
      pc.getSenders().forEach((s) => { try { pc.removeTrack(s); } catch {} });
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      setLocalStream(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendWs({ type: 'call_offer', offer: pc.localDescription, call_type: 'video' });
    } catch {
      setVideoOff(true);
      setCallType('audio');
    }
  };

  const activeConv = conversations.find(c => String(c.id) === String(activeConvId));
  const otherUser = activeConv?.other_user || {};
  const otherOnline = onlineUsers.has(otherUser.id);
  const otherTyping = typingUsers.has(otherUser.id);

  const visibleConvs = conversations.filter((c) => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return true;
    return (c.other_user?.first_name || "User").toLowerCase().includes(q);
  });

  // Group messages under day dividers for a modern chat feel.
  const grouped = [];
  messages.forEach((m) => {
    const label = m.created_at ? dayLabel(m.created_at) : null;
    const lastGroup = grouped[grouped.length - 1];
    if (!label || !lastGroup || lastGroup.label !== label) {
      grouped.push({ label, items: [m] });
    } else {
      lastGroup.items.push(m);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {inCall && (
          <VideoCallOverlay
            localStream={localStream}
            remoteStream={remoteStream}
            onEnd={endCall}
            onToggleMute={toggleMute}
            onToggleVideo={switchToVideo}
            muted={muted}
            videoOff={videoOff}
            callerName={otherUser.first_name || "User"}
            callType={callType}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {incomingCall && (
          <VideoCallOverlay
            incomingCall
            callerName={incomingCall.senderName}
            onAccept={acceptCall}
            onReject={rejectCall}
            callType={incomingCall.callType || 'video'}
          />
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <div className="flex h-[calc(100vh-9rem)] min-h-[480px] rounded-[1.75rem] border border-border/50 bg-card shadow-soft overflow-hidden">
          {/* Sidebar */}
          <aside className={`${activeConvId ? "hidden lg:flex" : "flex"} w-full lg:w-[340px] shrink-0 flex-col border-r border-border/40 bg-background/60`}>
            <div className="p-4 pb-3 shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-display text-xl font-bold">Messages</h2>
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${wsOnline ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${wsOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                  {wsOnline ? "Live" : "Connecting"}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder="Search conversations"
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-muted/70 border border-transparent text-sm outline-none focus:border-[#D3A345] focus:bg-background transition"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
              {visibleConvs.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#611C2B]/10 to-[#D3A345]/15 flex items-center justify-center mx-auto mb-3">
                    <Heart className="h-6 w-6 text-[#D3A345]" />
                  </div>
                  <p className="text-sm font-bold">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Like someone on Discover to start chatting</p>
                </div>
              ) : (
                visibleConvs.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={String(c.id) === String(activeConvId)}
                    online={onlineUsers.has(c.other_user?.id)}
                    currentUserId={user?.id}
                    onSelect={selectConversation}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Thread */}
          {activeConvId ? (
            <div className="flex-1 flex flex-col min-w-0 bg-background">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/80 backdrop-blur shrink-0">
                <button onClick={() => setActiveConvId(null)} aria-label="Back to conversations" className="lg:hidden p-1.5 -ml-1 rounded-xl hover:bg-muted transition">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar name={otherUser.first_name || "User"} online={otherOnline} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{otherUser.first_name || "User"}</p>
                  <p className={`text-xs ${otherTyping ? "text-[#D3A345] font-semibold italic" : otherOnline ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                    {otherTyping ? "Typing…" : otherOnline ? "Online now" : "Offline"}
                  </p>
                </div>
                <span className={`hidden sm:flex items-center gap-1.5 text-[11px] font-semibold ${wsOnline ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${wsOnline ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  {wsOnline ? "Connected" : "Reconnecting"}
                </span>
                <button
                  onClick={() => startCall('audio')}
                  aria-label="Start audio call"
                  className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-90 transition"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  aria-label="Start video call"
                  className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#611C2B] to-[#8A525E] flex items-center justify-center text-white hover:brightness-110 active:scale-90 transition shadow"
                >
                  <Video className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-1.5">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                    <div className="text-center max-w-xs">
                      <div className="h-16 w-16 rounded-[1.25rem] bg-gradient-to-br from-[#611C2B]/10 to-[#D3A345]/15 flex items-center justify-center mx-auto mb-4">
                        <Heart className="h-7 w-7 text-[#D3A345]" />
                      </div>
                      <p className="font-display text-lg font-bold">Say hello to {otherUser.first_name || "them"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Break the ice with a warm opener — or send a voice note.</p>
                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {["God bless you", "I'm happy we matched", "How was your day?"].map((p) => (
                          <button
                            key={p}
                            onClick={() => setText(p)}
                            className="px-3 py-1.5 rounded-full bg-[#611C2B]/5 border border-[#611C2B]/15 text-xs font-semibold text-[#611C2B] dark:text-[#D3A345] hover:bg-[#611C2B]/10 transition"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {grouped.map((g, gi) => (
                  <div key={`${g.label}-${gi}`}>
                    {g.label && (
                      <div className="flex items-center gap-3 my-4">
                        <span className="flex-1 h-px bg-border/60" />
                        <span className="px-3 py-1 rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                          {g.label}
                        </span>
                        <span className="flex-1 h-px bg-border/60" />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {g.items.map((msg, mi) => {
                        const isOwn = String(msg.sender) === String(user?.id) || String(msg.sender_id) === String(user?.id);
                        const next = g.items[mi + 1];
                        const nextOwn = next && (String(next.sender) === String(user?.id) || String(next.sender_id) === String(user?.id));
                        return (
                          <MessageBubble
                            key={msg.id ?? `${msg.created_at}-${mi}`}
                            msg={msg}
                            isOwn={isOwn}
                            showAvatar={!isOwn && !nextOwn}
                            avatarName={msg.sender_name || otherUser.first_name}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                {otherTyping && (
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-card border border-border/60 flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border/40 bg-card/80 backdrop-blur px-3 sm:px-4 pt-2 pb-3 shrink-0">
                {policyNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 px-2 pb-2"
                  >
                    <ShieldAlert className="h-4 w-4 text-[#D3A345] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#8A6D1B] dark:text-[#D3A345] leading-relaxed flex-1">{policyNotice}</p>
                    <button onClick={() => setPolicyNotice(null)} aria-label="Dismiss" className="text-xs font-bold text-muted-foreground hover:text-foreground transition shrink-0">
                      Dismiss
                    </button>
                  </motion.div>
                )}
                {showVoice ? (
                  <VoiceRecorder
                    onSend={handleVoiceSend}
                    onCancel={() => setShowVoice(false)}
                    uploading={voiceUploading}
                  />
                ) : (
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => setShowVoice(true)}
                      aria-label="Record voice note"
                      className="h-11 w-11 shrink-0 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground hover:text-[#611C2B] dark:hover:text-[#D3A345] hover:bg-muted/70 active:scale-90 transition"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                    <div className="flex-1 rounded-2xl bg-muted/70 border border-transparent focus-within:border-[#D3A345] focus-within:bg-background transition">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${otherUser.first_name || ""}…`}
                        rows={1}
                        className="w-full px-4 py-2.5 bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground max-h-28"
                      />
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!text.trim()}
                      aria-label="Send message"
                      className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-[#611C2B] to-[#8A525E] text-white flex items-center justify-center hover:brightness-110 active:scale-90 transition disabled:opacity-40 shadow"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center text-center bg-background">
              <div className="max-w-xs px-6">
                <div className="h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-[#611C2B]/10 to-[#D3A345]/15 flex items-center justify-center mx-auto mb-5">
                  <Heart className="h-9 w-9 text-[#D3A345]" />
                </div>
                <p className="font-display text-2xl font-bold">Your conversations</p>
                <p className="text-sm text-muted-foreground mt-2">Pick a connection on the left to keep the conversation going.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
