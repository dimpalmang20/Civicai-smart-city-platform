import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useAuthorityLogin,
  useGetAuthorityAssignedIssues,
  useUpdateIssue,
  getGetAuthorityAssignedIssuesQueryKey,
  getGetIssueQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  Shield,
  Loader2,
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
import type { Issue } from "@workspace/api-client-react";

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

function AuthorityLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { loginAuthority } = useAuth();
  const login = useAuthorityLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
  
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          isAuthorityLogin: true
        })
      });
  
      const result = await res.json();
  
      if (!res.ok) {
        throw new Error(result.message || "Login failed");
      }
  
      loginAuthority(result.user, result.token);
      window.location.reload();
  
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Authority Login</CardTitle>
              <p className="text-sm text-muted-foreground">For municipal and department officials</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="municipality@civicai.in" className="mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Login as Authority
            </Button>
          </form>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground font-medium mb-1">Demo Accounts:</p>
            <p className="text-xs text-muted-foreground">municipality@civicai.in / authority123</p>
            <p className="text-xs text-muted-foreground">pwd@civicai.in / authority123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthorityDashboard() {
  const { getAuthorityUser, logout } = useAuth();
  const authority = getAuthorityUser();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: issues, isLoading } = useGetAuthorityAssignedIssues(
    {
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    },
    {
      query: {
        enabled: !!authority && !!localStorage.getItem("civicai_token"),
        queryKey: getGetAuthorityAssignedIssuesQueryKey({
          status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        }),
      },
    },
  );
  const updateIssue = useUpdateIssue();

  const issueRows = asArray<Issue>(issues);

  const handleAction = async (id: number, status: "in_progress" | "resolved") => {
    await updateIssue.mutateAsync({ id, data: { status } });
    queryClient.invalidateQueries({
      queryKey: getGetAuthorityAssignedIssuesQueryKey({
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      }),
    });
    queryClient.invalidateQueries({ queryKey: getGetIssueQueryKey(id) });
  };

  const stats = {
    total: issueRows.length,
    pending: issueRows.filter((i) => i.status === "pending").length,
    inProgress: issueRows.filter((i) => i.status === "in_progress").length,
    resolved: issueRows.filter((i) => i.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Authority Panel</h1>
          <p className="text-muted-foreground mt-0.5">
            <span className="font-medium text-primary">{authority?.department}</span> · {authority?.name}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { logout(); window.location.reload(); }}>
          Logout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Assigned", value: stats.total, icon: <MapPin className="h-4 w-4" />, color: "text-foreground" },
          { label: "Pending", value: stats.pending, icon: <AlertCircle className="h-4 w-4" />, color: "text-amber-600" },
          { label: "In Progress", value: stats.inProgress, icon: <Clock className="h-4 w-4" />, color: "text-blue-600" },
          { label: "Resolved", value: stats.resolved, icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-4">
                <div className={`flex items-center gap-2 mb-1 ${s.color}`}>
                  {s.icon}
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "in_progress", "resolved"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : issueRows.length > 0 ? (
          issueRows.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {issue.imageUrl ? (
                      <div className="w-20 h-20 rounded-lg overflow-hidden border shrink-0 bg-muted">
                        <img src={issue.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                        {ISSUE_ICONS[issue.issueType] ?? <MapPin className="h-4 w-4" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold capitalize">{issue.issueType.replace("_", " ")}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[issue.status]}`}>
                          {issue.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">{issue.address}</div>
                      <div className="mt-2 rounded-md overflow-hidden border h-36 bg-muted hidden sm:block">
                        <iframe
                          title="Location map"
                          className="w-full h-full border-0"
                          loading="lazy"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(issue.longitude) - 0.006}%2C${Number(issue.latitude) - 0.006}%2C${Number(issue.longitude) + 0.006}%2C${Number(issue.latitude) + 0.006}&layer=mapnik&marker=${Number(issue.latitude)}%2C${Number(issue.longitude)}`}
                        />
                      </div>
                      <a
                        className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline"
                        href={`https://www.google.com/maps?q=${Number(issue.latitude)},${Number(issue.longitude)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" /> Open in Maps
                      </a>
                      {issue.description && (
                        <div className="text-xs text-muted-foreground mt-1">{issue.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Reported {new Date(issue.createdAt).toLocaleDateString("en-IN")}
                        {issue.reporterName && ` by ${issue.reporterName}`}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Link href={`/report/${issue.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {issue.status !== "resolved" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                      {issue.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-700 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleAction(issue.id, "in_progress")}
                          disabled={updateIssue.isPending}
                        >
                          Accept & Start
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAction(issue.id, "resolved")}
                        disabled={updateIssue.isPending}
                      >
                        Mark Resolved
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No complaints assigned to your authority yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default function Authority() {
  const { getAuthorityUser } = useAuth();
  const authority = getAuthorityUser();
  return authority ? <AuthorityDashboard /> : <AuthorityLoginForm />;
}
