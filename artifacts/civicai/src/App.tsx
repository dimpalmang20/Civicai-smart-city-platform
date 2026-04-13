import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { LanguageProvider } from "@/contexts/language-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Report from "@/pages/report";
import Dashboard from "@/pages/dashboard";
import Leaderboard from "@/pages/leaderboard";
import Wallet from "@/pages/wallet";
import IssueDetail from "@/pages/issue-detail";
import Authority from "@/pages/authority";
import Contact from "@/pages/contact";
import Login from "@/pages/login";
import MyReports from "@/pages/my-reports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/report" component={Report} />
        <Route path="/report/:id" component={IssueDetail} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/my-reports" component={MyReports} />
        <Route path="/authority" component={Authority} />
        <Route path="/contact" component={Contact} />
        <Route path="/login" component={Login} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
