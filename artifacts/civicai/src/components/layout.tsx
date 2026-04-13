import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage, LANGUAGES } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShieldAlert, Globe, LogOut, ChevronDown, Menu, X, Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useListNotifications,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import type { Notification } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCivicRealtime } from "@/hooks/use-civic-realtime";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { getAuthUser, getToken, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [session, setSession] = useState(() => getAuthUser());
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleStorage = () => setSession(getAuthUser());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const isAuthority = session?.role === "authority";
  const citizen = session && !isAuthority ? session : null;
  const authority = isAuthority ? session : null;

  const tokenPresent = Boolean(getToken());
  useCivicRealtime(tokenPresent && Boolean(session));

  const { data: notifications } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      enabled: tokenPresent && Boolean(session),
      refetchInterval: 20_000,
    },
  });
  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
    },
  });

  const unread = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((n: Notification) => !n.read).length : 0),
    [notifications],
  );

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  const navLinks = isAuthority
    ? [
        { href: "/", label: t("home") },
        { href: "/authority", label: t("authority") },
      ]
    : [
        { href: "/", label: t("home") },
        { href: "/report", label: t("reportIssue") },
        { href: "/dashboard", label: t("dashboard") },
        { href: "/my-reports", label: "My Uploads" },
        { href: "/leaderboard", label: t("leaderboard") },
        { href: "/wallet", label: t("wallet") },
        { href: "/contact", label: t("contact") },
      ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center mx-auto px-4 md:px-6">
          <Link href="/" className="mr-6 flex items-center space-x-2 shrink-0">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">CivicAI</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-foreground/80 ${
                  location === link.href ? "text-foreground font-semibold" : "text-foreground/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 px-2.5">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-medium hidden sm:inline">{currentLang.nativeName}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`flex items-center gap-2 cursor-pointer ${lang === l.code ? "bg-primary/10 font-semibold text-primary" : ""}`}
                  >
                    <span className="text-base">{l.flag}</span>
                    <span className="flex-1">{l.nativeName}</span>
                    <span className="text-xs text-muted-foreground">{l.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {session && tokenPresent && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                    {unread > 0 ? (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-80 overflow-y-auto">
                  {!notifications?.length ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No notifications yet.</div>
                  ) : (
                    notifications.slice(0, 12).map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className="flex flex-col items-start gap-0.5 cursor-pointer whitespace-normal"
                        onClick={() => {
                          if (!n.read) void markRead.mutateAsync({ id: n.id });
                        }}
                      >
                        <span className="text-xs font-semibold text-foreground">{n.title}</span>
                        <span className="text-xs text-muted-foreground">{n.body}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {citizen ? (
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {citizen.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{citizen.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { logout(); window.location.reload(); }} className="gap-1.5">
                  <LogOut className="h-3.5 w-3.5" />
                  {t("logout")}
                </Button>
              </div>
            ) : authority ? (
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {authority.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-primary leading-none">{authority.name}</span>
                    <span className="text-xs text-muted-foreground leading-none">
                      {(authority as { department?: string }).department}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { logout(); window.location.reload(); }} className="gap-1.5">
                  <LogOut className="h-3.5 w-3.5" />
                  {t("logout")}
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">{t("login")}</Button>
                </Link>
                <Link href="/authority">
                  <Button variant="ghost" size="sm">{t("authority")}</Button>
                </Link>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  location === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t flex flex-col gap-2">
              {citizen ? (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {citizen.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{citizen.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { logout(); window.location.reload(); setMobileOpen(false); }}>
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />{t("logout")}
                  </Button>
                </div>
              ) : authority ? (
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-semibold text-primary">{authority.name}</p>
                    <p className="text-xs text-muted-foreground">{(authority as { department?: string }).department}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { logout(); window.location.reload(); setMobileOpen(false); }}>
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />{t("logout")}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">{t("login")}</Button>
                  </Link>
                  <Link href="/authority" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full">{t("authority")}</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
