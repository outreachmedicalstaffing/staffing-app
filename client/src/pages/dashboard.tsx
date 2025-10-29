import { StatCard } from "@/components/stat-card";
import { ShiftCard } from "@/components/shift-card";
import { Clock, Calendar, CheckCircle, AlertTriangle, MapPin, Paperclip } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { User, TimeEntry, Shift, Document, Timesheet } from "@shared/schema";
import { format, isAfter, isBefore, startOfWeek, endOfWeek, differenceInDays, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [viewingShift, setViewingShift] = useState<Shift | null>(null);

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
                    onView={() => setViewingShift(shift)}
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

      {/* Shift Details Dialog */}
      <Dialog
        open={!!viewingShift}
        onOpenChange={(open) => !open && setViewingShift(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>
          {viewingShift && (
            <div className="space-y-4">
              {/* Shift Title */}
              <div>
                <Label className="text-muted-foreground">Shift Title</Label>
                <p className="text-sm font-medium mt-1">{viewingShift.title || 'Untitled Shift'}</p>
              </div>

              {/* Job Name */}
              {viewingShift.jobName && (
                <div>
                  <Label className="text-muted-foreground">Job</Label>
                  <p className="text-sm font-medium mt-1">{viewingShift.jobName}</p>
                </div>
              )}

              {/* Program */}
              {(viewingShift as any).program && (
                <div>
                  <Label className="text-muted-foreground">Program</Label>
                  <p className="text-sm font-medium mt-1">{(viewingShift as any).program}</p>
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {format(new Date(viewingShift.startTime), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {format(new Date(viewingShift.startTime), 'h:mm a')} - {format(new Date(viewingShift.endTime), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location */}
              {viewingShift.location && (
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{viewingShift.location}</p>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge variant={
                    viewingShift.status === 'approved' ? 'default' :
                    viewingShift.status === 'pending' ? 'secondary' :
                    viewingShift.status === 'completed' ? 'default' :
                    'outline'
                  }>
                    {viewingShift.status}
                  </Badge>
                </div>
              </div>

              {/* Notes */}
              {viewingShift.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <div className="mt-1 p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap">
                    {viewingShift.notes}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {viewingShift.attachments && viewingShift.attachments.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Attachments</Label>
                  <div className="space-y-2 mt-1">
                    {viewingShift.attachments.map((filename, index) => (
                      <button
                        key={index}
                        type="button"
                        className="flex items-center gap-2 p-2 border rounded-md w-full text-left hover:bg-accent transition-colors"
                        onClick={() => {
                          window.open(`/api/files/${filename}`, "_blank");
                        }}
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{filename}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <Button
                  variant="default"
                  onClick={() => setViewingShift(null)}
                  data-testid="button-close-shift-details"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
