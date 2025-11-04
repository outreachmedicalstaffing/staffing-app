import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SmartGroup {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  count: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GroupCategory {
  id: string;
  name: string;
  icon: string;
  groups: SmartGroup[];
}

// Convert Tailwind bg-color class to inline style
function getBgColorStyle(colorClass: string | null | undefined): React.CSSProperties {
  // If no color class provided, default to blue
  if (!colorClass || colorClass.trim() === '') {
    return { backgroundColor: '#3b82f6' }; // blue-500
  }

  // Map common Tailwind colors to their CSS values
  const colorMap: Record<string, string> = {
    'bg-red-500': '#ef4444',
    'bg-red-600': '#dc2626',
    'bg-orange-500': '#f97316',
    'bg-orange-600': '#ea580c',
    'bg-amber-500': '#f59e0b',
    'bg-amber-600': '#d97706',
    'bg-yellow-500': '#eab308',
    'bg-yellow-600': '#ca8a04',
    'bg-lime-500': '#84cc16',
    'bg-lime-600': '#65a30d',
    'bg-green-500': '#22c55e',
    'bg-green-600': '#16a34a',
    'bg-emerald-500': '#10b981',
    'bg-emerald-600': '#059669',
    'bg-teal-500': '#14b8a6',
    'bg-teal-600': '#0d9488',
    'bg-cyan-500': '#06b6d4',
    'bg-cyan-600': '#0891b2',
    'bg-sky-500': '#0ea5e9',
    'bg-sky-600': '#0284c7',
    'bg-blue-500': '#3b82f6',
    'bg-blue-600': '#2563eb',
    'bg-indigo-500': '#6366f1',
    'bg-indigo-600': '#4f46e5',
    'bg-violet-500': '#8b5cf6',
    'bg-violet-600': '#7c3aed',
    'bg-purple-500': '#a855f7',
    'bg-purple-600': '#9333ea',
    'bg-fuchsia-500': '#d946ef',
    'bg-fuchsia-600': '#c026d3',
    'bg-pink-500': '#ec4899',
    'bg-pink-600': '#db2777',
    'bg-rose-500': '#f43f5e',
    'bg-rose-600': '#e11d48',
    'bg-slate-500': '#64748b',
    'bg-slate-600': '#475569',
    'bg-gray-500': '#6b7280',
    'bg-gray-600': '#4b5563',
    'bg-zinc-500': '#71717a',
    'bg-zinc-600': '#52525b',
    'bg-neutral-500': '#737373',
    'bg-neutral-600': '#525252',
    'bg-stone-500': '#78716c',
    'bg-stone-600': '#57534e',
  };

  const color = colorMap[colorClass] || colorMap['bg-blue-500'];
  return { backgroundColor: color };
}

export default function SmartGroups() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["discipline", "general", "program"]);
  const [editingGroup, setEditingGroup] = useState<SmartGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<{ id: string; name: string } | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", count: 0, color: "" });
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: "", categoryId: "", color: "bg-blue-500" });
  const { toast } = useToast();

  const { data: smartGroups = [], isLoading, refetch } = useQuery<SmartGroup[]>({
    queryKey: ["/api/smart-groups"],
    staleTime: 0, // Always refetch to get latest groups
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; categoryId: string; categoryName: string; categoryIcon: string; count: number; color: string }) => {
      return await apiRequest("POST", "/api/smart-groups", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/smart-groups"] });
      await refetch(); // Explicitly refetch to ensure new group appears
      toast({ title: "Group created successfully" });
      setAddingGroup(false);
      setNewGroupData({ name: "", categoryId: "", color: "bg-blue-500" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SmartGroup> }) => {
      return await apiRequest("PATCH", `/api/smart-groups/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/smart-groups"] });
      await refetch(); // Explicitly refetch to ensure updates appear
      toast({ title: "Group updated successfully" });
      setEditingGroup(null);
      setEditFormData({ name: "", count: 0, color: "" });
    },
    onError: () => {
      toast({ title: "Failed to update group", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/smart-groups/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/smart-groups"] });
      await refetch(); // Explicitly refetch to ensure deletion is reflected
      toast({ title: "Group deleted successfully" });
      setDeletingGroup(null);
    },
    onError: () => {
      toast({ title: "Failed to delete group", variant: "destructive" });
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
    setExpandedCategories(["discipline", "general", "program"]);
  };

  const collapseAll = () => {
    setExpandedCategories([]);
  };

  const handleEditGroup = (group: SmartGroup) => {
    setEditingGroup(group);
    setEditFormData({ name: group.name, count: group.count, color: group.color });
  };

  const handleSaveEdit = () => {
    if (!editingGroup) return;
    updateMutation.mutate({
      id: editingGroup.id,
      data: editFormData,
    });
  };

  const handleDeleteGroup = (id: string, name: string) => {
    setDeletingGroup({ id, name });
  };

  const confirmDelete = () => {
    if (!deletingGroup) return;
    deleteMutation.mutate(deletingGroup.id);
  };

  const handleAddGroup = () => {
    setAddingGroup(true);
    setNewGroupData({ name: "", categoryId: "", color: "bg-blue-500" });
  };

  const handleSaveNewGroup = () => {
    if (!newGroupData.name || !newGroupData.categoryId) return;

    const categoryInfo = {
      discipline: { name: "Groups by Discipline", icon: "🩺" },
      general: { name: "General groups", icon: "👥" },
      program: { name: "Groups by Program", icon: "📋" },
    }[newGroupData.categoryId];

    if (!categoryInfo) return;

    createMutation.mutate({
      name: newGroupData.name,
      categoryId: newGroupData.categoryId,
      categoryName: categoryInfo.name,
      categoryIcon: categoryInfo.icon,
      count: 0,
      color: newGroupData.color,
    });
  };

  const groupsByCategory: GroupCategory[] = [
    {
      id: "discipline",
      name: "Groups by Discipline",
      icon: "🩺",
      groups: smartGroups.filter(g => g.categoryId === "discipline"),
    },
    {
      id: "general",
      name: "General groups",
      icon: "👥",
      groups: smartGroups.filter(g => g.categoryId === "general"),
    },
    {
      id: "program",
      name: "Groups by Program",
      icon: "📋",
      groups: smartGroups.filter(g => g.categoryId === "program"),
    },
  ];

  const filteredCategories = groupsByCategory.map(category => ({
    ...category,
    groups: category.groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.groups.length > 0);

  const totalGroups = smartGroups.length;

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
            onClick={expandedCategories.length === 3 ? collapseAll : expandAll}
            data-testid="button-expand-collapse"
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            {expandedCategories.length === 3 ? 'Collapse All' : 'Expand All'}
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
                            className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                            data-testid={`group-${group.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="h-3 w-3 rounded-full flex-shrink-0"
                                style={getBgColorStyle(group.color)}
                                title={group.color || 'No color set'}
                              />
                              <span className="text-sm font-medium">{group.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {group.count} {group.count === 1 ? 'member' : 'members'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditGroup(group);
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
                                  handleDeleteGroup(group.id, group.name);
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
              Update the group name, member count, and color.
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
              <Label htmlFor="member-count">Member Count</Label>
              <Input
                id="member-count"
                type="number"
                value={editFormData.count}
                onChange={(e) => setEditFormData(prev => ({ ...prev, count: parseInt(e.target.value) || 0 }))}
                placeholder="Enter member count"
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
                <div
                  className="h-6 w-6 rounded-full"
                  style={getBgColorStyle(editFormData.color)}
                />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
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
                <div
                  className="h-6 w-6 rounded-full"
                  style={getBgColorStyle(newGroupData.color)}
                />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingGroup(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewGroup} 
              disabled={!newGroupData.name || !newGroupData.categoryId || createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingGroup !== null} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingGroup(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
