import { ClockInterface } from "@/components/clock-interface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Clock() {
  const recentEntries = [
    { id: 1, date: "Dec 12, 2024", clockIn: "7:02 AM", clockOut: "7:15 PM", hours: 12.22, job: "Central Florida" },
    { id: 2, date: "Dec 11, 2024", clockIn: "7:00 AM", clockOut: "7:10 PM", hours: 12.17, job: "Treasure Coast" },
    { id: 3, date: "Dec 10, 2024", clockIn: "6:58 AM", clockOut: "7:05 PM", hours: 12.12, job: "Central Florida" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-clock">Time Clock</h1>
        <p className="text-muted-foreground">Clock in and out of your shifts</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ClockInterface
            userName="John Doe"
            currentJob="Central Florida"
            currentSubJob="7P-7A"
          />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
            <CardDescription>Your clock in/out history</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Job</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                    <TableCell className="font-medium">{entry.date}</TableCell>
                    <TableCell className="font-mono text-sm">{entry.clockIn}</TableCell>
                    <TableCell className="font-mono text-sm">{entry.clockOut}</TableCell>
                    <TableCell className="font-semibold">{entry.hours.toFixed(2)}h</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.job}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
