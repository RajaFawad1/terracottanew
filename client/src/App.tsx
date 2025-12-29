import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth, useLogout } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import SharePrice from "@/pages/share-price";
import MonthlyReport from "@/pages/monthly-report";
import AnnualReport from "@/pages/annual-report";
import CustomReport from "@/pages/custom-report";
import BalanceSheet from "@/pages/balance-sheet";
import UserManagement from "@/pages/user-management";
import AddMember from "@/pages/add-member";
import AddShares from "@/pages/add-shares";
import AuditTrailPage from "@/pages/audit-trail";
import Setup from "@/pages/setup";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

function Router() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      {isAdmin && <Route path="/transactions" component={Transactions} />}
      <Route path="/share-price" component={SharePrice} />
      <Route path="/reports/monthly" component={MonthlyReport} />
      <Route path="/reports/annual" component={AnnualReport} />
      {isAdmin && <Route path="/balance-sheet" component={BalanceSheet} />}
      <Route path="/reports/custom" component={CustomReport} />
      <Route path="/setup" component={Setup} />
      <Route path="/users" component={UserManagement} />
      <Route path="/users/add-member" component={AddMember} />
      <Route path="/users/add-shares" component={AddShares} />
      <Route path="/audit" component={AuditTrailPage} />
      <Route path="/profile" component={Profile} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, member, isAdmin } = useAuth();
  const logout = useLogout();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole={user?.role || "member"} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Logged in as: </span>
                <span className="font-medium">{member?.firstName} {member?.lastName}</span>
                <span className="text-xs text-muted-foreground ml-2">({user?.role})</span>
              </div>
              <ThemeToggle />
              <Button
                variant="default"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout-header"
                className="bg-[#4B4E53] bg-[linear-gradient(147deg,#4B4E53_0%,#000000_74%)] text-white hover:opacity-90"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-8 bg-background">
            <div className="max-w-7xl mx-auto animate-fade-in">
              <Router />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <TooltipProvider>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="lg" showText={true} />
            </div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : isAuthenticated ? (
        <AuthenticatedApp />
      ) : (
        <Login />
      )}
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
