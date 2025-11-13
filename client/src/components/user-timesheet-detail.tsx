import React, { useState, useRef, useCallback, useEffect } from "react";
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
  Check,
  ChevronsUpDown,
  Download,
  ExternalLink,
  Moon,
  CornerLeftDown,
  CornerRightUp,
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
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
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
  const [manualEntryDialogOpen, setManualEntryDialogOpen] = useState(false);
  const [manualEntryDate, setManualEntryDate] = useState<Date | null>(null);
  const [manualEntryData, setManualEntryData] = useState({
    clockIn: "",
    clockOut: "",
    location: "",
  });
  // Image preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  // Download the currently viewed image
  const downloadCurrent = () => {
    const url = previewImages[previewIndex];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = url.split("/").pop() || `attachment-${previewIndex + 1}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadAll = () => {
    previewImages.forEach((u, i) => {
      const a = document.createElement("a");
      a.href = u;
      a.download = u.split("/").pop() || `attachment-${i + 1}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };
  const openPreview = (images: string[], start = 0) => {
    if (!images || images.length === 0) return;
    setPreviewImages(images);
    setPreviewIndex(Math.max(0, Math.min(start, images.length - 1)));
    setPreviewOpen(true);
  };
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
  // Seed notesDraft with server values whenever timeEntries load/refresh
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const e of timeEntries) map[e.id] = e.managerNotes || "";
    setNotesDraft(map);
  }, [timeEntries]);
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
  const goToPreviousWeek = () =>
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () =>
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Check if user can edit (Owner or Admin)
  const canEdit =
    currentUser?.role === "Owner" || currentUser?.role === "Admin";

  // Approve timesheet mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const existingTimesheet = timesheets.find((ts: any) => {
        const tsStart = new Date(ts.periodStart);
        const tsEnd = new Date(ts.periodEnd);
        return (
          tsStart.getTime() === currentWeekStart.getTime() &&
          tsEnd.getTime() === weekEnd.getTime()
        );
      });

      let timesheetId = existingTimesheet?.id;

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
    onError: (error: any) => {
      console.error("Create entry error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create time entry",
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
      if (variables.locked) {
        setJobPopoverOpen((prev) => ({ ...prev, [variables.entryId]: false }));
      }
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0]?.toString().startsWith("/api/time/entries") ??
          false,
      });
      // 👇 suppress the toast if we passed _silentToast for debounced manager notes
      const silent = (variables?.data as any)?._silentToast;
      if (!silent) {
        toast({
          title: "Entry updated",
          description: "Time entry has been updated successfully",
        });
      }
    },
  });
  const queueSaveNotes = useCallback(
    (entryId: string, value: string) => {
      // clear previous timer for this entry
      if (notesTimers.current[entryId]) {
        clearTimeout(notesTimers.current[entryId]);
      }
      // schedule save after 800ms idle
      notesTimers.current[entryId] = setTimeout(() => {
        updateEntryMutation.mutate({
          entryId,
          data: { managerNotes: value, _silentToast: true }, // optional flag to suppress toast
        });
      }, 800);
    },
    [updateEntryMutation],
  );
  // Create time entry mutation (defensive parse + optimistic cache w/ fallback on refetch)
  const createEntryMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      clockIn: string;
      clockOut: string;
      location: string;
      hourlyRate: string;
    }) => {
      const result = await apiRequest("POST", "/api/time/entries", data);

      if (!result.ok) {
        let serverMessage = "";
        try {
          const errText = await result.text();
          if (errText) {
            try {
              const parsed = JSON.parse(errText);
              serverMessage = parsed?.message || errText;
            } catch {
              serverMessage = errText;
            }
          }
        } catch {}
        throw new Error(
          serverMessage ||
            `Failed to create time entry (HTTP ${result.status})`,
        );
      }

      const text = await result.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    },
    onSuccess: async (createdEntry, variables) => {
      const fallback = {
        id: `temp-${Date.now()}`,
        userId: variables.userId,
        clockIn: variables.clockIn,
        clockOut: variables.clockOut,
        location: variables.location || "",
        hourlyRate: variables.hourlyRate || (user?.defaultHourlyRate ?? "25"),
        locked: false,
        managerNotes: "",
        employeeNotes: "",
        shiftNoteAttachments: [],
        relievingNurseSignature: null as any,
      };

      const key = [`/api/time/entries?userId=${user?.id}`];

      const containsCreated = (arr: any[] | undefined | null) => {
        if (!Array.isArray(arr)) return false;
        const ci = new Date(variables.clockIn).getTime();
        return arr.some(
          (e: any) =>
            (e?.userId?.toString?.() ?? e?.userId) ===
              (variables.userId?.toString?.() ?? variables.userId) &&
            new Date(e.clockIn as any).getTime() === ci,
        );
      };

      // Optimistic insert
      queryClient.setQueryData(key, (old: any) => {
        const prev = Array.isArray(old) ? old : [];
        const candidate =
          createdEntry && typeof createdEntry === "object"
            ? createdEntry
            : fallback;
        if (containsCreated(prev)) return prev;
        const byId = prev.findIndex((e: any) => e?.id && e.id === candidate.id);
        if (byId !== -1) {
          const next = [...prev];
          next[byId] = { ...next[byId], ...candidate };
          return next;
        }
        return [...prev, candidate];
      });

      // Refetch from server
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.refetchQueries({ queryKey: key, type: "active" });

      // Keep fallback if server list doesn't include it (tz/filter issues)
      const latest = queryClient.getQueryData(key) as any[] | undefined;
      if (!containsCreated(latest)) {
        queryClient.setQueryData(key, (old: any) => {
          const prev = Array.isArray(old) ? old : [];
          if (containsCreated(prev)) return prev;
          return [...prev, fallback];
        });
      }

      toast({
        title: "Entry created",
        description: "Time entry has been created successfully",
      });
      setManualEntryDialogOpen(false);
      setManualEntryData({ clockIn: "", clockOut: "", location: "" });
      setManualEntryDate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create time entry",
        variant: "destructive",
      });
    },
  });

  const handleManualEntry = (date: Date) => {
    setManualEntryDate(date);
    setManualEntryDialogOpen(true);
  };

  const handleManualEntrySave = async () => {
    if (!manualEntryDate || !user?.id) return;

    const [inHours, inMinutes] = manualEntryData.clockIn.split(":").map(Number);
    const [outHours, outMinutes] = manualEntryData.clockOut
      .split(":")
      .map(Number);

    const clockInDate = new Date(manualEntryDate);
    clockInDate.setHours(inHours, inMinutes, 0, 0);

    const clockOutDate = new Date(manualEntryDate);
    clockOutDate.setHours(outHours, outMinutes, 0, 0);

    if (clockOutDate <= clockInDate) {
      clockOutDate.setDate(clockOutDate.getDate() + 1);
    }

    let hourlyRate = user.defaultHourlyRate || "25";
    if (manualEntryData.location && (user as any).jobRates) {
      const jobRates = (user.jobRates as Record<string, string>) || {};
      if (jobRates[manualEntryData.location]) {
        hourlyRate = jobRates[manualEntryData.location];
      }
    }

    await createEntryMutation.mutateAsync({
      userId: user.id,
      clockIn: clockInDate.toISOString(),
      clockOut: clockOutDate.toISOString(),
      location: manualEntryData.location,
      hourlyRate: hourlyRate,
    });
  };

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
    const entry = timeEntries.find((e) => e.id === entryId);
    if (entry?.locked) {
      toast({
        title: "Entry is locked",
        description: "This entry cannot be modified while locked",
        variant: "destructive",
      });
      return;
    }

    let newHourlyRate = user?.defaultHourlyRate || "25";
    if (location && user?.jobRates) {
      const jobRates = user.jobRates as Record<string, string>;
      if (jobRates[location]) newHourlyRate = jobRates[location];
    }

    updateEntryMutation.mutate({
      entryId,
      data: { location, hourlyRate: newHourlyRate },
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
      const [hours, minutes] = value.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes))
        throw new Error("Invalid time format");

      const existingTime = (entry as any)[field] || entry.clockIn;
      const date = new Date(existingTime);
      if (isNaN(date.getTime())) throw new Error("Invalid date");

      date.setHours(hours, minutes, 0, 0);
      if (isNaN(date.getTime())) throw new Error("Invalid time value");

      updateEntryMutation.mutate({
        entryId,
        data: { [field]: date.toISOString() } as any,
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

  // Calculate split hours for overnight shifts
  const getSplitShiftInfo = (entry: TimeEntry, viewDate: Date) => {
    if (!entry.clockOut) return null;

    const clockIn = new Date(entry.clockIn);
    const clockOut = new Date(entry.clockOut);

    if (!isOvernightShift(clockIn, clockOut)) return null;

    const midnight = new Date(clockIn);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);

    const viewDateStr = format(viewDate, "yyyy-MM-dd");
    const clockInDateStr = format(clockIn, "yyyy-MM-dd");

    if (viewDateStr === clockInDateStr) {
      const hoursBeforeMidnight =
        (midnight.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      return {
        isFirstDay: true,
        displayStart: format(clockIn, "h:mm a"),
        displayEnd: "12:00 AM 🌙",
        hours: hoursBeforeMidnight,
      };
    }

    const hoursAfterMidnight =
      (clockOut.getTime() - midnight.getTime()) / (1000 * 60 * 60);
    return {
      isFirstDay: false,
      displayStart: "🌙 12:00 AM",
      displayEnd: format(clockOut, "h:mm a"),
      hours: hoursAfterMidnight,
    };
  };

  // Get entry for a specific day (range-based: handles timezones & non-ISO strings)
  const getEntryForDay = (date: Date): TimeEntry | null => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return (
      timeEntries.find((entry) => {
        const clockIn = new Date(entry.clockIn as any);
        const clockOut = entry.clockOut
          ? new Date(entry.clockOut as any)
          : null;
        if (clockIn >= start && clockIn < end) return true;
        if (clockOut && isOvernightShift(clockIn, clockOut)) {
          if (clockOut >= start && clockOut < end) return true;
        }
        return false;
      }) || null
    );
  };

  // Calculate hours for an entry (raw full-span hours)
  const calculateHours = (entry: TimeEntry | null) => {
    if (!entry || !entry.clockOut) return 0;
    const hours =
      (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
      (1000 * 60 * 60);
    return hours;
  };

  // Calculate totals for the week (count only first day of split)
  const weeklyTotals = daysReversed.reduce(
    (totals, date) => {
      const entry = getEntryForDay(date);
      const splitInfo = entry ? getSplitShiftInfo(entry, date) : null;
      const shouldCountHours = !splitInfo || splitInfo.isFirstDay;
      const hours = shouldCountHours ? calculateHours(entry) : 0;

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
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
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
                  {
                    daysReversed.filter((date) => {
                      const entry = getEntryForDay(date);
                      if (!entry) return false;
                      const splitInfo = getSplitShiftInfo(entry, date);
                      return !splitInfo || splitInfo.isFirstDay;
                    }).length
                  }
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
                    <TableHead>Signature</TableHead>
                    <TableHead>Shift Notes</TableHead>
                    <TableHead>Employee notes</TableHead>
                    <TableHead>Manager notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daysReversed.map((date) => {
                    const entry = getEntryForDay(date);
                    const splitInfo = entry
                      ? getSplitShiftInfo(entry, date)
                      : null;
                    const hours = splitInfo
                      ? splitInfo.hours
                      : calculateHours(entry);
                    const hourlyRate = entry?.hourlyRate
                      ? parseFloat(entry.hourlyRate)
                      : parseFloat(
                          ((user as any)?.defaultHourlyRate ?? "25") as string,
                        );
                    const dailyPay = hours * hourlyRate;
                    const isLocked = entry?.locked || false;
                    // --- overnight visual linking helpers ---
                    const rowId = `row-${format(date, "yyyy-MM-dd")}`;

                    const prev = new Date(date);
                    prev.setDate(prev.getDate() - 1);
                    const next = new Date(date);
                    next.setDate(next.getDate() + 1);

                    const prevId = `row-${format(prev, "yyyy-MM-dd")}`;
                    const nextId = `row-${format(next, "yyyy-MM-dd")}`;
                    // light band + left border for both sides of an overnight pair
                    const pairClass = splitInfo
                      ? "bg-blue-50/60 border-l-4 border-blue-600"
                      : "";
                    // ---
                    return (
                      <TableRow
                        id={rowId}
                        key={date.toISOString()}
                        data-testid={`row-day-${format(date, "yyyy-MM-dd")}`}
                        className={pairClass}
                      >
                        <TableCell className="font-medium">
                          {format(date, "EEE M/d")}
                        </TableCell>

                        {/* Job cell */}
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
                                    title={
                                      splitInfo && !splitInfo.isFirstDay
                                        ? "Overnight continuation — editing job updates the whole shift"
                                        : undefined
                                    }
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
                                                className={`ml-auto h-4 w-4 ${entry.location === job.name ? "opacity-100" : "opacity-0"}`}
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
                          ) : canEdit ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManualEntry(date)}
                              className="h-8"
                            >
                              Add Entry
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        {/* Start cell */}
                        <TableCell>
                          {entry ? (
                            // Second day of an overnight: show a clear link back to the previous day
                            splitInfo && !splitInfo.isFirstDay ? (
                              <a
                                href={`#${prevId}`}
                                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                                title={`Linked from ${format(prev, "EEE M/d")}`}
                              >
                                <CornerRightUp className="h-3 w-3" />
                                <span>12:00 AM</span>
                                <span className="ml-1 text-[11px]">
                                  from {format(prev, "EEE M/d")}
                                </span>
                              </a>
                            ) : canEdit ? (
                              <Input
                                type="time"
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

                        {/* End cell */}
                        <TableCell>
                          {entry?.clockOut ? (
                            // First day of an overnight: clear link forward to the next day
                            splitInfo && splitInfo.isFirstDay ? (
                              <a
                                href={`#${nextId}`}
                                className="inline-flex items-center gap-1 text-sm text-blue-700 whitespace-nowrap hover:underline"
                                title={`Continues to ${format(next, "EEE M/d")}`}
                              >
                                <span>12:00 AM</span>
                                <CornerLeftDown className="h-3 w-3" />
                                <Moon className="h-3 w-3" />
                                <span className="ml-1 text-[11px]">
                                  to {format(next, "EEE M/d")}
                                </span>
                              </a>
                            ) : canEdit ? (
                              <Input
                                type="time"
                                defaultValue={format(
                                  new Date(entry.clockOut),
                                  "HH:mm",
                                )}
                                onBlur={(e) => {
                                  const newValue = e.target.value;
                                  const oldValue = format(
                                    new Date(entry.clockOut),
                                    "HH:mm",
                                  );
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
                              <span className="text-sm whitespace-nowrap">
                                {format(new Date(entry.clockOut), "h:mm a")}
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        {/* Totals for the day */}
                        <TableCell>
                          {splitInfo && !splitInfo.isFirstDay ? (
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {hours.toFixed(2)} 🌙
                            </span>
                          ) : hours > 0 ? (
                            <span className="whitespace-nowrap">
                              {hours.toFixed(2)}
                            </span>
                          ) : (
                            "—"
                          )}
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

                        {/* Actions */}
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
                          {entry?.shiftNoteAttachments?.length
                            ? (() => {
                                // Make an array of URLs from the attachments in this row
                                const urls = (
                                  entry.shiftNoteAttachments as any[]
                                )
                                  .map((a) =>
                                    typeof a === "string" ? a : a?.url,
                                  )
                                  .filter(Boolean) as string[];

                                return (
                                  <div className="flex items-center gap-2">
                                    {/* Open the preview dialog and show the first image */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openPreview(urls, 0)}
                                      title="Open in a new tab"
                                    >
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      Open
                                    </Button>

                                    {/* These use your existing download helpers which read previewImages */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={downloadCurrent}
                                      title="Download this image"
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download
                                    </Button>

                                    {urls.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        onClick={downloadAll}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download all
                                      </Button>
                                    )}
                                  </div>
                                );
                              })()
                            : "—"}
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
                                value={
                                  notesDraft[entry.id] ??
                                  entry.managerNotes ??
                                  ""
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNotesDraft((prev) => ({
                                    ...prev,
                                    [entry.id]: val,
                                  }));
                                  queueSaveNotes(entry.id, val); // debounced save
                                }}
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
      {/* Image preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Shift note images
              {previewImages.length
                ? ` (${previewIndex + 1}/${previewImages.length})`
                : ""}
            </DialogTitle>
          </DialogHeader>

          {previewImages.length > 0 ? (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={previewImages[previewIndex]}
                  alt={`attachment-${previewIndex + 1}`}
                  className="max-h-[70vh] w-full object-contain rounded border bg-black/5"
                  onClick={() =>
                    window.open(previewImages[previewIndex], "_blank")
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setPreviewIndex(
                      (i) =>
                        (i - 1 + previewImages.length) % previewImages.length,
                    )
                  }
                >
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">
                  {previewIndex + 1} / {previewImages.length}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPreviewIndex((i) => (i + 1) % previewImages.length)
                  }
                >
                  Next
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(previewImages[previewIndex], "_blank")
                  }
                  title="Open in a new tab"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCurrent}
                  title="Download this image"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>

                {previewImages.length > 1 && (
                  <Button variant="ghost" onClick={downloadAll}>
                    <Download className="h-4 w-4 mr-1" /> Download all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-6 gap-2">
                {previewImages.map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setPreviewIndex(i)}
                    className={`border rounded overflow-hidden ${
                      i === previewIndex ? "ring-2 ring-primary" : ""
                    }`}
                    title={`Open image ${i + 1}`}
                  >
                    <img
                      src={src}
                      alt={`thumb-${i + 1}`}
                      className="h-16 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No images to display.
            </p>
          )}
        </DialogContent>
      </Dialog>
      {/* Manual Time Entry Dialog */}
      <AlertDialog
        open={manualEntryDialogOpen}
        onOpenChange={setManualEntryDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Add Time Entry for{" "}
              {manualEntryDate ? format(manualEntryDate, "EEEE, MMMM d") : ""}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Job Location
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={manualEntryData.location}
                onChange={(e) =>
                  setManualEntryData({
                    ...manualEntryData,
                    location: e.target.value,
                  })
                }
              >
                <option value="">Select job...</option>
                {jobLocations.map((job) => (
                  <option key={job.id} value={job.name}>
                    {job.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Clock In</label>
              <Input
                type="time"
                value={manualEntryData.clockIn}
                onChange={(e) =>
                  setManualEntryData({
                    ...manualEntryData,
                    clockIn: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Clock Out
              </label>
              <Input
                type="time"
                value={manualEntryData.clockOut}
                onChange={(e) =>
                  setManualEntryData({
                    ...manualEntryData,
                    clockOut: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleManualEntrySave}
              disabled={
                !manualEntryData.clockIn ||
                !manualEntryData.clockOut ||
                !manualEntryData.location ||
                createEntryMutation.isPending
              }
            >
              {createEntryMutation.isPending ? "Creating..." : "Create Entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
