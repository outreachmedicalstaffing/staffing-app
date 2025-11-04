import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User } from "@shared/schema";

interface GroupData {
  name: string;
  memberCount: number;
  members: User[];
  createdBy?: User;
  administeredBy?: User;
  assignments?: number;
}

type CategoryType = "discipline" | "general" | "program";

interface Category {
  id: CategoryType;
  name: string;
  dotColor: string;
  groups: GroupData[];
}

export default function Groups() {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryType>>(
    new Set(["discipline", "general", "program"])
  );
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("general");

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

    // Convert map to array and add metadata
    return Array.from(groupMap.entries())
      .map(([name, members]) => ({
        name,
        memberCount: members.length,
        members,
        // Mock data for demonstration - replace with real data when available
        createdBy: users[0],
        administeredBy: users[0],
        assignments: Math.floor(Math.random() * 5),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Categorize groups based on their names
  const categories = useMemo((): Category[] => {
    const disciplineGroups: GroupData[] = [];
    const generalGroups: GroupData[] = [];
    const programGroups: GroupData[] = [];

    groups.forEach(group => {
      const nameLower = group.name.toLowerCase();

      // Categorization logic - adjust based on your actual group naming conventions
      if (nameLower.includes('discipline') || nameLower.includes('dept') || nameLower.includes('department')) {
        disciplineGroups.push(group);
      } else if (nameLower.includes('program') || nameLower.includes('project')) {
        programGroups.push(group);
      } else {
        generalGroups.push(group);
      }
    });

    return [
      {
        id: "discipline",
        name: "Groups by Discipline",
        dotColor: "bg-blue-500",
        groups: disciplineGroups,
      },
      {
        id: "general",
        name: "General groups",
        dotColor: "bg-green-500",
        groups: generalGroups,
      },
      {
        id: "program",
        name: "Groups by Program",
        dotColor: "bg-purple-500",
        groups: programGroups,
      },
    ];
  }, [groups]);

  const toggleCategory = (categoryId: CategoryType) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleGroupSelection = (groupName: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupName)) {
      newSelected.delete(groupName);
    } else {
      newSelected.add(groupName);
    }
    setSelectedGroups(newSelected);
  };

  const toggleCategorySelection = (category: Category) => {
    const allSelected = category.groups.every(g => selectedGroups.has(g.name));
    const newSelected = new Set(selectedGroups);

    category.groups.forEach(group => {
      if (allSelected) {
        newSelected.delete(group.name);
      } else {
        newSelected.add(group.name);
      }
    });

    setSelectedGroups(newSelected);
  };

  const getInitials = (user?: User) => {
    if (!user) return "?";
    const names = user.fullName?.split(" ") || [];
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return user.fullName?.[0]?.toUpperCase() || "?";
  };

  const handleAddGroup = () => {
    // TODO: Implement API call to save the group
    console.log("Adding group:", { name: newGroupName, category: selectedCategory });

    // Reset form and close modal
    setNewGroupName("");
    setSelectedCategory("general");
    setIsAddGroupModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold" data-testid="heading-groups">Groups</h1>
        <Button onClick={() => setIsAddGroupModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </Button>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading groups...
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category.id} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className={`w-2 h-2 rounded-full ${category.dotColor}`} />
                      <span className="font-medium">{category.name}</span>
                    </button>
                    <Badge variant="secondary" className="rounded-full">
                      {category.groups.length}
                    </Badge>
                  </div>

                  {/* Category Table */}
                  {expandedCategories.has(category.id) && (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={
                                    category.groups.length > 0 &&
                                    category.groups.every(g => selectedGroups.has(g.name))
                                  }
                                  onCheckedChange={() => toggleCategorySelection(category)}
                                />
                              </TableHead>
                              <TableHead>Group name</TableHead>
                              <TableHead>Connected</TableHead>
                              <TableHead>Created by</TableHead>
                              <TableHead>Assignments</TableHead>
                              <TableHead>Administered by</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {category.groups.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                  No groups in this category
                                </TableCell>
                              </TableRow>
                            ) : (
                              category.groups.map((group) => (
                                <TableRow
                                  key={group.name}
                                  data-testid={`row-group-${group.name.toLowerCase().replace(/\s+/g, '-')}`}
                                  className="hover-elevate"
                                >
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedGroups.has(group.name)}
                                      onCheckedChange={() => toggleGroupSelection(group.name)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{group.name}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {group.memberCount} / {group.memberCount}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={group.createdBy?.profilePicture} />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(group.createdBy)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm">
                                        {group.createdBy?.fullName || "Unknown"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <select className="text-sm border rounded px-2 py-1 bg-background">
                                      <option>{group.assignments || 0} selected</option>
                                    </select>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={group.administeredBy?.profilePicture} />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(group.administeredBy)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm">
                                        {group.administeredBy?.fullName || "Unknown"}
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Group Modal */}
      <Dialog open={isAddGroupModalOpen} onOpenChange={setIsAddGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={(value: CategoryType) => setSelectedCategory(value)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discipline">Groups by Discipline</SelectItem>
                  <SelectItem value="general">General groups</SelectItem>
                  <SelectItem value="program">Groups by Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
              Add Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
