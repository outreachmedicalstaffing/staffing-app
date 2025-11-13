import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clock from "@/pages/clock";
import Schedule from "@/pages/schedule";
import Timesheets from "@/pages/timesheets";
import UserTimesheets from "@/pages/user-timesheets";
import Documents from "@/pages/documents";
import Knowledge from "@/pages/knowledge";
import Updates from "@/pages/updates";
import Users from "@/pages/users";
import Groups from "@/pages/groups";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Onboarding from "@/pages/onboarding";
import type { User } from "@shared/schema";
import { useEffect, useState } from "react";

function TimesheetsRouter() {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  const isAdmin = user?.role?.toLowerCase() === "owner" || user?.role?.toLowerCase() === "admin";

  // Show admin Timesheets for owners/admins, UserTimesheets for regular users
  return isAdmin ? <Timesheets /> : <UserTimesheets />;
}

function AuthenticatedRouter() {
  const [location, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      setLocation('/login');
    }
  }, [isLoading, error, user, setLocation, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !user) {
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clock" component={Clock} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/timesheets" component={TimesheetsRouter} />
      <Route path="/documents" component={Documents} />
      <Route path="/knowledge" component={Knowledge} />
      <Route path="/updates" component={Updates} />
      <Route path="/users" component={Users} />
      <Route path="/groups" component={Groups} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === '/login') {
    return <Login />;
  }

  // Check if it's an onboarding route
  if (location.startsWith('/onboarding/')) {
    return <Onboarding />;
  }

  return <AuthenticatedRouter />;
}

function Header() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        // Clear the auth query cache
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        toast({
          title: "Success",
          description: "Logged out successfully",
        });
        setLocation("/login");
      } else {
        toast({
          title: "Error",
          description: "Failed to logout",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          disabled={loading}
          data-testid="button-logout"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const [location] = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {location === '/login' ? (
          <>
            <Router />
            <Toaster />
          </>
        ) : (
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar hipaaMode={true} />
              <div className="flex flex-col flex-1">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                  <Router />
                </main>
              </div>
            </div>
            <Toaster />
          </SidebarProvider>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
