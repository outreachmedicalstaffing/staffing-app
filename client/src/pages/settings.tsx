import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Clock, Bell, Users, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-settings">Settings</h1>
        <p className="text-muted-foreground">Manage organization preferences and configurations</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
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
                <Select defaultValue="biweekly">
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
                  defaultValue="14"
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

      <div className="flex justify-end gap-3">
        <Button variant="outline" data-testid="button-cancel">
          Cancel
        </Button>
        <Button data-testid="button-save-settings">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
