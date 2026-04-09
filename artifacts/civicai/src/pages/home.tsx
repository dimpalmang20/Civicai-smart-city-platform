import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetAnalyticsSummary,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import {
  Trash2,
  AlertTriangle,
  Droplets,
  Lightbulb,
  MapPin,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  Recycle,
  Shield,
} from "lucide-react";

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  garbage: <Trash2 className="h-4 w-4" />,
  pothole: <AlertTriangle className="h-4 w-4" />,
  water_leakage: <Droplets className="h-4 w-4" />,
  street_light: <Lightbulb className="h-4 w-4" />,
  plastic: <Recycle className="h-4 w-4" />,
  other: <MapPin className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
};

function StatCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Home() {
  const { data: summary } = useGetAnalyticsSummary();
  const { data: activity } = useGetRecentActivity({ limit: 6 });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white px-8 py-16 md:py-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1400&q=80')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/30">
              <Shield className="h-3 w-3 mr-1" /> AI-Powered Civic Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
              Let's Clean Our Society
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed max-w-2xl">
              Report civic issues with a photo. Our AI instantly identifies the problem,
              routes it to the right authority, and rewards you for making India cleaner.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/report">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg">
                Report an Issue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10">
                View Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      {summary && (
        <section>
          <h2 className="text-xl font-bold mb-5 text-foreground">Platform Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total Issues" value={summary.totalIssues} delay={0} />
            <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Resolved" value={summary.resolvedIssues} delay={0.1} />
            <StatCard icon={<Clock className="h-5 w-5" />} label="Pending" value={summary.pendingIssues} delay={0.2} />
            <StatCard icon={<Users className="h-5 w-5" />} label="Active Citizens" value={summary.totalUsers} delay={0.3} />
          </div>
        </section>
      )}

      {/* Issue Types */}
      <section>
        <h2 className="text-xl font-bold mb-5 text-foreground">What Can You Report?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { type: "garbage", label: "Garbage Dump", dept: "Municipality", icon: <Trash2 className="h-8 w-8" /> },
            { type: "pothole", label: "Road Pothole", dept: "PWD Department", icon: <AlertTriangle className="h-8 w-8" /> },
            { type: "water_leakage", label: "Water Leakage", dept: "Water Authority", icon: <Droplets className="h-8 w-8" /> },
            { type: "street_light", label: "Street Light", dept: "Electricity Dept", icon: <Lightbulb className="h-8 w-8" /> },
            { type: "plastic", label: "Plastic Waste", dept: "Recycling Company", icon: <Recycle className="h-8 w-8" /> },
            { type: "other", label: "Other Issues", dept: "Municipality", icon: <MapPin className="h-8 w-8" /> },
          ].map((item, i) => (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Link href="/report">
                <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Routes to {item.dept}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      {activity && activity.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {activity.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                      {ISSUE_ICONS[item.issueType] ?? <MapPin className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground capitalize text-sm">
                        {item.issueType.replace("_", " ")}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{item.address}</div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[item.status]}`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Earn Rewards Banner */}
      <section>
        <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/20">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Earn While You Help</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get 100 points for every accepted report. 10 points = ₹1. Withdraw via UPI!
              </p>
            </div>
            <Link href="/leaderboard">
              <Button className="shrink-0">
                View Leaderboard <Trophy className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Trophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
