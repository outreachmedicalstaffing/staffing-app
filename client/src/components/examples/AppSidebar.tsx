import { AppSidebar } from '../app-sidebar'
import { SidebarProvider } from "@/components/ui/sidebar"

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar hipaaMode={true} />
        <div className="flex-1 p-6">
          <h2 className="text-2xl font-semibold">Sidebar Preview</h2>
          <p className="text-muted-foreground mt-2">Navigation sidebar with HIPAA mode indicator</p>
        </div>
      </div>
    </SidebarProvider>
  )
}
