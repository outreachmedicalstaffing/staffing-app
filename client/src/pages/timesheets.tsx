import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import type { Timesheet, User, TimeEntry } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserTimesheetDetail } from "@/components/user-timesheet-detail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";

export default function Timesheets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("today");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery<Timesheet[]>({
    queryKey: ['/api/timesheets'],
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: timeEntries = [], isLoading: loadingEntries } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time/entries'],
  });

  // Calculate current week range
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekRangeDisplay = `${format(currentWeekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`;

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

  // Filter today's entries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.clockIn);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });

  // Group today's entries by user
  const todayByUser = users.map(user => {
    const userEntries = todayEntries.filter(entry => entry.userId === user.id);
    const latestEntry = userEntries[0];
    
    let totalHours = 0;
    let regularHours = 0;
    
    userEntries.forEach(entry => {
      if (entry.clockOut) {
        const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
        regularHours += hours;
      }
    });

    return {
      user,
      job: latestEntry?.location || '—',
      clockIn: latestEntry ? format(new Date(latestEntry.clockIn), 'h:mm a') : '—',
      clockOut: latestEntry?.clockOut ? format(new Date(latestEntry.clockOut), 'h:mm a') : '—',
      totalHours,
      regularHours,
      holidayHours: 0,
    };
  });

  const clockedInCount = todayByUser.filter(item => 
    item.clockIn !== '—' && item.clockOut === '—'
  ).length;

  // Group timesheets by user (filtered by selected week)
  const timesheetsByUser = users.map(user => {
    const userTimesheets = timesheets.filter(ts => {
      if (ts.userId !== user.id) return false;
      // Extract YYYY-MM-DD directly from ISO string to avoid timezone conversion
      const tsDateStr = ts.periodStart.toString().split('T')[0];
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      return tsDateStr >= weekStartStr && tsDateStr <= weekEndStr;
    });
    const totalHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHours), 0);
    const regularHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.regularHours || '0'), 0);
    const overtimeHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.overtimeHours || '0'), 0);
    
    return {
      user,
      totalHours,
      regularHours,
      overtimeHours,
      holidayHours: 0,
      totalPay: totalHours * 25,
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

  const filteredTodayData = todayByUser.filter(item => 
    item.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRegular = timesheetsByUser.reduce((sum, item) => sum + item.regularHours, 0);
  const totalHours = timesheetsByUser.reduce((sum, item) => sum + item.totalHours, 0);
  const totalPayroll = timesheetsByUser.reduce((sum, item) => sum + item.totalPay, 0);

  if (loadingTimesheets || loadingUsers || loadingEntries) {
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
          <h1 className="text-2xl font-semibold" data-testid="heading-timesheets">Time Clock</h1>
          <p className="text-muted-foreground">Review and approve employee time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
          <TabsTrigger value="timesheets" data-testid="tab-timesheets">Timesheets</TabsTrigger>
        </TabsList>

        {/* Today Tab */}
        <TabsContent value="today" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-lg font-semibold text-foreground">{clockedInCount}</span> employees clocked in today
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search"
                    className="pl-9 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-today"
                  />
                </div>
              </div>

              {/* Today's Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">First name</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Clock in</TableHead>
                      <TableHead>Clock out</TableHead>
                      <TableHead>Total hours</TableHead>
                      <TableHead>Regular</TableHead>
                      <TableHead>Holiday hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTodayData.map((item) => (
                      <TableRow key={item.user.id} data-testid={`row-today-${item.user.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.user.fullName}`} />
                              <AvatarFallback>{item.user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{item.user.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.job}</TableCell>
                        <TableCell>{item.clockIn}</TableCell>
                        <TableCell>{item.clockOut}</TableCell>
                        <TableCell>{item.totalHours > 0 ? item.totalHours.toFixed(2) : '—'}</TableCell>
                        <TableCell>{item.regularHours > 0 ? item.regularHours.toFixed(2) : '—'}</TableCell>
                        <TableCell>—</TableCell>
                      </TableRow>
                    ))}
                    {filteredTodayData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No clock entries for today
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timesheets Tab */}
        <TabsContent value="timesheets" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={goToPreviousWeek}
                      data-testid="button-previous-week"
                      title="Previous week"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToCurrentWeek}
                      data-testid="button-date-range"
                      className="min-w-[140px]"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {weekRangeDisplay}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={goToNextWeek}
                      data-testid="button-next-week"
                      title="Next week"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
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
              <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b">
                <div>
                  <p className="text-sm text-muted-foreground">Regular</p>
                  <p className="text-lg font-semibold">{totalRegular.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Total time off</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total paid hours</p>
                  <p className="text-lg font-semibold">{totalHours.toFixed(1)}</p>
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
                      <TableHead className="w-[200px]">First name</TableHead>
                      <TableHead>Total hours</TableHead>
                      <TableHead>Total pay</TableHead>
                      <TableHead>Admin approval</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Regular</TableHead>
                      <TableHead>Holiday</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow 
                        key={item.user.id} 
                        data-testid={`row-user-${item.user.id}`}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelectedUser(item.user)}
                      >
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
                        <TableCell>—</TableCell>
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
        </TabsContent>
      </Tabs>

      <UserTimesheetDetail 
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
