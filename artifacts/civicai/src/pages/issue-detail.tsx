import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetIssue, useUpdateIssue, getGetIssueQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Droplets,
  Lightbulb,
  Recycle,
  Brain,
  Building2,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";

const STATUS_STEPS = [
  { key: "pending", label: "Reported", icon: <AlertCircle className="h-5 w-5" /> },
  { key: "in_progress", label: "In Progress", icon: <Clock className="h-5 w-5" /> },
  { key: "resolved", label: "Resolved", icon: <CheckCircle className="h-5 w-5" /> },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
};

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  garbage: <Trash2 className="h-6 w-6" />,
  pothole: <AlertTriangle className="h-6 w-6" />,
  water_leakage: <Droplets className="h-6 w-6" />,
  street_light: <Lightbulb className="h-6 w-6" />,
  plastic: <Recycle className="h-6 w-6" />,
  other: <MapPin className="h-6 w-6" />,
};

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { getAuthorityUser } = useAuth();
  const authority = getAuthorityUser();
  const queryClient = useQueryClient();

  const { data: issue, isLoading } = useGetIssue(Number(id), {
    query: { enabled: !!id, queryKey: getGetIssueQueryKey(Number(id)) },
  });
  const updateIssue = useUpdateIssue();

  const handleStatusChange = async (status: "in_progress" | "resolved") => {
    if (!id) return;
    await updateIssue.mutateAsync({ id: Number(id), data: { status } });
    queryClient.invalidateQueries({ queryKey: getGetIssueQueryKey(Number(id)) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Issue Not Found</h2>
        <Link href="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === issue.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground capitalize">
            {issue.issueType.replace("_", " ")} Report
          </h1>
          <p className="text-xs text-muted-foreground">Issue #{issue.id}</p>
        </div>
      </div>

      {/* Image */}
      {issue.imageUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="overflow-hidden">
            <img src={issue.imageUrl} alt="Issue" className="w-full max-h-72 object-cover" />
          </Card>
        </motion.div>
      )}

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const isActive = i <= currentStepIdx;
              const isCurrent = i === currentStepIdx;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex flex-col items-center gap-1 ${i < STATUS_STEPS.length - 1 ? "flex-1" : ""}`}>
                    <div className={`p-2 rounded-full border-2 transition-colors ${
                      isCurrent ? "border-primary bg-primary text-white" :
                      isActive ? "border-green-500 bg-green-500 text-white" :
                      "border-border bg-muted text-muted-foreground"
                    }`}>
                      {step.icon}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 ${isActive && i < currentStepIdx ? "bg-green-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Issue Details */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              {ISSUE_ICONS[issue.issueType] ?? <MapPin className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground capitalize text-lg">
                  {issue.issueType.replace("_", " ")}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[issue.status]}`}>
                  {issue.status.replace("_", " ")}
                </span>
              </div>
              {issue.description && (
                <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <MapPin className="h-3 w-3" /> Location
              </div>
              <div className="text-sm font-medium text-foreground">{issue.address}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {Number(issue.latitude).toFixed(5)}, {Number(issue.longitude).toFixed(5)}
              </div>
              <div className="mt-3 rounded-lg overflow-hidden border border-border h-48 bg-muted">
                <iframe
                  title="Map"
                  className="w-full h-full border-0"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(issue.longitude) - 0.008}%2C${Number(issue.latitude) - 0.008}%2C${Number(issue.longitude) + 0.008}%2C${Number(issue.latitude) + 0.008}&layer=mapnik&marker=${Number(issue.latitude)}%2C${Number(issue.longitude)}`}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Map data © OpenStreetMap contributors (Nominatim / OSM).</p>
              <Button variant="outline" size="sm" className="mt-2 gap-1.5" asChild>
                <a
                  href={`https://www.google.com/maps?q=${Number(issue.latitude)},${Number(issue.longitude)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Maps
                </a>
              </Button>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Building2 className="h-3 w-3" /> Routed To
              </div>
              <div className="text-sm font-medium text-foreground">{issue.department}</div>
            </div>
            {issue.confidenceScore && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Brain className="h-3 w-3" /> AI Confidence
                </div>
                <div className="text-sm font-medium text-foreground">
                  {Math.round(Number(issue.confidenceScore) * 100)}%
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" /> Reported
              </div>
              <div className="text-sm font-medium text-foreground">
                {new Date(issue.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>

          {issue.reporterName && (
            <div className="pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Reported by </span>
              <span className="text-xs font-medium text-foreground">{issue.reporterName}</span>
              {issue.pointsAwarded > 0 && (
                <Badge className="ml-2 text-xs bg-primary/10 text-primary border-primary/20">
                  +{issue.pointsAwarded} pts
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Image */}
      {issue.resolvedImageUrl && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">Resolution Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={issue.resolvedImageUrl} alt="Resolved" className="w-full max-h-48 object-cover rounded-lg" />
          </CardContent>
        </Card>
      )}

      {/* Authority Actions */}
      {authority && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-primary">Authority Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            {issue.status === "pending" && (
              <Button
                onClick={() => handleStatusChange("in_progress")}
                disabled={updateIssue.isPending}
              >
                {updateIssue.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Mark In Progress
              </Button>
            )}
            {issue.status !== "resolved" && (
              <Button
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50"
                onClick={() => handleStatusChange("resolved")}
                disabled={updateIssue.isPending}
              >
                Mark Resolved
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
