import UploadShiftNotesDialog from "@/components/upload-shift-notes-dialog";
import { useState } from "react";
import ClockInterface from "@/components/clock-interface";
import CurrentShift from "@/components/clock-current-shift";
import OptionalShiftNotesDialog from "@/components/optional-shift-notes-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, TimeEntry } from "@shared/schema";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Clock() {
  const { toast } = useToast();

  // Who am I
  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/me"] });

  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === "owner" || user?.role?.toLowerCase() === "admin";

  // All time entries
  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time/entries"],
  });

  // Current payroll week (Mon–Sun)
  const payrollStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const payrollEnd = endOfWeek(payrollStart, { weekStartsOn: 1 });

  // Helper: entry overlaps current payroll week
  const inThisWeek = (e: TimeEntry) =>
    isWithinInterval(new Date(e.clockIn), {
      start: payrollStart,
      end: payrollEnd,
    }) ||
    (e.clockOut
      ? isWithinInterval(new Date(e.clockOut), {
          start: payrollStart,
          end: payrollEnd,
        })
      : false);

  // Active entry (best-effort)
  const activeEntry =
    timeEntries.find((e) => (e as any).status === "active" && !e.clockOut) ||
    timeEntries.find((e) => !e.clockOut);

  // Completed entries in current week (sorted, newest first)
  const completedEntries = timeEntries
    .filter((e) => e.clockOut)
    .filter(inThisWeek)
    .sort(
      (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime(),
    );

  // -------- Edit dialog state --------
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  // ---- Shift-notes & optional-notes dialog state ----
  const [showUpload, setShowUpload] = useState(false);
  const [finishedTimeEntryId, setFinishedTimeEntryId] = useState<string | null>(
    null,
  );
  const [showEmpNotes, setShowEmpNotes] = useState(false);

  // Called by ClockInterface when clock-out succeeds
  function handleClockOutSuccess({
    timeEntryId,
    jobCode,
  }: {
    timeEntryId: string;
    jobCode?: string;
  }) {
    setFinishedTimeEntryId(timeEntryId);
    const isIPU = (jobCode || "").toUpperCase() === "IPU";
    if (isIPU) setShowEmpNotes(true);
    else setShowUpload(true);
  }
  // Open edit dialog
  const openEdit = (entry: TimeEntry) => {
    if ((entry as any).locked) {
      toast({
        title: "Entry is locked",
        description: "You can't edit a locked entry.",
        variant: "destructive",
      });
      return;
    }
    setEditing(entry);
    setEditLocation(entry.location || "");
    setEditClockIn(format(new Date(entry.clockIn), "HH:mm"));
    setEditClockOut(
      entry.clockOut ? format(new Date(entry.clockOut), "HH:mm") : "",
    );
  };

  // Save (PATCH)
  const updateEntryMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TimeEntry>;
    }) => {
      const res = await apiRequest("PATCH", `/api/time/entries/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      setEditing(null);
      toast({
        title: "Entry updated",
        description: "Your changes were saved.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  const handleSaveEdit = () => {
    if (!editing) return;

    const baseIn = new Date(editing.clockIn);
    const [inH, inM] = (editClockIn || "00:00").split(":").map(Number);
    const newIn = new Date(baseIn);
    newIn.setHours(inH || 0, inM || 0, 0, 0);

    let outISO: string | null = null;
    if (editClockOut) {
      const [outH, outM] = editClockOut.split(":").map(Number);
      const newOut = new Date(baseIn);
      newOut.setHours(outH || 0, outM || 0, 0, 0);
      if (newOut <= newIn) newOut.setDate(newOut.getDate() + 1); // overnight
      outISO = newOut.toISOString();
    }

    updateEntryMutation.mutate({
      id: editing.id,
      data: {
        location: editLocation,
        clockIn: newIn.toISOString(),
        ...(outISO ? { clockOut: outISO } : {}),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-clock">
            Loading...
          </h1>
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
          {isAdmin ? "Time Clock" : "Clock"}
        </h1>
        {isAdmin && (
          <p className="text-muted-foreground">Review and approve employee time</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: clock widget */}
        <div className="lg:col-span-1">
          <ClockInterface
            userName={user?.fullName}
            currentJob={
              (activeEntry as any)?.jobName ||
              activeEntry?.location ||
              "No active shift"
            }
            currentSubJob={(activeEntry as any)?.notes || ""}
            activeEntry={activeEntry as any}
            onClockOutSuccess={handleClockOutSuccess}
          />
        </div>

        {/* Right: recent entries (this payroll week only) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
            <CardDescription>
              Your clock in/out history (current payroll week)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No time entries in this payroll week
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedEntries.map((entry) => {
                    const total =
                      (new Date(entry.clockOut as any).getTime() -
                        new Date(entry.clockIn as any).getTime()) /
                      (1000 * 60 * 60);

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
                          {entry.clockOut ? total.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell>{entry.program || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Clock In
                </label>
                <Input
                  type="time"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Clock Out
                </label>
                <Input
                  type="time"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                />
              </div>
            </div>

            {isAdmin && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Job / Location
                </label>
                <Input
                  placeholder="Location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateEntryMutation.isPending}
            >
              {updateEntryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Required images dialog */}
      <UploadShiftNotesDialog
        open={showUpload}
        onOpenChange={(v) => {
          setShowUpload(v);
          if (!v) setShowEmpNotes(true); // when upload closes, open optional notes
        }}
        timeEntryId={finishedTimeEntryId}
        requireAtLeastOne={true}
      />

      {/* Optional employee notes dialog */}
      <OptionalShiftNotesDialog
        open={showEmpNotes}
        onOpenChange={setShowEmpNotes}
        timeEntryId={finishedTimeEntryId}
      />
    </div>
  );
}
