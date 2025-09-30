import { useState } from "react";
import { TimesheetRow } from "@/components/timesheet-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Lock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Timesheet } from "@shared/schema";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Timesheets() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: timesheets = [], isLoading } = useQuery<Timesheet[]>({
    queryKey: ['/api/timesheets'],
  });

  const timesheetEntries = timesheets.map(ts => ({
    id: ts.id,
    date: format(new Date(ts.periodEnd), 'MMM d, yyyy'),
    job: "Timesheet",
    subJob: `${format(new Date(ts.periodStart), 'MMM d')} - ${format(new Date(ts.periodEnd), 'MMM d')}`,
    clockIn: format(new Date(ts.periodStart), 'h:mm a'),
    clockOut: format(new Date(ts.periodEnd), 'h:mm a'),
    totalHours: parseFloat(ts.totalHours),
    status: ts.status as any,
    hasEdit: false,
    hasAttachments: false
  }));

  const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHours), 0);
  const approvedCount = timesheets.filter(ts => ts.status === 'approved').length;
  const pendingCount = timesheets.filter(ts => ts.status === 'pending' || ts.status === 'submitted').length;
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-timesheets">Timesheets</h1>
          <p className="text-muted-foreground">Review and approve time entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-lock-period">
            <Lock className="h-4 w-4 mr-2" />
            Lock Period
          </Button>
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button data-testid="button-approve-all">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve All
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Entries approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timesheets.length}</div>
            <p className="text-xs text-muted-foreground">All timesheets</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <CardDescription>
            <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Week ending Dec 15, 2024</Badge>
                <Badge variant="outline">Payroll Period: Biweekly</Badge>
              </div>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-timesheets"
                />
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Job / Sub-Job</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attachments</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheetEntries.map((entry) => (
                <TimesheetRow
                  key={entry.id}
                  {...entry}
                  onEdit={() => console.log(`Edit ${entry.id}`)}
                  onViewHistory={() => console.log(`View history ${entry.id}`)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
