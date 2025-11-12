import {
  Home,
  Clock,
  Calendar,
  Users,
  Settings,
  ClipboardList,
  Bell,
  UsersRound,
  FileText,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

import type { User } from "@shared/schema";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Clock", url: "/clock", icon: Clock },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Timesheets", url: "/timesheets", icon: ClipboardList },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Updates", url: "/updates", icon: Bell },
  { title: "Users", url: "/users", icon: Users },
  { title: "Groups", url: "/groups", icon: UsersRound },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  hipaaMode?: boolean;
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(" ");
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

export function AppSidebar({ hipaaMode = false }: AppSidebarProps) {
  const [location] = useLocation();
  const [pendingDocumentsCount, setPendingDocumentsCount] = useState(0);

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  // Calculate total pending documents for admins
  useEffect(() => {
    if (!isAdmin) {
      setPendingDocumentsCount(0);
      return;
    }

    const updatePendingCount = () => {
      try {
        const storedDocuments = localStorage.getItem("documents");
        if (storedDocuments) {
          const documents = JSON.parse(storedDocuments);
          const pendingCount = documents.filter((d: any) => d.status === "pending").length;
          setPendingDocumentsCount(pendingCount);
        }
      } catch (error) {
        console.error("Error reading documents from localStorage:", error);
      }
    };

    // Initial load
    updatePendingCount();

    // Listen for storage changes
    window.addEventListener("storage", updatePendingCount);

    // Poll for changes every 2 seconds (in case changes happen in same tab)
    const interval = setInterval(updatePendingCount, 2000);

    return () => {
      window.removeEventListener("storage", updatePendingCount);
      clearInterval(interval);
    };
  }, [isAdmin]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="OutreachOps Logo"
            className="h-12 w-12 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Outreach Medical</span>
            <span className="text-xs font-semibold text-muted-foreground">
              Staffing
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link
                      href={item.url}
                      data-testid={`link-${item.title.toLowerCase().replace(" ", "-")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.title === "Documents" && isAdmin && pendingDocumentsCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
                          {pendingDocumentsCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <span
              className="text-sm font-medium"
              data-testid="text-user-initials"
            >
              {isLoading
                ? "..."
                : currentUser
                  ? getInitials(currentUser.fullName)
                  : "?"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium" data-testid="text-user-name">
              {isLoading ? "Loading..." : currentUser?.fullName || "Guest"}
            </span>
            <span
              className="text-xs text-muted-foreground"
              data-testid="text-user-role"
            >
              {isLoading ? "..." : currentUser?.role || "No role"}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
