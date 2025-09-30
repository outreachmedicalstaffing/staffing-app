import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarIcon, ChevronDown, FileText, Search, Gift, Clock, FileCheck, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { User } from "@shared/schema";
import { useState } from "react";

interface UserDetailViewProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

export function UserDetailView({ user, open, onClose }: UserDetailViewProps) {
  const [activeTab, setActiveTab] = useState("work-rules");

  if (!user) return null;

  const customFields = user.customFields as any || {};
  const [firstName, ...lastNameParts] = user.fullName.split(' ');
  const lastName = lastNameParts.join(' ');

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
              <Button variant="outline" size="sm">
                <Gift className="h-4 w-4 mr-2" />
                Send reward
              </Button>
              <Button variant="outline" size="sm">
                Options
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Text Message
              </Button>
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
                      <Input value={firstName} className="mt-1 h-9" data-testid="input-first-name" />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Last name *</Label>
                      <Input value={lastName} className="mt-1 h-9" data-testid="input-last-name" />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Mobile phone *</Label>
                      <div className="flex gap-2 mt-1">
                        <Select defaultValue="us">
                          <SelectTrigger className="w-20 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">+1</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input value={customFields.mobilePhone || ''} className="h-9" data-testid="input-mobile-phone" />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Email *</Label>
                      <Input value={user.email} className="mt-1 h-9" data-testid="input-email" />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Birthday</Label>
                      <div className="relative mt-1">
                        <Input value={customFields.birthday || ''} className="h-9" data-testid="input-birthday" />
                        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Emergency Contact Name/Number</Label>
                      <Input value={customFields.emergencyContact || ''} className="mt-1 h-9" data-testid="input-emergency-contact" />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Shift Preference</Label>
                      <Select defaultValue={customFields.shiftPreference || 'select'}>
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
                      <Select defaultValue={customFields.facility || 'select'}>
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
                      <Select defaultValue={customFields.allergies || 'select'}>
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
                      <Input value={customFields.address || ''} className="mt-1 h-9" data-testid="input-address" />
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
                      <Select defaultValue={user.role}>
                        <SelectTrigger className="mt-1 h-9" data-testid="select-title">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RN">RN</SelectItem>
                          <SelectItem value="LPN">LPN</SelectItem>
                          <SelectItem value="CNA">CNA</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Employment Start Date</Label>
                      <div className="relative mt-1">
                        <Input value={customFields.employmentStartDate || '05/06/2022'} className="h-9" data-testid="input-employment-start-date" />
                        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Program</Label>
                      <div className="mt-1 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">Vitas VHVP</Badge>
                          <Badge variant="outline" className="text-xs">Vitas Central Florida</Badge>
                        </div>
                        <Select>
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
                      <Select defaultValue={customFields.directManager || 'amanda'}>
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
                            Effective date: 01/01/1970
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-overtime-menu">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem data-testid="menu-update-overtime">
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
                          <span className="text-sm font-medium">Overtime & Pay rules policy</span>
                          <Badge variant="outline">Default</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Regular</span>
                            <p className="font-medium">x1/hour</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Holiday</span>
                            <p className="font-medium">+0.5$/hour</p>
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
                            Effective date: 05/29/2025
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-payrate-menu">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem data-testid="menu-update-payrate">
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
                              <span className="text-sm font-semibold">$35/hour</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Job rate</div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 rounded-md border">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                                  <span className="text-sm">Advent/Health IPU</span>
                                </div>
                                <span className="text-sm font-medium">$38/hour</span>
                              </div>
                              <div className="flex items-center justify-between p-2 rounded-md border">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                                  <span className="text-sm">Vitas VHVP</span>
                                </div>
                                <span className="text-sm font-medium">$34/hour</span>
                              </div>
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
      </DialogContent>
    </Dialog>
  );
}
