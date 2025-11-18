import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Users as UsersIcon, UserX, User } from "lucide-react";
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
import { PROGRAM_OPTIONS } from "@/lib/constants";
import { useLocation } from "wouter";

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

async function syncGroupsToServer(groups: Group[]) {
  try {
    console.log("[Groups] Syncing groups to server...");
    const res = await apiRequest("POST", "/api/groups/sync", { groups });
    const result = await res.json();
    console.log("[Groups] Sync result:", result);
    return result;
  } catch (error) {
    console.error("[Groups] Failed to sync groups to server:", error);
    throw error;
  }
}

export default function Groups() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

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

  // Fetch users from API
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
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

  // Load groups from localStorage on mount
  useEffect(() => {
    const loadedGroups = loadGroupsFromStorage();
    setGroups(loadedGroups);
  }, []);

  // Sync groups to server when loaded
  useEffect(() => {
    if (isAdmin && groups.length > 0) {
      syncGroupsToServer(groups).catch(error => {
        console.error("[Groups] Failed to sync on mount:", error);
      });
    }
  }, [isAdmin, groups.length]); // Only sync when groups are loaded and user is admin

  // Create program groups from the predefined program options
  const autoProgramGroups = useMemo((): Group[] => {
    // Use the same program list as the user edit form
    return PROGRAM_OPTIONS.map(programName => ({
      id: `auto-program-${programName}`,
      name: programName,
      category: 'program',
      memberIds: [],
      assignmentIds: [],
      createdAt: new Date().toISOString(),
    }));
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
      // For program groups, count users who have this program in their customFields.programs
      // Users can have multiple programs assigned
      return users.filter(user => {
        // Check if user has customFields and programs array
        if (!user.customFields || typeof user.customFields !== 'object') {
          return false;
        }

        const customFields = user.customFields as Record<string, any>;
        const programs = customFields.programs;

        // Check if programs is an array and includes the group name
        return Array.isArray(programs) && programs.includes(group.name);
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

    // Only get discipline and general groups from localStorage
    // Program groups are now auto-generated from users
    groups.forEach(group => {
      if (group.category === 'discipline') {
        disciplineGroups.push(group);
      } else if (group.category === 'general') {
        generalGroups.push(group);
      }
      // Ignore manually created program groups - we use auto-generated ones instead
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
        groups: autoProgramGroups, // Use auto-generated program groups
      },
    ];
  }, [groups, autoProgramGroups]);

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

  const handleSaveGroup = async () => {
    if (!groupName.trim()) return;

    let updatedGroups: Group[];

    if (editingGroup) {
      // Edit existing group
      updatedGroups = groups.map(g =>
        g.id === editingGroup.id
          ? { ...g, name: groupName.trim(), category: selectedCategory }
          : g
      );
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

      updatedGroups = [...groups, newGroup];
    }

    setGroups(updatedGroups);
    saveGroupsToStorage(updatedGroups);

    // Sync to server
    try {
      await syncGroupsToServer(updatedGroups);
      toast({
        title: "Success",
        description: "Group saved and synced to server",
      });
    } catch (error) {
      toast({
        title: "Warning",
        description: "Group saved locally but failed to sync to server",
        variant: "destructive",
      });
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

  const confirmDeleteGroup = async () => {
    if (!deleteConfirmGroup) return;

    const updatedGroups = groups.filter(g => g.id !== deleteConfirmGroup.id);
    setGroups(updatedGroups);
    saveGroupsToStorage(updatedGroups);

    // Remove from selected groups if it was selected
    const newSelected = new Set(selectedGroups);
    newSelected.delete(deleteConfirmGroup.id);
    setSelectedGroups(newSelected);

    // Sync to server
    try {
      await syncGroupsToServer(updatedGroups);
      toast({
        title: "Success",
        description: "Group deleted and synced to server",
      });
    } catch (error) {
      toast({
        title: "Warning",
        description: "Group deleted locally but failed to sync to server",
        variant: "destructive",
      });
    }

    setDeleteConfirmGroup(null);
  };

  const handleViewMembers = (group: Group) => {
    setViewingGroup(group);
    setShowMembersModal(true);
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
                                <TableCell
                                  className="font-medium cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => handleViewMembers(group)}
                                >
                                  {group.name}
                                </TableCell>
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

      {/* Group Members Modal */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              {viewingGroup?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Members ({viewingGroup?.category === 'program'
                  ? users.filter(user => {
                      const userCustomFields = user.customFields as any;
                      const userPrograms = userCustomFields?.programs || [];
                      return Array.isArray(userPrograms) && userPrograms.includes(viewingGroup.name);
                    }).length
                  : viewingGroup?.memberIds?.length || 0
                })
              </h3>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {viewingGroup?.category === 'program' ? (
                // For program groups, show users who have this program in their customFields
                <>
                  {users.filter(user => {
                    const userCustomFields = user.customFields as any;
                    const userPrograms = userCustomFields?.programs || [];
                    return Array.isArray(userPrograms) && userPrograms.includes(viewingGroup.name);
                  }).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UsersIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No members in this program yet</p>
                    </div>
                  ) : (
                    users.filter(user => {
                      const userCustomFields = user.customFields as any;
                      const userPrograms = userCustomFields?.programs || [];
                      return Array.isArray(userPrograms) && userPrograms.includes(viewingGroup.name);
                    }).map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                            {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{user.fullName}</p>
                            <p className="text-sm text-muted-foreground">{user.role}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">Program Member</Badge>
                      </div>
                    ))
                  )}
                </>
              ) : (
                // For general/discipline groups, show members from memberIds
                <>
                  {(!viewingGroup?.memberIds || viewingGroup.memberIds.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UsersIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No members in this group yet</p>
                    </div>
                  ) : (
                    viewingGroup.memberIds.map(userId => {
                      const user = users.find(u => u.id === userId);
                      if (!user) return null;

                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                              {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-sm text-muted-foreground">{user.role}</p>
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Remove member from group
                                const updatedGroups = groups.map(g =>
                                  g.id === viewingGroup.id
                                    ? { ...g, memberIds: g.memberIds.filter(id => id !== userId) }
                                    : g
                                );
                                setGroups(updatedGroups);
                                saveGroupsToStorage(updatedGroups);
                                syncGroupsToServer(updatedGroups);
                                setViewingGroup({ ...viewingGroup, memberIds: viewingGroup.memberIds.filter(id => id !== userId) });
                                toast({
                                  title: "Success",
                                  description: "Member removed from group",
                                });
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
