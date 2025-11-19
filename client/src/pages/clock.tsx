import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Clock as ClockIcon, Moon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, TimeEntry, Shift } from "@shared/schema";
import { ClockOutDialog } from "@/components/clock-out-dialog";

// Helper function to remove "United States of America" from addresses
const stripCountryFromAddress = (address: string): string => {
  return address.replace(/, United States of America$/, '');
};

// Helper function to detect if a time entry is a night shift
const isNightShift = (clockIn: Date, clockOut: Date | null): boolean => {
  if (!clockOut) return false; // Can't determine if shift is still active

  const clockInHour = clockIn.getHours();
  const clockOutHour = clockOut.getHours();

  // Night shift if:
  // 1. Clock in is after 6 PM (18:00)
  // 2. Clock out is before 6 AM (06:00)
  // 3. Shift crosses midnight (clock out date is after clock in date, but clock out hour is earlier)
  const startsAtNight = clockInHour >= 18; // After 6 PM
  const endsInMorning = clockOutHour < 6; // Before 6 AM
  const crossesMidnight = clockOut.getTime() > clockIn.getTime() && clockOutHour < clockInHour;

  return startsAtNight || endsInMorning || crossesMidnight;
};

export default function Clock() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewingShift, setViewingShift] = useState<Shift | null>(null);
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);

  // Update current time every second
  useState(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  });

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Fetch time entries - CRITICAL: Include user.id in queryKey to prevent cross-user cache pollution
  const { data: timeEntries = [], isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time/entries", user?.id],
    enabled: !!user?.id, // Only fetch when user is loaded
  });

  // Fetch shifts - Backend filters by user role automatically
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
  });

  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === "owner" || user?.role?.toLowerCase() === "admin";

  // Get active time entry (currently clocked in) for the current user only
  // CRITICAL: Must filter by userId to prevent showing other users' clock-in status
  // Only calculate activeEntry if we have a valid user loaded to prevent showing wrong data
  const activeEntry = user?.id
    ? timeEntries.find((e) => !e.clockOut && e.userId === user.id)
    : undefined;

  // DEBUG: Log to verify correct data isolation
  if (user?.id) {
    console.log("[Time Clock Debug]", {
      loggedInUserId: user.id,
      loggedInUserName: user.fullName,
      totalTimeEntries: timeEntries.length,
      activeEntries: timeEntries.filter(e => !e.clockOut).map(e => ({
        entryUserId: e.userId,
        program: (e as any).program,
        matchesLoggedInUser: e.userId === user.id
      })),
      hasActiveEntry: !!activeEntry,
      activeEntryUserId: activeEntry?.userId,
      activeEntryProgram: (activeEntry as any)?.program,
    });
  }

  // Get current or next assigned shift
  // Note: Backend already filters shifts for regular users to only their assigned shifts
  const now = new Date();
  const myShifts = shifts;

  const currentShift = myShifts.find(
    (s) => new Date(s.startTime) <= now && now <= new Date(s.endTime),
  );

  const nextShift = myShifts
    .filter((s) => new Date(s.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const displayShift = currentShift || nextShift;

  // Get payroll week (Monday to Sunday)
  const payrollStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const payrollEnd = endOfWeek(payrollStart, { weekStartsOn: 1 });

  // Filter entries for current payroll week (current user only)
  // CRITICAL: Must filter by userId to prevent showing other users' time entries
  const weekEntries = user?.id
    ? timeEntries
        .filter((e) => {
          // Only show the current user's time entries
          if (e.userId !== user.id) return false;

          const clockIn = new Date(e.clockIn);
          return (
            isWithinInterval(clockIn, { start: payrollStart, end: payrollEnd }) ||
            (e.clockOut &&
              isWithinInterval(new Date(e.clockOut), {
                start: payrollStart,
                end: payrollEnd,
              }))
          );
        })
        .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
    : [];

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (shift?: Shift) => {
      const shiftToUse = shift || displayShift;
      const res = await apiRequest("POST", "/api/time/clock-in", {
        shiftId: shiftToUse?.id || null,
        location: shiftToUse?.location || "Office",
        notes: "",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      const clockInTime = format(new Date(), "h:mm a");
      toast({
        title: "Clocked In",
        description: `Successfully clocked in at ${clockInTime}`,
      });
      // Close the shift details dialog if it was open
      setViewingShift(null);
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
    mutationFn: async (photoFilenames: string[]) => {
      const res = await apiRequest("POST", "/api/time/clock-out", {
        shiftNoteAttachments: photoFilenames,
        relievingNurseSignature: null,
      });
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });

      // Calculate hours worked if we have the active entry
      let hoursWorked = "";
      if (activeEntry) {
        const clockInTime = new Date(activeEntry.clockIn);
        const clockOutTime = new Date();
        const hours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
        hoursWorked = ` - ${hours.toFixed(2)} hours worked`;
      }

      const clockOutTime = format(new Date(), "h:mm a");
      toast({
        title: "Clocked Out",
        description: `Successfully clocked out at ${clockOutTime}${hoursWorked}`,
      });

      // Close the dialog
      setShowClockOutDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Close the dialog on error too
      setShowClockOutDialog(false);
    },
  });

  // Handle clock toggle
  const handleClockToggle = () => {
    if (activeEntry) {
      // Open the clock out dialog to upload shift notes
      setShowClockOutDialog(true);
    } else {
      clockInMutation.mutate(undefined);
    }
  };

  // Handle clock out with photo filenames
  const handleClockOut = (photoFilenames: string[]) => {
    clockOutMutation.mutate(photoFilenames);
  };

  const isLoading = userLoading || timeEntriesLoading || shiftsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-clock">
          Time Clock
        </h1>
        <p className="text-muted-foreground">Clock in and out of your shifts</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Clock Widget */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Time Clock</CardTitle>
            <CardDescription>
              {currentTime.toLocaleTimeString()} · {currentTime.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="lg"
              className="w-full min-h-16 text-lg font-semibold bg-[#1565C0] hover:bg-[#0D47A1] border-2 border-[#E91E63] text-white"
              onClick={handleClockToggle}
              disabled={clockInMutation.isPending || clockOutMutation.isPending}
              data-testid={activeEntry ? "button-clock-out" : "button-clock-in"}
            >
              <ClockIcon className="h-5 w-5 mr-2" />
              {activeEntry
                ? clockOutMutation.isPending
                  ? "Clocking Out..."
                  : "Clock Out"
                : clockInMutation.isPending
                  ? "Clocking In..."
                  : "Clock In"}
            </Button>

            {/* Current/Next Shift Display */}
            <div className="pt-4 border-t">
              {displayShift ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {displayShift.title || "Shift"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {displayShift.location ? stripCountryFromAddress(displayShift.location) : "No location"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(displayShift.startTime), "EEE, MMM d")} ·{" "}
                        {format(new Date(displayShift.startTime), "h:mm a")} –{" "}
                        {format(new Date(displayShift.endTime), "h:mm a")}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 text-sm"
                    onClick={() => setViewingShift(displayShift)}
                    data-testid="button-view-shift-details"
                  >
                    View details
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assigned shift found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Recent Time Entries */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
            <CardDescription>
              Your clock in/out history (current payroll week)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weekEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No time entries in this payroll week
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Program</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekEntries.map((entry) => {
                    const totalHours = entry.clockOut
                      ? (new Date(entry.clockOut).getTime() -
                          new Date(entry.clockIn).getTime()) /
                        (1000 * 60 * 60)
                      : 0;

                    const isNight = isNightShift(
                      new Date(entry.clockIn),
                      entry.clockOut ? new Date(entry.clockOut) : null
                    );

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.clockIn), "EEE M/d")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.clockIn), "h:mm a")}
                        </TableCell>
                        <TableCell className="text-center">
                          {isNight && (
                            <Moon className="h-4 w-4 text-blue-500 inline-block" title="Overnight shift" />
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut ? (
                            format(new Date(entry.clockOut), "h:mm a")
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut ? totalHours.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell>
                          {(entry as any).program || entry.location || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
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
              <div>
                <Label className="text-muted-foreground">Shift Title</Label>
                <p className="text-sm font-medium mt-1">
                  {viewingShift.title || "Untitled Shift"}
                </p>
              </div>

              {viewingShift.jobName && (
                <div>
                  <Label className="text-muted-foreground">Job</Label>
                  <p className="text-sm font-medium mt-1">{viewingShift.jobName}</p>
                </div>
              )}

              {(viewingShift as any).program && (
                <div>
                  <Label className="text-muted-foreground">Program</Label>
                  <p className="text-sm font-medium mt-1">
                    {(viewingShift as any).program}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="text-sm font-medium mt-1">
                    {format(new Date(viewingShift.startTime), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time</Label>
                  <p className="text-sm font-medium mt-1">
                    {format(new Date(viewingShift.startTime), "h:mm a")} -{" "}
                    {format(new Date(viewingShift.endTime), "h:mm a")}
                  </p>
                </div>
              </div>

              {viewingShift.location && (
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="text-sm font-medium mt-1">{stripCountryFromAddress(viewingShift.location)}</p>
                </div>
              )}

              {viewingShift.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <div className="mt-1 p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap">
                    {viewingShift.notes}
                  </div>
                </div>
              )}

              <DialogFooter className="flex justify-between">
                {!isAdmin && !activeEntry ? (
                  <Button
                    className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
                    onClick={() => clockInMutation.mutate(viewingShift)}
                    disabled={clockInMutation.isPending}
                    data-testid="button-dialog-clock-in"
                  >
                    <ClockIcon className="h-4 w-4 mr-2" />
                    {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  variant="outline"
                  onClick={() => setViewingShift(null)}
                  data-testid="button-close-shift-details"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clock Out Dialog with Photo Upload */}
      <ClockOutDialog
        open={showClockOutDialog}
        onOpenChange={setShowClockOutDialog}
        onClockOut={handleClockOut}
        isLoading={clockOutMutation.isPending}
      />
    </div>
  );
}
