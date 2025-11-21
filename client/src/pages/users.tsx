import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Filter, FileDown, UserPlus, Clock, FileText, Settings as SettingsIcon, Archive, RotateCcw, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserDetailView } from "@/components/user-detail-view";
import { AddUserDialog } from "@/components/add-user-dialog";
import { useLocation } from "wouter";

export default function Users() {
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

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

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [archiveUserId, setArchiveUserId] = useState<string | null>(null);
  const [restoreUserId, setRestoreUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Archive user mutation
  const archiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User archived successfully",
      });
      setArchiveUserId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive user",
        variant: "destructive",
      });
    },
  });

  // Unarchive (restore) user mutation
  const unarchiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/unarchive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User restored successfully",
      });
      setRestoreUserId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation (only for archived users)
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User permanently deleted",
      });
      setDeleteUserId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
      setDeleteUserId(null);
    },
  });

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

  // Staff users: non-archived users who are NOT admins or owners
  const activeUsers = users.filter(u => {
    const role = u.role?.toLowerCase();
    return u.status !== 'archived' && role !== 'admin' && role !== 'owner';
  });

  // Admin users: non-archived users who ARE admins or owners
  const adminUsers = users.filter(u => {
    const role = u.role?.toLowerCase();
    return (role === 'admin' || role === 'owner') && u.status !== 'archived';
  });

  // Archived users: all users with archived status
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
            All Users ({activeUsers.length})
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
                      {isAdmin && <TableHead className="text-center">Archive</TableHead>}
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
                              <div className="flex flex-col">
                                <span className="font-medium">{firstName}</span>
                                {user.status === 'pending-onboarding' && (
                                  <Badge variant="secondary" className="text-xs w-fit mt-0.5">Pending</Badge>
                                )}
                              </div>
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
                          {isAdmin && (
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArchiveUserId(user.id);
                                }}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                data-testid={`button-archive-${user.id}`}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 11 : 10} className="text-center text-muted-foreground py-8">
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
                              <div className="flex flex-col">
                                <span className="font-medium">{firstName}</span>
                                {user.status === 'pending-onboarding' && (
                                  <Badge variant="secondary" className="text-xs w-fit mt-0.5">Pending</Badge>
                                )}
                              </div>
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
                      {isAdmin && <TableHead className="text-center">Restore</TableHead>}
                      {isAdmin && <TableHead className="text-center">Delete</TableHead>}
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
                          {isAdmin && (
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unarchiveMutation.mutate(user.id);
                                }}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                data-testid={`button-restore-${user.id}`}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteUserId(user.id);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {filteredArchived.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 6 : 4} className="text-center text-muted-foreground py-8">
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

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archiveUserId} onOpenChange={(open) => !open && setArchiveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{" "}
              <strong>{users.find(u => u.id === archiveUserId)?.fullName}</strong>?
              They will be moved to the Archived tab and won't be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveUserId) {
                  archiveMutation.mutate(archiveUserId);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{users.find(u => u.id === deleteUserId)?.fullName}</strong>?
              This action cannot be undone and will delete all their data including time entries, schedules, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteUserId) {
                  deleteMutation.mutate(deleteUserId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
