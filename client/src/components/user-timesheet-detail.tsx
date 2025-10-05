import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  AlertCircle,
  Search,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { TimeEntry, User } from "@shared/schema";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  parseISO,
} from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const jobLocations = [
  { id: 1, name: "Vitas Citrus", color: "#B91C1C" },
  { id: 2, name: "Vitas Nature Coast", color: "#BE185D" },
  { id: 3, name: "Vitas Jacksonville", color: "#0F766E" },
  { id: 4, name: "Vitas V/F/P", color: "#0F766E", subItems: 3 },
  { id: 5, name: "Vitas Central Florida", color: "#1D4ED8" },
  { id: 6, name: "Vitas Midstate", color: "#A16207" },
  { id: 7, name: "Vitas Brevard", color: "#9333EA" },
  { id: 8, name: "Vitas Treasure Coast", color: "#EA580C" },
  { id: 9, name: "Vitas Palm Beach", color: "#1D4ED8" },
  { id: 10, name: "Vitas Dade/Monroe", color: "#B91C1C" },
  { id: 11, name: "Vitas Jacksonville ( St. Johns)", color: "#7C3AED" },
  { id: 12, name: "Vitas Broward", color: "#7C3AED" },
  { id: 13, name: "AdventHealth IPU", color: "#1D4ED8", subItems: 3 },
  { id: 14, name: "AdventHealth Central Florida", color: "#7C3AED" },
  { id: 15, name: "Haven", color: "#EAB308" },
];

interface UserTimesheetDetailProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

