import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Clock, Bell, Users, Database, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface Holiday {
  id: string;
  name: string;
  date: string;
  startTime?: string;
  endTime?: string;
}

interface PayRules {
  regularRate: string;
  holidayRateType: "additional" | "custom";
  holidayAdditionalRate: string;
  holidayCustomRate: string;
  payrollPeriod?: string;
  autoClockOutHours?: string;
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user to check role
  const { data: currentUser, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Check if user is admin
  const isAdmin = currentUser?.role?.toLowerCase() === "owner" || currentUser?.role?.toLowerCase() === "admin";

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (!isLoadingUser && !isAdmin) {
      setLocation("/");
    }
  }, [isLoadingUser, isAdmin, setLocation]);

  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: "1", name: "New Year's Day", date: "2025-01-01" },
    { id: "2", name: "Memorial Day", date: "2025-05-26" },
    { id: "3", name: "Independence Day", date: "2025-07-04" },
    { id: "4", name: "Labor Day", date: "2025-09-01" },
    { id: "5", name: "Thanksgiving", date: "2025-11-27" },
    { id: "6", name: "Christmas", date: "2025-12-25" },
  ]);

  const [activeTab, setActiveTab] = useState("general");
  const [payrollPeriod, setPayrollPeriod] = useState("biweekly");
  const [autoClockOutHours, setAutoClockOutHours] = useState("14");
  const [regularRate, setRegularRate] = useState("1.0");
  const [holidayRateType, setHolidayRateType] = useState<"additional" | "custom">("additional");
  const [holidayAdditionalRate, setHolidayAdditionalRate] = useState("0.5");
  const [holidayCustomRate, setHolidayCustomRate] = useState("1.5");
  const [isSaving, setIsSaving] = useState(false);

  // Load pay rules from the database
  const { data: payRulesData, refetch: refetchPayRules, isLoading: payRulesLoading, error: payRulesError } = useQuery({
    queryKey: ['/api/settings/pay_rules'],
    retry: (failureCount, error: any) => {
      // Don't retry on 404 - it just means no data exists yet
      if (error?.message?.includes('404')) return false;
      return failureCount < 3;
    },
    staleTime: 0, // Always refetch to get latest data
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Load holidays from the database
  const { data: holidaysData, refetch: refetchHolidays, isLoading: holidaysLoading, error: holidaysError } = useQuery({
    queryKey: ['/api/settings/holidays'],
    retry: (failureCount, error: any) => {
      // Don't retry on 404 - it just means no data exists yet
      if (error?.message?.includes('404')) return false;
      return failureCount < 3;
    },
    staleTime: 0, // Always refetch to get latest data
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Debug logging
  console.log('Payroll Settings Debug:');
  console.log('- Pay Rules Data:', payRulesData);
  console.log('- Pay Rules Loading:', payRulesLoading);
  console.log('- Pay Rules Error:', payRulesError);
  console.log('- Holidays Data:', holidaysData);
  console.log('- Holidays Loading:', holidaysLoading);
  console.log('- Holidays Error:', holidaysError);
  console.log('- Active Tab:', activeTab);

  // Update state when data is loaded
  useEffect(() => {
    console.log('Pay Rules useEffect triggered, payRulesData:', payRulesData);
    if (payRulesData?.value) {
      const rules = payRulesData.value as PayRules;
      console.log('Setting pay rules state:', rules);
      setPayrollPeriod(rules.payrollPeriod || "biweekly");
      setAutoClockOutHours(rules.autoClockOutHours || "14");
      setRegularRate(rules.regularRate || "1.0");
      setHolidayRateType(rules.holidayRateType || "additional");
      setHolidayAdditionalRate(rules.holidayAdditionalRate || "0.5");
      setHolidayCustomRate(rules.holidayCustomRate || "1.5");
    } else {
      console.log('Pay rules data not available or no value property');
    }
  }, [payRulesData]);

  useEffect(() => {
    console.log('Holidays useEffect triggered, holidaysData:', holidaysData);
    if (holidaysData?.value) {
      console.log('Setting holidays state:', holidaysData.value);
      setHolidays(holidaysData.value as Holiday[]);
    } else {
      console.log('Holidays data not available or no value property');
    }
  }, [holidaysData]);

  // Refetch data when Payroll tab becomes active
  useEffect(() => {
    console.log('Tab change effect triggered, activeTab:', activeTab);
    if (activeTab === "payroll") {
      console.log('Payroll tab active, refetching data...');
      refetchPayRules();
      refetchHolidays();
    }
  }, [activeTab, refetchPayRules, refetchHolidays]);

  const addHoliday = () => {
    const newHoliday: Holiday = {
      id: Date.now().toString(),
      name: "New Holiday",
      date: new Date().toISOString().split('T')[0],
    };
    setHolidays([...holidays, newHoliday]);
  };

  const updateHoliday = (id: string, updates: Partial<Holiday>) => {
    setHolidays(holidays.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const removeHoliday = (id: string) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    console.log('Saving settings...');
    console.log('Pay Rules to save:', { payrollPeriod, autoClockOutHours, regularRate, holidayRateType, holidayAdditionalRate, holidayCustomRate });
    console.log('Holidays to save:', holidays);

    try {
      // Save pay rules
      const payRulesBody = {
        value: {
          payrollPeriod,
          autoClockOutHours,
          regularRate,
          holidayRateType,
          holidayAdditionalRate,
          holidayCustomRate,
        },
      };
      console.log('Sending pay rules request:', payRulesBody);

      const payRulesResponse = await fetch('/api/settings/pay_rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payRulesBody),
        credentials: 'include',
      });

      console.log('Pay rules response status:', payRulesResponse.status);

      if (!payRulesResponse.ok) {
        const errorData = await payRulesResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save pay rules: ${payRulesResponse.status} ${payRulesResponse.statusText}`);
      }

      // Save holidays
      const holidaysBody = { value: holidays };
      console.log('Sending holidays request:', holidaysBody);

      const holidaysResponse = await fetch('/api/settings/holidays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidaysBody),
        credentials: 'include',
      });

      console.log('Holidays response status:', holidaysResponse.status);

      if (!holidaysResponse.ok) {
        const errorData = await holidaysResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save holidays: ${holidaysResponse.status} ${holidaysResponse.statusText}`);
      }

      console.log('Both save operations successful, refetching data...');

      // Invalidate and refetch queries to refresh data
      const refetchResults = await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/settings/pay_rules'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/settings/holidays'] }),
        refetchPayRules(),
        refetchHolidays(),
      ]);

      console.log('Refetch completed:', refetchResults);

      toast({
        title: "Settings saved",
        description: "Your payroll settings have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings. Please try again.";
      toast({
        title: "Error saving settings",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state while checking permissions
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render page if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-settings">Settings</h1>
        <p className="text-muted-foreground">Manage organization preferences and configurations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" data-testid="tab-general">
            <Database className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="payroll" data-testid="tab-payroll">
            <Clock className="h-4 w-4 mr-2" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="permissions" data-testid="tab-permissions">
            <Users className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Basic details about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input id="org-name" defaultValue="Outreach Medical Staffing" data-testid="input-org-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="est">
                  <SelectTrigger id="timezone" data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="est">Eastern (EST/EDT)</SelectItem>
                    <SelectItem value="cst">Central (CST/CDT)</SelectItem>
                    <SelectItem value="mst">Mountain (MST/MDT)</SelectItem>
                    <SelectItem value="pst">Pacific (PST/PDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                HIPAA Mode
                <Badge variant="secondary" className="gap-1.5">
                  <Shield className="h-3 w-3" />
                  Active
                </Badge>
              </CardTitle>
              <CardDescription>Enhanced security and compliance features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>HIPAA Mode Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Enforces stricter security defaults
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-hipaa-mode" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>PHI Field Masking</Label>
                  <p className="text-sm text-muted-foreground">
                    Mask sensitive data in activity logs
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-phi-masking" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require MFA</Label>
                  <p className="text-sm text-muted-foreground">
                    Mandatory multi-factor authentication
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-require-mfa" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  defaultValue="30"
                  data-testid="input-session-timeout"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Data access and export settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Disable Public Links</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent creation of public file links
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-disable-public-links" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Admin-Only Exports</Label>
                  <p className="text-sm text-muted-foreground">
                    Restrict data exports to administrators
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-admin-exports" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Configuration</CardTitle>
              <CardDescription>Set up payroll periods and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-period">Payroll Period</Label>
                <Select value={payrollPeriod} onValueChange={setPayrollPeriod}>
                  <SelectTrigger id="payroll-period" data-testid="select-payroll-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto-clockout">Auto Clock-Out After (hours)</Label>
                <Input
                  id="auto-clockout"
                  type="number"
                  value={autoClockOutHours}
                  onChange={(e) => setAutoClockOutHours(e.target.value)}
                  data-testid="input-auto-clockout"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Timesheet Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    All timesheets must be approved before export
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-require-approval" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll Integrations</CardTitle>
              <CardDescription>Connect to QuickBooks or ADP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">QuickBooks</p>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" data-testid="button-connect-quickbooks">
                  Connect
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">ADP</p>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" data-testid="button-connect-adp">
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pay Rules Policy</CardTitle>
              <CardDescription>Configure pay rates for regular time and holidays</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Regular Rate */}
              <div className="space-y-2">
                <Label htmlFor="regular-rate">Regular Rate</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">x</span>
                  <Input
                    id="regular-rate"
                    type="number"
                    step="0.1"
                    min="0"
                    value={regularRate}
                    onChange={(e) => setRegularRate(e.target.value)}
                    className="w-24"
                    data-testid="input-regular-rate"
                  />
                  <span className="text-sm text-muted-foreground">/hour</span>
                </div>
              </div>

              {/* Holiday Rate Configuration */}
              <div className="space-y-3">
                <Label>Holiday Rate</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="holiday-additional"
                      name="holiday-rate-type"
                      checked={holidayRateType === "additional"}
                      onChange={() => setHolidayRateType("additional")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="holiday-additional" className="flex items-center gap-2 font-normal cursor-pointer">
                      Additional rate
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">+x</span>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={holidayAdditionalRate}
                          onChange={(e) => setHolidayAdditionalRate(e.target.value)}
                          disabled={holidayRateType !== "additional"}
                          className="w-20"
                          data-testid="input-holiday-additional-rate"
                        />
                        <span className="text-sm text-muted-foreground">/hour</span>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="holiday-custom"
                      name="holiday-rate-type"
                      checked={holidayRateType === "custom"}
                      onChange={() => setHolidayRateType("custom")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="holiday-custom" className="flex items-center gap-2 font-normal cursor-pointer">
                      Custom rate
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">x</span>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={holidayCustomRate}
                          onChange={(e) => setHolidayCustomRate(e.target.value)}
                          disabled={holidayRateType !== "custom"}
                          className="w-20"
                          data-testid="input-holiday-custom-rate"
                        />
                        <span className="text-sm text-muted-foreground">/hour</span>
                      </div>
                    </Label>
                  </div>
                </div>
              </div>

              {/* Holidays List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Holidays</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addHoliday}
                    data-testid="button-add-holiday"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Holiday
                  </Button>
                </div>

                <Accordion type="single" collapsible className="space-y-2">
                  {holidays.map((holiday) => (
                    <AccordionItem
                      key={holiday.id}
                      value={holiday.id}
                      className="border rounded-md px-4"
                      data-testid={`holiday-item-${holiday.id}`}
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{holiday.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                              {holiday.startTime && holiday.endTime &&
                                ` • ${holiday.startTime} - ${holiday.endTime}`
                              }
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`holiday-name-${holiday.id}`}>Holiday Name</Label>
                          <Input
                            id={`holiday-name-${holiday.id}`}
                            value={holiday.name}
                            onChange={(e) => updateHoliday(holiday.id, { name: e.target.value })}
                            data-testid={`input-holiday-name-${holiday.id}`}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`holiday-date-${holiday.id}`}>Date</Label>
                          <Input
                            id={`holiday-date-${holiday.id}`}
                            type="date"
                            value={holiday.date}
                            onChange={(e) => updateHoliday(holiday.id, { date: e.target.value })}
                            data-testid={`input-holiday-date-${holiday.id}`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`holiday-start-${holiday.id}`}>Start Time (Optional)</Label>
                            <Input
                              id={`holiday-start-${holiday.id}`}
                              type="time"
                              value={holiday.startTime || ""}
                              onChange={(e) => updateHoliday(holiday.id, { startTime: e.target.value })}
                              data-testid={`input-holiday-start-${holiday.id}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`holiday-end-${holiday.id}`}>End Time (Optional)</Label>
                            <Input
                              id={`holiday-end-${holiday.id}`}
                              type="time"
                              value={holiday.endTime || ""}
                              onChange={(e) => updateHoliday(holiday.id, { endTime: e.target.value })}
                              data-testid={`input-holiday-end-${holiday.id}`}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeHoliday(holiday.id)}
                            data-testid={`button-remove-holiday-${holiday.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove Holiday
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {holidays.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No holidays configured. Click "Add Holiday" to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              data-testid="button-save-settings"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure alerts and reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Shift Start Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify users before shift starts
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-shift-reminders" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Missed Clock-In Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when user misses clock-in
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-missed-clockin" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Document Expiry Warnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Warn before credentials expire
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-doc-expiry" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-advance">Reminder Advance Time (minutes)</Label>
                <Input
                  id="reminder-advance"
                  type="number"
                  defaultValue="30"
                  data-testid="input-reminder-advance"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Access Control</CardTitle>
              <CardDescription>Manage permissions by role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["Owner", "Admin", "Scheduler", "Payroll", "HR", "Manager", "Staff"].map((role) => (
                  <div key={role} className="flex items-center justify-between p-3 border rounded-md hover-elevate">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{role}</span>
                    </div>
                    <Button variant="ghost" size="sm" data-testid={`button-edit-${role.toLowerCase()}`}>
                      Edit Permissions
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
