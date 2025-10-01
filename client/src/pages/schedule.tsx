import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Info,
  Pencil,
  Trash2,
  Moon
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, addDays, startOfWeek, endOfWeek, parse, differenceInMinutes } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, Shift, ShiftTemplate } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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
  const [showShiftTemplates, setShowShiftTemplates] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [showAddShift, setShowAddShift] = useState(false);
  const [shiftFormData, setShiftFormData] = useState({
    date: new Date(),
    allDay: false,
    startTime: '8:00am',
    endTime: '8:00pm',
    shiftTitle: '',
    job: '',
    selectedUsers: [] as string[],
    address: '',
    note: '',
    timezone: 'America/New_York',
    attachments: [] as File[],
  });
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{
    formatted: string;
    lat: number;
    lon: number;
  }>>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Helper function to detect night shifts
  const isNightShift = (startTime: Date, endTime: Date) => {
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    // Consider it a night shift if it starts after 7pm or ends before 7am
    // or if end time is before start time (crosses midnight)
    return startHour >= 19 || endHour <= 7 || endTime < startTime;
  };

  // Calculate shift duration
  const calculateDuration = () => {
    if (shiftFormData.allDay) {
      return "All day";
    }
    try {
      const start = parse(shiftFormData.startTime, 'h:mma', new Date());
      const end = parse(shiftFormData.endTime, 'h:mma', new Date());
      let minutes = differenceInMinutes(end, start);
      if (minutes < 0) minutes += 24 * 60; // Handle overnight shifts
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } catch {
      return "";
    }
  };

  // Address autocomplete with Geoapify
  const addressInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
      if (!apiKey) {
        console.warn('Geoapify API key not configured');
        return;
      }

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${apiKey}&limit=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        const suggestions = data.features?.map((feature: any) => ({
          formatted: feature.properties.formatted,
          lat: feature.properties.lat,
          lon: feature.properties.lon,
        })) || [];
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(suggestions.length > 0);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    }
  };

  const handleAddressChange = (value: string) => {
    setShiftFormData({ ...shiftFormData, address: value });
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 300);
  };

  const selectAddress = (address: string) => {
    setShiftFormData({ ...shiftFormData, address });
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

  // File attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setShiftFormData({
        ...shiftFormData,
        attachments: [...shiftFormData.attachments, ...newFiles]
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setShiftFormData({
      ...shiftFormData,
      attachments: shiftFormData.attachments.filter((_, i) => i !== index)
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handlePublishShift = () => {
    // Validate required fields
    if (!shiftFormData.shiftTitle.trim()) {
      toast({ 
        title: "Shift title is required", 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Convert date and time strings to timestamps
      let startTime: Date;
      let endTime: Date;

      if (shiftFormData.allDay) {
        // For all-day shifts, set start to midnight and end to 11:59 PM
        startTime = new Date(shiftFormData.date);
        startTime.setHours(0, 0, 0, 0);
        
        endTime = new Date(shiftFormData.date);
        endTime.setHours(23, 59, 59, 999);
      } else {
        // Parse time strings and combine with date
        const startTimeParsed = parse(shiftFormData.startTime, 'h:mma', shiftFormData.date);
        const endTimeParsed = parse(shiftFormData.endTime, 'h:mma', shiftFormData.date);
        
        startTime = startTimeParsed;
        endTime = endTimeParsed;

        // Handle overnight shifts
        if (endTime < startTime) {
          endTime = addDays(endTime, 1);
        }
      }

      // Prepare shift data
      const shiftData = {
        title: shiftFormData.shiftTitle,
        jobName: shiftFormData.job || null,
        startTime: startTime,
        endTime: endTime,
        location: shiftFormData.address || null,
        notes: shiftFormData.note || null,
        status: 'open',
        color: jobLocations.find(j => j.name === shiftFormData.job)?.color || null,
      };

      createShiftMutation.mutate(shiftData);
    } catch (error) {
      toast({ 
        title: "Invalid date or time format", 
        description: "Please check your inputs and try again",
        variant: "destructive" 
      });
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const { toast } = useToast();

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  const { data: shiftTemplates = [], isLoading: templatesLoading } = useQuery<ShiftTemplate[]>({
    queryKey: ['/api/shift-templates'],
  });

  const { data: shiftAssignments = [] } = useQuery<any[]>({
    queryKey: ['/api/shift-assignments'],
  });

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any): Promise<Shift> => {
      const response = await apiRequest('POST', '/api/shifts', shiftData);
      return response.json();
    },
    onSuccess: async (shift: Shift) => {
      // Assign users to the shift
      for (const userId of shiftFormData.selectedUsers) {
        try {
          await apiRequest('POST', `/api/shifts/${shift.id}/assign`, {
            userId,
            shiftId: shift.id,
          });
        } catch (error) {
          console.error('Error assigning user to shift:', error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({ title: "Shift created successfully" });
      
      // Reset form and close dialog
      setShiftFormData({
        date: new Date(),
        allDay: false,
        startTime: '8:00am',
        endTime: '8:00pm',
        shiftTitle: '',
        job: '',
        selectedUsers: [],
        address: '',
        note: '',
        timezone: 'America/New_York',
        attachments: [],
      });
      setShowAddShift(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create shift", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { title: string; startTime: string; endTime: string; color: string; description?: string }) => {
      return apiRequest('POST', '/api/shift-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-templates'] });
      setEditingTemplate(null);
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ title: string; startTime: string; endTime: string; color: string; description?: string }> }) => {
      return apiRequest('PATCH', `/api/shift-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-templates'] });
      setEditingTemplate(null);
      toast({ title: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/shift-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shift-templates'] });
      setDeletingTemplateId(null);
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
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
    const assignment = shiftAssignments.find(a => a.shiftId === shift.id);
    if (!assignment) return null;
    return users.find(u => u.id === assignment.userId) || null;
  };

  // Get all users assigned to a shift (for multi-assignee shifts)
  const getUsersForShift = (shift: Shift) => {
    const assignments = shiftAssignments.filter(a => a.shiftId === shift.id);
    return assignments
      .map(a => users.find(u => u.id === a.userId))
      .filter((u): u is User => u !== undefined);
  };

  const getShiftsForUserAndDay = (userId: string, day: Date) => {
    return shifts.filter(s => {
      const shiftDate = new Date(s.startTime);
      const assignment = shiftAssignments.find(a => a.shiftId === s.id && a.userId === userId);
      return assignment && shiftDate.toDateString() === day.toDateString();
    });
  };

  // Calculate hours for a shift
  const calculateShiftHours = (shift: Shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  // Calculate labor cost for a shift based on ALL assigned users' hourly rates
  // For multi-assignee shifts, this sums the labor cost for each assigned user
  const calculateShiftLabor = (shift: Shift) => {
    const assignedUsers = getUsersForShift(shift);
    if (assignedUsers.length === 0) return 0;
    
    const hours = calculateShiftHours(shift);
    
    // Sum labor cost for all assigned users
    return assignedUsers.reduce((totalLabor, user) => {
      const hourlyRate = parseFloat(user.hourlyRate || '25.00');
      return totalLabor + (hours * hourlyRate);
    }, 0);
  };

  // Calculate labor cost for a specific user on a specific shift
  const calculateUserShiftLabor = (userId: string, shift: Shift) => {
    const user = users.find(u => u.id === userId);
    if (!user) return 0;
    const hours = calculateShiftHours(shift);
    const hourlyRate = parseFloat(user.hourlyRate || '25.00');
    return hours * hourlyRate;
  };

  // Calculate stats for a specific user for the week
  const calculateUserWeekStats = (userId: string) => {
    const userShifts = shifts.filter(s => {
      const assignment = shiftAssignments.find(a => a.shiftId === s.id && a.userId === userId);
      const shiftDate = new Date(s.startTime);
      return assignment && shiftDate >= weekStart && shiftDate <= weekEnd;
    });
    
    const hours = userShifts.reduce((sum, s) => sum + calculateShiftHours(s), 0);
    const labor = userShifts.reduce((sum, s) => sum + calculateUserShiftLabor(userId, s), 0);
    
    return { hours, labor };
  };

  const calculateDayStats = (day: Date) => {
    const dayShifts = getShiftsForDay(day);
    
    const scheduledLabor = dayShifts.reduce((sum, shift) => {
      return sum + calculateShiftLabor(shift);
    }, 0);
    
    const actualLabor = dayShifts
      .filter(s => s.status === 'assigned' || s.status === 'in-progress' || s.status === 'completed')
      .reduce((sum, shift) => sum + calculateShiftLabor(shift), 0);
    
    const hours = dayShifts.reduce((sum, shift) => sum + calculateShiftHours(shift), 0);
    
    return { scheduled: scheduledLabor, actual: actualLabor, shifts: dayShifts.length, hours };
  };

  const calculateWeekStats = () => {
    const weekShifts = shifts.filter(s => {
      const shiftDate = new Date(s.startTime);
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });
    
    const totalShifts = weekShifts.length;
    const totalHours = weekShifts.reduce((sum, s) => sum + calculateShiftHours(s), 0);
    
    const assignedUsers = new Set(
      shiftAssignments
        .filter(a => weekShifts.some(s => s.id === a.shiftId))
        .map(a => a.userId)
    );
    
    const totalLabor = weekShifts.reduce((sum, s) => sum + calculateShiftLabor(s), 0);
    
    return { 
      hours: totalHours.toFixed(1), 
      shifts: totalShifts, 
      users: assignedUsers.size, 
      labor: totalLabor 
    };
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
                <DropdownMenuItem onClick={() => setShowAddShift(true)} data-testid="menu-add-single-shift">
                  <Plus className="h-4 w-4 mr-2" />
                  Add single shift
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowShiftTemplates(true)} data-testid="menu-add-from-templates">
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
                <span className="font-medium">${weekStats.labor.toFixed(2)}</span>
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
              <Badge variant="secondary" className="text-xs">
                {shifts.filter(s => !shiftAssignments.some(a => a.shiftId === s.id)).length}
              </Badge>
            </div>
            <div className="space-y-2">
              {unassignedUsers.map((user) => {
                const initials = user.fullName.split(' ').map(n => n[0]).join('');
                const userStats = calculateUserWeekStats(user.id);
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
                      <div className="text-xs text-muted-foreground">
                        {userStats.hours.toFixed(1)}h - ${userStats.labor.toFixed(2)}
                      </div>
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
                <div className="font-medium">${weekStats.labor.toFixed(2)}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar Grid */}
        <Card className="flex-1 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Calendar Header */}
            <div className="grid grid-cols-8 border-b">
              {/* Empty cell for user column */}
              <div className="border-r p-3 bg-muted/30"></div>
              
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
                        <span>{stats.hours.toFixed(1)}h</span>
                        <span>·</span>
                        <span>${stats.scheduled.toFixed(0)}</span>
                        <span>·</span>
                        <span>{stats.shifts}</span>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Labor</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scheduled</span>
                        <span className="font-medium">${stats.scheduled.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual</span>
                        <span className="font-medium">${stats.actual.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Body - User Rows */}
            <div>
              {users.map((user) => (
                <div key={user.id} className="grid grid-cols-8 border-b last:border-b-0">
                  {/* User Column */}
                  <div className="border-r p-2 flex items-center gap-2 bg-muted/30">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {user.fullName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(() => {
                          const stats = calculateUserWeekStats(user.id);
                          return `${stats.hours.toFixed(1)}h - $${stats.labor.toFixed(0)}`;
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Day Columns */}
                  {weekDays.map((day, dayIdx) => {
                    const userShifts = getShiftsForUserAndDay(user.id, day);
                    
                    return (
                      <div
                        key={dayIdx}
                        className="border-r last:border-r-0 p-2 min-h-[80px] space-y-1"
                        data-testid={`user-${user.id}-day-${dayIdx}`}
                      >
                        {userShifts.map((shift) => {
                          const startTime = format(new Date(shift.startTime), 'h:mma');
                          const endTime = format(new Date(shift.endTime), 'h:mma');
                          const isNight = isNightShift(new Date(shift.startTime), new Date(shift.endTime));
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => setEditingShift(shift)}
                              className="rounded p-2 text-xs cursor-pointer hover-elevate"
                              style={{
                                backgroundColor: shift.color || '#3b82f6',
                                color: 'white'
                              }}
                              data-testid={`shift-${shift.id}`}
                            >
                              <div className="font-medium text-white flex items-center gap-1">
                                {startTime} - {endTime}
                                {isNight && <Moon className="h-3 w-3 flex-shrink-0" />}
                              </div>
                              <div className="mt-0.5 text-white/90 text-[10px] truncate">
                                {shift.jobName && `${shift.jobName} • `}{shift.title}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
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

      {/* Edit Shift Template Sheet */}
      <Sheet open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{editingTemplate?.id ? 'Edit Shift Template' : 'New Shift Template'}</SheetTitle>
          </SheetHeader>

          {editingTemplate && (
            <div className="space-y-6">
              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">
                    Start time <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="start-time" 
                    placeholder="8:00am"
                    defaultValue={editingTemplate.startTime}
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">
                    End time <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="end-time" 
                    placeholder="8:00pm"
                    defaultValue={editingTemplate.endTime}
                    data-testid="input-end-time"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="template-title">
                  Shift title <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="template-title" 
                  placeholder="Day shift - facility"
                  defaultValue={editingTemplate.title}
                  data-testid="input-template-title"
                />
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <Label htmlFor="template-color">
                  Color
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="template-color" 
                    type="color"
                    defaultValue={editingTemplate.color}
                    className="w-20 h-9 cursor-pointer"
                    data-testid="input-template-color"
                  />
                  <span className="text-sm text-muted-foreground">{editingTemplate.color}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="template-description">Additional notes</Label>
                <Textarea
                  id="template-description"
                  rows={4}
                  placeholder="Optional description or notes..."
                  defaultValue={editingTemplate.description || ""}
                  data-testid="textarea-template-description"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={() => {
                    const startTime = (document.getElementById('start-time') as HTMLInputElement).value;
                    const endTime = (document.getElementById('end-time') as HTMLInputElement).value;
                    const title = (document.getElementById('template-title') as HTMLInputElement).value;
                    const color = (document.getElementById('template-color') as HTMLInputElement).value;
                    const description = (document.getElementById('template-description') as HTMLTextAreaElement).value;

                    if (!startTime || !endTime || !title) {
                      toast({ title: "Please fill in all required fields", variant: "destructive" });
                      return;
                    }

                    if (editingTemplate.id) {
                      updateTemplateMutation.mutate({
                        id: editingTemplate.id,
                        data: { title, startTime, endTime, color, description: description || undefined }
                      });
                    } else {
                      createTemplateMutation.mutate({
                        title,
                        startTime,
                        endTime,
                        color,
                        description: description || undefined
                      });
                    }
                  }}
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  data-testid="button-save-template"
                >
                  {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? "Saving..." : "Save Template"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingTemplate(null)}
                  data-testid="button-cancel-template"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Template Confirmation */}
      <AlertDialog open={!!deletingTemplateId} onOpenChange={(open) => !open && setDeletingTemplateId(null)}>
        <AlertDialogContent data-testid="dialog-delete-template">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shift template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingTemplateId) {
                  deleteTemplateMutation.mutate(deletingTemplateId);
                }
              }}
              disabled={deleteTemplateMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shift Templates Dialog */}
      <Dialog open={showShiftTemplates} onOpenChange={setShowShiftTemplates}>
        <DialogContent className="max-w-sm p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="text-base">Shifts</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="px-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Drag and drop to the schedule</span>
                <Info className="h-4 w-4" />
              </div>
            </div>

            {/* Search */}
            <div className="px-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  className="pl-9"
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  data-testid="input-template-search"
                />
              </div>
            </div>

            {/* Templates List */}
            <div className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto">
              {shiftTemplates
                .filter(template => {
                  const timeRange = `${template.startTime} - ${template.endTime}`;
                  const query = templateSearchQuery.toLowerCase();
                  return timeRange.toLowerCase().includes(query) ||
                         template.title.toLowerCase().includes(query) ||
                         (template.description && template.description.toLowerCase().includes(query));
                })
                .map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 rounded-md border bg-background hover-elevate cursor-pointer group"
                    style={{ borderLeftWidth: '3px', borderLeftColor: template.color }}
                    data-testid={`template-item-${template.id}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{template.startTime} - {template.endTime}</div>
                      <div className="text-sm text-muted-foreground mt-1">{template.title}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(template);
                        }}
                        data-testid={`button-edit-template-${template.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTemplateId(template.id);
                        }}
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Add Template Link */}
            <div className="px-4 pb-4">
              <Button 
                variant="ghost" 
                className="text-primary p-0 h-auto hover:bg-transparent" 
                onClick={() => {
                  setEditingTemplate({
                    id: "",
                    title: "",
                    startTime: "",
                    endTime: "",
                    color: "#64748B",
                    description: null,
                    createdAt: new Date()
                  });
                }}
                data-testid="button-add-template"
              >
                Add Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Add Shift Dialog */}
      <Dialog open={showAddShift} onOpenChange={setShowAddShift}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Shift</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" data-testid="tab-shift-details">Shift details</TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-shift-tasks">Shift tasks</TabsTrigger>
              <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
            </TabsList>

            {/* Shift Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Date and Time */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor="shift-date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-date-picker"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {shiftFormData.date ? format(shiftFormData.date, 'MM/dd/yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={shiftFormData.date}
                          onSelect={(date) => date && setShiftFormData({ ...shiftFormData, date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      id="all-day"
                      checked={shiftFormData.allDay}
                      onCheckedChange={(checked) => setShiftFormData({ ...shiftFormData, allDay: checked })}
                      data-testid="switch-all-day"
                    />
                    <Label htmlFor="all-day">All day</Label>
                  </div>
                </div>

                {!shiftFormData.allDay && (
                  <>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label htmlFor="start-time">Start time</Label>
                        <Input
                          id="start-time"
                          type="text"
                          value={shiftFormData.startTime}
                          onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                          data-testid="input-start-time"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="end-time">End time</Label>
                        <Input
                          id="end-time"
                          type="text"
                          value={shiftFormData.endTime}
                          onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                          data-testid="input-end-time"
                        />
                      </div>
                    </div>
                    {calculateDuration() && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {calculateDuration()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Shift Title */}
              <div>
                <Label htmlFor="shift-title">Shift title</Label>
                <Input
                  id="shift-title"
                  value={shiftFormData.shiftTitle}
                  onChange={(e) => setShiftFormData({ ...shiftFormData, shiftTitle: e.target.value })}
                  placeholder="Enter shift title"
                  data-testid="input-shift-title"
                />
              </div>

              {/* Job Selection */}
              <div>
                <Label htmlFor="job-select">Job</Label>
                <Select
                  value={shiftFormData.job}
                  onValueChange={(value) => setShiftFormData({ ...shiftFormData, job: value })}
                >
                  <SelectTrigger id="job-select" data-testid="select-job">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobLocations.map((job) => (
                      <SelectItem key={job.id} value={job.name} data-testid={`job-option-${job.id}`}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: job.color }}
                          />
                          {job.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Assignment */}
              <div>
                <Label>Assign to</Label>
                <div className="mt-2 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-9"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      data-testid="input-user-search"
                    />
                  </div>
                  
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {users
                      .filter(user => 
                        user.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                      )
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 hover-elevate cursor-pointer"
                          onClick={() => {
                            const isSelected = shiftFormData.selectedUsers.includes(String(user.id));
                            setShiftFormData({
                              ...shiftFormData,
                              selectedUsers: isSelected
                                ? shiftFormData.selectedUsers.filter(id => id !== String(user.id))
                                : [...shiftFormData.selectedUsers, String(user.id)]
                            });
                          }}
                          data-testid={`user-option-${user.id}`}
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                            shiftFormData.selectedUsers.includes(String(user.id)) 
                              ? 'bg-primary border-primary' 
                              : 'border-input'
                          }`}>
                            {shiftFormData.selectedUsers.includes(String(user.id)) && (
                              <div className="h-2 w-2 bg-primary-foreground rounded-sm" />
                            )}
                          </div>
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {user.fullName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{user.fullName}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {shiftFormData.selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {shiftFormData.selectedUsers.map((userId) => {
                        const user = users.find(u => String(u.id) === userId);
                        if (!user) return null;
                        return (
                          <Badge key={userId} variant="secondary" className="gap-1" data-testid={`selected-user-${userId}`}>
                            {user.fullName}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => {
                                setShiftFormData({
                                  ...shiftFormData,
                                  selectedUsers: shiftFormData.selectedUsers.filter(id => id !== userId)
                                });
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    ref={addressInputRef}
                    id="address"
                    className="pl-9"
                    value={shiftFormData.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) {
                        setShowAddressSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowAddressSuggestions(false), 200);
                    }}
                    placeholder="Enter address"
                    data-testid="input-address"
                    autoComplete="off"
                  />
                  
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover-elevate cursor-pointer text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectAddress(suggestion.formatted);
                          }}
                          data-testid={`address-suggestion-${index}`}
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span>{suggestion.formatted}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              <div>
                <Label htmlFor="note">Note</Label>
                <div className="relative">
                  <Textarea
                    id="note"
                    value={shiftFormData.note}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, note: e.target.value })}
                    placeholder="Type description"
                    rows={3}
                    data-testid="textarea-note"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-2 left-2 h-8 text-primary hover:text-primary"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-attach"
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    Attach
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                </div>
                
                {shiftFormData.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {shiftFormData.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                        data-testid={`attachment-${index}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{file.name}</div>
                            <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => removeAttachment(index)}
                          data-testid={`button-remove-attachment-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timezone */}
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={shiftFormData.timezone}
                  onValueChange={(value) => setShiftFormData({ ...shiftFormData, timezone: value })}
                >
                  <SelectTrigger id="timezone" data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddShift(false)}
                  data-testid="button-cancel-shift"
                >
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    data-testid="button-save-template"
                  >
                    Save as template
                  </Button>
                  <Button 
                    variant="outline"
                    data-testid="button-save-draft"
                  >
                    Save draft
                  </Button>
                  <Button 
                    variant="default"
                    onClick={handlePublishShift}
                    disabled={createShiftMutation.isPending}
                    data-testid="button-publish-shift"
                  >
                    {createShiftMutation.isPending ? "Publishing..." : "Publish"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Shift Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Shift tasks functionality coming soon</p>
              </div>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select a template to apply</Label>
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  {shiftTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No shift templates available</p>
                    </div>
                  ) : (
                    shiftTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 hover-elevate cursor-pointer"
                        onClick={() => {
                          setShiftFormData({
                            ...shiftFormData,
                            startTime: template.startTime,
                            endTime: template.endTime,
                            shiftTitle: template.title,
                          });
                          toast({ title: `Applied template: ${template.title}` });
                        }}
                        data-testid={`template-option-${template.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: template.color }}
                          />
                          <div>
                            <div className="font-medium">{template.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {template.startTime} - {template.endTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Shift Dialog */}
      <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>
          {editingShift && (
            <div className="space-y-4">
              {/* Shift Title */}
              <div>
                <Label htmlFor="edit-shift-title">Shift title</Label>
                <Input
                  id="edit-shift-title"
                  defaultValue={editingShift.title}
                  data-testid="input-edit-shift-title"
                />
              </div>

              {/* Job Selection */}
              <div>
                <Label htmlFor="edit-job-select">Job</Label>
                <Select defaultValue={editingShift.jobName || undefined}>
                  <SelectTrigger id="edit-job-select" data-testid="select-edit-job">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobLocations.map((job) => (
                      <SelectItem key={job.id} value={job.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: job.color }}
                          />
                          {job.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="text"
                    defaultValue={format(new Date(editingShift.startTime), 'h:mma')}
                    data-testid="input-edit-start-time"
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="text"
                    defaultValue={format(new Date(editingShift.endTime), 'h:mma')}
                    data-testid="input-edit-end-time"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  defaultValue={editingShift.location || ''}
                  data-testid="input-edit-address"
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  rows={3}
                  defaultValue={editingShift.notes || ''}
                  data-testid="textarea-edit-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingShift(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive"
                    data-testid="button-delete-shift"
                  >
                    Delete
                  </Button>
                  <Button 
                    variant="default"
                    data-testid="button-save-shift"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
