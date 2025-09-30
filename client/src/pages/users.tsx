import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users as UsersIcon, UserCog, Archive } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");

  const users = [
    { id: "1", name: "Jane Smith", email: "jane.smith@example.com", role: "RN - Manager", groups: ["Central Florida", "Managers"], status: "active", customFields: { license: "RN123456", region: "Central" } },
    { id: "2", name: "Mike Johnson", email: "mike.j@example.com", role: "LPN - Staff", groups: ["Treasure Coast"], status: "active", customFields: { license: "LPN789012", region: "Treasure Coast" } },
    { id: "3", name: "Sarah Williams", email: "sarah.w@example.com", role: "CNA - Staff", groups: ["Jacksonville"], status: "active", customFields: { license: "CNA345678", region: "Jacksonville" } },
    { id: "4", name: "Tom Brown", email: "tom.b@example.com", role: "RN - Staff", groups: ["Brevard", "Float Pool"], status: "active", customFields: { license: "RN901234", region: "Multi-Region" } },
    { id: "5", name: "Lisa Davis", email: "lisa.d@example.com", role: "Admin", groups: ["Central Florida"], status: "archived", customFields: { region: "Central" } },
  ];

  const activeUsers = users.filter(u => u.status === "active");
  const archivedUsers = users.filter(u => u.status === "archived");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-users">Users</h1>
          <p className="text-muted-foreground">Manage team members and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-smart-groups">
            <UserCog className="h-4 w-4 mr-2" />
            Smart Groups
          </Button>
          <Button data-testid="button-add-user">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">{activeUsers.length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Permission roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archivedUsers.length}</div>
            <p className="text-xs text-muted-foreground">Inactive users</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, role, or group..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-users"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>{activeUsers.length} active users</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.groups.slice(0, 2).map((group, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {group}
                        </Badge>
                      ))}
                      {user.groups.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.groups.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{user.customFields.license}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => console.log(`Edit user ${user.id}`)}
                      data-testid={`button-edit-${user.id}`}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
