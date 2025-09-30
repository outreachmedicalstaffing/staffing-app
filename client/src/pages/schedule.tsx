import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings as SettingsIcon,
  ClipboardList,
  DollarSign,
  Plus,
  Search,
  Clock,
  Users as UsersIcon,
  FileText,
  CalendarClock,
  XCircle,
  Heart,
  X,
  Lightbulb,
  MoreHorizontal,
  MapPin,
  Paperclip,
  Info
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { User, Shift } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [showJobList, setShowJobList] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [editingJob, setEditingJob] = useState<typeof jobLocations[0] | null>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const unassignedUsers = users.slice(0, 10);

  const getShiftsForDay = (day: Date) => {
    return shifts.filter(s => {
      const shiftDate = new Date(s.startTime);
      return shiftDate.toDateString() === day.toDateString();
    });
  };

  const getUserForShift = (shift: Shift) => {
    return users[0];
  };

  const calculateDayStats = (day: Date) => {
    const dayShifts = getShiftsForDay(day);
    const scheduledLabor = dayShifts.length * 150;
    const actualLabor = dayShifts.filter(s => s.status === 'assigned').length * 150;
    return { scheduled: scheduledLabor, actual: actualLabor, shifts: dayShifts.length };
  };

  const calculateWeekStats = () => {
    const totalShifts = shifts.length;
    const totalHours = shifts.reduce((sum, s) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    const uniqueUsers = users.length;
    const totalLabor = shifts.length * 150;
    return { hours: totalHours.toFixed(1), shifts: totalShifts, users: uniqueUsers, labor: totalLabor };
  };

  const weekStats = calculateWeekStats();

  if (usersLoading || shiftsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="heading-schedule">
          <ClipboardList className="h-6 w-6 text-primary" />
          Schedule
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" data-testid="button-permissions">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Permissions
          </Button>
          <Button variant="outline" size="sm" data-testid="button-requests">
            <FileText className="h-4 w-4 mr-2" />
            Requests
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowJobList(true)} data-testid="button-job-list">
            <ClipboardList className="h-4 w-4 mr-2" />
            Job list
          </Button>
          <Button variant="outline" size="sm" data-testid="button-settings">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Top Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-40" data-testid="select-view-options">
                <SelectValue placeholder="View options" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week view</SelectItem>
                <SelectItem value="day">Day view</SelectItem>
                <SelectItem value="month">Month view</SelectItem>
              </SelectContent>
            </Select>

            <Select value="week">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek} data-testid="button-previous-week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-3 py-1 text-sm font-medium whitespace-nowrap">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
              </div>
              <Button variant="outline" size="icon" onClick={goToNextWeek} data-testid="button-next-week">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-add-menu">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem data-testid="menu-add-single-shift">
                  <Plus className="h-4 w-4 mr-2" />
                  Add single shift
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-add-from-templates">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Add from shift templates
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-add-unavailability">
                  <XCircle className="h-4 w-4 mr-2" />
                  Add unavailability
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-add-work-preference">
                  <Heart className="h-4 w-4 mr-2" />
                  Add work preference
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Left Sidebar */}
        <div className="w-64 space-y-4 flex-shrink-0">
          {/* Labor & Sales */}
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Labor & Sales</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor</span>
                <span className="font-medium">Scheduled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual</span>
                <span className="font-medium">${weekStats.labor}</span>
              </div>
            </div>
          </Card>

          {/* Daily Info */}
          <Card className="p-3">
            <div className="text-sm font-medium mb-2">Daily info</div>
          </Card>

          {/* Unassigned Shifts */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Unassigned shifts</span>
              <Badge variant="secondary" className="text-xs">{unassignedUsers.length}</Badge>
            </div>
            <div className="space-y-2">
              {unassignedUsers.map((user) => {
                const initials = user.fullName.split(' ').map(n => n[0]).join('');
                return (
                  <div key={user.id} className="flex items-center gap-2" data-testid={`unassigned-user-${user.id}`}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">0h - $0</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Weekly Summary */}
          <Card className="p-3">
            <div className="text-sm font-medium mb-3">Weekly summary</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  <span>Hours</span>
                </div>
                <div className="font-medium">{weekStats.hours}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <ClipboardList className="h-3 w-3" />
                  <span>Shifts</span>
                </div>
                <div className="font-medium">{weekStats.shifts}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <UsersIcon className="h-3 w-3" />
                  <span>Users</span>
                </div>
                <div className="font-medium">{weekStats.users}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Labor</span>
                </div>
                <div className="font-medium">${weekStats.labor}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar Grid */}
        <Card className="flex-1 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day, idx) => {
                const stats = calculateDayStats(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={idx}
                    className={`border-r last:border-r-0 p-3 ${isToday ? 'bg-primary/5' : ''}`}
                    data-testid={`day-column-${idx}`}
                  >
                    <div className="text-center">
                      <div className="text-sm font-medium">
                        {format(day, 'EEE M/d')}
                      </div>
                      {isToday && (
                        <Badge variant="default" className="text-xs mt-1">Today</Badge>
                      )}
                      <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                        <span>0</span>
                        <span>·</span>
                        <span>$0</span>
                        <span>·</span>
                        <span>0</span>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Labor</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scheduled</span>
                        <span className="font-medium">${stats.scheduled}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual</span>
                        <span className="font-medium">${stats.actual}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map((day, idx) => {
                const dayShifts = getShiftsForDay(day);
                
                return (
                  <div
                    key={idx}
                    className="border-r last:border-r-0 p-2 space-y-2"
                    data-testid={`day-shifts-${idx}`}
                  >
                    {dayShifts.map((shift) => {
                      const user = getUserForShift(shift);
                      const startTime = format(new Date(shift.startTime), 'h:mma');
                      const endTime = format(new Date(shift.endTime), 'h:mma');
                      
                      return (
                        <div
                          key={shift.id}
                          className="rounded-md p-2 text-xs bg-primary text-primary-foreground cursor-pointer hover-elevate"
                          data-testid={`shift-${shift.id}`}
                        >
                          <div className="font-medium">
                            {startTime} - {endTime}
                          </div>
                          {user && (
                            <div className="mt-1 truncate">
                              {user.fullName}
                            </div>
                          )}
                          {shift.location && (
                            <div className="mt-1 text-primary-foreground/80 truncate">
                              {shift.location}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Placeholder for unavailable/prefer to work */}
                    {idx === 3 && (
                      <>
                        <div className="rounded-md p-2 text-xs bg-destructive/10 text-destructive border border-destructive/20">
                          <div className="font-medium">Unavailable</div>
                          <div className="mt-1">All day</div>
                        </div>
                        <div className="rounded-md p-2 text-xs bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                          <div className="font-medium">Prefer to work</div>
                          <div className="mt-1">6:00a - 7:00p</div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Summary Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Hours:</span>
              <span className="font-medium">{weekStats.hours}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Shifts:</span>
              <span className="font-medium">{weekStats.shifts}</span>
            </div>
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Users:</span>
              <span className="font-medium">{weekStats.users}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Labor:</span>
              <span className="font-medium">${weekStats.labor.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sales:</span>
              <span className="font-medium">--</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Job Sheet */}
      <Sheet open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <SheetTitle>Edit Job</SheetTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-edit-job-settings">
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </SheetHeader>

          {editingJob && (
            <div className="space-y-6">
              {/* Job Name and Code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job-name">
                    Job name <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="job-name" 
                    defaultValue={editingJob.name}
                    data-testid="input-job-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-code" className="flex items-center gap-1">
                    Code
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="job-code" 
                      placeholder="Type here"
                      data-testid="input-job-code"
                    />
                    <button
                      type="button"
                      className="h-9 w-9 rounded border flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: editingJob.color }}
                      data-testid="button-color-picker"
                    >
                      <div className="h-6 w-6 rounded" style={{ backgroundColor: editingJob.color }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="job-description">Description</Label>
                <Textarea
                  id="job-description"
                  rows={10}
                  placeholder="Enter job description..."
                  defaultValue="Overlapping Shift Start times and End times: Dayshift hours are 8a-8p and Nightshift hours are 8p-8a, unless modified by scheduling/supervision/management determining and scheduling later coverage hours or Patient need. Contractors should start at scheduled start times, unless direct patient care requires a 2 person assist. CC documentation must reflect the direct assigned patient, based on the tech Plan. Contractor should end at scheduled end times. Reports should be short, sweet, and to the point. Remember the shift has 12 hrs to read documentation from off-going shifts.

**Please upload all of your notes in this app by the end of your shift.
If you have any trouble uploading your notes, use the Adobe Scan app on your phone to scan all of your notes and email them to staffing@outreachmedicalstaffing.com"
                  data-testid="textarea-job-description"
                />
              </div>

              {/* Attach Button */}
              <Button variant="ghost" className="text-primary p-0 h-auto hover:bg-transparent" data-testid="button-attach">
                <Paperclip className="h-4 w-4 mr-2" />
                Attach
              </Button>

              {/* Qualified Section */}
              <div className="space-y-2">
                <Label>Qualified</Label>
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="text-sm">
                    <span className="font-medium">3 users</span> are qualified for this job
                  </span>
                  <Button variant="ghost" className="text-primary p-0 h-auto hover:bg-transparent" data-testid="button-edit-qualified">
                    Edit
                  </Button>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="job-address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="job-address" 
                    placeholder="Type here"
                    className="pl-9"
                    data-testid="input-job-address"
                  />
                </div>
              </div>

              {/* Use in clocks and Use in schedules */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="use-in-clocks">Use in clocks:</Label>
                  <Select defaultValue="time-clock">
                    <SelectTrigger id="use-in-clocks" data-testid="select-use-in-clocks">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time-clock">Time Clock</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="use-in-schedules">Use in schedules:</Label>
                  <Select defaultValue="schedule">
                    <SelectTrigger id="use-in-schedules" data-testid="select-use-in-schedules">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Job List Dialog */}
      <Dialog open={showJobList} onOpenChange={setShowJobList}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                Job list
                <span className="text-muted-foreground font-normal text-sm cursor-pointer">ⓘ</span>
              </DialogTitle>
              <Button variant="ghost" className="text-primary p-0 h-auto hover:bg-transparent" data-testid="link-shift-layers">
                Shift layers
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {/* Info Message */}
            <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="text-muted-foreground">These are the resources assigned to this schedule. You can view and manage each resource in your account from the </span>
                <Button variant="ghost" className="text-primary p-0 h-auto text-sm hover:bg-transparent underline" data-testid="link-job-sidebar">
                  Job Sidebar tab
                </Button>
                <span className="text-muted-foreground">.</span>
              </div>
            </div>

            {/* Search and Create */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="flex-shrink-0" data-testid="button-job-more">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  className="pl-9"
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  data-testid="input-job-search"
                />
              </div>
              <Button variant="default" size="sm" data-testid="button-create-job">
                <Plus className="h-4 w-4 mr-2" />
                Create new
              </Button>
            </div>

            {/* Job List */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {jobLocations
                .filter(job => job.name.toLowerCase().includes(jobSearchQuery.toLowerCase()))
                .map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-md hover-elevate group"
                    data-testid={`job-item-${job.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-3 w-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: job.color }}
                      />
                      <span className="text-sm">{job.name}</span>
                      {job.subItems && (
                        <Badge variant="secondary" className="text-xs">
                          <span className="text-muted-foreground">↳</span> {job.subItems} job sub items
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => setEditingJob(job)}
                        data-testid={`button-job-settings-${job.id}`}
                      >
                        <SettingsIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-job-more-${job.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
