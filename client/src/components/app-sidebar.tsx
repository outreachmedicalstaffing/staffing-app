import {
  Home,
  Clock,
  Calendar,
  Users,
  BookOpen,
  Settings,
  Shield,
  ClipboardList,
  FolderTree,
  Bell,
  UsersRound,
  FileText,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
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

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">OutreachOps</span>
            <span className="text-xs text-muted-foreground">
              Medical Staffing
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
