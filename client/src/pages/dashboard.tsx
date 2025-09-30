import { StatCard } from "@/components/stat-card";
import { ShiftCard } from "@/components/shift-card";
import { Clock, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-dashboard">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, John Doe</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Hours This Week"
          value="42.5"
          icon={Clock}
          description="5 shifts completed"
        />
        <StatCard
          title="Upcoming Shifts"
          value={8}
          icon={Calendar}
          description="Next 7 days"
        />
        <StatCard
          title="Completed Tasks"
          value="24/28"
          icon={CheckCircle}
          trend={{ value: "+12%", isPositive: true }}
        />
        <StatCard
          title="Pending Items"
          value={3}
          icon={AlertTriangle}
          description="Requires attention"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Shifts</CardTitle>
            <CardDescription>Upcoming scheduled shifts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShiftCard
              id="1"
              job="Central Florida"
              subJob="7A-7P Day Shift"
              date="Dec 15, 2024"
              startTime="7:00 AM"
              endTime="7:00 PM"
              location="Orlando Medical Center"
              status="approved"
              tasksCount={5}
              attachmentsCount={2}
              assignedTo="You"
              onView={() => console.log('View shift 1')}
            />
            <ShiftCard
              id="2"
              job="Treasure Coast"
              subJob="7P-7A Night Shift"
              date="Dec 16, 2024"
              startTime="7:00 PM"
              endTime="7:00 AM"
              location="Stuart Regional"
              status="approved"
              tasksCount={3}
              assignedTo="You"
              onView={() => console.log('View shift 2')}
            />
            <Button variant="outline" className="w-full" data-testid="button-view-all-shifts">
              View All Shifts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks & Reminders</CardTitle>
            <CardDescription>Action items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-md border hover-elevate">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs shrink-0 mt-0.5">
                  !
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">CPR Certification Expiring</p>
                  <p className="text-sm text-muted-foreground">Expires in 15 days - Upload renewal</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md border hover-elevate">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Pending Timesheet Approval</p>
                  <p className="text-sm text-muted-foreground">Week ending Dec 7, 2024</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md border hover-elevate">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-chart-2 text-white text-xs shrink-0 mt-0.5">
                  i
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">New Shift Available</p>
                  <p className="text-sm text-muted-foreground">Jacksonville - Dec 18, 12P-12A</p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full" data-testid="button-view-all-tasks">
              View All Reminders
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
