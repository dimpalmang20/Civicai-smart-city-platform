import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Award, Star, Shield, Zap, TrendingUp, CheckCircle } from "lucide-react";

const BADGE_CONFIG: Record<string, { color: string; icon: React.ReactNode; desc: string }> = {
  "City Hero": {
    color: "bg-amber-100 text-amber-800 border-amber-300",
    icon: <Award className="h-3.5 w-3.5" />,
    desc: "5000+ points",
  },
  "Top Reporter": {
    color: "bg-purple-100 text-purple-800 border-purple-300",
    icon: <Star className="h-3.5 w-3.5" />,
    desc: "2000+ points",
  },
  "Civic Champion": {
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: <Shield className="h-3.5 w-3.5" />,
    desc: "500+ points",
  },
};

const RANK_STYLES: Record<number, string> = {
  1: "bg-gradient-to-r from-amber-400 to-amber-500 text-white",
  2: "bg-gradient-to-r from-slate-400 to-slate-500 text-white",
  3: "bg-gradient-to-r from-orange-400 to-orange-500 text-white",
};

export default function Leaderboard() {
  const { data: leaderboard } = useGetLeaderboard({ limit: 20 });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Top civic contributors making India cleaner</p>
      </div>

      {/* Badge System */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(BADGE_CONFIG).map(([badge, config]) => (
          <Card key={badge} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                {config.icon}
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">{badge}</div>
                <div className="text-xs text-muted-foreground">{config.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Points System Info */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-accent" />
              <span className="font-medium text-foreground">Report accepted</span>
              <Badge className="bg-primary/10 text-primary border-primary/20">+100 pts</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-foreground">Issue resolved</span>
              <Badge className="bg-green-100 text-green-700 border-green-200">+200 pts</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
              <TrendingUp className="h-4 w-4" />
              10 pts = ₹1 cashback
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Contributors</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboard && leaderboard.length > 0 ? (
            <div className="divide-y divide-border/50">
              {leaderboard.map((entry, i) => (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Rank */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    RANK_STYLES[entry.rank] ?? "bg-muted text-muted-foreground"
                  }`}>
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{entry.name}</span>
                      {entry.badge && BADGE_CONFIG[entry.badge] && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${BADGE_CONFIG[entry.badge].color}`}>
                          {BADGE_CONFIG[entry.badge].icon}
                          {entry.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {entry.totalReports} reports · {entry.resolvedReports} resolved
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-primary">{entry.points.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">points</div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No contributors yet. Be the first to report an issue!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
