import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface Group {
  id: string;
  name: string;
  category: string;
  memberIds: string[];
  assignmentIds: string[];
  createdAt: string;
}

type CategoryType = "discipline" | "general" | "program";

interface Category {
  id: CategoryType;
  name: string;
  dotColor: string;
  groups: Group[];
}

const STORAGE_KEY = "staffing-app-groups";

function loadGroupsFromStorage(): Group[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading groups from localStorage:", error);
    return [];
  }
}

function saveGroupsToStorage(groups: Group[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (error) {
    console.error("Error saving groups to localStorage:", error);
  }
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryType>>(
    new Set(["discipline", "general", "program"])
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("general");
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<Group | null>(null);

  // Fetch users from API
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Load groups from localStorage on mount
  useEffect(() => {
    const loadedGroups = loadGroupsFromStorage();
    setGroups(loadedGroups);
  }, []);

  // Function to count members for a group based on category
  const getMemberCount = (group: Group): number => {
    if (group.category === 'discipline') {
      // For discipline groups, count users whose role matches the group name
      // Extract common abbreviations from group name (e.g., "RN" from "Registered Nurse (RN)")
      const groupNameLower = group.name.toLowerCase();

      return users.filter(user => {
        if (!user.role) return false;

        const userRole = user.role.toLowerCase();

        // Check if the user's role matches common patterns
        // Match exact role or if group name contains the role
        return groupNameLower.includes(userRole) ||
               userRole.includes(groupNameLower) ||
               // Check for abbreviation matches (e.g., "RN", "LPN", "CNA")
               (group.name.match(/\(([^)]+)\)/)?.[1]?.toLowerCase() === userRole);
      }).length;
    } else if (group.category === 'program') {
      // For program groups, count users who have this program in their jobRates
      // Users can have multiple programs (e.g., Bryant has both "Vitas Central Florida" and "Haven")
      return users.filter(user => {
        // Check if user has jobRates and if the program exists as a key
        if (!user.jobRates || typeof user.jobRates !== 'object') return false;
        const jobRatesObj = user.jobRates as Record<string, any>;
        return Object.keys(jobRatesObj).includes(group.name);
      }).length;
    } else {
      // For general groups, use memberIds array
      return group.memberIds?.length || 0;
    }
  };

  // Categorize groups
  const categories = useMemo((): Category[] => {
    const disciplineGroups: Group[] = [];
    const generalGroups: Group[] = [];
    const programGroups: Group[] = [];

    groups.forEach(group => {
      if (group.category === 'discipline') {
        disciplineGroups.push(group);
      } else if (group.category === 'program') {
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

  const toggleGroupSelection = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const toggleCategorySelection = (category: Category) => {
    const allSelected = category.groups.every(g => selectedGroups.has(g.id));
    const newSelected = new Set(selectedGroups);

    category.groups.forEach(group => {
      if (allSelected) {
        newSelected.delete(group.id);
      } else {
        newSelected.add(group.id);
      }
    });

    setSelectedGroups(newSelected);
  };

  const openAddGroupModal = () => {
    setEditingGroup(null);
    setGroupName("");
    setSelectedCategory("general");
    setIsModalOpen(true);
  };

  const openEditGroupModal = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setSelectedCategory(group.category as CategoryType);
    setIsModalOpen(true);
  };

  const handleSaveGroup = () => {
    if (!groupName.trim()) return;

    if (editingGroup) {
      // Edit existing group
      const updatedGroups = groups.map(g =>
        g.id === editingGroup.id
          ? { ...g, name: groupName.trim(), category: selectedCategory }
          : g
      );
      setGroups(updatedGroups);
      saveGroupsToStorage(updatedGroups);
    } else {
      // Add new group
      const newGroup: Group = {
        id: crypto.randomUUID(),
        name: groupName.trim(),
        category: selectedCategory,
        memberIds: [],
        assignmentIds: [],
        createdAt: new Date().toISOString(),
      };

      const updatedGroups = [...groups, newGroup];
      setGroups(updatedGroups);
      saveGroupsToStorage(updatedGroups);
    }

    // Reset and close modal
    setGroupName("");
    setSelectedCategory("general");
    setEditingGroup(null);
    setIsModalOpen(false);
  };

  const handleDeleteGroup = (group: Group) => {
    setDeleteConfirmGroup(group);
  };

  const confirmDeleteGroup = () => {
    if (!deleteConfirmGroup) return;

    const updatedGroups = groups.filter(g => g.id !== deleteConfirmGroup.id);
    setGroups(updatedGroups);
    saveGroupsToStorage(updatedGroups);

    // Remove from selected groups if it was selected
    const newSelected = new Set(selectedGroups);
    newSelected.delete(deleteConfirmGroup.id);
    setSelectedGroups(newSelected);

    setDeleteConfirmGroup(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold" data-testid="heading-groups">Groups</h1>
        <Button onClick={openAddGroupModal} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </Button>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="pt-6">
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
                                  category.groups.every(g => selectedGroups.has(g.id))
                                }
                                onCheckedChange={() => toggleCategorySelection(category)}
                              />
                            </TableHead>
                            <TableHead>Group name</TableHead>
                            <TableHead>Members</TableHead>
                            <TableHead>Assignments</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.groups.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No groups in this category
                              </TableCell>
                            </TableRow>
                          ) : (
                            category.groups.map((group) => (
                              <TableRow
                                key={group.id}
                                data-testid={`row-group-${group.name.toLowerCase().replace(/\s+/g, '-')}`}
                                className="hover-elevate"
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedGroups.has(group.id)}
                                    onCheckedChange={() => toggleGroupSelection(group.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{group.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {getMemberCount(group)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {group.assignmentIds?.length || 0}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditGroupModal(group)}
                                      className="h-8 w-8"
                                      title="Edit group"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteGroup(group)}
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      title="Delete group"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
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
        </CardContent>
      </Card>

      {/* Add/Edit Group Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Add Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && groupName.trim()) {
                    handleSaveGroup();
                  }
                }}
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
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingGroup(null);
                setGroupName("");
                setSelectedCategory("general");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={!groupName.trim()}
            >
              {editingGroup ? "Save Changes" : "Add Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmGroup} onOpenChange={(open) => !open && setDeleteConfirmGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmGroup?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
