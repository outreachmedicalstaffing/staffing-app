import { StatCard } from "@/components/stat-card";
import { ShiftCard } from "@/components/shift-card";
import { Clock, Calendar, CheckCircle, AlertTriangle, MapPin, Paperclip } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, TimeEntry, Shift, Document, Timesheet } from "@shared/schema";

interface Update {
  id: string;
  title: string;
  content: string;
  publishDate: string;
  createdAt: string;
  visibility: string;
  status: string;
}
import { format, isAfter, isBefore, startOfWeek, endOfWeek, differenceInDays, addDays, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Helper function to remove "United States of America" from addresses
const stripCountryFromAddress = (address: string): string => {
  return address.replace(/, United States of America$/, '');
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [viewingShift, setViewingShift] = useState<Shift | null>(null);
  const [viewingUpdate, setViewingUpdate] = useState<Update | null>(null);
  const { toast } = useToast();

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

  // Fetch all users (for admin to see user names on shifts)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch shift assignments (to see who is assigned to each shift)
  const { data: shiftAssignments = [] } = useQuery<any[]>({
    queryKey: ['/api/shift-assignments'],
  });

  // Fetch updates
  const { data: updates = [] } = useQuery<Update[]>({
    queryKey: ['/api/updates'],
  });

  // Clock in/out logic
  const activeEntry = timeEntries.find((e) => !e.clockOut);

  // Check if currently clocked in to the viewing shift
  const isClockedInToShift = activeEntry && viewingShift &&
    (activeEntry as any).shiftId === viewingShift.id;

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (shift: { id: string; location?: string | null }) => {
      const res = await apiRequest("POST", "/api/time/clock-in", {
        shiftId: shift.id,
        location: shift.location || "Office",
        notes: "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/active"] });
      toast({
        title: "Clocked In",
        description: "You have successfully clocked in to this shift",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/time/clock-out", {
        shiftNoteAttachments: [],
        relievingNurseSignature: null,
      });
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/active"] });
      toast({
        title: "Clocked Out",
        description: "You have successfully clocked out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle clock in for the viewing shift
  const handleClockIn = () => {
    if (viewingShift) {
      clockInMutation.mutate(viewingShift);
    }
  };

  // Handle clock out
  const handleClockOut = () => {
    clockOutMutation.mutate();
  };

  const isLoading = userLoading || timeEntriesLoading || shiftsLoading || documentsLoading || timesheetsLoading;

  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === "owner" || user?.role?.toLowerCase() === "admin";

  // Calculate statistics
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

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

  // Shifts this week - for regular users, only their assigned shifts
  const weekShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.startTime);
    if (!(shiftDate >= weekStart && shiftDate <= weekEnd)) {
      return false;
    }
    // For regular users, only count their assigned shifts
    if (!isAdmin) {
      const assignment = shiftAssignments.find(a => a.shiftId === shift.id);
      return assignment && assignment.userId === user?.id;
    }
    // For admins, count all shifts
    return true;
  });

  // Upcoming shifts (next 7 days) - for regular users, only their assigned shifts
  const upcomingShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.startTime);
    // Check if shift is in the next 7 days
    if (!isAfter(shiftDate, now) || !isBefore(shiftDate, addDays(now, 7))) {
      return false;
    }
    // Check if the shift is assigned to the current user
    const assignment = shiftAssignments.find(a => a.shiftId === shift.id);
    return assignment && assignment.userId === user?.id;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Today's shifts - for admins (all users' shifts for today)
  const todayShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.startTime);
    return shiftDate >= todayStart && shiftDate <= todayEnd;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Helper function to get user name for a shift
  const getUserNameForShift = (shiftId: string) => {
    // Find assignment for this shift
    const assignment = shiftAssignments.find(a => a.shiftId === shiftId);
    if (!assignment) return 'Unassigned';

    // Find the user assigned to this shift
    const shiftUser = users.find(u => u.id === assignment.userId);
    return shiftUser?.fullName || 'Unknown User';
  };

  // Get the correct status for a shift based on whether the assigned user is clocked in
  const getShiftStatus = (shift: Shift): any => {
    // Find the assignment for this shift
    const assignment = shiftAssignments.find(a => a.shiftId === shift.id);
    if (!assignment) return shift.status;

    // Check if the assigned user has an active time entry for this shift
    const activeTimeEntry = timeEntries.find(entry =>
      !entry.clockOut &&
      (entry as any).shiftId === shift.id &&
      entry.userId === assignment.userId
    );

    // If there's an active time entry, show "Clocked In"
    if (activeTimeEntry) {
      return "clocked-in";
    }

    // Otherwise return the original shift status
    return shift.status;
  };

  // Expired documents - only count user's uploaded documents that have expired
  const expiredDocs = documents.filter(doc => {
    // Only count user's own uploaded documents (must have status) that are visible
    if (!doc.status || doc.userId !== user?.id || !doc.visibleToUsers) return false;
    // Check if document has expired
    return doc.expirationDate && new Date(doc.expirationDate) < now;
  });

  // Pending items - expiring soon (within 30 days)
  const expiringDocs = documents.filter(doc => {
    // Only count user's own uploaded documents (must have status) that are visible
    if (!doc.status || doc.userId !== user?.id || !doc.visibleToUsers) return false;
    if (!doc.expirationDate) return false;
    const expiryDate = new Date(doc.expirationDate);
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

      {/* Expired Documents Alert - Only for regular users, not admins/owners */}
      {expiredDocs.length > 0 && user?.role?.toLowerCase() !== "owner" && user?.role?.toLowerCase() !== "admin" && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-destructive">Expired Documents Require Renewal</h3>
                <p className="text-sm text-muted-foreground">
                  You have {expiredDocs.length} expired {expiredDocs.length === 1 ? 'document' : 'documents'} that need to be renewed immediately.
                </p>
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setLocation('/documents')}
                    data-testid="button-view-expired-documents"
                  >
                    View Expired Documents
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          value={weekShifts.length}
          icon={CheckCircle}
          description="This week"
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
            <CardTitle>{isAdmin ? "Today's Shifts" : "My Shifts"}</CardTitle>
            <CardDescription>{isAdmin ? "All shifts scheduled for today" : "Upcoming scheduled shifts"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              // Admin view: Show today's shifts across all users
              todayShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No shifts scheduled for today</p>
              ) : (
                <>
                  {todayShifts.slice(0, 2).map(shift => (
                    <ShiftCard
                      key={shift.id}
                      id={shift.id}
                      job={shift.location ? stripCountryFromAddress(shift.location) : 'Unknown Location'}
                      subJob={shift.notes || 'Shift'}
                      date={format(new Date(shift.startTime), 'MMM d, yyyy')}
                      startTime={format(new Date(shift.startTime), 'h:mm a')}
                      endTime={format(new Date(shift.endTime), 'h:mm a')}
                      location={shift.location ? stripCountryFromAddress(shift.location) : 'Unknown'}
                      status={getShiftStatus(shift)}
                      assignedTo={getUserNameForShift(shift.id)}
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
              )
            ) : (
              // Regular user view: Show upcoming shifts
              upcomingShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming shifts</p>
              ) : (
                <>
                  {upcomingShifts.slice(0, 2).map(shift => (
                    <ShiftCard
                      key={shift.id}
                      id={shift.id}
                      job={shift.location ? stripCountryFromAddress(shift.location) : 'Unknown Location'}
                      subJob={shift.notes || 'Shift'}
                      date={format(new Date(shift.startTime), 'MMM d, yyyy')}
                      startTime={format(new Date(shift.startTime), 'h:mm a')}
                      endTime={format(new Date(shift.endTime), 'h:mm a')}
                      location={shift.location ? stripCountryFromAddress(shift.location) : 'Unknown'}
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
              )
            )}
          </CardContent>
        </Card>

{isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Tasks & Reminders</CardTitle>
              <CardDescription>Action items requiring attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {expiringDocs.slice(0, 2).map(doc => {
                  const daysUntilExpiry = differenceInDays(new Date(doc.expirationDate!), now);
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
              <CardDescription>Latest announcements and news</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {updates.slice(0, 5).map(update => (
                  <div
                    key={update.id}
                    className="p-3 rounded-md border-2 border-red-500 bg-[#1565C0] hover-elevate cursor-pointer"
                    onClick={() => setViewingUpdate(update)}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">{update.title}</p>
                      <p className="text-xs text-white/80">
                        {format(new Date(update.publishDate), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-white/90 line-clamp-2">
                        {update.content.substring(0, 100)}
                        {update.content.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                ))}

                {updates.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No updates available</p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full"
                data-testid="button-view-all-updates"
                onClick={() => setLocation('/updates')}
              >
                View All Updates
              </Button>
            </CardContent>
          </Card>
        )}
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
                    <p className="text-sm font-medium">{stripCountryFromAddress(viewingShift.location)}</p>
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

              {/* Clock In/Out Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {!isAdmin && (
                  <>
                    {activeEntry ? (
                      isClockedInToShift ? (
                        <Button
                          className="flex-1 bg-chart-2 hover:bg-chart-2/90 text-white"
                          onClick={handleClockOut}
                          disabled={clockOutMutation.isPending}
                          data-testid="button-modal-clock-out"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                        </Button>
                      ) : (
                        <div className="flex-1 text-sm text-muted-foreground p-2">
                          You're currently clocked in to a different shift
                        </div>
                      )
                    ) : (
                      <Button
                        className="flex-1"
                        onClick={handleClockIn}
                        disabled={clockInMutation.isPending}
                        data-testid="button-modal-clock-in"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
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

      {/* Update Details Dialog */}
      <Dialog
        open={!!viewingUpdate}
        onOpenChange={(open) => !open && setViewingUpdate(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Details</DialogTitle>
          </DialogHeader>
          {viewingUpdate && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold">{viewingUpdate.title}</h3>
              </div>

              {/* Date */}
              <div>
                <Label className="text-muted-foreground">Published Date</Label>
                <p className="text-sm mt-1">
                  {format(new Date(viewingUpdate.publishDate), 'MMMM d, yyyy')}
                </p>
              </div>

              {/* Content */}
              <div>
                <Label className="text-muted-foreground">Details</Label>
                <div className="mt-2 p-4 bg-muted/30 rounded-md text-sm whitespace-pre-wrap">
                  {viewingUpdate.content}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setViewingUpdate(null)}
                  data-testid="button-close-update-details"
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
