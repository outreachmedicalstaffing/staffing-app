import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import type { TimeEntry, User } from "@shared/schema";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserTimesheets() {
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
