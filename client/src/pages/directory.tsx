import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Building2, Moon, Sun, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getInitials(fullName: string): string {
  const names = fullName.trim().split(" ");
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

export default function Directory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Filter to only show active (non-archived) users
  const activeUsers = users.filter(user => user.status !== 'archived');

  // Filter users based on search query
  const filteredUsers = activeUsers.filter(user => {
    const query = searchQuery.toLowerCase();
    const customFields = user.customFields as any || {};

    return (
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query) ||
      customFields.program?.toLowerCase().includes(query) ||
      customFields.facility?.toLowerCase().includes(query)
    );
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const customFieldsA = a.customFields as any || {};
    const customFieldsB = b.customFields as any || {};

    switch (sortBy) {
      case "name":
        return a.fullName.localeCompare(b.fullName);
      case "role":
        return (a.role || "").localeCompare(b.role || "");
      case "program":
        return (customFieldsA.program || "").localeCompare(customFieldsB.program || "");
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading directory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-directory">
          Staff Directory
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View contact information for all staff members
        </p>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, role, or program..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-directory"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-sort">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="program">Program</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedUsers.length} of {activeUsers.length} staff members
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedUsers.map((user) => {
          const customFields = user.customFields as any || {};
          const shiftIcon = customFields.shiftPreference === "Night" ? Moon :
                           customFields.shiftPreference === "Day" ? Sun : Calendar;

          return (
            <Card
              key={user.id}
              className="hover:shadow-lg transition-shadow"
              data-testid={`card-user-${user.id}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Avatar */}
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                    <AvatarFallback className="text-lg">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name and Role */}
                  <div className="space-y-1 w-full">
                    <h3 className="font-semibold text-lg">{user.fullName}</h3>
                    {user.role && (
                      <Badge variant="secondary" className="text-xs">
                        {user.role}
                      </Badge>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 w-full text-sm">
                    {/* Email */}
                    <a
                      href={`mailto:${user.email}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate group-hover:underline">{user.email}</span>
                    </a>

                    {/* Phone */}
                    {customFields.mobilePhone && (
                      <a
                        href={`tel:${customFields.mobilePhone}`}
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
                      >
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span className="group-hover:underline">{customFields.mobilePhone}</span>
                      </a>
                    )}

                    {/* Program */}
                    {customFields.program && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{customFields.program}</span>
                      </div>
                    )}

                    {/* Shift Preference */}
                    {customFields.shiftPreference && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {shiftIcon && <shiftIcon className="h-4 w-4 flex-shrink-0" />}
                        <span>{customFields.shiftPreference} shift</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {sortedUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No staff members found matching your search." : "No staff members in the directory."}
          </p>
        </div>
      )}
    </div>
  );
}
