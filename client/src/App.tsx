import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clock from "@/pages/clock";
import Schedule from "@/pages/schedule";
import Timesheets from "@/pages/timesheets";
import Documents from "@/pages/documents";
import Knowledge from "@/pages/knowledge";
import Users from "@/pages/users";
import SmartGroups from "@/pages/smart-groups";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import type { User } from "@shared/schema";
import { useEffect } from "react";

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
      <Route path="/timesheets" component={Timesheets} />
      <Route path="/documents" component={Documents} />
      <Route path="/knowledge" component={Knowledge} />
      <Route path="/users" component={Users} />
      <Route path="/smart-groups" component={SmartGroups} />
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

  return <AuthenticatedRouter />;
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
                <header className="flex items-center justify-between p-4 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
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
