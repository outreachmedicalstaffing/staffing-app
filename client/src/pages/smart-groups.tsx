import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight, UserPlus, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GroupMember {
  id: string;
  userId: string;
  fullName: string;
  role?: string;
  addedAt: string;
}

interface SmartGroupType {
  id: string;
  name: string;
  count: number;
  category: string | null;
  color: string;
  creator?: { id: string; fullName: string } | null;
  administrator?: { id: string; fullName: string } | null;
  members?: GroupMember[];
}

interface GroupCategory {
  id: string;
  name: string;
  icon: string;
  groups: SmartGroupType[];
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(" ");
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

export default function SmartGroups() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["discipline", "general", "program"]);
  const [editingGroup, setEditingGroup] = useState<{ categoryId: string; group: SmartGroupType } | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", count: 0, color: "" });
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: "", categoryId: "", color: "bg-blue-500" });
  const [pendingMemberRemovals, setPendingMemberRemovals] = useState<Map<string, Set<string>>>(new Map());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch smart groups from API
  const { data: smartGroups = [], isLoading, refetch } = useQuery<SmartGroupType[]>({
    queryKey: ["/api/smart-groups"],
  });

  // Seed mutation for populating initial data
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/smart-groups/seed", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to seed groups");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Initial groups have been created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed groups",
        variant: "destructive",
      });
    },
  });

  // Fetch members for a specific group
  const fetchGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    const res = await fetch(`/api/smart-groups/${groupId}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.members || [];
  };

  // Toggle group expansion and fetch members if needed
  const toggleGroupExpansion = async (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      // Fetch members if not already loaded
      const group = smartGroups.find(g => g.id === groupId);
      if (group && !group.members) {
        const members = await fetchGroupMembers(groupId);
        // Update the group with members
        queryClient.setQueryData(["/api/smart-groups"], (old: SmartGroupType[] = []) =>
          old.map(g => g.id === groupId ? { ...g, members } : g)
        );
      }
    }
    setExpandedGroups(newExpanded);
  };

  // Transform API data into category structure for UI
  const categories: GroupCategory[] = [
    {
      id: "discipline",
      name: "Groups by Discipline",
      icon: "🩺",
      groups: smartGroups.filter(g => g.category === "discipline")
    },
    {
      id: "general",
      name: "General groups",
      icon: "👥",
      groups: smartGroups.filter(g => g.category === "general")
    },
    {
      id: "program",
      name: "Groups by Program",
      icon: "📋",
      groups: smartGroups.filter(g => g.category === "program")
    }
  ];

  // Handle removing a member from a group (marks for removal)
  const handleRemoveMember = (groupId: string, memberId: string) => {
    setPendingMemberRemovals(prev => {
      const newMap = new Map(prev);
      const groupRemovals = newMap.get(groupId) || new Set();
      groupRemovals.add(memberId);
      newMap.set(groupId, groupRemovals);
      return newMap;
    });
  };

  // Check if a member is pending removal
  const isMemberPendingRemoval = (groupId: string, memberId: string): boolean => {
    return pendingMemberRemovals.get(groupId)?.has(memberId) || false;
  };

  // Get visible members for a group (excluding pending removals)
  const getVisibleMembers = (group: SmartGroupType): GroupMember[] => {
    if (!group.members) return [];
    const pendingRemovals = pendingMemberRemovals.get(group.id) || new Set();
    return group.members.filter(member => !pendingRemovals.has(member.id));
  };

  // Calculate total pending removals across all groups
  const getTotalPendingRemovals = (): number => {
    let total = 0;
    pendingMemberRemovals.forEach(set => {
      total += set.size;
    });
    return total;
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; color: string } }) => {
      console.log(`[Frontend] Updating group ${id} with data:`, data);
      const res = await fetch(`/api/smart-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update group");
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log(`[Frontend] Successfully updated group:`, data);
      queryClient.invalidateQueries({ queryKey: ["/api/smart-groups"] });
      setEditingGroup(null);
      setEditFormData({ name: "", count: 0, color: "" });
      toast({
        title: "Success",
        description: "Group updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error(`[Frontend] Failed to update group:`, error);
      toast({
        title: "Error",
        description: error.message || "Failed to update group",
        variant: "destructive",
      });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; color: string }) => {
      const res = await fetch("/api/smart-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-groups"] });
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const expandAll = () => {
    setExpandedCategories(categories.map(c => c.id));
  };

  const collapseAll = () => {
    setExpandedCategories([]);
  };

  const handleEditGroup = (categoryId: string, group: { id: string; name: string; count: number; color: string }) => {
    setEditingGroup({ categoryId, group });
    setEditFormData({ name: group.name, count: group.count, color: group.color });
  };

  const handleSaveEdit = () => {
    if (!editingGroup) return;

    updateMutation.mutate({
      id: editingGroup.group.id,
      data: {
        name: editFormData.name,
        color: editFormData.color,
      },
    });
    // Don't close dialog here - it will close in onSuccess callback
  };

  const handleSaveChanges = async () => {
    const totalRemovals = getTotalPendingRemovals();
    if (totalRemovals === 0) return;

    try {
      // Remove all pending members from their groups
      const removalPromises: Promise<Response>[] = [];

      pendingMemberRemovals.forEach((memberIds, groupId) => {
        memberIds.forEach(memberId => {
          // Extract userId from member (need to find the member object)
          const group = smartGroups.find(g => g.id === groupId);
          const member = group?.members?.find(m => m.id === memberId);
          if (member) {
            removalPromises.push(
              fetch(`/api/smart-groups/${groupId}/members/${member.userId}`, {
                method: "DELETE",
                credentials: "include",
              })
            );
          }
        });
      });

      const results = await Promise.all(removalPromises);
      const failedRemovals = results.filter(res => !res.ok);

      if (failedRemovals.length > 0) {
        throw new Error(`Failed to remove ${failedRemovals.length} member(s)`);
      }

      // Clear pending removals and refresh
      setPendingMemberRemovals(new Map());
      queryClient.invalidateQueries({ queryKey: ["/api/smart-groups"] });

      toast({
        title: "Success",
        description: `Successfully removed ${totalRemovals} member(s) from groups`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const handleCancelChanges = () => {
    setPendingMemberRemovals(new Map());
    toast({
      title: "Cancelled",
      description: "All pending changes have been discarded",
    });
  };

  const handleAddGroup = () => {
    setAddingGroup(true);
    setNewGroupData({ name: "", categoryId: "", color: "bg-blue-500" });
  };

  const handleSaveNewGroup = () => {
    if (!newGroupData.name || !newGroupData.categoryId) return;

    createMutation.mutate({
      name: newGroupData.name,
      category: newGroupData.categoryId,
      color: newGroupData.color,
    });

    setAddingGroup(false);
    setNewGroupData({ name: "", categoryId: "", color: "bg-blue-500" });
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    groups: category.groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.groups.length > 0);

  const totalGroups = categories.reduce((sum, cat) => sum + cat.groups.length, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold" data-testid="heading-groups">Groups</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" data-testid="button-permissions">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Permissions
          </Button>
          <Button variant="outline" size="sm" data-testid="button-settings">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Card className="p-6">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandedCategories.length === categories.length ? collapseAll : expandAll}
            data-testid="button-expand-collapse"
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            {expandedCategories.length === categories.length ? 'Collapse All' : 'Expand All'}
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-groups"
              />
            </div>
            <Button size="sm" onClick={handleAddGroup} data-testid="button-add-segment">
              <UserPlus className="h-4 w-4 mr-2" />
              Add segment
            </Button>
          </div>
        </div>

        {/* Group Categories */}
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);
            const groupCount = category.groups.length;

            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <div className="border rounded-md">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover-elevate" data-testid={`category-${category.id}`}>
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-lg">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {groupCount} {groupCount === 1 ? 'group' : 'groups'}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2">
                      <div className="space-y-2">
                        {category.groups.map((group) => {
                          const isGroupExpanded = expandedGroups.has(group.id);
                          const visibleMembers = getVisibleMembers(group);

                          return (
                            <div
                              key={group.id}
                              className="rounded-md border"
                              data-testid={`group-${group.id}`}
                            >
                              {/* Group Header - Click to expand/collapse members */}
                              <div
                                className="flex items-center justify-between p-4 cursor-pointer hover-elevate"
                                onClick={() => toggleGroupExpansion(group.id)}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  {isGroupExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}

                                  <div className={`h-3 w-3 rounded-full ${group.color}`} />
                                  <span className="text-sm font-medium">{group.name}</span>

                                  <Badge variant="secondary" className="text-xs">
                                    {visibleMembers.length} {visibleMembers.length === 1 ? 'member' : 'members'}
                                  </Badge>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditGroup(category.id, group);
                                  }}
                                  className="text-xs"
                                >
                                  Edit Group
                                </Button>
                              </div>

                              {/* Members List - Shown when expanded */}
                              {isGroupExpanded && (
                                <div className="border-t bg-muted/30">
                                  {visibleMembers.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground text-center">
                                      No members in this group
                                    </div>
                                  ) : (
                                    <div className="p-2 space-y-1">
                                      {visibleMembers.map((member) => (
                                        <div
                                          key={member.id}
                                          className="flex items-center justify-between p-3 rounded hover:bg-background transition-colors"
                                          data-testid={`member-${member.id}`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                                              <span className="text-xs font-medium">
                                                {getInitials(member.fullName)}
                                              </span>
                                            </div>
                                            <div>
                                              <div className="text-sm font-medium">{member.fullName}</div>
                                              {member.role && (
                                                <div className="text-xs text-muted-foreground">{member.role}</div>
                                              )}
                                            </div>
                                          </div>

                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemoveMember(group.id, member.id)}
                                            data-testid={`remove-member-${member.id}`}
                                            title="Remove from group"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {smartGroups.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No groups found. Click below to create initial groups.</p>
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? "Creating Groups..." : "Create Initial Groups"}
            </Button>
          </div>
        )}

        {filteredCategories.length === 0 && smartGroups.length > 0 && (
          <div className="text-center text-muted-foreground py-12">
            No groups found matching your search
          </div>
        )}
      </Card>

      {/* Save/Cancel buttons - sticky at bottom when there are pending changes */}
      {getTotalPendingRemovals() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-primary shadow-lg">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {getTotalPendingRemovals()} member{getTotalPendingRemovals() !== 1 ? 's' : ''} pending removal from groups
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelChanges}
                  data-testid="button-cancel-changes"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  data-testid="button-save-changes"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Dialog */}
      <Dialog open={editingGroup !== null} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group name and color.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter group name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-color">Color Class</Label>
              <Input
                id="group-color"
                value={editFormData.color}
                onChange={(e) => setEditFormData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="e.g., bg-blue-500"
              />
              <div className="flex items-center gap-2 mt-2">
                <div className={`h-6 w-6 rounded-full ${editFormData.color}`} />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingGroup(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Group Dialog */}
      <Dialog open={addingGroup} onOpenChange={(open) => !open && setAddingGroup(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Group</DialogTitle>
            <DialogDescription>
              Create a new group by providing a name, selecting a category, and choosing a color.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-group-name">Group Name</Label>
              <Input
                id="new-group-name"
                value={newGroupData.name}
                onChange={(e) => setNewGroupData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter group name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-group-category">Category</Label>
              <Select
                value={newGroupData.categoryId}
                onValueChange={(value) => setNewGroupData(prev => ({ ...prev, categoryId: value }))}
              >
                <SelectTrigger id="new-group-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discipline">Groups by Discipline</SelectItem>
                  <SelectItem value="general">General groups</SelectItem>
                  <SelectItem value="program">Groups by Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-group-color">Color Class</Label>
              <Input
                id="new-group-color"
                value={newGroupData.color}
                onChange={(e) => setNewGroupData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="e.g., bg-blue-500"
              />
              <div className="flex items-center gap-2 mt-2">
                <div className={`h-6 w-6 rounded-full ${newGroupData.color}`} />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingGroup(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewGroup} disabled={!newGroupData.name || !newGroupData.categoryId}>
              Add Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
