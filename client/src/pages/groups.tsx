import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("general");

  // Load groups from localStorage on mount
  useEffect(() => {
    const loadedGroups = loadGroupsFromStorage();
    setGroups(loadedGroups);
  }, []);

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

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: newGroupName.trim(),
      category: selectedCategory,
      memberIds: [],
      assignmentIds: [],
      createdAt: new Date().toISOString(),
    };

    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    saveGroupsToStorage(updatedGroups);

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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.groups.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
                                  {group.memberIds?.length || 0}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {group.assignmentIds?.length || 0}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGroupName.trim()) {
                    handleAddGroup();
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
              onClick={() => setIsAddGroupModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddGroup}
              disabled={!newGroupName.trim()}
            >
              Add Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
