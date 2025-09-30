import { ClockInterface } from "@/components/clock-interface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { User, TimeEntry } from "@shared/schema";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Clock() {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries'],
  });

  const activeEntry = timeEntries.find(entry => entry.status === 'active' && !entry.clockOut);
  const completedEntries = timeEntries
    .filter(entry => entry.clockOut)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
    .slice(0, 10);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-clock">Time Clock</h1>
          <p className="text-muted-foreground">Clock in and out of your shifts</p>
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
        <h1 className="text-2xl font-semibold" data-testid="heading-clock">Time Clock</h1>
        <p className="text-muted-foreground">Clock in and out of your shifts</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ClockInterface
            userName={user?.fullName}
            currentJob={activeEntry?.location || "No active shift"}
            currentSubJob={activeEntry?.notes || ""}
            activeEntry={activeEntry}
          />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
            <CardDescription>Your clock in/out history</CardDescription>
          </CardHeader>
          <CardContent>
            {completedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No time entries yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedEntries.map((entry) => {
                    const clockIn = new Date(entry.clockIn);
                    const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
                    const hours = clockOut 
                      ? (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - (entry.breakMinutes || 0) / 60
                      : 0;
                    
                    return (
                      <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                        <TableCell className="font-medium">{format(clockIn, 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-mono text-sm">{format(clockIn, 'h:mm a')}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {clockOut ? format(clockOut, 'h:mm a') : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">{hours.toFixed(2)}h</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.location || 'Unknown'}</Badge>
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
    </div>
  );
}
