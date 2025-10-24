import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, FileDown, UserPlus, Clock, FileText, Settings as SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { UserDetailView } from "@/components/user-detail-view";
import { AddUserDialog } from "@/components/add-user-dialog";

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const activeUsers = users.filter(u => u.status === 'active' && u.role !== 'Admin' && u.role !== 'Owner');
  const adminUsers = users.filter(u => (u.role === 'Admin' || u.role === 'Owner') && u.status === 'active');
  const archivedUsers = users.filter(u => u.status === 'archived');

  const filteredUsers = activeUsers.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAdmins = adminUsers.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArchived = archivedUsers.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold" data-testid="heading-users">Users</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" data-testid="button-pending-approvals">
            <Clock className="h-4 w-4 mr-2" />
            Pending approvals
          </Button>
          <Button variant="outline" size="sm" data-testid="button-company-policies">
            <FileText className="h-4 w-4 mr-2" />
            Company policies
          </Button>
          <Button variant="outline" size="sm" data-testid="button-settings">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            Users ({activeUsers.length}/{users.filter(u => u.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="admins" data-testid="tab-admins">
            Admins ({adminUsers.length})
          </TabsTrigger>
          <TabsTrigger value="archived" data-testid="tab-archived">
            Archived ({archivedUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <Button variant="outline" size="sm" data-testid="button-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search"
                      className="pl-9 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-users"
                    />
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-export">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" onClick={() => setShowAddUserDialog(true)} data-testid="button-add-users">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add users
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">First name</TableHead>
                      <TableHead>Last name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile phone</TableHead>
                      <TableHead>Birthday</TableHead>
                      <TableHead>Shift Preference</TableHead>
                      <TableHead>Facility/home</TableHead>
                      <TableHead>Allergies</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Program</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const customFields = user.customFields as any || {};
                      const [firstName, ...lastNameParts] = user.fullName.split(' ');
                      const lastName = lastNameParts.join(' ');
                      
                      return (
                        <TableRow 
                          key={user.id} 
                          data-testid={`row-user-${user.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedUser(user)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                                <AvatarFallback>
                                  {user.fullName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{firstName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{lastName}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell className="text-sm">{customFields.mobilePhone || '—'}</TableCell>
                          <TableCell className="text-sm">{customFields.birthday || '—'}</TableCell>
                          <TableCell className="text-sm">{customFields.shiftPreference || '—'}</TableCell>
                          <TableCell className="text-sm">{customFields.facility || '—'}</TableCell>
                          <TableCell className="text-sm">{customFields.allergies || '—'}</TableCell>
                          <TableCell>
                            {user.role ? (
                              <Badge variant="outline">{user.role}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{customFields.program || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <Button variant="outline" size="sm" data-testid="button-filter-admins">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search"
                      className="pl-9 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-admins"
                    />
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-export-admins">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" onClick={() => setShowAddUserDialog(true)} data-testid="button-add-admin">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add users
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">First name</TableHead>
                      <TableHead>Last name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile phone</TableHead>
                      <TableHead>Birthday</TableHead>
                      <TableHead>Title</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmins.map((user) => {
                      const customFields = user.customFields as any || {};
                      const [firstName, ...lastNameParts] = user.fullName.split(' ');
                      const lastName = lastNameParts.join(' ');
                      
                      return (
                        <TableRow 
                          key={user.id} 
                          data-testid={`row-admin-${user.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedUser(user)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                                <AvatarFallback>
                                  {user.fullName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{firstName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{lastName}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell className="text-sm">{customFields.mobilePhone || '—'}</TableCell>
                          <TableCell className="text-sm">{customFields.birthday || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredAdmins.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No admins found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archived Tab */}
        <TabsContent value="archived" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <Button variant="outline" size="sm" data-testid="button-filter-archived">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search"
                    className="pl-9 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-archived"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">First name</TableHead>
                      <TableHead>Last name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArchived.map((user) => {
                      const [firstName, ...lastNameParts] = user.fullName.split(' ');
                      const lastName = lastNameParts.join(' ');
                      
                      return (
                        <TableRow 
                          key={user.id} 
                          data-testid={`row-archived-${user.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedUser(user)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                                <AvatarFallback>
                                  {user.fullName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{firstName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{lastName}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredArchived.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No archived users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UserDetailView
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />

      <AddUserDialog
        open={showAddUserDialog}
        onClose={() => setShowAddUserDialog(false)}
      />
    </div>
  );
}
