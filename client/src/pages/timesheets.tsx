import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Calendar, Filter, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import type { Timesheet, User, TimeEntry } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserTimesheetDetail } from "@/components/user-timesheet-detail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { Moon, CornerRightUp, CornerLeftDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function Timesheets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("today");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery<Timesheet[]>({
    queryKey: ['/api/timesheets'],
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: timeEntries = [], isLoading: loadingEntries } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time/entries'],
  });

  // Filter out owners and admins - only show staff/regular users
  const staffUsers = users.filter(user => {
    const role = user.role?.toLowerCase();
    return role !== 'owner' && role !== 'admin';
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
  // parse "9:27 AM" / "09:27 AM" / "12:00 AM" into minutes since midnight
  const parse12h = (t: string) => {
    const m = t?.trim().match(/^(\d{1,2}):(\d{2})\s?([AP]M)$/i);
    if (!m) return null;
    let [, hh, mm, ap] = m;
    let h = Number(hh) % 12;
    if (/pm/i.test(ap)) h += 12;
    return h * 60 + Number(mm);
  };

  const isMidnight = (t: string) => /^12:0?0\s?AM$/i.test((t || "").trim());
  const crossesMidnight = (start: string, end: string) => {
    const s = parse12h(start);
    const e = parse12h(end);
    if (s == null || e == null) return false;
    // if end is <= start in same-day minutes, it rolled into the next day
    return e <= s;
  };
  // Group today's entries by user (staff only)
  const todayByUser = staffUsers.map(user => {
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
      job: (latestEntry as any)?.program || latestEntry?.jobName || latestEntry?.location || '—',
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

  // Group timesheets by user (staff only, filtered by selected week)
  const timesheetsByUser = staffUsers.map(user => {
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

  const filteredTodayData = todayByUser
    .filter(item =>
      item.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Check if currently clocked in (has clock in but no clock out)
      const aClockedIn = a.clockIn !== '—' && a.clockOut === '—';
      const bClockedIn = b.clockIn !== '—' && b.clockOut === '—';

      // If one is clocked in and the other isn't, clocked in comes first
      if (aClockedIn && !bClockedIn) return -1;
      if (!aClockedIn && bClockedIn) return 1;

      // Otherwise, sort alphabetically by full name
      return a.user.fullName.localeCompare(b.user.fullName);
    });

  const totalRegular = timesheetsByUser.reduce((sum, item) => sum + item.regularHours, 0);
  const totalHours = timesheetsByUser.reduce((sum, item) => sum + item.totalHours, 0);
  const totalPayroll = timesheetsByUser.reduce((sum, item) => sum + item.totalPay, 0);

  // Checkbox selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUserIds = new Set(filteredData.map(item => item.user.id));
      setSelectedUserIds(allUserIds);
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const allSelected = filteredData.length > 0 && filteredData.every(item => selectedUserIds.has(item.user.id));
  const someSelected = filteredData.some(item => selectedUserIds.has(item.user.id)) && !allSelected;

  // Export button handler
  const handleExportClick = () => {
    // Check if any users are selected
    if (selectedUserIds.size === 0) {
      alert("Please select at least one user");
      return;
    }

    // Get selected users data
    const selectedUsers = filteredData.filter(item => selectedUserIds.has(item.user.id));

    // Generate HTML content
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Timesheets - ${weekRangeDisplay}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .report-title {
      font-size: 18px;
      color: #666;
    }
    .user-section {
      page-break-after: always;
      margin-bottom: 40px;
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 8px;
    }
    .user-header {
      background-color: #2563eb;
      color: white;
      padding: 15px;
      margin: -20px -20px 20px -20px;
      border-radius: 8px 8px 0 0;
    }
    .user-name {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .week-range {
      font-size: 14px;
      opacity: 0.9;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
    }
    .stat-box {
      text-align: center;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #2563eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 12px;
    }
    th {
      background-color: #2563eb;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #1d4ed8;
    }
    td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    tr:hover {
      background-color: #f3f4f6;
    }
    .no-entries {
      text-align: center;
      padding: 30px;
      color: #666;
      font-style: italic;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    @media print {
      .user-section {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Outreach Medical Staffing</div>
    <div class="report-title">Timesheet Report - Week of ${weekRangeDisplay}</div>
  </div>
`;

    // Generate content for each selected user
    selectedUsers.forEach((userData, index) => {
      // Get time entries for this user in the current week
      const userTimeEntries = timeEntries.filter(entry => {
        if (entry.userId !== userData.user.id) return false;
        const entryDate = new Date(entry.clockIn);
        return entryDate >= currentWeekStart && entryDate <= weekEnd;
      }).sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

      // Count worked days
      const workedDays = new Set(userTimeEntries.map(entry =>
        format(new Date(entry.clockIn), 'yyyy-MM-dd')
      )).size;

      htmlContent += `
  <div class="user-section">
    <div class="user-header">
      <div class="user-name">${userData.user.fullName}</div>
      <div class="week-range">Week of ${weekRangeDisplay}</div>
    </div>

    <div class="summary-stats">
      <div class="stat-box">
        <div class="stat-label">Regular Hours</div>
        <div class="stat-value">${userData.regularHours.toFixed(2)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Holiday Hours</div>
        <div class="stat-value">${userData.holidayHours.toFixed(2)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Paid Hours</div>
        <div class="stat-value">${userData.totalHours.toFixed(2)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Worked Days</div>
        <div class="stat-value">${workedDays}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Program</th>
          <th>Start</th>
          <th>End</th>
          <th>Total Hours</th>
          <th>Hourly Rate</th>
          <th>Daily Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
`;

      if (userTimeEntries.length > 0) {
        userTimeEntries.forEach(entry => {
          const clockIn = new Date(entry.clockIn);
          const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
          const hours = clockOut
            ? ((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)).toFixed(2)
            : '—';
          const hourlyRate = 25; // Default rate
          const dailyTotal = clockOut ? (parseFloat(hours) * hourlyRate).toFixed(2) : '—';

          htmlContent += `
        <tr>
          <td>${format(clockIn, 'EEE M/d/yyyy')}</td>
          <td>${(entry as any).program || '—'}</td>
          <td>${format(clockIn, 'h:mm a')}</td>
          <td>${clockOut ? format(clockOut, 'h:mm a') : '—'}</td>
          <td>${hours}</td>
          <td>$${hourlyRate.toFixed(2)}</td>
          <td>$${dailyTotal}</td>
          <td>${entry.clockOut ? 'Complete' : 'In Progress'}</td>
        </tr>
`;
        });
      } else {
        htmlContent += `
        <tr>
          <td colspan="8" class="no-entries">No time entries for this week</td>
        </tr>
`;
      }

      htmlContent += `
      </tbody>
    </table>
  </div>
`;
    });

    htmlContent += `
  <div class="footer">
    Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}
  </div>
</body>
</html>
`;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Timesheets_${format(currentWeekStart, 'MM-dd')}-to-${format(weekEnd, 'MM-dd')}_${format(new Date(), 'yyyy')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Clear selection after export
    setSelectedUserIds(new Set());
  };

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
          <h1 className="text-2xl font-semibold" data-testid="heading-timesheets">Timesheets</h1>
          <p className="text-muted-foreground">Review and approve employee time</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportClick}
            data-testid="button-export"
          >
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
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Program</TableHead>
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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all users"
                          data-testid="checkbox-select-all"
                          className={someSelected ? "data-[state=checked]:bg-primary" : ""}
                        />
                      </TableHead>
                      <TableHead className="w-[200px]">Name</TableHead>
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
                        className="hover-elevate"
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedUserIds.has(item.user.id)}
                            onCheckedChange={(checked) => handleSelectUser(item.user.id, checked as boolean)}
                            aria-label={`Select ${item.user.fullName}`}
                            data-testid={`checkbox-user-${item.user.id}`}
                          />
                        </TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onClick={() => setSelectedUser(item.user)}
                        >
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
