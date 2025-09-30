import { StatCard } from "@/components/stat-card";
import { ShiftCard } from "@/components/shift-card";
import { Clock, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { User, TimeEntry, Shift, Document, Timesheet } from "@shared/schema";
import { format, isAfter, isBefore, startOfWeek, endOfWeek, differenceInDays, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Fetch time entries
  const { data: timeEntries = [], isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time/entries'],
  });

  // Fetch shifts
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  // Fetch timesheets
  const { data: timesheets = [], isLoading: timesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: ['/api/timesheets'],
  });

  const isLoading = userLoading || timeEntriesLoading || shiftsLoading || documentsLoading || timesheetsLoading;

  // Calculate statistics
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  // Hours this week
  const weekTimeEntries = timeEntries.filter(entry => {
    const clockIn = new Date(entry.clockIn);
    return clockIn >= weekStart && clockIn <= weekEnd && entry.clockOut;
  });
  
  const totalHoursThisWeek = weekTimeEntries.reduce((sum, entry) => {
    if (entry.clockOut) {
      const clockIn = new Date(entry.clockIn);
      const clockOut = new Date(entry.clockOut);
      return sum + (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    }
    return sum;
  }, 0);

  // Upcoming shifts (next 7 days)
  const upcomingShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.startTime);
    return isAfter(shiftDate, now) && isBefore(shiftDate, addDays(now, 7));
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Pending items
  const expiringDocs = documents.filter(doc => {
    if (!doc.expiryDate) return false;
    const expiryDate = new Date(doc.expiryDate);
    const daysUntilExpiry = differenceInDays(expiryDate, now);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  const pendingTimesheets = timesheets.filter(ts => ts.status === 'submitted');
  const pendingItems = expiringDocs.length + pendingTimesheets.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-dashboard">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.fullName || 'User'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Hours This Week"
          value={totalHoursThisWeek.toFixed(1)}
          icon={Clock}
          description={`${weekTimeEntries.length} shifts completed`}
        />
        <StatCard
          title="Upcoming Shifts"
          value={upcomingShifts.length}
          icon={Calendar}
          description="Next 7 days"
        />
        <StatCard
          title="Total Shifts"
          value={shifts.length}
          icon={CheckCircle}
          description="All scheduled shifts"
        />
        <StatCard
          title="Pending Items"
          value={pendingItems}
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
            {upcomingShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming shifts</p>
            ) : (
              <>
                {upcomingShifts.slice(0, 2).map(shift => (
                  <ShiftCard
                    key={shift.id}
                    id={shift.id}
                    job={shift.location || 'Unknown Location'}
                    subJob={shift.notes || 'Shift'}
                    date={format(new Date(shift.startTime), 'MMM d, yyyy')}
                    startTime={format(new Date(shift.startTime), 'h:mm a')}
                    endTime={format(new Date(shift.endTime), 'h:mm a')}
                    location={shift.location || 'Unknown'}
                    status={shift.status as any}
                    assignedTo="You"
                    onView={() => setLocation('/schedule')}
                  />
                ))}
                <Button 
                  variant="outline" 
                  className="w-full" 
                  data-testid="button-view-all-shifts"
                  onClick={() => setLocation('/schedule')}
                >
                  View All Shifts
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks & Reminders</CardTitle>
            <CardDescription>Action items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {expiringDocs.slice(0, 2).map(doc => {
                const daysUntilExpiry = differenceInDays(new Date(doc.expiryDate!), now);
                return (
                  <div key={doc.id} className="flex items-start gap-3 p-3 rounded-md border hover-elevate">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs shrink-0 mt-0.5">
                      !
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{doc.title} Expiring</p>
                      <p className="text-sm text-muted-foreground">Expires in {daysUntilExpiry} days</p>
                    </div>
                  </div>
                );
              })}

              {pendingTimesheets.slice(0, 2).map(ts => (
                <div key={ts.id} className="flex items-start gap-3 p-3 rounded-md border hover-elevate">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs shrink-0 mt-0.5">
                    !
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Pending Timesheet Approval</p>
                    <p className="text-sm text-muted-foreground">
                      Week ending {format(new Date(ts.periodEnd), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}

              {expiringDocs.length === 0 && pendingTimesheets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No pending items</p>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              data-testid="button-view-all-tasks"
              onClick={() => setLocation('/documents')}
            >
              View All Reminders
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
