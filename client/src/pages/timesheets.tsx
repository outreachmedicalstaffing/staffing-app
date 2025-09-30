import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Calendar, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import type { Timesheet, User } from "@shared/schema";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Timesheets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery<Timesheet[]>({
    queryKey: ['/api/timesheets'],
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Group timesheets by user
  const timesheetsByUser = users.map(user => {
    const userTimesheets = timesheets.filter(ts => ts.userId === user.id);
    const totalHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHours), 0);
    const regularHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.regularHours || '0'), 0);
    const overtimeHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.overtimeHours || '0'), 0);
    
    return {
      user,
      totalHours,
      regularHours,
      overtimeHours,
      paidTimeOff: 0, // TODO: Calculate from data
      totalPay: totalHours * 25, // TODO: Calculate based on actual pay rates
      status: userTimesheets.length > 0 ? userTimesheets[0].status : 'pending',
      issues: userTimesheets.filter(ts => ts.status === 'rejected').length
    };
  });

  const filteredData = timesheetsByUser.filter(item => {
    const matchesSearch = item.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.user.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRegular = timesheetsByUser.reduce((sum, item) => sum + item.regularHours, 0);
  const totalPaidTimeOff = timesheetsByUser.reduce((sum, item) => sum + item.paidTimeOff, 0);
  const totalPayroll = timesheetsByUser.reduce((sum, item) => sum + item.totalPay, 0);

  if (loadingTimesheets || loadingUsers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-timesheets">Timesheets</h1>
          <p className="text-muted-foreground">Review and approve employee time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" data-testid="button-date-range">
                <Calendar className="h-4 w-4 mr-2" />
                09/22 - 10/05
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b">
            <div>
              <p className="text-sm text-muted-foreground">Regular</p>
              <p className="text-lg font-semibold">{totalRegular.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Total time off</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid time off</p>
              <p className="text-lg font-semibold">{totalPaidTimeOff}</p>
              <p className="text-xs text-muted-foreground">Total paid hours</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total paid off</p>
              <p className="text-lg font-semibold">0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pay per date</p>
              <p className="text-lg font-semibold">${totalPayroll.toFixed(2)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">First name</TableHead>
                  <TableHead>Total hours</TableHead>
                  <TableHead>Paid time off</TableHead>
                  <TableHead>Total pay</TableHead>
                  <TableHead>Admin approval</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Regular</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.user.id} data-testid={`row-user-${item.user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.user.fullName}`} />
                          <AvatarFallback>{item.user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{item.user.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.totalHours > 0 ? item.totalHours.toFixed(1) : '—'}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{item.totalHours > 0 ? `$${item.totalPay.toFixed(2)}` : '—'}</TableCell>
                    <TableCell>
                      {item.status === 'approved' ? (
                        <Badge variant="secondary" data-testid={`badge-status-${item.user.id}`}>Approved</Badge>
                      ) : item.status === 'rejected' ? (
                        <Badge variant="destructive" data-testid={`badge-status-${item.user.id}`}>Rejected</Badge>
                      ) : (
                        <Badge variant="outline" data-testid={`badge-status-${item.user.id}`}>Open</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.issues > 0 ? item.issues : '—'}</TableCell>
                    <TableCell>{item.regularHours > 0 ? item.regularHours.toFixed(1) : '—'}</TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No timesheets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredData.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Rows per page: 10
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  1
                </Button>
                <Button variant="ghost" size="sm">
                  2
                </Button>
                <Button variant="ghost" size="sm">
                  3
                </Button>
                <Button variant="ghost" size="sm">
                  &gt;
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
