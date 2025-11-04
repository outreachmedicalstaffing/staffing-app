import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, FileDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface GroupData {
  name: string;
  memberCount: number;
  members: User[];
}

export default function Groups() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Extract unique groups and count members
  const groups = useMemo(() => {
    const groupMap = new Map<string, User[]>();

    users.forEach(user => {
      if (user.groups && Array.isArray(user.groups)) {
        user.groups.forEach(groupName => {
          if (!groupMap.has(groupName)) {
            groupMap.set(groupName, []);
          }
          groupMap.get(groupName)!.push(user);
        });
      }
    });

    // Convert map to array and sort by group name
    return Array.from(groupMap.entries())
      .map(([name, members]) => ({
        name,
        memberCount: members.length,
        members,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold" data-testid="heading-groups">Groups</h1>
      </div>

      {/* Main Content */}
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
                  placeholder="Search groups"
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-groups"
                />
              </div>
              <Button variant="outline" size="sm" data-testid="button-export">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Loading groups...
                    </TableCell>
                  </TableRow>
                ) : filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'No groups found matching your search' : 'No groups found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((group) => (
                    <TableRow
                      key={group.name}
                      data-testid={`row-group-${group.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="cursor-pointer hover-elevate"
                    >
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-sm">{group.memberCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
