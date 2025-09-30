import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight, UserPlus, Settings as SettingsIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GroupCategory {
  id: string;
  name: string;
  icon: string;
  groups: Array<{ id: string; name: string; count: number; color: string }>;
}

export default function SmartGroups() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["discipline", "general", "program"]);

  const categories: GroupCategory[] = [
    {
      id: "discipline",
      name: "Groups by Discipline",
      icon: "🩺",
      groups: [
        { id: "rn", name: "Registered Nurses (RN)", count: 45, color: "bg-blue-500" },
        { id: "lpn", name: "Licensed Practical Nurses (LPN)", count: 28, color: "bg-purple-500" },
        { id: "cna", name: "Certified Nursing Assistants (CNA)", count: 62, color: "bg-green-500" },
        { id: "manager", name: "Managers", count: 8, color: "bg-orange-500" },
      ]
    },
    {
      id: "general",
      name: "General groups",
      icon: "👥",
      groups: [
        { id: "full-time", name: "Full-time Staff", count: 98, color: "bg-teal-500" },
        { id: "part-time", name: "Part-time Staff", count: 45, color: "bg-cyan-500" },
      ]
    },
    {
      id: "program",
      name: "Groups by Program",
      icon: "📋",
      groups: [
        { id: "vitas-vhvp", name: "Vitas VHVP", count: 32, color: "bg-pink-500" },
        { id: "vitas-central", name: "Vitas Central Florida", count: 28, color: "bg-indigo-500" },
        { id: "vitas-west", name: "Vitas West Jacksonville", count: 24, color: "bg-red-500" },
        { id: "advent-ipu", name: "Advent/Health IPU", count: 18, color: "bg-yellow-500" },
        { id: "haven-hospice", name: "Haven Hospice", count: 15, color: "bg-emerald-500" },
        { id: "brevard", name: "Vitas Brevard", count: 12, color: "bg-violet-500" },
        { id: "palm-coast", name: "Gentiva Palm Coast", count: 10, color: "bg-fuchsia-500" },
        { id: "daytona", name: "Gentiva Daytona", count: 9, color: "bg-rose-500" },
        { id: "deland", name: "Gentiva DeLand", count: 8, color: "bg-sky-500" },
        { id: "orlando", name: "Gentiva Orlando", count: 11, color: "bg-lime-500" },
        { id: "kissimmee", name: "Gentiva Kissimmee", count: 7, color: "bg-amber-500" },
        { id: "nature-coast", name: "Vitas Nature Coast", count: 6, color: "bg-teal-600" },
        { id: "citrus", name: "Vitas Citrus", count: 5, color: "bg-cyan-600" },
        { id: "jacksonville", name: "Vitas Jacksonville", count: 14, color: "bg-purple-600" },
        { id: "st-johns", name: "Vitas St. Johns", count: 8, color: "bg-pink-600" },
        { id: "treasure-coast", name: "Treasure Coast", count: 9, color: "bg-orange-600" },
        { id: "st-augustine", name: "St. Augustine", count: 6, color: "bg-blue-600" },
        { id: "vero-beach", name: "Vero Beach", count: 5, color: "bg-green-600" },
        { id: "stuart", name: "Stuart", count: 4, color: "bg-red-600" },
        { id: "port-st-lucie", name: "Port St. Lucie", count: 7, color: "bg-indigo-600" },
        { id: "melbourne", name: "Melbourne", count: 6, color: "bg-yellow-600" },
        { id: "cocoa", name: "Cocoa Beach", count: 3, color: "bg-emerald-600" },
      ]
    }
  ];

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

  const filteredCategories = categories.map(category => ({
    ...category,
    groups: category.groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.groups.length > 0);

  const totalGroups = categories.reduce((sum, cat) => sum + cat.groups.length, 0);

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
            <Button size="sm" data-testid="button-add-segment">
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
                            className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer"
                            data-testid={`group-${group.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-3 w-3 rounded-full ${group.color}`} />
                              <span className="text-sm font-medium">{group.name}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {group.count} {group.count === 1 ? 'member' : 'members'}
                            </Badge>
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
    </div>
  );
}
