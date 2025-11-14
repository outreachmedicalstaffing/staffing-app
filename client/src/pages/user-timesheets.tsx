import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { TimeEntry, User } from "@shared/schema";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UserTimesheets() {
  const { toast } = useToast();
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time/entries"],
  });

  // Current payroll week (Mon–Sun)
  const payrollStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const payrollEnd = endOfWeek(payrollStart, { weekStartsOn: 1 });

  // Filter entries for current user and current week
  const userEntries = timeEntries
    .filter((entry) => entry.userId === currentUser?.id)
    .filter((entry) => {
      const entryDate = new Date(entry.clockIn);
      return isWithinInterval(entryDate, { start: payrollStart, end: payrollEnd });
    })
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  // Calculate total hours for the week
  const totalHours = userEntries.reduce((sum, entry) => {
    if (entry.clockOut) {
      const hours =
        (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
        (1000 * 60 * 60);
      return sum + hours;
    }
    return sum;
  }, 0);

  // Update time entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async (data: { id: string; clockIn: string; clockOut: string | null }) => {
      const res = await apiRequest("PATCH", `/api/time/entries/${data.id}`, {
        clockIn: data.clockIn,
        clockOut: data.clockOut,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      toast({
        title: "Success",
        description: "Time entry updated successfully",
      });
      setEditingEntry(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update time entry",
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditClockIn(format(new Date(entry.clockIn), "yyyy-MM-dd'T'HH:mm"));
    setEditClockOut(
      entry.clockOut ? format(new Date(entry.clockOut), "yyyy-MM-dd'T'HH:mm") : ""
    );
  };

  // Handle save edited entry
  const handleSaveEntry = () => {
    if (!editingEntry) return;

    // Convert datetime-local strings to ISO date strings
    const clockInDate = new Date(editClockIn);
    const clockOutDate = editClockOut ? new Date(editClockOut) : null;

    // Validate dates
    if (isNaN(clockInDate.getTime())) {
      toast({
        title: "Invalid clock in time",
        description: "Please enter a valid clock in time",
        variant: "destructive",
      });
      return;
    }

    if (editClockOut && clockOutDate && isNaN(clockOutDate.getTime())) {
      toast({
        title: "Invalid clock out time",
        description: "Please enter a valid clock out time",
        variant: "destructive",
      });
      return;
    }

    updateEntryMutation.mutate({
      id: editingEntry.id,
      clockIn: clockInDate.toISOString(),
      clockOut: clockOutDate ? clockOutDate.toISOString() : null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Timesheets</h1>
          <p className="text-muted-foreground">Your timesheet for the current payroll week</p>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-timesheets">
          Timesheets
        </h1>
        <p className="text-muted-foreground">
          Your timesheet for the current payroll week
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Current Week Summary</CardTitle>
            <CardDescription>
              {format(payrollStart, "MMM d")} - {format(payrollEnd, "MMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalHours.toFixed(2)} hours</div>
            <p className="text-sm text-muted-foreground">Total hours worked this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
            <CardDescription>
              All time entries for the current payroll week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No time entries for this payroll week
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userEntries.map((entry) => {
                    const hours = entry.clockOut
                      ? (new Date(entry.clockOut).getTime() -
                          new Date(entry.clockIn).getTime()) /
                        (1000 * 60 * 60)
                      : 0;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.clockIn), "EEE M/d")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.clockIn), "h:mm a")}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut
                            ? format(new Date(entry.clockOut), "h:mm a")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut ? hours.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell>{entry.program || "—"}</TableCell>
                        <TableCell>
                          {(entry as any).approvalStatus === "pending" && (
                            <Badge variant="outline" className="border-orange-500 text-orange-700">
                              Pending Approval
                            </Badge>
                          )}
                          {(entry as any).approvalStatus === "approved" && (
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              Approved
                            </Badge>
                          )}
                          {(entry as any).approvalStatus === "rejected" && (
                            <Badge variant="outline" className="border-red-500 text-red-700">
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEntry(entry)}
                            data-testid={`button-edit-entry-${entry.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      {/* Edit Time Entry Dialog */}
      <Dialog
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-clock-in">Clock In</Label>
              <Input
                id="edit-clock-in"
                type="datetime-local"
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
                data-testid="input-edit-clock-in"
              />
            </div>
            <div>
              <Label htmlFor="edit-clock-out">Clock Out</Label>
              <Input
                id="edit-clock-out"
                type="datetime-local"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
                data-testid="input-edit-clock-out"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingEntry(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEntry}
              disabled={updateEntryMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateEntryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
