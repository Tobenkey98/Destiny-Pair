import { motion } from "framer-motion";
import { useState } from "react";
import {
  Lock, Construction, Heart, Clock,
} from "lucide-react";

export default function Counselling() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="max-w-5xl mx-auto relative">
      {!showInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-40 flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-28 w-28 rounded-[2rem] bg-gradient-to-br from-emerald/20 to-gold/10 border border-border/60 flex items-center justify-center mb-6 shadow-soft"
          >
            <Lock className="h-14 w-14 text-emerald-deep dark:text-gold-royal" />
          </motion.div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Counselling Hub
          </h2>
          <p className="text-muted-foreground max-w-md text-sm sm:text-base">
            Pre-marital counselling is coming soon. We're working with faith-based counsellors to bring you guided sessions.
          </p>
          <button
            onClick={() => setShowInfo(true)}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald text-gold-royal font-semibold shadow-soft hover:shadow-glow transition"
          >
            <Construction className="h-4 w-4" />
            Learn More
          </button>
        </motion.div>
      )}

      {showInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center mb-6"
          >
            <Construction className="h-12 w-12 text-amber-500" />
          </motion.div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Under Development
          </h2>
          <div className="max-w-lg space-y-4 text-sm sm:text-base text-muted-foreground">
            <p>
              The counselling feature is currently being built. Here's what's coming:
            </p>
            <ul className="text-left space-y-3 max-w-sm mx-auto">
              {[
                "One-on-one video sessions with certified counsellors",
                "Faith-based pre-marital guidance programs",
                "Resource library with articles and guides",
                "Session scheduling and progress tracking",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-emerald/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="h-3 w-3 text-emerald-deep dark:text-gold-royal" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setShowInfo(false)}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full glass border border-border/60 text-sm font-medium text-foreground/70 hover:text-foreground transition"
          >
            <Lock className="h-4 w-4" />
            Back
          </button>
        </motion.div>
      )}
    </div>
  );
}
