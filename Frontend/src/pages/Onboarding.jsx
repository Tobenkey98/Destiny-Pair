import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FourSquare } from "react-loading-indicators";
import { Heart, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getUserAccessToken } from "../lib/api";
import ProfileCenter from "./dashboard/ProfileCenter";

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const complete = user?.profile_completion?.is_complete === true;

  useEffect(() => {
    if (loading) return;
    if (!getUserAccessToken() && !user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user && complete) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, complete, navigate]);

  if (loading || (!user && getUserAccessToken())) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-background">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </section>
    );
  }

  if (!user) return null;

  return (
    <section className="min-h-screen pt-24 pb-20 bg-hero">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald/10 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            Profile Setup
          </div>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-gradient-luxury flex items-center justify-center gap-2">
            Let's build your profile <Heart className="h-7 w-7 text-[color:var(--gold-royal)]" fill="currentColor" />
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Complete each section one after another. Your progress saves automatically —
            if you leave and come back, just sign in and continue where you left off.
            Once your profile hits 100%, you'll enter your dashboard.
          </p>
        </motion.div>

        <ProfileCenter
          setupMode
          onComplete={() => navigate("/dashboard", { replace: true })}
        />

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Need to leave? Your progress is saved. <Link to="/login" className="font-semibold underline underline-offset-2">Sign back in</Link> anytime to continue setup.
        </p>
      </div>
    </section>
  );
}

export default Onboarding;
