import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginUser, useCreateUser } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Loader2, User, Mail, Phone, Lock, CheckCircle } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { loginUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const loginUser_ = useLoginUser();
  const createUser = useCreateUser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await loginUser_.mutateAsync({ data: { email, password } });
      loginUser((result as any).user);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createUser.mutateAsync({ data: { name, email, password, phone: phone || undefined } });
      // Auto-login after register
      const result = await loginUser_.mutateAsync({ data: { email, password } });
      loginUser((result as any).user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.status === 409 ? "Email already registered." : "Registration failed.");
    }
  };

  const demoLogin = async () => {
    setEmail("amit@example.com");
    setPassword("password123");
    try {
      const result = await loginUser_.mutateAsync({ data: { email: "amit@example.com", password: "password123" } });
      loginUser((result as any).user);
      navigate("/dashboard");
    } catch {
      setError("Demo login failed.");
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{isRegister ? "Create Account" : "Welcome Back"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isRegister ? "Join CivicAI and earn rewards" : "Sign in to your CivicAI account"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isRegister ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Amit Singh" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" required />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
                  </div>
                </div>
                <div>
                  <Label>Phone (optional)</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="tel" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={createUser.isPending || loginUser_.isPending}>
                  {(createUser.isPending || loginUser_.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Account
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
                  </div>
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loginUser_.isPending}>
                  {loginUser_.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign In
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={demoLogin} disabled={loginUser_.isPending}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Try Demo Account
                </Button>
              </form>
            )}

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isRegister ? (
                <>Already have an account? <button onClick={() => { setIsRegister(false); setError(""); }} className="text-primary hover:underline font-medium">Sign in</button></>
              ) : (
                <>New to CivicAI? <button onClick={() => { setIsRegister(true); setError(""); }} className="text-primary hover:underline font-medium">Create account</button></>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
