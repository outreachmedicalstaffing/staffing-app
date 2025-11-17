import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { TimeEntry, User, Timesheet } from "@shared/schema";
import { format, startOfWeek, endOfWeek, isWithinInterval, isSameDay, parseISO, addWeeks, subWeeks } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Download, Moon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export default function UserTimesheets() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("time-entries");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [payslipStatusFilter, setPayslipStatusFilter] = useState("all");
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time/entries"],
  });

  const { data: timesheets = [], isLoading: timesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  // Fetch holidays from settings
  const { data: holidaysData } = useQuery({
    queryKey: ["/api/settings/holidays"],
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("404")) return false;
      return failureCount < 3;
    },
  });

  const holidays = (holidaysData?.value || []) as Array<{ id: string; name: string; date: string }>;

  // Fetch pay rules from settings to get holiday multiplier
  const { data: payRulesData } = useQuery({
    queryKey: ["/api/settings/pay_rules"],
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("404")) return false;
      return failureCount < 3;
    },
  });

  const payRules = payRulesData?.value as any || {};
  const holidayRateType = payRules.holidayRateType || "additional";
  const holidayAdditionalRate = parseFloat(payRules.holidayAdditionalRate || "0.5");
  const holidayCustomRate = parseFloat(payRules.holidayCustomRate || "1.5");

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

  // Function to calculate holiday hours for a given timesheet period
  const calculateHolidayHours = (periodStart: string, periodEnd: string): number => {
    // Find holidays that fall within this pay period
    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);

    const holidaysInPeriod = holidays.filter((holiday) => {
      const holidayDate = parseISO(holiday.date);
      return isWithinInterval(holidayDate, { start: periodStartDate, end: periodEndDate });
    });

    // For each holiday, find time entries on that date and sum the hours
    let totalHolidayHours = 0;

    for (const holiday of holidaysInPeriod) {
      const holidayDate = parseISO(holiday.date);

      // Find all time entries for this user on this holiday
      const holidayEntries = timeEntries.filter((entry) => {
        if (entry.userId !== currentUser?.id) return false;
        const entryDate = new Date(entry.clockIn);
        return isSameDay(entryDate, holidayDate);
      });

      // Sum up hours from these entries
      for (const entry of holidayEntries) {
        if (entry.clockOut) {
          const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
          totalHolidayHours += hours;
        }
      }
    }

    return totalHolidayHours;
  };

  // Filter and sort timesheets for current user (most recent first)
  const allUserTimesheets = timesheets
    .filter((ts) => ts.userId === currentUser?.id)
    .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());

  // Navigation handlers for payslips week view
  const handlePreviousWeek = () => {
    setSelectedWeekStart(subWeeks(selectedWeekStart, 1));
  };

  const handleNextWeek = () => {
    setSelectedWeekStart(addWeeks(selectedWeekStart, 1));
  };

  // Calculate selected week end
  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });

  // Filter payslips by selected week and status
  const filteredPayslips = allUserTimesheets.filter((ts) => {
    const tsStart = new Date(ts.periodStart);
    const tsEnd = new Date(ts.periodEnd);

    // Check if the timesheet period overlaps with the selected week
    const matchesWeek = (
      (tsStart <= selectedWeekEnd && tsEnd >= selectedWeekStart) ||
      isSameDay(tsStart, selectedWeekStart) ||
      isSameDay(tsEnd, selectedWeekEnd)
    );

    // Check status filter
    const matchesStatus = payslipStatusFilter === "all" || (() => {
      if (payslipStatusFilter === "paid") {
        return ts.status === "exported";
      }
      if (payslipStatusFilter === "processing") {
        return ts.status === "submitted";
      }
      return ts.status === payslipStatusFilter;
    })();

    return matchesWeek && matchesStatus;
  });

  if (isLoading || timesheetsLoading) {
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
          Your timesheet and payslip information
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="time-entries" data-testid="tab-time-entries">
            Time Entries
          </TabsTrigger>
          <TabsTrigger value="payslips" data-testid="tab-payslips">
            Payslips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="time-entries" className="space-y-4 mt-6">
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
                    <TableHead className="w-12"></TableHead>
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
        </TabsContent>

        <TabsContent value="payslips" className="space-y-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              {/* Week Navigation Bar */}
              <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousWeek}
                    data-testid="button-previous-week"
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-medium min-w-[140px] text-center">
                    {format(selectedWeekStart, "M/d")} to {format(selectedWeekEnd, "M/d")}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextWeek}
                    data-testid="button-next-week"
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={payslipStatusFilter} onValueChange={setPayslipStatusFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-payslip-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payslips</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Stats */}
              {filteredPayslips.length > 0 && (() => {
                // Calculate totals across filtered payslips
                const totalHoursSum = filteredPayslips.reduce((sum, ts) =>
                  sum + parseFloat(ts.totalHours), 0
                );
                const totalRegularSum = filteredPayslips.reduce((sum, ts) =>
                  sum + parseFloat(ts.regularHours || '0'), 0
                );
                const totalHolidaySum = filteredPayslips.reduce((sum, ts) => {
                  const holidayHours = calculateHolidayHours(ts.periodStart, ts.periodEnd);
                  return sum + holidayHours;
                }, 0);

                // Calculate total pay across filtered payslips
                const defaultRate = currentUser?.defaultHourlyRate
                  ? parseFloat(currentUser.defaultHourlyRate)
                  : 0;

                const totalPaySum = filteredPayslips.reduce((sum, ts) => {
                  const regularHours = parseFloat(ts.regularHours || '0');
                  const holidayHours = calculateHolidayHours(ts.periodStart, ts.periodEnd);

                  const regularPay = regularHours * defaultRate;

                  let holidayPayRate = defaultRate;
                  if (holidayRateType === "additional") {
                    holidayPayRate = defaultRate * (1 + holidayAdditionalRate);
                  } else {
                    holidayPayRate = defaultRate * holidayCustomRate;
                  }
                  const holidayPay = holidayHours * holidayPayRate;

                  return sum + regularPay + holidayPay;
                }, 0);

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-lg font-semibold">{totalHoursSum.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Regular</p>
                      <p className="text-lg font-semibold">{totalRegularSum.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Holiday</p>
                      <p className="text-lg font-semibold">{totalHolidaySum.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pay</p>
                      <p className="text-lg font-semibold text-green-600">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(totalPaySum)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Payslips Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pay Period</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Regular</TableHead>
                      <TableHead>Holiday</TableHead>
                      <TableHead>Total Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayslips.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {allUserTimesheets.length === 0
                            ? "No payslips available yet"
                            : "No payslips found for this week"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayslips.map((timesheet) => {
                        // Calculate holiday hours for this pay period
                        const holidayHours = calculateHolidayHours(
                          timesheet.periodStart,
                          timesheet.periodEnd
                        );

                        // Calculate total pay based on user's default hourly rate
                        const defaultRate = currentUser?.defaultHourlyRate
                          ? parseFloat(currentUser.defaultHourlyRate)
                          : 0;

                        // Calculate regular pay
                        const regularPay = parseFloat(timesheet.regularHours) * defaultRate;

                        // Calculate holiday pay based on pay rules
                        let holidayPayRate = defaultRate;
                        if (holidayRateType === "additional") {
                          holidayPayRate = defaultRate * (1 + holidayAdditionalRate);
                        } else {
                          holidayPayRate = defaultRate * holidayCustomRate;
                        }
                        const holidayPay = holidayHours * holidayPayRate;

                        // Calculate total pay
                        const totalPay = regularPay + holidayPay;

                        // Format as currency
                        const formattedPay = new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(totalPay);

                        return (
                          <TableRow
                            key={timesheet.id}
                            className="cursor-pointer hover-elevate"
                            onClick={() => setViewingTimesheet(timesheet)}
                            data-testid={`row-payslip-${timesheet.id}`}
                          >
                            <TableCell className="font-medium">
                              {format(new Date(timesheet.periodStart), "MMM d")} - {format(new Date(timesheet.periodEnd), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>{parseFloat(timesheet.totalHours).toFixed(1)}</TableCell>
                            <TableCell>{parseFloat(timesheet.regularHours || '0').toFixed(1)}</TableCell>
                            <TableCell>{holidayHours.toFixed(1)}</TableCell>
                            <TableCell className="font-semibold text-green-600">{formattedPay}</TableCell>
                            <TableCell>
                              {timesheet.status === "pending" && (
                                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                  Pending
                                </Badge>
                              )}
                              {timesheet.status === "submitted" && (
                                <Badge variant="outline" className="border-blue-500 text-blue-700">
                                  Submitted
                                </Badge>
                              )}
                              {timesheet.status === "approved" && (
                                <Badge variant="outline" className="border-green-500 text-green-700">
                                  Approved
                                </Badge>
                              )}
                              {timesheet.status === "rejected" && (
                                <Badge variant="outline" className="border-red-500 text-red-700">
                                  Rejected
                                </Badge>
                              )}
                              {timesheet.status === "exported" && (
                                <Badge variant="outline" className="border-purple-500 text-purple-700">
                                  Paid
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingTimesheet(timesheet);
                                }}
                                data-testid={`button-view-payslip-${timesheet.id}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* Timesheet Details Dialog */}
      <Dialog
        open={!!viewingTimesheet}
        onOpenChange={(open) => !open && setViewingTimesheet(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timesheet Details</DialogTitle>
          </DialogHeader>
          {viewingTimesheet && (
            <div className="space-y-6">
              {/* Pay Period Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Pay Period: {format(new Date(viewingTimesheet.periodStart), "MMM d")} - {format(new Date(viewingTimesheet.periodEnd), "MMM d, yyyy")}
                  </h3>
                </div>
                <div>
                  {viewingTimesheet.status === "pending" && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      Pending
                    </Badge>
                  )}
                  {viewingTimesheet.status === "submitted" && (
                    <Badge variant="outline" className="border-blue-500 text-blue-700">
                      Submitted
                    </Badge>
                  )}
                  {viewingTimesheet.status === "approved" && (
                    <Badge variant="outline" className="border-green-500 text-green-700">
                      Approved
                    </Badge>
                  )}
                  {viewingTimesheet.status === "rejected" && (
                    <Badge variant="outline" className="border-red-500 text-red-700">
                      Rejected
                    </Badge>
                  )}
                  {viewingTimesheet.status === "exported" && (
                    <Badge variant="outline" className="border-purple-500 text-purple-700">
                      Paid
                    </Badge>
                  )}
                </div>
              </div>

              {/* Time Entries Table */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Time Entries</h4>
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
                    {timeEntries
                      .filter((entry) => {
                        if (entry.userId !== currentUser?.id) return false;
                        const entryDate = new Date(entry.clockIn);
                        return isWithinInterval(entryDate, {
                          start: new Date(viewingTimesheet.periodStart),
                          end: new Date(viewingTimesheet.periodEnd),
                        });
                      })
                      .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
                      .map((entry) => {
                        const hours = entry.clockOut
                          ? (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
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
                              {entry.clockOut ? format(new Date(entry.clockOut), "h:mm a") : "—"}
                            </TableCell>
                            <TableCell>
                              {entry.clockOut ? hours.toFixed(2) : "—"}
                            </TableCell>
                            <TableCell>{entry.program || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Regular Hours</Label>
                    <p className="text-lg font-semibold">
                      {parseFloat(viewingTimesheet.regularHours).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Holiday Hours</Label>
                    <p className="text-lg font-semibold">
                      {calculateHolidayHours(
                        viewingTimesheet.periodStart,
                        viewingTimesheet.periodEnd
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Total Hours</Label>
                    <p className="text-lg font-semibold">
                      {parseFloat(viewingTimesheet.totalHours).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Total Pay</Label>
                    <p className="text-lg font-semibold text-green-600">
                      {(() => {
                        const defaultRate = currentUser?.defaultHourlyRate
                          ? parseFloat(currentUser.defaultHourlyRate)
                          : 0;
                        const regularPay = parseFloat(viewingTimesheet.regularHours) * defaultRate;
                        const holidayHours = calculateHolidayHours(
                          viewingTimesheet.periodStart,
                          viewingTimesheet.periodEnd
                        );
                        let holidayPayRate = defaultRate;
                        if (holidayRateType === "additional") {
                          holidayPayRate = defaultRate * (1 + holidayAdditionalRate);
                        } else {
                          holidayPayRate = defaultRate * holidayCustomRate;
                        }
                        const holidayPay = holidayHours * holidayPayRate;
                        const totalPay = regularPay + holidayPay;
                        return new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(totalPay);
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setViewingTimesheet(null)}
                  data-testid="button-close-timesheet-details"
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
