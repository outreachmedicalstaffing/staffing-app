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
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from "date-fns";
import { Moon, CornerRightUp, CornerLeftDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
export default function Timesheets() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("today");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
    if (selectedUserIds.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user to export",
        variant: "destructive",
      });
      return;
    }
    setShowExportModal(true);
  };

  // Generate PDF function
  const generatePDF = () => {
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF();

      // Company header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Outreach Medical Staffing", 105, 20, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`Timesheet Report`, 105, 30, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Week of ${weekRangeDisplay}`, 105, 38, { align: "center" });

      let yPosition = 50;

      // Get selected users data
      const selectedUsersData = filteredData.filter(item => selectedUserIds.has(item.user.id));

      selectedUsersData.forEach((userData, index) => {
        // Add page break if needed
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // User header
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Employee: ${userData.user.fullName}`, 20, yPosition);
        yPosition += 8;

        // User summary
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Hours: ${userData.totalHours.toFixed(2)}`, 20, yPosition);
        doc.text(`Regular: ${userData.regularHours.toFixed(2)}`, 80, yPosition);
        doc.text(`Total Pay: $${userData.totalPay.toFixed(2)}`, 140, yPosition);
        yPosition += 10;

        // Get time entries for this user in the current week
        const userTimeEntries = timeEntries.filter(entry => {
          if (entry.userId !== userData.user.id) return false;
          const entryDate = new Date(entry.clockIn);
          return isWithinInterval(entryDate, { start: currentWeekStart, end: weekEnd });
        }).sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

        // Time entries table
        if (userTimeEntries.length > 0) {
          const tableData = userTimeEntries.map(entry => {
            const hours = entry.clockOut
              ? ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)).toFixed(2)
              : "—";

            return [
              format(new Date(entry.clockIn), "EEE M/d/yyyy"),
              (entry as any).program || "—",
              format(new Date(entry.clockIn), "h:mm a"),
              entry.clockOut ? format(new Date(entry.clockOut), "h:mm a") : "—",
              hours
            ];
          });

          (doc as any).autoTable({
            startY: yPosition,
            head: [["Date", "Program", "Clock In", "Clock Out", "Hours"]],
            body: tableData,
            theme: "grid",
            headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            margin: { left: 20, right: 20 },
            tableWidth: 'auto',
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;
        } else {
          doc.text("No time entries for this week", 20, yPosition);
          yPosition += 15;
        }
      });

      // Save the PDF
      const fileName = `Timesheets_${format(currentWeekStart, "MM-dd")}-to-${format(weekEnd, "MM-dd")}_${format(new Date(), "yyyy")}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Generated",
        description: "Timesheet PDF has been downloaded successfully",
      });

      setShowExportModal(false);
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
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
            data-testid="button-export"
            onClick={handleExportClick}
            disabled={selectedUserIds.size === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export {selectedUserIds.size > 0 && `(${selectedUserIds.size})`}
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

      {/* Export PDF Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Timesheets to PDF</DialogTitle>
            <DialogDescription>
              Review the selected users and their timesheet data for the week of {weekRangeDisplay}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Selected Employees ({selectedUserIds.size})</h3>
              <div className="space-y-3">
                {filteredData
                  .filter(item => selectedUserIds.has(item.user.id))
                  .map(item => (
                    <div
                      key={item.user.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.user.fullName}`} />
                          <AvatarFallback>{item.user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.user.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.totalHours.toFixed(2)} hours
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          ${item.totalPay.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Pay</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
              <p className="text-sm text-muted-foreground">
                The PDF will include detailed time entries, hours breakdown, and pay information for all selected employees.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
              disabled={isGeneratingPdf}
            >
              Cancel
            </Button>
            <Button
              onClick={generatePDF}
              disabled={isGeneratingPdf}
              data-testid="button-download-pdf"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
