import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Globe, MapPin, User as UserIcon, Wallet, Trophy, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { getAuthUser, getAuthorityUser, logout } = useAuth();
  const [user, setUser] = useState(getAuthUser());
  const [authority, setAuthority] = useState(getAuthorityUser());

  useEffect(() => {
    const handleStorage = () => {
      setUser(getAuthUser());
      setAuthority(getAuthorityUser());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center mx-auto px-4 md:px-6">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
              <span className="hidden font-bold sm:inline-block text-xl tracking-tight">
                CivicAI
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="/" className={`transition-colors hover:text-foreground/80 ${location === "/" ? "text-foreground" : "text-foreground/60"}`}>Home</Link>
              <Link href="/report" className={`transition-colors hover:text-foreground/80 ${location === "/report" ? "text-foreground" : "text-foreground/60"}`}>Report Issue</Link>
              <Link href="/dashboard" className={`transition-colors hover:text-foreground/80 ${location === "/dashboard" ? "text-foreground" : "text-foreground/60"}`}>Dashboard</Link>
              <Link href="/leaderboard" className={`transition-colors hover:text-foreground/80 ${location === "/leaderboard" ? "text-foreground" : "text-foreground/60"}`}>Leaderboard</Link>
              <Link href="/wallet" className={`transition-colors hover:text-foreground/80 ${location === "/wallet" ? "text-foreground" : "text-foreground/60"}`}>Wallet</Link>
              <Link href="/contact" className={`transition-colors hover:text-foreground/80 ${location === "/contact" ? "text-foreground" : "text-foreground/60"}`}>Contact</Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none flex items-center justify-end space-x-2">
              <Button variant="ghost" size="icon" className="mr-2">
                <Globe className="h-4 w-4" />
                <span className="sr-only">Toggle Language</span>
              </Button>
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium hidden sm:inline-block">{user.name}</span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : authority ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium hidden sm:inline-block text-primary">{authority.name} (Authority)</span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Link href="/login">
                    <Button variant="outline" size="sm">Login</Button>
                  </Link>
                  <Link href="/authority">
                    <Button variant="ghost" size="sm">Authority</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}