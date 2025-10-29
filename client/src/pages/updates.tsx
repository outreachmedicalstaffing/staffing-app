import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Eye,
  Heart,
  MessageCircle,
  Trash2,
  Send,
  Calendar,
  Users,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Update {
  id: string;
  title: string;
  content: string;
  publishDate: string;
  createdBy: string;
  visibility: string;
  targetUserIds: string[] | null;
  targetGroups: string[] | null;
  status: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLikedByUser: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string;
}

interface SmartGroup {
  id: string;
  name: string;
}

export default function Updates() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null);
  const [newComment, setNewComment] = useState("");
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [openGroupSelect, setOpenGroupSelect] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    publishDate: new Date().toISOString().split("T")[0],
    visibility: "all",
    targetUserIds: [] as string[],
    targetGroups: [] as string[],
    status: "published",
  });

  // Get current user
  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/me"] });
  const isAdmin = user && ["Admin", "Owner"].includes(user.role);

  // Fetch all updates
  const { data: updates = [], isLoading } = useQuery<Update[]>({
    queryKey: ["/api/updates"],
  });

  // Fetch users for targeting
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  // Fetch smart groups for targeting
  const { data: smartGroups = [] } = useQuery<SmartGroup[]>({
    queryKey: ["/api/smart-groups"],
    enabled: isAdmin,
  });

  // Fetch comments for selected update
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/updates", selectedUpdate?.id, "comments"],
    enabled: !!selectedUpdate,
  });

  // Create update mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/updates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      toast({
        title: "Update created",
        description: "Your update has been created successfully",
      });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create update",
        variant: "destructive",
      });
    },
  });

  // Delete update mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/updates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      toast({
        title: "Update deleted",
        description: "The update has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete update",
        variant: "destructive",
      });
    },
  });

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/updates/${id}/like`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
    },
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({
      updateId,
      content,
    }: {
      updateId: string;
      content: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/updates/${updateId}/comments`,
        { content }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/updates", selectedUpdate?.id, "comments"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      publishDate: new Date().toISOString().split("T")[0],
      visibility: "all",
      targetUserIds: [],
      targetGroups: [],
      status: "published",
    });
  };

  const handleCreateUpdate = () => {
    if (!formData.title || !formData.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleViewUpdate = async (update: Update) => {
    setSelectedUpdate(update);
    setShowViewDialog(true);

    // Mark as viewed
    try {
      await apiRequest("GET", `/api/updates/${update.id}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
    } catch (error) {
      console.error("Failed to mark update as viewed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Updates</h1>
          <p className="text-muted-foreground">
            Company announcements and updates
          </p>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-updates">
            Updates
          </h1>
          <p className="text-muted-foreground">
            Company announcements and updates
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            data-testid="button-create-update"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Update
          </Button>
        )}
      </div>

      {/* Updates Feed */}
      <div className="space-y-4">
        {updates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground text-center">
                No updates available
              </p>
            </CardContent>
          </Card>
        ) : (
          updates.map((update) => (
            <Card
              key={update.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewUpdate(update)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{update.title}</CardTitle>
                    <CardDescription className="mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(update.publishDate), "MMM d, yyyy")}
                      {isAdmin && (
                        <Badge variant="outline" className="ml-2">
                          {update.status}
                        </Badge>
                      )}
                      {update.visibility !== "all" && (
                        <Badge variant="secondary" className="ml-2">
                          <Users className="h-3 w-3 mr-1" />
                          {update.visibility === "specific_users"
                            ? "Specific Users"
                            : "Specific Groups"}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(update.id);
                      }}
                      data-testid={`button-delete-update-${update.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {update.content}
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    {update.viewCount}
                  </div>
                  <button
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      likeMutation.mutate(update.id);
                    }}
                  >
                    <Heart
                      className={`h-4 w-4 ${update.isLikedByUser ? "fill-current text-red-500" : ""}`}
                    />
                    {update.likeCount}
                  </button>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    {update.commentCount}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Update Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Update</DialogTitle>
            <DialogDescription>
              Share an announcement or update with your team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter update title"
                data-testid="input-update-title"
              />
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Enter update content"
                rows={6}
                data-testid="textarea-update-content"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publishDate">Publish Date</Label>
                <Input
                  id="publishDate"
                  type="date"
                  value={formData.publishDate}
                  onChange={(e) =>
                    setFormData({ ...formData, publishDate: e.target.value })
                  }
                  data-testid="input-publish-date"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) =>
                  setFormData({ ...formData, visibility: value })
                }
              >
                <SelectTrigger data-testid="select-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="specific_groups">
                    Specific Groups
                  </SelectItem>
                  <SelectItem value="specific_users">
                    Specific Users
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.visibility === "specific_users" && (
              <div>
                <Label>Target Users</Label>
                <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openUserSelect}
                      className="w-full justify-between mt-2"
                      data-testid="button-select-users"
                    >
                      {formData.targetUserIds.length > 0
                        ? `${formData.targetUserIds.length} user(s) selected`
                        : "Select users..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search users..." />
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => {
                              const isSelected = formData.targetUserIds.includes(user.id);
                              setFormData({
                                ...formData,
                                targetUserIds: isSelected
                                  ? formData.targetUserIds.filter((id) => id !== user.id)
                                  : [...formData.targetUserIds, user.id],
                              });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.targetUserIds.includes(user.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {user.fullName} ({user.role})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.targetUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.targetUserIds.map((userId) => {
                      const user = users.find((u) => u.id === userId);
                      return user ? (
                        <Badge key={userId} variant="secondary">
                          {user.fullName}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            {formData.visibility === "specific_groups" && (
              <div>
                <Label>Target Groups</Label>
                <Popover open={openGroupSelect} onOpenChange={setOpenGroupSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openGroupSelect}
                      className="w-full justify-between mt-2"
                      data-testid="button-select-groups"
                    >
                      {formData.targetGroups.length > 0
                        ? `${formData.targetGroups.length} group(s) selected`
                        : "Select groups..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search groups..." />
                      <CommandEmpty>No groups found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {smartGroups.map((group) => (
                          <CommandItem
                            key={group.id}
                            onSelect={() => {
                              const isSelected = formData.targetGroups.includes(group.id);
                              setFormData({
                                ...formData,
                                targetGroups: isSelected
                                  ? formData.targetGroups.filter((id) => id !== group.id)
                                  : [...formData.targetGroups, group.id],
                              });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.targetGroups.includes(group.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {group.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.targetGroups.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.targetGroups.map((groupId) => {
                      const group = smartGroups.find((g) => g.id === groupId);
                      return group ? (
                        <Badge key={groupId} variant="secondary">
                          {group.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUpdate}
              disabled={createMutation.isPending}
              data-testid="button-save-update"
            >
              {createMutation.isPending ? "Creating..." : "Create Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Update Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedUpdate && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedUpdate.title}</DialogTitle>
                <DialogDescription>
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {format(
                    new Date(selectedUpdate.publishDate),
                    "MMM d, yyyy"
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedUpdate.content}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 py-4 border-y">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    {selectedUpdate.viewCount} views
                  </div>
                  <button
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => likeMutation.mutate(selectedUpdate.id)}
                  >
                    <Heart
                      className={`h-4 w-4 ${selectedUpdate.isLikedByUser ? "fill-current text-red-500" : ""}`}
                    />
                    {selectedUpdate.likeCount} likes
                  </button>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    {selectedUpdate.commentCount} comments
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h3 className="font-semibold mb-4">Comments</h3>

                  {/* Add comment */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && newComment.trim()) {
                          commentMutation.mutate({
                            updateId: selectedUpdate.id,
                            content: newComment,
                          });
                        }
                      }}
                      data-testid="input-new-comment"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newComment.trim()) {
                          commentMutation.mutate({
                            updateId: selectedUpdate.id,
                            content: newComment,
                          });
                        }
                      }}
                      disabled={
                        !newComment.trim() || commentMutation.isPending
                      }
                      data-testid="button-post-comment"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Comments list */}
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-3 border rounded-md bg-muted/30"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {comment.userName}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {comment.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(
                                  new Date(comment.createdAt),
                                  "MMM d, yyyy h:mm a"
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
