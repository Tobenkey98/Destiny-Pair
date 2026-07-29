import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import DiscoverCarousel from "../components/DiscoverCarousel";

export default function DiscoverPage() {
  return (
    <div className="min-h-screen pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            <Sparkles className="h-3.5 w-3.5 text-gold-royal" />
            <span className="text-gradient-gold">Faith &bull; Purpose &bull; Intention</span>
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-4">
            Discover Compatible <span className="text-gradient-luxury italic">Christian Singles</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Profiles matched to your faith, values, and relationship goals &mdash; every introduction is prayerfully considered.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <DiscoverCarousel />
        </motion.div>
      </div>
    </div>
  );
}
