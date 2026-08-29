import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Bot, X, Send, ThumbsUp, ThumbsDown,
  Headset, ChevronDown, Loader2,
} from "lucide-react";
import { api } from "../lib/api";

const SESSION_KEY = "dp_bot_session";

function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = "dp-" + (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const QUICK_ACTIONS = [
  "How do I create an account?",
  "How much does it cost?",
  "How do I report a user?",
  "How do I reset my password?",
  "I have a complaint",
];

const WELCOME = "Hello! I'm Destiny, the DestinyPair assistant. I'm here 24/7 to help with sign-up, membership, " +
  "matching, safety, and more. How can I help you today?";

function MessageBubble({ msg }) {
  const isBot = msg.role === "assistant";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} w-full`}>
      <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isBot
          ? "bg-foreground/5 text-foreground border border-border/50 rounded-tl-sm"
          : "bg-emerald text-gold-royal rounded-tr-sm"
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [escCategory, setEscCategory] = useState("other");
  const [escDescription, setEscDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const scrollRef = useRef(null);
  const sessionId = getSessionId();

  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, open, showEscalate]);

  if (isAdminRoute) return null;

  function pushBot(text) {
    setMessages(prev => [...prev, { role: "assistant", content: text }]);
    setFeedbackGiven(false);
  }

  async function handleSend(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || typing) return;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
    setTyping(true);
    try {
      const data = await api.chatbotSend({ session_id: sessionId, message: trimmed });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      setFeedbackGiven(false);
    } catch (err) {
      setError(err.data?.error || err.message || "Sorry, I couldn't respond. Please try again.");
    } finally {
      setTyping(false);
    }
  }

  async function handleEscalate(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const data = await api.chatbotEscalate({
        session_id: sessionId,
        category: escCategory,
        description: escDescription.trim(),
      });
      setShowEscalate(false);
      setEscDescription("");
      pushBot(data.message);
    } catch (err) {
      setError(err.data?.error || err.message || "Could not send your report. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleFeedback(rating) {
    if (feedbackGiven) return;
    setFeedbackGiven(true);
    try {
      await api.chatbotFeedback({ session_id: sessionId, rating });
    } catch {}
  }

  function handleQuick(action) {
    if (action === "I have a complaint") {
      setShowEscalate(true);
      return;
    }
    handleSend(action);
  }

  const escalateLabels = {
    not_answered: "My question was not answered",
    complaint: "Complaint",
    bug: "Bug / technical issue",
    billing: "Payment / billing",
    account: "Account issue",
    report_user: "Report a user",
    other: "Other",
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open Destiny assistant"
        className="fixed bottom-5 right-5 z-40 group"
      >
        <span className="absolute -inset-1.5 rounded-full bg-emerald/40 animate-ping opacity-40" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald to-[color:var(--gold-royal)] shadow-luxe transition group-hover:scale-105">
          {open ? <X className="h-6 w-6 text-gold-royal" /> : <Bot className="h-6 w-6 text-gold-royal" />}
        </span>
        {!open && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald border-2 border-background" />
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-40 w-[min(92vw,25rem)] h-[min(70vh,34rem)] rounded-3xl bg-background border border-border/60 shadow-luxe overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 px-5 py-4 bg-gradient-to-r from-emerald/15 via-background to-gold/15 border-b border-border/50 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald to-[color:var(--gold-royal)] flex items-center justify-center">
                <Bot className="h-5 w-5 text-gold-royal" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-foreground leading-tight">Destiny Assistant</p>
                <p className="text-[11px] text-emerald-dark dark:text-gold-royal flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald inline-block" /> Online • 24/7
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/60 transition"
                aria-label="Close chat"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <MessageBubble msg={{ role: "assistant", content: WELCOME }} />
              {messages.map((m, i) => (
                <MessageBubble key={i} msg={m} />
              ))}
              {typing && (
                <div className="flex justify-start w-full">
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-foreground/5 border border-border/50">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald" />
                    <span className="text-xs text-muted-foreground">Destiny is typing…</span>
                  </div>
                </div>
              )}
              {!typing && messages.length > 0 && !feedbackGiven && (
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-[11px] text-muted-foreground">Was this helpful?</span>
                  <button onClick={() => handleFeedback(5)} className="text-emerald hover:scale-110 transition" aria-label="Helpful">
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleFeedback(1)} className="text-muted-foreground hover:scale-110 transition" aria-label="Not helpful">
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              )}
              {error && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">{error}</p>
              )}
            </div>

            {/* Escalate form */}
            {showEscalate ? (
              <form onSubmit={handleEscalate} className="shrink-0 border-t border-border/50 px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Headset className="h-4 w-4 text-emerald" /> Talk to a human
                  </p>
                  <button type="button" onClick={() => setShowEscalate(false)} className="text-muted-foreground hover:text-foreground text-xs">Back to chat</button>
                </div>
                <select
                  value={escCategory}
                  onChange={e => setEscCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:border-emerald"
                >
                  {Object.entries(escalateLabels).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <textarea
                  value={escDescription}
                  onChange={e => setEscDescription(e.target.value)}
                  placeholder="Briefly describe your issue…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:border-emerald resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 py-2.5 rounded-full bg-emerald text-gold-royal text-sm font-semibold transition hover:shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send report
                  </button>
                </div>
              </form>
            ) : (
              <div className="shrink-0 border-t border-border/50 px-4 pt-3 pb-2">
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_ACTIONS.map(a => (
                    <button
                      key={a}
                      onClick={() => handleQuick(a)}
                      className="px-3 py-1.5 rounded-full bg-emerald/5 border border-emerald/20 text-[11px] text-emerald-dark dark:text-gold-royal transition hover:bg-emerald/15"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); handleSend(); }}
              className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-border/50"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={showEscalate ? "" : "Type your message…"}
                disabled={showEscalate}
                className="flex-1 px-4 py-2.5 rounded-full bg-foreground/5 border border-border/50 text-sm outline-none focus:border-emerald disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={typing || showEscalate || !input.trim()}
                className="h-10 w-10 shrink-0 rounded-full bg-emerald text-gold-royal flex items-center justify-center transition hover:shadow-glow disabled:opacity-50"
                aria-label="Send message"
              >
                {typing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}