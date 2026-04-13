import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useLoginUser,
  useCreateUser,
  useRegisterUser,
  useVerifyRegistrationOtp,
  useResendRegistrationOtp,
  ApiError,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Loader2, User, Mail, Phone, Lock, CheckCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.data && typeof err.data === "object") {
    const m = (err.data as { message?: string }).message;
    if (m) return m;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export default function Login() {
  const [, navigate] = useLocation();
  const { loginUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [registerStep, setRegisterStep] = useState<"form" | "otp">("form");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const loginUser_ = useLoginUser();
  const createUser = useCreateUser();
  const registerUser = useRegisterUser();
  const verifyOtp = useVerifyRegistrationOtp();
  const resendOtp = useResendRegistrationOtp();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await loginUser_.mutateAsync({ data: { email, password } });
      const token = (result as { token?: string }).token;
      const user = (result as { user: unknown }).user as Parameters<typeof loginUser>[0];
      loginUser(user, token ?? null);
      if ((user as { role?: string }).role === "authority") navigate("/authority");
      else navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleRegisterForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await registerUser.mutateAsync({ data: { name, email, password, phone: phone || undefined } });
      setRegisterStep("otp");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    try {
      const result = await verifyOtp.mutateAsync({ data: { email, code: otp } });
      const token = (result as { token?: string }).token;
      const user = (result as { user: unknown }).user as Parameters<typeof loginUser>[0];
      loginUser(user, token ?? null);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const skipOtpLegacyRegister = async () => {
    setError("");
    try {
      await createUser.mutateAsync({ data: { name, email, password, phone: phone || undefined } });
      const result = await loginUser_.mutateAsync({ data: { email, password } });
      const token = (result as { token?: string }).token;
      const user = (result as { user: unknown }).user as Parameters<typeof loginUser>[0];
      loginUser(user, token ?? null);
      navigate("/dashboard");
    } catch (err) {
      setError((err as { status?: number })?.status === 409 ? "Email already registered." : errorMessage(err));
    }
  };

  const demoLogin = async () => {
    setEmail("amit@example.com");
    setPassword("password123");
    try {
      const result = await loginUser_.mutateAsync({ data: { email: "amit@example.com", password: "password123" } });
      const token = (result as { token?: string }).token;
      const user = (result as { user: unknown }).user as Parameters<typeof loginUser>[0];
      loginUser(user, token ?? null);
      navigate("/dashboard");
    } catch {
      setError("Demo login failed. Run DB seed script if the demo user is missing.");
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
                  {isRegister
                    ? registerStep === "otp"
                      ? "Enter the verification code sent to your email"
                      : "Join CivicAI — OTP verification keeps accounts real"
                    : "Sign in to your CivicAI account"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isRegister && registerStep === "otp" ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label>6-digit code</Label>
                  <div className="mt-2 flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Code was printed to the API server console (dev default).
                  </p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={verifyOtp.isPending}>
                  {verifyOtp.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Verify & Continue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={resendOtp.isPending}
                  onClick={async () => {
                    setError("");
                    try {
                      await resendOtp.mutateAsync({ data: { email } });
                    } catch (err) {
                      setError(errorMessage(err));
                    }
                  }}
                >
                  Resend code
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => { setRegisterStep("form"); setOtp(""); setError(""); }}>
                  Back
                </Button>
              </form>
            ) : isRegister ? (
              <form onSubmit={handleRegisterForm} className="space-y-4">
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
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required minLength={8} />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={registerUser.isPending}>
                  {registerUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send verification code
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Trouble with OTP in local dev?{" "}
                  <button type="button" className="text-primary underline font-medium" onClick={() => void skipOtpLegacyRegister()} disabled={createUser.isPending || loginUser_.isPending}>
                    Skip OTP (legacy register)
                  </button>
                </p>
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
                <>Already have an account? <button type="button" onClick={() => { setIsRegister(false); setRegisterStep("form"); setError(""); setOtp(""); }} className="text-primary hover:underline font-medium">Sign in</button></>
              ) : (
                <>New to CivicAI? <button type="button" onClick={() => { setIsRegister(true); setRegisterStep("form"); setError(""); }} className="text-primary hover:underline font-medium">Create account</button></>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