export function UserTimesheetDetail({
  user,
  open,
  onClose,
}: UserTimesheetDetailProps) {
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    entry: TimeEntry | null | undefined;
  } | null>(null);
  const [jobPopoverOpen, setJobPopoverOpen] = useState<Record<string, boolean>>(
    {},
  );

  // Get current user to check role
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: user?.id
      ? [`/api/time/entries?userId=${user.id}`]
      : ["/api/time/entries"],
    enabled: !!user,
  });

  // Query timesheet for this user and week period
  const { data: timesheets = [] } = useQuery<any[]>({
    queryKey: user?.id ? [`/api/timesheets?userId=${user.id}`] : [],
    enabled: !!user,
  });

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekRangeDisplay = `${format(currentWeekStart, "MM/dd")} - ${format(weekEnd, "MM/dd")}`;

  // Get all days of the week
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  // Reverse to show Monday at bottom
  const daysReversed = [...weekDays].reverse();

  // Navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Check if user can edit (Owner or Admin)
  const canEdit =
    currentUser?.role === "Owner" || currentUser?.role === "Admin";

  // Approve timesheet mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      // Find existing timesheet for this period
      const existingTimesheet = timesheets.find((ts: any) => {
        const tsStart = new Date(ts.periodStart);
        const tsEnd = new Date(ts.periodEnd);
        return (
          tsStart.getTime() === currentWeekStart.getTime() &&
          tsEnd.getTime() === weekEnd.getTime()
        );
      });

      let timesheetId = existingTimesheet?.id;

      // If no timesheet exists, create one
      if (!timesheetId) {
        const createResult = await apiRequest("POST", "/api/timesheets", {
          userId: user?.id,
          periodStart: currentWeekStart,
          periodEnd: weekEnd,
          totalHours: weeklyTotals.totalHours.toFixed(2),
          regularHours: weeklyTotals.regularHours.toFixed(2),
          overtimeHours: "0.00",
        });
        const newTimesheet = await createResult.json();
        timesheetId = newTimesheet.id;
      }

      // Approve the timesheet
      const result = await apiRequest(
        "POST",
        `/api/timesheets/${timesheetId}/approve`,
        {},
      );
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/timesheets");
        },
      });
      toast({
        title: "Timesheet approved",
        description: "The timesheet has been successfully approved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve timesheet",
        variant: "destructive",
      });
    },
  });

  // Lock/unlock mutation
  const lockMutation = useMutation({
    mutationFn: async ({
      entryId,
      locked,
    }: {
      entryId: string;
      locked: boolean;
    }) => {
      const result = await apiRequest("PATCH", "/api/time/entries/" + entryId, {
        locked,
      });
      return result.json();
    },
    onSuccess: (data, variables) => {
      // Close any open job popovers for this entry (security: prevent editing locked entries)
      if (variables.locked) {
        setJobPopoverOpen((prev) => ({ ...prev, [variables.entryId]: false }));
      }

      // Invalidate all time entries queries (including those with userId params)
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0]?.toString().startsWith("/api/time/entries") ??
          false,
      });
      toast({
        title: selectedDay?.entry?.locked ? "Day unlocked" : "Day locked",
        description: selectedDay?.entry?.locked
          ? "You can now edit this day's entries"
          : "This day is now locked and cannot be edited",
      });
      setLockDialogOpen(false);
      setSelectedDay(null);
    },
  });

  // Update time entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string;
      data: Partial<TimeEntry>;
    }) => {
      const result = await apiRequest(
        "PATCH",
        "/api/time/entries/" + entryId,
        data,
      );
      return result.json();
    },
    onSuccess: () => {
      // Invalidate and refetch all time entries queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0]?.toString().startsWith("/api/time/entries") ??
          false,
      });

      // Force immediate refetch
      queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0]?.toString().startsWith("/api/time/entries") ??
          false,
      });

      toast({
        title: "Entry updated",
        description: "Time entry has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update time entry",
        variant: "destructive",
      });
    },
  });

  const handleLockToggle = (date: Date, entry: TimeEntry | null) => {
    setSelectedDay({ date, entry });
    setLockDialogOpen(true);
  };

  const confirmLockToggle = () => {
    if (selectedDay?.entry) {
      lockMutation.mutate({
        entryId: selectedDay.entry.id,
        locked: !selectedDay.entry.locked,
      });
    }
  };

  const handleJobChange = (entryId: string, location: string) => {
    // Check if entry is locked before allowing changes
    const entry = timeEntries.find((e) => e.id === entryId);
    if (entry?.locked) {
      toast({
        title: "Entry is locked",
        description: "This entry cannot be modified while locked",
        variant: "destructive",
      });
      return;
    }

    // Determine the new hourly rate based on the selected job
    let newHourlyRate = user?.defaultHourlyRate || "25";

    if (location && user?.jobRates) {
      const jobRates = user.jobRates as Record<string, string>;
      if (jobRates[location]) {
        newHourlyRate = jobRates[location];
      }
    }

    // Update both location and hourlyRate
    updateEntryMutation.mutate({
      entryId,
      data: {
        location,
        hourlyRate: newHourlyRate,
      },
    });
  };

  const handleTimeChange = (
    entryId: string,
    field: "clockIn" | "clockOut",
    value: string,
  ) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry) return;

    if (entry.locked) {
      toast({
        title: "Entry is locked",
        description: "This entry cannot be modified while locked",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Received time value:", value, "for field:", field);
      const [hours, minutes] = value.split(":").map(Number);

      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error("Invalid time format");
      }

      const baseDate = new Date(entry[field] || entry.clockIn);
      baseDate.setHours(hours, minutes, 0, 0);
      const isoString = baseDate.toISOString();
      
      console.log("Updating entry:", entryId, "setting", field, "to:", isoString);

      updateEntryMutation.mutate({
        entryId,
        data: { [field]: isoString as any },
      });
    } catch (error) {
      console.error("Time change error:", error);
      toast({
        title: "Invalid time",
        description: "Please enter a valid time",
        variant: "destructive",
      });
    }
  };

  const handleManagerNotesChange = (entryId: string, notes: string) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (entry?.locked) {
      toast({
        title: "Entry is locked",
        description: "This entry cannot be modified while locked",
        variant: "destructive",
      });
      return;
    }
    updateEntryMutation.mutate({ entryId, data: { managerNotes: notes } });
  };

  // Helper to check if a shift spans multiple days
  const isOvernightShift = (clockIn: Date, clockOut: Date | null) => {
    if (!clockOut) return false;
    const inDate = new Date(clockIn);
    const outDate = new Date(clockOut);
    inDate.setHours(0, 0, 0, 0);
    outDate.setHours(0, 0, 0, 0);
    return inDate.getTime() !== outDate.getTime();
  };

  // Get entry for a specific day
  const getEntryForDay = (date: Date): TimeEntry | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return (
      timeEntries.find((entry) => {
        const entryDateStr = entry.clockIn.toString().split("T")[0];
        // Check if this is the clock-in day
        if (entryDateStr === dateStr) return true;

        // Check if this is an overnight shift ending on this day
        if (
          entry.clockOut &&
          isOvernightShift(new Date(entry.clockIn), new Date(entry.clockOut))
        ) {
          const clockOutDateStr = entry.clockOut.toString().split("T")[0];
          return clockOutDateStr === dateStr;
        }

        return false;
      }) || null
    );
  };

  // Calculate hours for an entry
  const calculateHours = (entry: TimeEntry | null) => {
    if (!entry || !entry.clockOut) return 0;
    const hours =
      (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
      (1000 * 60 * 60);
    return hours;
  };

  // Calculate totals for the week
  const weeklyTotals = daysReversed.reduce(
    (totals, date) => {
      const entry = getEntryForDay(date);
      // Recalculate hours from current entry data on every render
      const hours =
        entry && entry.clockOut
          ? (new Date(entry.clockOut).getTime() -
              new Date(entry.clockIn).getTime()) /
            (1000 * 60 * 60)
          : 0;
      // Use the actual hourly rate from the time entry, or fall back to default
      const hourlyRate = entry?.hourlyRate
        ? parseFloat(entry.hourlyRate)
        : parseFloat(user?.defaultHourlyRate || "25");
      const dailyPay = hours * hourlyRate;

      return {
        totalHours: totals.totalHours + hours,
        regularHours: totals.regularHours + hours,
        totalPay: totals.totalPay + dailyPay,
      };
    },
    { totalHours: 0, regularHours: 0, totalPay: 0 },
  );

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`}
                  />
                  <AvatarFallback>
                    {user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <DialogTitle className="text-xl">{user.fullName}</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-detail"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousWeek}
                  data-testid="button-previous-week-detail"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentWeek}
                  data-testid="button-week-range-detail"
                  className="min-w-[140px]"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {weekRangeDisplay}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextWeek}
                  data-testid="button-next-week-detail"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 pb-4 border-b">
              <div>
                <p className="text-sm text-muted-foreground">Regular</p>
                <p className="text-lg font-semibold">
                  {weeklyTotals.regularHours.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Holiday paid hours
                </p>
                <p className="text-lg font-semibold">0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Paid hours
                </p>
                <p className="text-lg font-semibold">
                  {weeklyTotals.totalHours.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Worked Days</p>
                <p className="text-lg font-semibold">
                  {daysReversed.filter((date) => getEntryForDay(date)).length}
                </p>
              </div>
            </div>

            {/* Weekly Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Total hours</TableHead>
                    <TableHead>Hourly rate</TableHead>
                    <TableHead>Daily total</TableHead>
                    <TableHead>Daily pay</TableHead>
                    <TableHead>Weekly total</TableHead>
                    <TableHead>Regular</TableHead>
                    <TableHead>Holiday</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Relieving Nurse Si...</TableHead>
                    <TableHead>Attach ALL shift n...</TableHead>
                    <TableHead>Employee notes</TableHead>
                    <TableHead>Manager notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daysReversed.map((date) => {
                    const entry = getEntryForDay(date);
                    const hours =
                      entry && entry.clockOut
                        ? (new Date(entry.clockOut).getTime() -
                            new Date(entry.clockIn).getTime()) /
                          (1000 * 60 * 60)
                        : 0;
                    // Use the actual hourly rate from the time entry, or fall back to default
                    const hourlyRate = entry?.hourlyRate
                      ? parseFloat(entry.hourlyRate)
                      : parseFloat(user.defaultHourlyRate || "25");
                    const dailyPay = hours * hourlyRate;
                    const isLocked = entry?.locked || false;

                    return (
                      <TableRow
                        key={date.toISOString()}
                        data-testid={`row-day-${format(date, "yyyy-MM-dd")}`}
                      >
                        <TableCell className="font-medium">
                          {format(date, "EEE M/d")}
                        </TableCell>
                        <TableCell>
                          {entry ? (
                            canEdit ? (
                              <Popover
                                open={jobPopoverOpen[entry.id] || false}
                                onOpenChange={(open) =>
                                  !isLocked &&
                                  setJobPopoverOpen((prev) => ({
                                    ...prev,
                                    [entry.id]: open,
                                  }))
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-[200px] justify-between h-8 font-normal"
                                    data-testid={`select-job-${format(date, "yyyy-MM-dd")}`}
                                    disabled={isLocked}
                                  >
                                    {entry.location || "Select"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-[250px] p-0"
                                  align="start"
                                >
                                  <Command>
                                    <CommandInput placeholder="Search" />
                                    <CommandList>
                                      <CommandEmpty>No job found.</CommandEmpty>
                                      <CommandGroup>
                                        <CommandItem
                                          onSelect={() => {
                                            handleJobChange(entry.id, "");
                                            setJobPopoverOpen((prev) => ({
                                              ...prev,
                                              [entry.id]: false,
                                            }));
                                          }}
                                          className="text-muted-foreground"
                                        >
                                          Clear
                                        </CommandItem>
                                        <CommandItem
                                          disabled
                                          className="text-muted-foreground opacity-100"
                                        >
                                          Manage job items
                                        </CommandItem>
                                      </CommandGroup>
                                      <CommandSeparator />
                                      <CommandGroup>
                                        {jobLocations.map((job) => (
                                          <CommandItem
                                            key={job.id}
                                            value={job.name}
                                            onSelect={() => {
                                              handleJobChange(
                                                entry.id,
                                                job.name,
                                              );
                                              setJobPopoverOpen((prev) => ({
                                                ...prev,
                                                [entry.id]: false,
                                              }));
                                            }}
                                          >
                                            <div className="flex items-center gap-2 w-full">
                                              <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{
                                                  backgroundColor: job.color,
                                                }}
                                              />
                                              <span className="flex-1">
                                                {job.name}
                                              </span>
                                              <Check
                                                className={`ml-auto h-4 w-4 ${
                                                  entry.location === job.name
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                }`}
                                              />
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span className="text-sm">
                                {entry.location || "—"}
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {entry ? (
                            canEdit ? (
                              <Input
                                type="time"
                                key={`start-${entry.id}-${entry.clockIn}`}
                                defaultValue={format(
                                  new Date(entry.clockIn),
                                  "HH:mm",
                                )}
                                onBlur={(e) => {
                                  const newValue = e.target.value;
                                  const oldValue = format(
                                    new Date(entry.clockIn),
                                    "HH:mm",
                                  );
                                  if (newValue !== oldValue) {
                                    handleTimeChange(
                                      entry.id,
                                      "clockIn",
                                      newValue,
                                    );
                                  }
                                }}
                                className="w-[120px] h-8"
                                data-testid={`input-start-${format(date, "yyyy-MM-dd")}`}
                                disabled={isLocked}
                              />
                            ) : (
                              <span className="text-sm">
                                {format(new Date(entry.clockIn), "h:mm a")}
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {entry?.clockOut ? (
                            canEdit ? (
                              <Input
                                type="time"
                                key={`end-${entry.id}-${entry.clockOut}`}
                                defaultValue={format(
                                  new Date(entry.clockOut),
                                  "HH:mm",
                                )}
                                onBlur={(e) => {
                                  const newValue = e.target.value;
                                  const oldValue = entry.clockOut ? format(
                                    new Date(entry.clockOut),
                                    "HH:mm",
                                  ) : "";
                                  if (newValue !== oldValue) {
                                    handleTimeChange(
                                      entry.id,
                                      "clockOut",
                                      newValue,
                                    );
                                  }
                                }}
                                className="w-[120px] h-8"
                                data-testid={`input-end-${format(date, "yyyy-MM-dd")}`}
                                disabled={isLocked}
                              />
                            ) : (
                              <span className="text-sm">
                                {format(new Date(entry.clockOut), "h:mm a")}
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {hours > 0 ? hours.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell>
                          {entry ? `$${hourlyRate.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell>
                          {hours > 0 ? hours.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell>
                          {hours > 0 ? `$${dailyPay.toFixed(2)}` : "$0.00"}
                        </TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          {hours > 0 ? hours.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          {canEdit && entry && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLockToggle(date, entry)}
                              data-testid={`button-lock-${format(date, "yyyy-MM-dd")}`}
                              className="h-8 w-8"
                            >
                              {isLocked ? (
                                <Lock className="h-4 w-4 text-red-600" />
                              ) : (
                                <Unlock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry?.relievingNurseSignature ? (
                            <img
                              src={entry.relievingNurseSignature}
                              alt="Signature"
                              className="h-8 max-w-[100px] object-contain cursor-pointer"
                              onClick={() =>
                                window.open(
                                  entry.relievingNurseSignature!,
                                  "_blank",
                                )
                              }
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {entry?.shiftNoteAttachments &&
                          entry.shiftNoteAttachments.length > 0 ? (
                            <button
                              className="text-blue-600 hover:underline text-sm"
                              onClick={() => {
                                // TODO: Open image viewer modal
                                toast({
                                  title: "Attachments",
                                  description: `${entry.shiftNoteAttachments?.length} file(s) attached`,
                                });
                              }}
                            >
                              {entry.shiftNoteAttachments.length} image
                              {entry.shiftNoteAttachments.length !== 1
                                ? "s"
                                : ""}
                            </button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {entry?.employeeNotes || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry ? (
                            canEdit ? (
                              <Input
                                type="text"
                                value={entry.managerNotes || ""}
                                onChange={(e) =>
                                  handleManagerNotesChange(
                                    entry.id,
                                    e.target.value,
                                  )
                                }
                                placeholder="Add notes..."
                                className="w-full min-w-[150px] h-8"
                                data-testid={`input-manager-notes-${format(date, "yyyy-MM-dd")}`}
                                disabled={isLocked}
                              />
                            ) : (
                              <span className="text-sm">
                                {entry.managerNotes || "—"}
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" data-testid="button-conflicts-detail">
                  Conflicts
                </Button>
                <Button variant="outline" data-testid="button-export-detail">
                  Export
                </Button>
              </div>
              <Button
                data-testid="button-approve-timesheet"
                onClick={() => approveMutation.mutate()}
                disabled={!canEdit || approveMutation.isPending}
              >
                {approveMutation.isPending ? "Approving..." : "Approve"}
              </Button>
            </div>

            {/* Summary Footer */}
            <div className="flex justify-end gap-8 text-sm pt-2">
              <div className="text-right">
                <p className="text-muted-foreground">Pay per dates</p>
                <p className="font-semibold">
                  ${weeklyTotals.totalPay.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lock/Unlock Confirmation Dialog */}
      <AlertDialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
              <AlertDialogTitle className="text-center">
                {selectedDay?.entry?.locked
                  ? "Unlock day in timesheet"
                  : "Lock day in timesheet"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center">
              {selectedDay?.entry?.locked ? (
                <>
                  Unlocking this day will allow you to edit the time entry.
                  <br />
                  <br />
                  Are you sure you want to unlock{" "}
                  {selectedDay?.date
                    ? format(selectedDay.date, "EEEE, MMMM d")
                    : "this day"}
                  ?
                </>
              ) : (
                <>
                  Ensure payroll accuracy by locking days in your employees'
                  timesheets.
                  <br />
                  <br />
                  Locking prevents admins and users from adding or editing any
                  records for that day.
                  <br />
                  <br />
                  Only listed admins are able to lock or unlock days. System
                  owners can modify those permissions in the time clock's
                  settings menu.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-lock">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLockToggle}
              data-testid="button-confirm-lock"
            >
              {selectedDay?.entry?.locked ? "Unlock day" : "Confirm locking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
