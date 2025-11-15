import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth, useLogout } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import MonthlyReport from "@/pages/monthly-report";
import UserManagement from "@/pages/user-management";
import AuditTrailPage from "@/pages/audit-trail";
import Setup from "@/pages/setup";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/reports/monthly" component={MonthlyReport} />
      <Route path="/reports/annual" component={MonthlyReport} />
      <Route path="/balance-sheet" component={Dashboard} />
      <Route path="/reports/custom" component={MonthlyReport} />
      <Route path="/setup" component={Setup} />
      <Route path="/users" component={UserManagement} />
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
          <header className="flex items-center justify-between p-4 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Logged in as: </span>
                <span className="font-medium">{member?.firstName} {member?.lastName}</span>
                <span className="text-xs text-muted-foreground ml-2">({user?.role})</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout-header"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-8 bg-background">
            <div className="max-w-7xl mx-auto">
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
            <div className="h-16 w-16 rounded-md bg-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">TC</span>
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
