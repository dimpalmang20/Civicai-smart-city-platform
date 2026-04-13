import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getGetUserIssuesQueryKey, useGetUserIssues } from "@workspace/api-client-react";
import { asArray } from "@/lib/as-array";
import type { Issue } from "@workspace/api-client-react";
import { ExternalLink, Lock, MapPin, ShieldCheck, ShieldAlert } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
};

const VERIFICATION_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-800 border-slate-200",
  flagged: "bg-orange-100 text-orange-800 border-orange-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  approved: "bg-green-100 text-green-800 border-green-200",
};

export default function MyReports() {
  const { getAuthUser } = useAuth();
  const user = getAuthUser();

  const { data: issues, isLoading } = useGetUserIssues(user?.id ?? 0, {
    query: {
      enabled: !!user?.id,
      queryKey: getGetUserIssuesQueryKey(user?.id ?? 0),
    },
  });

  const issueRows = asArray<Issue>(issues);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Login Required</h2>
        <p className="text-muted-foreground mb-6">Please login to view your uploaded reports.</p>
        <Link href="/login">
          <Button size="lg">Login to Continue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Uploaded Reports</h1>
          <p className="text-muted-foreground mt-1">Everything you’ve submitted, with verification status and rewards</p>
        </div>
        <Link href="/report">
          <Button>Upload New Report</Button>
        </Link>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Rewards are granted only after verification.</span>{" "}
            Flagged reports may require manual review.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Your reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
          ) : issueRows.length > 0 ? (
            issueRows.map((issue, i) => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                  {issue.verificationStatus === "flagged" ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm capitalize">{issue.issueType.replace("_", " ")}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[issue.status]}`}>
                      {issue.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${VERIFICATION_COLORS[issue.verificationStatus]}`}>
                      {issue.verificationStatus}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{issue.address}</div>
                  {issue.validationNotes ? (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{issue.validationNotes}</div>
                  ) : null}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-primary">{issue.pointsAwarded} pts</div>
                  <div className="text-xs text-muted-foreground">awarded</div>
                </div>
                <Link href={`/report/${issue.id}`}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="py-10 text-center text-muted-foreground text-sm">
              You haven’t uploaded any reports yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

