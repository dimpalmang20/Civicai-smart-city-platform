import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGetUserRewards,
  useWithdrawRewards,
  getGetUserRewardsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet as WalletIcon,
  TrendingUp,
  ArrowDownCircle,
  Loader2,
  CheckCircle,
  IndianRupee,
  Zap,
  ArrowUpRight,
  Lock,
} from "lucide-react";

function TransactionRow({ tx }: { tx: any }) {
  const isEarned = tx.type === "earned";
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`p-2 rounded-lg shrink-0 ${isEarned ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
        {isEarned ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{tx.description}</div>
        <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("en-IN")}</div>
      </div>
      <div className={`font-bold text-sm shrink-0 ${isEarned ? "text-green-600" : "text-red-600"}`}>
        {isEarned ? "+" : "-"}{tx.points} pts
      </div>
    </div>
  );
}

export default function Wallet() {
  const { getAuthUser } = useAuth();
  const user = getAuthUser();
  const queryClient = useQueryClient();
  const [upiId, setUpiId] = useState("");
  const [withdrawPoints, setWithdrawPoints] = useState("");
  const [success, setSuccess] = useState<{ transactionId: string; amount: number } | null>(null);

  const { data: rewards } = useGetUserRewards(user?.id ?? 0, {
    query: { enabled: !!user?.id, queryKey: getGetUserRewardsQueryKey(user?.id ?? 0) },
  });
  const withdrawRewards = useWithdrawRewards();

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !upiId || !withdrawPoints) return;

    const pts = parseInt(withdrawPoints);
    if (isNaN(pts) || pts < 100) return;

    try {
      const result = await withdrawRewards.mutateAsync({
        data: { userId: user.id, points: pts, upiId },
      });
      setSuccess({ transactionId: (result as any).transactionId, amount: (result as any).amount });
      queryClient.invalidateQueries({ queryKey: getGetUserRewardsQueryKey(user.id) });
      setUpiId("");
      setWithdrawPoints("");
    } catch {
      alert("Withdrawal failed. Please check your balance.");
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Login Required</h2>
        <p className="text-muted-foreground mb-6">Please login to view your wallet and rewards.</p>
        <Link href="/login">
          <Button size="lg">Login to Continue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Wallet</h1>
        <p className="text-muted-foreground mt-1">Your civic rewards and earnings</p>
      </div>

      {/* Wallet Overview */}
      {rewards && (
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-gradient-to-br from-primary/80 to-primary text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1 opacity-80">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Points</span>
                </div>
                <div className="text-4xl font-bold">{rewards.totalPoints.toLocaleString()}</div>
                <div className="text-sm opacity-70 mt-1">pts</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-accent/80 to-accent text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1 opacity-80">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-sm font-medium">Cash Value</span>
                </div>
                <div className="text-4xl font-bold">₹{rewards.cashValue.toFixed(2)}</div>
                <div className="text-sm opacity-70 mt-1">10 pts = ₹1</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Total Withdrawn</span>
                </div>
                <div className="text-2xl font-bold">₹{rewards.totalWithdrawn.toFixed(2)}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <WalletIcon className="h-4 w-4" />
                  <span className="text-xs">Badge Earned</span>
                </div>
                <div className="text-lg font-bold">
                  {rewards.badge ? (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300">{rewards.badge}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">None yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* UPI Withdrawal Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-primary" /> Withdraw via UPI
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-foreground">Withdrawal Initiated!</h3>
              <p className="text-muted-foreground text-sm mt-1">₹{success.amount} will be credited within 24 hours</p>
              <Badge className="mt-3 font-mono text-xs">{success.transactionId}</Badge>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => setSuccess(null)}>
                  Make Another Withdrawal
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="points">Points to Withdraw (min. 100)</Label>
                <Input
                  id="points"
                  type="number"
                  min={100}
                  step={10}
                  placeholder="e.g. 500"
                  value={withdrawPoints}
                  onChange={(e) => setWithdrawPoints(e.target.value)}
                  className="mt-1"
                />
                {withdrawPoints && Number(withdrawPoints) >= 100 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You will receive ₹{(Number(withdrawPoints) / 10).toFixed(2)}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!upiId || !withdrawPoints || Number(withdrawPoints) < 100 || withdrawRewards.isPending}
              >
                {withdrawRewards.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Request Withdrawal"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Mock UPI withdrawal — no real money is transferred in this demo
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {rewards?.transactions && rewards.transactions.length > 0 ? (
            <div>
              {rewards.transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No transactions yet. Start reporting issues to earn points!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
