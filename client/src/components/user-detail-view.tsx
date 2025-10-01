import { Dialog, DialogContent, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarIcon, ChevronDown, FileText, Search, Gift, Clock, FileCheck, MoreVertical, Pencil, Trash2, Save, X } from "lucide-react";
import type { User } from "@shared/schema";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserDetailViewProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

interface EditableUser {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  mobilePhone: string;
  birthday: string;
  emergencyContact: string;
  shiftPreference: string;
  facility: string;
  allergies: string;
  address: string;
  employmentStartDate: string;
  programs: string[];
  directManager: string;
}

interface OvertimeRules {
  effectiveDate: string;
  policyName: string;
  regularRate: string;
  holidayRate: string;
}

interface PayRate {
  effectiveDate: string;
  defaultRate: string;
  jobRates: { name: string; rate: string; color: string }[];
}

export function UserDetailView({ user, open, onClose }: UserDetailViewProps) {
  const [activeTab, setActiveTab] = useState("work-rules");
  const [isEditing, setIsEditing] = useState(false);
  const [editingOvertimeRules, setEditingOvertimeRules] = useState(false);
  const [editingPayRate, setEditingPayRate] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!user) return null;

  const customFields = user.customFields as any || {};
  const [firstName, ...lastNameParts] = user.fullName.split(' ');
  const lastName = lastNameParts.join(' ');

  const [formData, setFormData] = useState<EditableUser>({
    firstName,
    lastName,
    email: user.email,
    role: user.role,
    mobilePhone: customFields.mobilePhone || '',
    birthday: customFields.birthday || '',
    emergencyContact: customFields.emergencyContact || '',
    shiftPreference: customFields.shiftPreference || 'select',
    facility: customFields.facility || 'select',
    allergies: customFields.allergies || 'select',
    address: customFields.address || '',
    employmentStartDate: customFields.employmentStartDate || '05/06/2022',
    programs: customFields.programs || ['Vitas VHVP', 'Vitas Central Florida'],
    directManager: customFields.directManager || 'amanda',
  });

  const [overtimeRules, setOvertimeRules] = useState<OvertimeRules>({
    effectiveDate: customFields.overtimeEffectiveDate || '01/01/1970',
    policyName: customFields.overtimePolicyName || 'Overtime & Pay rules policy',
    regularRate: customFields.overtimeRegularRate || 'x1/hour',
    holidayRate: customFields.overtimeHolidayRate || '+0.5$/hour',
  });

  const [payRate, setPayRate] = useState<PayRate>({
    effectiveDate: customFields.payRateEffectiveDate || '05/29/2025',
    defaultRate: customFields.payRateDefault || '$35/hour',
    jobRates: customFields.jobRates || [
      { name: 'Advent/Health IPU', rate: '$38/hour', color: 'bg-blue-500' },
      { name: 'Vitas VHVP', rate: '$34/hour', color: 'bg-purple-500' },
    ],
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<EditableUser>) => {
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const customFields = {
        mobilePhone: data.mobilePhone,
        birthday: data.birthday,
        emergencyContact: data.emergencyContact,
        shiftPreference: data.shiftPreference,
        facility: data.facility,
        allergies: data.allergies,
        address: data.address,
        employmentStartDate: data.employmentStartDate,
        programs: data.programs,
        directManager: data.directManager,
        overtimeEffectiveDate: overtimeRules.effectiveDate,
        overtimePolicyName: overtimeRules.policyName,
        overtimeRegularRate: overtimeRules.regularRate,
        overtimeHolidayRate: overtimeRules.holidayRate,
        payRateEffectiveDate: payRate.effectiveDate,
        payRateDefault: payRate.defaultRate,
        jobRates: payRate.jobRates,
      };
      
      return await apiRequest('PATCH', `/api/users/${user.id}`, {
        fullName,
        email: data.email,
        role: data.role,
        customFields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user.id] });
      toast({
        title: "Success",
        description: "User details updated successfully",
      });
      setIsEditing(false);
      setEditingOvertimeRules(false);
      setEditingPayRate(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user details",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateUserMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      firstName,
      lastName,
      email: user.email,
      role: user.role,
      mobilePhone: customFields.mobilePhone || '',
      birthday: customFields.birthday || '',
      emergencyContact: customFields.emergencyContact || '',
      shiftPreference: customFields.shiftPreference || 'select',
      facility: customFields.facility || 'select',
      allergies: customFields.allergies || 'select',
      address: customFields.address || '',
      employmentStartDate: customFields.employmentStartDate || '05/06/2022',
      programs: customFields.programs || ['Vitas VHVP', 'Vitas Central Florida'],
      directManager: customFields.directManager || 'amanda',
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                <AvatarFallback>
                  {user.fullName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{user.fullName}</h2>
                <Badge variant="outline" className="mt-1">{user.role}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleSave}
                    disabled={updateUserMutation.isPending}
                    data-testid="button-save-user"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save changes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancel}
                    disabled={updateUserMutation.isPending}
                    data-testid="button-cancel-edit"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-user"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit details
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-send-reward">
                    <Gift className="h-4 w-4 mr-2" />
                    Send reward
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-options">
                    Options
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-text-message">
                    <FileText className="h-4 w-4 mr-2" />
                    Text Message
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Personal Details */}
          <div className="w-64 border-r bg-muted/30 overflow-y-auto">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search information"
                  className="pl-9 h-9"
                  data-testid="input-search-user-info"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center justify-between">
                    Personal Details
                    <ChevronDown className="h-4 w-4" />
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">First name *</Label>
                      <Input 
                        value={formData.firstName} 
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1 h-9" 
                        data-testid="input-first-name" 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Last name *</Label>
                      <Input 
                        value={formData.lastName} 
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1 h-9" 
                        data-testid="input-last-name" 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Mobile phone *</Label>
                      <div className="flex gap-2 mt-1">
                        <Select defaultValue="us" disabled={!isEditing}>
                          <SelectTrigger className="w-20 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">+1</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input 
                          value={formData.mobilePhone} 
                          onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                          disabled={!isEditing}
                          className="h-9" 
                          data-testid="input-mobile-phone" 
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Email *</Label>
                      <Input 
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1 h-9" 
                        data-testid="input-email" 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Birthday</Label>
                      <div className="relative mt-1">
                        <Input 
                          value={formData.birthday} 
                          onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                          disabled={!isEditing}
                          className="h-9" 
                          data-testid="input-birthday" 
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Emergency Contact Name/Number</Label>
                      <Input 
                        value={formData.emergencyContact} 
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1 h-9" 
                        data-testid="input-emergency-contact" 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Shift Preference</Label>
                      <Select 
                        value={formData.shiftPreference}
                        onValueChange={(value) => setFormData({ ...formData, shiftPreference: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-1 h-9" data-testid="select-shift-preference">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="day">Day shift only</SelectItem>
                          <SelectItem value="night">Night shift only</SelectItem>
                          <SelectItem value="both">Both but prefers nights</SelectItem>
                          <SelectItem value="any">Day or Night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Facility/home</Label>
                      <Select 
                        value={formData.facility}
                        onValueChange={(value) => setFormData({ ...formData, facility: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-1 h-9" data-testid="select-facility">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="home">Home or Facility</SelectItem>
                          <SelectItem value="prefers-facilities">Prefers facilities</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Allergies</Label>
                      <Select 
                        value={formData.allergies}
                        onValueChange={(value) => setFormData({ ...formData, allergies: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-1 h-9" data-testid="select-allergies">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="smoke">Smoke</SelectItem>
                          <SelectItem value="cats-dogs">Cats, Dogs, Smoke</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Address</Label>
                      <Input 
                        value={formData.address} 
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1 h-9" 
                        data-testid="input-address" 
                      />
                    </div>
                  </div>
                </div>

                {/* Company Related Info */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-3 flex items-center justify-between">
                    Company Related Info
                    <ChevronDown className="h-4 w-4" />
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Title *</Label>
                      <Select 
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-1 h-9" data-testid="select-title">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Owner">Owner</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Scheduler">Scheduler</SelectItem>
                          <SelectItem value="Payroll">Payroll</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Employment Start Date</Label>
                      <div className="relative mt-1">
                        <Input 
                          value={formData.employmentStartDate} 
                          onChange={(e) => setFormData({ ...formData, employmentStartDate: e.target.value })}
                          disabled={!isEditing}
                          className="h-9" 
                          data-testid="input-employment-start-date" 
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Program</Label>
                      <div className="mt-1 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {formData.programs.map((program, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {program}
                              {isEditing && (
                                <button
                                  onClick={() => {
                                    const newPrograms = formData.programs.filter((_, i) => i !== idx);
                                    setFormData({ ...formData, programs: newPrograms });
                                  }}
                                  className="ml-1 hover:text-destructive"
                                  data-testid={`button-remove-program-${idx}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                        <Select 
                          disabled={!isEditing}
                          onValueChange={(value) => {
                            const programMap: Record<string, string> = {
                              'vitas-vhvp': 'Vitas VHVP',
                              'vitas-central': 'Vitas Central Florida',
                              'advent-health': 'Advent/Health IPU',
                            };
                            const programName = programMap[value];
                            if (programName && !formData.programs.includes(programName)) {
                              setFormData({ ...formData, programs: [...formData.programs, programName] });
                            }
                          }}
                        >
                          <SelectTrigger className="h-9" data-testid="select-program">
                            <SelectValue placeholder="Add program" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vitas-vhvp">Vitas VHVP</SelectItem>
                            <SelectItem value="vitas-central">Vitas Central Florida</SelectItem>
                            <SelectItem value="advent-health">Advent/Health IPU</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Direct manager</Label>
                      <Select 
                        value={formData.directManager}
                        onValueChange={(value) => setFormData({ ...formData, directManager: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-1 h-9" data-testid="select-direct-manager">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amanda">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=Amanda Ecklind" />
                                <AvatarFallback>AE</AvatarFallback>
                              </Avatar>
                              <span>Amanda Ecklind</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      <span>Tags (0)</span>
                    </h3>
                    <Button variant="ghost" size="sm" className="text-blue-600 p-0 h-auto text-sm">
                      + Add tags
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="border-b px-6">
                <TabsList className="h-12">
                  <TabsTrigger value="work-rules" data-testid="tab-work-rules">Work Rules</TabsTrigger>
                  <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
                  <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
                  <TabsTrigger value="forms" data-testid="tab-forms">Forms</TabsTrigger>
                  <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
                  <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="payslips" data-testid="tab-payslips">Payslips</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="work-rules" className="mt-0">
                  <div className="space-y-6">
                    {/* Overtime & Pay rules */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Overtime & Pay rules</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Effective date: {overtimeRules.effectiveDate}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-overtime-menu">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onSelect={() => setEditingOvertimeRules(true)}
                                data-testid="menu-update-overtime"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" data-testid="menu-delete-overtime">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{overtimeRules.policyName}</span>
                          <Badge variant="outline">Default</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Regular</span>
                            <p className="font-medium">{overtimeRules.regularRate}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Holiday</span>
                            <p className="font-medium">{overtimeRules.holidayRate}</p>
                          </div>
                        </div>
                        <Button variant="ghost" className="p-0 h-auto text-sm">
                          More details
                        </Button>
                        <Button variant="ghost" className="p-0 h-auto text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          View history
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Pay rate */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Pay rate</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Effective date: {payRate.effectiveDate}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-payrate-menu">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onSelect={() => setEditingPayRate(true)}
                                data-testid="menu-update-payrate"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" data-testid="menu-delete-payrate">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Default rate</span>
                              <span className="text-sm font-semibold">{payRate.defaultRate}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Job rate</div>
                            <div className="space-y-2">
                              {payRate.jobRates.map((job, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-md border">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${job.color}`} />
                                    <span className="text-sm">{job.name}</span>
                                  </div>
                                  <span className="text-sm font-medium">{job.rate}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button variant="ghost" className="p-0 h-auto text-sm">
                            Show full job list
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-0">
                  <div className="text-center text-muted-foreground py-12">
                    Activity timeline coming soon
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <div className="text-center text-muted-foreground py-12">
                    Notes section coming soon
                  </div>
                </TabsContent>

                <TabsContent value="forms" className="mt-0">
                  <div className="text-center text-muted-foreground py-12">
                    Forms section coming soon
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <div className="text-center text-muted-foreground py-12">
                    Documents section coming soon
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-0">
                  <div className="text-center text-muted-foreground py-12">
                    Timeline section coming soon
                  </div>
                </TabsContent>

                <TabsContent value="payslips" className="mt-0">
                  <div className="text-center text-muted-foreground py-12">
                    Payslips section coming soon
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Overtime Rules Edit Dialog */}
        <Dialog open={editingOvertimeRules} onOpenChange={setEditingOvertimeRules}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <h2 className="text-lg font-semibold">Edit Overtime & Pay Rules</h2>
              <DialogDescription>
                Update the overtime and pay rules for this employee
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm">Effective Date</Label>
                <div className="relative mt-1">
                  <Input 
                    value={overtimeRules.effectiveDate}
                    onChange={(e) => setOvertimeRules({ ...overtimeRules, effectiveDate: e.target.value })}
                    className="h-9"
                    data-testid="input-overtime-effective-date"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Policy Name</Label>
                <Input 
                  value={overtimeRules.policyName}
                  onChange={(e) => setOvertimeRules({ ...overtimeRules, policyName: e.target.value })}
                  className="mt-1 h-9"
                  data-testid="input-overtime-policy-name"
                />
              </div>
              <div>
                <Label className="text-sm">Regular Rate</Label>
                <Input 
                  value={overtimeRules.regularRate}
                  onChange={(e) => setOvertimeRules({ ...overtimeRules, regularRate: e.target.value })}
                  className="mt-1 h-9"
                  placeholder="x1/hour"
                  data-testid="input-overtime-regular-rate"
                />
              </div>
              <div>
                <Label className="text-sm">Holiday Rate</Label>
                <Input 
                  value={overtimeRules.holidayRate}
                  onChange={(e) => setOvertimeRules({ ...overtimeRules, holidayRate: e.target.value })}
                  className="mt-1 h-9"
                  placeholder="+0.5$/hour"
                  data-testid="input-overtime-holiday-rate"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingOvertimeRules(false)}
                data-testid="button-cancel-overtime-edit"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setEditingOvertimeRules(false);
                  handleSave();
                }}
                data-testid="button-save-overtime"
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pay Rate Edit Dialog */}
        <Dialog open={editingPayRate} onOpenChange={setEditingPayRate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <h2 className="text-lg font-semibold">Edit Pay Rate</h2>
              <DialogDescription>
                Update the default and job-specific pay rates for this employee
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm">Effective Date</Label>
                <div className="relative mt-1">
                  <Input 
                    value={payRate.effectiveDate}
                    onChange={(e) => setPayRate({ ...payRate, effectiveDate: e.target.value })}
                    className="h-9"
                    data-testid="input-payrate-effective-date"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Default Rate</Label>
                <Input 
                  value={payRate.defaultRate}
                  onChange={(e) => setPayRate({ ...payRate, defaultRate: e.target.value })}
                  className="mt-1 h-9"
                  placeholder="$35/hour"
                  data-testid="input-payrate-default"
                />
              </div>
              <div>
                <Label className="text-sm">Job Rates</Label>
                <div className="mt-2 space-y-2">
                  {payRate.jobRates.map((job, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${job.color} flex-shrink-0`} />
                      <Input 
                        value={job.name}
                        onChange={(e) => {
                          const newJobRates = [...payRate.jobRates];
                          newJobRates[idx].name = e.target.value;
                          setPayRate({ ...payRate, jobRates: newJobRates });
                        }}
                        className="h-9 flex-1"
                        placeholder="Job name"
                        data-testid={`input-job-name-${idx}`}
                      />
                      <Input 
                        value={job.rate}
                        onChange={(e) => {
                          const newJobRates = [...payRate.jobRates];
                          newJobRates[idx].rate = e.target.value;
                          setPayRate({ ...payRate, jobRates: newJobRates });
                        }}
                        className="h-9 w-28"
                        placeholder="$00/hour"
                        data-testid={`input-job-rate-${idx}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingPayRate(false)}
                data-testid="button-cancel-payrate-edit"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setEditingPayRate(false);
                  handleSave();
                }}
                data-testid="button-save-payrate"
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
