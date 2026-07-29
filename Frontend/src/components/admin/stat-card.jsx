import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({ label, value, delta, icon: Icon, hint, color = "primary" }) {
  const colors = {
    primary: "from-primary/10 to-transparent",
    gold: "from-gold/10 to-transparent",
    success: "from-success/10 to-transparent",
    warning: "from-warning/10 to-transparent",
    info: "from-info/10 to-transparent",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative overflow-hidden rounded-xl border bg-card p-5", colors[color] && `bg-gradient-to-br ${colors[color]}`)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {delta != null && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", delta >= 0 ? "text-success" : "text-destructive")}>
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{delta >= 0 ? "+" : ""}{delta}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}
