import { 
  Home, 
  Clock, 
  Calendar, 
  FileText, 
  Users, 
  BookOpen, 
  Settings, 
  Shield,
  ClipboardList,
  FolderTree
} from "lucide-react";
import { Link, useLocation } from "wouter";
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
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Clock", url: "/clock", icon: Clock },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Timesheets", url: "/timesheets", icon: ClipboardList },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
  { title: "Users", url: "/users", icon: Users },
  { title: "Smart Groups", url: "/smart-groups", icon: FolderTree },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  hipaaMode?: boolean;
}

export function AppSidebar({ hipaaMode = true }: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">OutreachOps</span>
            <span className="text-xs text-muted-foreground">Medical Staffing</span>
          </div>
        </div>
        {hipaaMode && (
          <Badge variant="secondary" className="mt-3 justify-center gap-1.5" data-testid="badge-hipaa-mode">
            <Shield className="h-3 w-3" />
            HIPAA Mode Active
          </Badge>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
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
            <span className="text-sm font-medium">JD</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">John Doe</span>
            <span className="text-xs text-muted-foreground">RN - Manager</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
