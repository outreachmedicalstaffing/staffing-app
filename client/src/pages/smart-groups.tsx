import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight, UserPlus, Settings as SettingsIcon, Pencil, Trash2 } from "lucide-react";
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

interface SmartGroupType {
  id: string;
  name: string;
  count: number;
  category: string | null;
  color: string;
  creator?: { id: string; fullName: string } | null;
  administrator?: { id: string; fullName: string } | null;
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
  const [deletingGroup, setDeletingGroup] = useState<{ categoryId: string; groupId: string; groupName: string } | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", count: 0, color: "" });
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: "", categoryId: "", color: "bg-blue-500" });

  // Fetch smart groups from API
  const { data: smartGroups = [], isLoading } = useQuery<SmartGroupType[]>({
    queryKey: ["/api/smart-groups"],
  });

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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      console.log(`[Frontend] Deleting group with ID: ${groupId}`);
      const res = await fetch(`/api/smart-groups/${groupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete group");
      }
      return res.json();
    },
    onSuccess: (data, groupId) => {
      console.log(`[Frontend] Successfully deleted group: ${groupId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/smart-groups"] });
      setDeletingGroup(null); // Close dialog after successful deletion
      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error(`[Frontend] Failed to delete group:`, error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; color: string } }) => {
      const res = await fetch(`/api/smart-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-groups"] });
      toast({
        title: "Success",
        description: "Group updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update group",
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

    setEditingGroup(null);
    setEditFormData({ name: "", count: 0, color: "" });
  };

  const handleDeleteGroup = (categoryId: string, groupId: string, groupName: string) => {
    setDeletingGroup({ categoryId, groupId, groupName });
  };

  const confirmDelete = () => {
    if (!deletingGroup) return;

    console.log(`[Frontend] Confirming delete for group: ${deletingGroup.groupName} (${deletingGroup.groupId})`);
    deleteMutation.mutate(deletingGroup.groupId);
    // Dialog will close automatically on success via onSuccess callback
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
                        {category.groups.map((group) => (
                          <div
                            key={group.id}
                            className="flex items-center justify-between p-4 rounded-md border hover-elevate"
                            data-testid={`group-${group.id}`}
                          >
                            <div className="flex items-center gap-6 flex-1">
                              {/* Group name with color indicator */}
                              <div className="flex items-center gap-3 min-w-[200px]">
                                <div className={`h-3 w-3 rounded-full ${group.color}`} />
                                <span className="text-sm font-medium">{group.name}</span>
                              </div>

                              {/* Connected users */}
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <span className="text-xs text-muted-foreground">Connected:</span>
                                <Badge variant="secondary" className="text-xs">
                                  {group.count}/{group.count}
                                </Badge>
                              </div>

                              {/* Created by */}
                              <div className="flex items-center gap-2 min-w-[150px]">
                                <span className="text-xs text-muted-foreground">Created by:</span>
                                <span className="text-xs font-medium">
                                  {group.creator ? group.creator.fullName : "System"}
                                </span>
                              </div>

                              {/* Assignments dropdown placeholder */}
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <span className="text-xs text-muted-foreground">Assignments:</span>
                                <span className="text-xs">0 selected</span>
                              </div>

                              {/* Administered by */}
                              <div className="flex items-center gap-2 min-w-[150px]">
                                <span className="text-xs text-muted-foreground">Admin:</span>
                                {group.administrator ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                                      <span className="text-xs font-medium">
                                        {getInitials(group.administrator.fullName)}
                                      </span>
                                    </div>
                                    <span className="text-xs font-medium">
                                      {group.administrator.fullName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs">Unassigned</span>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditGroup(category.id, group);
                                }}
                                data-testid={`edit-group-${group.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGroup(category.id, group.id, group.name);
                                }}
                                data-testid={`delete-group-${group.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No groups found matching your search
          </div>
        )}
      </Card>

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
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingGroup !== null} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.groupName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingGroup(null)} disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
