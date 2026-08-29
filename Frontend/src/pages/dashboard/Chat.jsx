import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Heart, Send, Sparkles, Music,
  ArrowLeft, User, Check, X, Compass, Crown, Star,
  Phone, PhoneOff, Video, Mic, Square, Volume2, ShieldAlert,
} from "lucide-react";
import { FourSquare } from "react-loading-indicators";
import { useAuth } from "../../context/AuthContext";
import { api, getUserAccessToken } from "../../lib/api";

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat/`;
const WS_PRESENCE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/presence/`;
const wsAuth = (t) => [`Bearer.${t}`, 'dp'];

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

function ConversationList({ conversations, activeId, setActiveId, onlineUsers, currentUserId }) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <Heart className="h-12 w-12 text-emerald/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Like someone on Discover to start a conversation</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {conversations.map((c) => {
        const other = c.other_user || {};
        const name = other.first_name || "User";
        const initial = name[0];
        const lastMsg = c.last_message;
        const isOnline = onlineUsers.has(other.id);
        return (
          <motion.button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            whileHover={{ x: 4 }}
            className={`w-full text-left p-4 rounded-2xl transition ${
              activeId === c.id
                ? "bg-emerald/10 border border-emerald/20"
                : "hover:bg-foreground/5 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald to-gold flex items-center justify-center text-lg font-bold text-white">
                  {initial}
                </div>
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground truncate">{name}</span>
                  {lastMsg && (
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {new Date(lastMsg.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {lastMsg ? (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lastMsg.sender === currentUserId ? "You: " : `${lastMsg.sender_name || "User"}: `}
                    {lastMsg.text}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5 italic">No messages yet</p>
                )}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function MessageBubble({ msg, isOwn }) {
  const isAudio = msg.audio_url || msg.audio || msg.text === '[Voice Note]';
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? "bg-emerald text-white rounded-br-md"
            : "bg-foreground/5 text-foreground rounded-bl-md"
        }`}
      >
        {isAudio && (msg.audio_url || msg.audio) ? (
          <div className="flex items-center gap-2 min-w-[180px]">
            <button onClick={togglePlay} className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
              {playing ? <Volume2 className="h-4 w-4" /> : <Music className="h-4 w-4" />}
            </button>
            <div className="flex-1 h-2 rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white/40" style={{ width: playing ? "100%" : "0%" }} />
            </div>
            <span className="text-xs opacity-70">0:12</span>
            <audio ref={audioRef} src={msg.audio_url || msg.audio} onEnded={() => setPlaying(false)} />
          </div>
        ) : (
          <p>{msg.text}</p>
        )}
        <span className={`block text-[10px] mt-1 flex items-center gap-1 ${isOwn ? "text-white/60 justify-end" : "text-muted-foreground"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isOwn && <Check className="h-3 w-3" />}
        </span>
      </div>
    </motion.div>
  );
}

function VoiceRecorder({ onSend, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timer.current);
        setDuration(0);
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if (blob.size > 0) onSend(blob);
      };

      recorder.start();
      setRecording(true);
      timer.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch { alert("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  useEffect(() => {
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {recording ? (
        <>
          <div className="flex items-center gap-2 flex-1">
            <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">Recording {fmt(duration)}</span>
          </div>
          <button onClick={stopRecording} className="h-9 w-9 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition">
            <Square className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button onClick={startRecording} className="h-9 w-9 rounded-full bg-foreground/10 text-foreground/70 hover:text-foreground flex items-center justify-center transition">
            <Mic className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">Tap to record voice note</span>
        </>
      )}
    </div>
  );
}

function VideoCallOverlay({ conversationId, localStream, remoteStream, onEnd, incomingCall, callerName, onAccept, onReject, callType }) {
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
    if (incomingCall || !remoteStream) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [incomingCall, remoteStream]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (incomingCall) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        <div className="p-8 rounded-3xl bg-background text-center shadow-luxe max-w-sm w-full mx-4">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald to-gold flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white">
            {callerName?.[0] || "U"}
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">{callerName} is calling...</h3>
          <p className="text-sm text-muted-foreground mt-1">{callLabel}</p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <button onClick={onReject} className="h-14 w-14 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition shadow-lg">
              <PhoneOff className="h-6 w-6" />
            </button>
            <button onClick={onAccept} className="h-14 w-14 rounded-full bg-emerald text-white flex items-center justify-center hover:bg-emerald/90 transition shadow-lg">
              <Phone className="h-6 w-6" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isAudio) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
      >
        <div className="relative">
          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-emerald to-gold flex items-center justify-center text-4xl font-bold text-white">
            {callerName?.[0] || "U"}
          </div>
          <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald border-4 border-black animate-pulse" />
        </div>
        <p className="text-white/90 font-display text-xl font-semibold mt-6">{callerName || "Call"}</p>
        <p className="text-white/50 text-sm mt-1">{callLabel} · {fmt(elapsed)}</p>
        <div className="mt-12 flex items-center gap-6">
          <button onClick={onEnd} className="h-16 w-16 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition shadow-lg">
            <PhoneOff className="h-6 w-6" />
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
        {/* Remote video (full screen) */}
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        {/* Call label + timer */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/50 text-white/90 text-sm backdrop-blur-sm">
          {callLabel} · {fmt(elapsed)}
        </div>
        {/* Local video (small overlay) */}
        <div className="absolute top-4 right-4 h-40 w-32 rounded-2xl overflow-hidden shadow-lg border-2 border-white/30">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>
        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button onClick={onEnd} className="h-14 w-14 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition shadow-lg">
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const { id: urlConvId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(urlConvId || null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [ws, setWs] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showVoice, setShowVoice] = useState(false);
  const [policyNotice, setPolicyNotice] = useState(null);

  // Call state
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState('video');
  const [callSessionId, setCallSessionId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
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
    api.getConversations().then(setConversations).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (urlConvId) setActiveConvId(urlConvId);
  }, [urlConvId]);

  useEffect(() => {
    if (!activeConvId) return;
    api.getMessages(activeConvId).then(setMessages).catch(() => {});
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
      socket.onopen = () => { retries = 0; };
      socket.onmessage = (event) => {
        try { wsMessageRef.current(JSON.parse(event.data)); } catch { /* ignore malformed frames */ }
      };
      socket.onclose = () => {
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

  const handleVoiceSend = async (blob) => {
    setShowVoice(false);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice.webm');
      formData.append('conversation_id', activeConvId);
      const result = await api.uploadAudio(formData);
      sendWs({ type: 'audio', id: result.id, audio_url: result.audio || '', created_at: result.created_at || new Date().toISOString() });
    } catch { console.error("Voice upload failed"); }
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

  const endCall = () => {
    const sid = callSessionId;
    if (sid) api.endCall(sid).catch(() => {});
    setCallSessionId(null);
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    sendWs({ type: 'call_end' });
  };

  const activeConv = conversations.find(c => String(c.id) === String(activeConvId));
  const otherUser = activeConv?.other_user || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <>
      {inCall && (
        <VideoCallOverlay
          conversationId={activeConvId}
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={endCall}
          callerName={otherUser.first_name || "User"}
          callType={callType}
        />
      )}

      <AnimatePresence>
        {incomingCall && (
          <VideoCallOverlay
            incomingCall={true}
            callerName={incomingCall.senderName}
            onAccept={acceptCall}
            onReject={rejectCall}
            callType={incomingCall.callType || 'video'}
          />
        )}
      </AnimatePresence>

      <div className="flex h-[calc(100vh-8rem)] max-w-6xl mx-auto gap-0 lg:gap-4">
        {/* Conversation list — sidebar on desktop, overlay on mobile */}
        <div className={`${activeConvId ? "hidden lg:flex" : "flex"} w-full lg:w-80 shrink-0 flex-col overflow-y-auto p-2 lg:p-0`}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-display text-lg font-bold text-foreground mb-4 px-2">Messages</h2>
            <ConversationList
              conversations={conversations}
              activeId={activeConvId}
              setActiveId={(id) => { setActiveConvId(id); setMessages([]); }}
              onlineUsers={onlineUsers}
              currentUserId={user?.id}
            />
          </motion.div>
        </div>

        {/* Chat area */}
        {activeConvId ? (
          <div className="flex-1 flex flex-col bg-background rounded-3xl border border-border/50 overflow-hidden lg:ml-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0">
              <button onClick={() => setActiveConvId(null)} className="lg:hidden p-1 -ml-1">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald to-gold flex items-center justify-center font-bold text-white">
                {(otherUser.first_name || "U")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{otherUser.first_name || "User"}</p>
                <p className="text-xs text-muted-foreground">
                  {onlineUsers.has(otherUser.id) ? "Online" : "Offline"}
                </p>
              </div>
              <button
                onClick={() => startCall('audio')}
                className="h-9 w-9 rounded-full bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-foreground/10 flex items-center justify-center transition"
                title="Start audio call"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button
                onClick={() => startCall('video')}
                className="h-9 w-9 rounded-full bg-emerald/10 text-emerald flex items-center justify-center hover:bg-emerald/20 transition"
                title="Start video call"
              >
                <Video className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Heart className="h-10 w-10 text-emerald/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {["God bless you", "I'm happy we matched", "How was your day?"].map(p => (
                        <button
                          key={p}
                          onClick={() => { setText(p); }}
                          className="px-3 py-1.5 rounded-full bg-emerald/5 text-xs font-medium text-emerald-dark hover:bg-emerald/10 transition"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} isOwn={String(msg.sender) === String(user?.id)} />
              ))}
              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground italic px-1">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </span>
                  Typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-border/40 shrink-0">
              {policyNotice && (
                <div className="flex items-start gap-2 px-4 pt-3">
                  <ShieldAlert className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-gold leading-relaxed flex-1">{policyNotice}</p>
                  <button onClick={() => setPolicyNotice(null)} className="text-muted-foreground hover:text-foreground transition shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {showVoice ? (
                <VoiceRecorder
                  onSend={handleVoiceSend}
                  onCancel={() => setShowVoice(false)}
                />
              ) : (
                <div className="flex items-end gap-2 p-3">
                  <button
                    onClick={() => setShowVoice(true)}
                    className="h-9 w-9 rounded-full bg-foreground/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition shrink-0"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-2.5 rounded-2xl bg-foreground/5 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-emerald/50 transition"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!text.trim()}
                    className="h-9 w-9 rounded-full bg-emerald text-white flex items-center justify-center hover:bg-emerald/90 transition disabled:opacity-40 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-center text-muted-foreground">
            <div>
              <Heart className="h-16 w-16 mx-auto mb-4 text-emerald/20" />
              <p className="font-display text-xl font-semibold text-foreground">Select a conversation</p>
              <p className="text-sm mt-1">Choose a connection to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
