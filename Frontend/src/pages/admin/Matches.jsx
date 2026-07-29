import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart, Users, TrendingUp, Sparkles, MessageCircle } from "lucide-react";
import { PageHeader } from "../../components/admin/page-header";
import { StatCard } from "../../components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { api } from "../../lib/api";

export default function Matches() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api.getMatches().then(setMatches).catch(() => {});
  }, []);

  const matchRate = matches.length > 0
    ? Math.round((matches.filter(m => m.status === "matched").length / matches.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Matches" description="Compatibility and matchmaking analytics" />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard label="Total Matches" value={String(matches.length || 0)} icon={Heart} color="primary" />
        <StatCard label="Match Rate" value={`${matchRate}%`} icon={TrendingUp} color="success" />
        <StatCard label="Active Conversations" value="156" icon={MessageCircle} color="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compatibility Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { range: "90-100%", pct: 18, color: "bg-success" },
                { range: "70-89%", pct: 35, color: "bg-primary" },
                { range: "50-69%", pct: 30, color: "bg-gold" },
                { range: "Below 50%", pct: 17, color: "bg-muted-foreground/30" },
              ].map((b, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{b.range}</span>
                    <span className="text-muted-foreground">{b.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.pct}%` }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      className={`h-full rounded-full ${b.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matches.slice(0, 6).map((m, i) => {
              const name = m.to_user_name || `User ${m.to_user}`;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={m.status === "matched" ? "success" : m.status === "liked" ? "info" : "warning"}>
                    {m.status}
                  </Badge>
                </motion.div>
              );
            })}
            {matches.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No matches yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
