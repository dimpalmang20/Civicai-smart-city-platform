import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  useGetAnalyticsSummary,
  useGetIssuesByType,
  useGetIssuesOverTime,
  useListIssues,
} from "@workspace/api-client-react";
import {
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Trash2,
  AlertTriangle,
  Droplets,
  Lightbulb,
  Recycle,
  ExternalLink,
} from "lucide-react";
import { asArray } from "@/lib/as-array";
import type { Issue, IssueTimePoint, IssueTypeCount } from "@workspace/api-client-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
};

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  garbage: <Trash2 className="h-4 w-4" />,
  pothole: <AlertTriangle className="h-4 w-4" />,
  water_leakage: <Droplets className="h-4 w-4" />,
  street_light: <Lightbulb className="h-4 w-4" />,
  plastic: <Recycle className="h-4 w-4" />,
  other: <MapPin className="h-4 w-4" />,
};

const CHART_COLORS = ["#22863a", "#ff8c00", "#2563eb", "#9333ea", "#dc2626", "#64748b"];

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: summary } = useGetAnalyticsSummary();
  const { data: byType } = useGetIssuesByType();
  const { data: overTime } = useGetIssuesOverTime();
  const { data: issues } = useListIssues({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    issue_type: typeFilter !== "all" ? (typeFilter as any) : undefined,
    limit: 20,
  });

  const byTypeRows = asArray<IssueTypeCount>(byType);
  const overTimeRows = asArray<IssueTimePoint>(overTime);
  const issueRows = asArray<Issue>(issues);

  const statCards = summary
    ? [
        { icon: <TrendingUp className="h-5 w-5" />, label: "Total Issues", value: summary.totalIssues, color: "text-primary" },
        { icon: <CheckCircle className="h-5 w-5" />, label: "Resolved", value: summary.resolvedIssues, color: "text-green-600" },
        { icon: <AlertCircle className="h-5 w-5" />, label: "In Progress", value: summary.inProgressIssues, color: "text-blue-600" },
        { icon: <Clock className="h-5 w-5" />, label: "Pending", value: summary.pendingIssues, color: "text-amber-600" },
      ]
    : [];

  const validationCards = summary
    ? [
        { label: "Fake Reports", value: summary.fakeReports, hint: "Rejected + duplicates", color: "text-red-600" },
        { label: "Flagged Reports", value: summary.flaggedReports, hint: "Needs review", color: "text-orange-600" },
        { label: "Avg Trust Score", value: summary.avgTrustScore.toFixed(2), hint: "Across all users", color: "text-emerald-700" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Civic Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time overview of civic issues across India</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className={`flex items-center gap-2 mb-2 ${card.color}`}>
                  {card.icon}
                  <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                </div>
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
                {summary && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round((card.value / Math.max(summary.totalIssues, 1)) * 100)}% of total
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Validation Overview */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {validationCards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.07 }}
            >
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
                      <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">{c.hint}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar Chart: Issues by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {byTypeRows.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byTypeRows} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {byTypeRows.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart: Issues Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues Over Time (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {overTimeRows.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={overTimeRows} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.substring(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No data for last 30 days
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Recent Reports</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="garbage">Garbage</SelectItem>
                  <SelectItem value="pothole">Pothole</SelectItem>
                  <SelectItem value="water_leakage">Water Leakage</SelectItem>
                  <SelectItem value="street_light">Street Light</SelectItem>
                  <SelectItem value="plastic">Plastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {issueRows.length > 0 ? (
            <div className="space-y-2">
              {issueRows.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                    {ISSUE_ICONS[issue.issueType] ?? <MapPin className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm capitalize">
                        {issue.issueType.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">→ {issue.department}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{issue.address}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[issue.status]}`}>
                      {issue.status.replace("_", " ")}
                    </span>
                    <Link href={`/report/${issue.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No issues found for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Placeholder with Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Issue Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border/50 p-4 min-h-[200px]">
            <div className="text-sm text-muted-foreground mb-3 font-medium">Active Issue Locations</div>
            {issueRows.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {issueRows.slice(0, 6).map((issue) => (
                  <div key={issue.id} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      issue.status === "resolved" ? "bg-green-500" :
                      issue.status === "in_progress" ? "bg-blue-500" : "bg-amber-500"
                    }`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium capitalize">{issue.issueType.replace("_", " ")}</div>
                      <div className="text-xs text-muted-foreground truncate">{issue.address}</div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-auto shrink-0">
                      {Number(issue.latitude).toFixed(2)}°N
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No active issues
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
