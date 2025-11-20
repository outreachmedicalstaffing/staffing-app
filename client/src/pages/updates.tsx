import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { format } from "date-fns";
import { PROGRAM_OPTIONS } from "@/lib/constants";
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
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Search,
  Paperclip,
  X,
  Upload,
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
  targetGroupIds: string[] | null;
  status: string;
  metadata: string | null;
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

interface Group {
  id: string;
  name: string;
  category: string;
  memberIds: string[];
  assignmentIds: string[];
  createdAt: string;
}

type CategoryType = "discipline" | "general" | "program";

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

export default function Updates() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [newComment, setNewComment] = useState("");
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [openGroupSelect, setOpenGroupSelect] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    publishDate: new Date().toISOString().split("T")[0],
    visibility: "all",
    targetUserIds: [] as string[],
    targetGroupIds: [] as string[],
    status: "published",
  });

  // Get current user
  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/me"] });
  const isAdmin = user && ["Admin", "Owner"].includes(user.role);

  // Fetch all updates
  const { data: updatesRaw = [], isLoading, dataUpdatedAt } = useQuery<Update[]>({
    queryKey: ["/api/updates"],
  });

  // Log when updates data changes
  useEffect(() => {
    console.log("[Updates Page] Updates data changed:", {
      count: updatesRaw.length,
      timestamp: new Date().toISOString(),
      dataUpdatedAt,
      updates: updatesRaw.map(u => ({ id: u.id, title: u.title, status: u.status })),
    });
  }, [updatesRaw, dataUpdatedAt]);

  // Sort updates by createdAt descending (newest first) as a safety measure
  const updates = useMemo(() => {
    console.log("[Updates Page] Sorting updates, count:", updatesRaw.length);
    return [...updatesRaw].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [updatesRaw]);

  // Filter updates based on search query and exclude system notifications
  const filteredUpdates = useMemo(() => {
    // First filter out system notifications (time entry approvals/edits)
    const nonSystemUpdates = updates.filter(update => {
      if (!update.metadata) return true;
      try {
        const metadata = JSON.parse(update.metadata);
        // Exclude time entry system notifications from the main feed
        return metadata.type !== 'time_entry_approval' && metadata.type !== 'time_entry_edit';
      } catch {
        return true;
      }
    });

    // Then apply search filter if there's a search query
    if (!searchQuery.trim()) {
      return nonSystemUpdates;
    }

    const searchLower = searchQuery.toLowerCase();
    return nonSystemUpdates.filter(update => {
      // Search in title
      if (update.title.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Search in content
      if (update.content.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Search in formatted date
      const formattedDate = format(new Date(update.publishDate), "MMM d, yyyy").toLowerCase();
      if (formattedDate.includes(searchLower)) {
        return true;
      }
      return false;
    });
  }, [updates, searchQuery]);

  // Fetch users for targeting
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  // Debug: Log users when they change
  useEffect(() => {
    if (users.length > 0) {
      console.log('[Updates] Loaded users for targeting:', users.length, 'users');
      console.log('[Updates] User list:', users.map(u => ({ id: u.id, name: u.fullName, role: u.role })));
    }
  }, [users]);

  // Fetch comments for selected update
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/updates", selectedUpdate?.id, "comments"],
    enabled: !!selectedUpdate,
  });

  // Load groups from localStorage on mount
  useEffect(() => {
    const loadedGroups = loadGroupsFromStorage();
    setGroups(loadedGroups);
  }, []);

  // Debug attachment state changes
  useEffect(() => {
    console.log('[Attachment] State changed:', attachment);
  }, [attachment]);

  // Create program groups from the predefined program options
  const autoProgramGroups = useMemo((): Group[] => {
    return PROGRAM_OPTIONS.map(programName => ({
      id: `auto-program-${programName}`,
      name: programName,
      category: 'program',
      memberIds: [],
      assignmentIds: [],
      createdAt: new Date().toISOString(),
    }));
  }, []);

  // Combine all groups (stored groups + auto-generated program groups)
  const allGroups = useMemo(() => {
    const disciplineGroups: Group[] = [];
    const generalGroups: Group[] = [];

    // Only get discipline and general groups from localStorage
    groups.forEach(group => {
      if (group.category === 'discipline') {
        disciplineGroups.push(group);
      } else if (group.category === 'general') {
        generalGroups.push(group);
      }
    });

    // Combine all groups
    return [...disciplineGroups, ...generalGroups, ...autoProgramGroups];
  }, [groups, autoProgramGroups]);

  // Create update mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log("[Updates Page] Creating update:", data);
      const res = await apiRequest("POST", "/api/updates", data);
      const result = await res.json();
      console.log("[Updates Page] Update created:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("[Updates Page] Create success, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      console.log("[Updates Page] Queries invalidated");
      toast({
        title: "Update created",
        description: "Your update has been created successfully",
      });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("[Updates Page] Create error:", error);
      toast({
        title: "Error",
        description: "Failed to create update",
        variant: "destructive",
      });
    },
  });

  // Update/edit mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      console.log("[Update Edit] Sending update request:", { id, data });
      const res = await apiRequest("PATCH", `/api/updates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      toast({
        title: "Update saved",
        description: "Your update has been saved successfully",
      });
      setShowCreateDialog(false);
      setEditingUpdate(null);
      resetForm();
    },
    onError: (error: any) => {
      console.error("[Update Edit] Error:", error.message || error);
      toast({
        title: "Error",
        description: error.message || "Failed to save update",
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

  // Approve time entry mutation
  const approveTimeEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await apiRequest("POST", `/api/time/entries/${entryId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      toast({
        title: "Time entry approved",
        description: "The time entry edit has been approved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve time entry",
        variant: "destructive",
      });
    },
  });

  // Reject time entry mutation
  const rejectTimeEntryMutation = useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason?: string }) => {
      const res = await apiRequest("POST", `/api/time/entries/${entryId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      toast({
        title: "Time entry rejected",
        description: "The time entry edit has been rejected and reverted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject time entry",
        variant: "destructive",
      });
    },
  });

  // Filter pending approval updates
  const pendingApprovals = useMemo(() => {
    if (!isAdmin) return [];
    return updates.filter((update) => {
      if (!update.metadata) return false;
      try {
        const metadata = JSON.parse(update.metadata);
        return metadata.type === 'time_entry_edit' && metadata.needsApproval;
      } catch {
        return false;
      }
    });
  }, [updates, isAdmin]);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      publishDate: new Date().toISOString().split("T")[0],
      visibility: "all",
      targetUserIds: [],
      targetGroupIds: [],
      status: "published",
    });
    setAttachment(null);
  };

  // Button click handler - opens file picker
  const handleAttachmentButtonClick = () => {
    if (isUploadingAttachment) {
      console.log('[Upload] Blocked: already uploading');
      return;
    }
    console.log('[Upload] Opening file picker');
    fileInputRef.current?.click();
  };

  // File selection handler - uploads the file
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file || isUploadingAttachment) {
      console.log('[Upload] Skipping:', { hasFile: !!file, uploading: isUploadingAttachment });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    console.log('[Upload] Starting upload for:', file.name);
    setIsUploadingAttachment(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/updates/attachment', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Upload] Success:', data);

      setAttachment(data);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

    } catch (error: any) {
      console.error('[Upload] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAttachment(false);
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = () => {
    console.log('[Upload] Removing attachment');
    setAttachment(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

    // Convert publishDate from date string to ISO timestamp
    const publishDateTimestamp = new Date(formData.publishDate).toISOString();
    const dataToSend = {
      ...formData,
      publishDate: publishDateTimestamp,
      attachments: attachment ? [attachment] : [],
    };

    if (editingUpdate) {
      // Update existing update
      updateMutation.mutate({ id: editingUpdate.id, data: dataToSend });
    } else {
      // Create new update
      createMutation.mutate(dataToSend);
    }
  };

  const handleEditUpdate = (update: Update) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      content: update.content,
      publishDate: update.publishDate ? new Date(update.publishDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      visibility: update.visibility,
      targetUserIds: update.targetUserIds || [],
      targetGroupIds: update.targetGroupIds || [],
      status: update.status,
    });
    setAttachment(update.attachments && update.attachments.length > 0 ? update.attachments[0] : null);
    setShowCreateDialog(true);
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
            {isAdmin && pendingApprovals.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingApprovals.length} Pending
              </Badge>
            )}
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

      {/* Search Bar */}
      <div className="flex justify-end">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-updates"
          />
        </div>
      </div>

      {/* Pending Approvals Section */}
      {isAdmin && pendingApprovals.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Clock className="h-5 w-5" />
              Pending Time Entry Approvals
              <Badge variant="destructive">{pendingApprovals.length}</Badge>
            </CardTitle>
            <CardDescription>
              The following time entry edits require your approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((update) => {
              const metadata = JSON.parse(update.metadata || '{}');
              return (
                <div
                  key={update.id}
                  className="bg-white rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{update.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                        {update.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {format(new Date(update.publishDate), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approveTimeEntryMutation.mutate(metadata.entryId)}
                      disabled={approveTimeEntryMutation.isPending}
                      data-testid={`button-approve-${metadata.entryId}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt("Reason for rejection (optional):");
                        rejectTimeEntryMutation.mutate({
                          entryId: metadata.entryId,
                          reason: reason || undefined
                        });
                      }}
                      disabled={rejectTimeEntryMutation.isPending}
                      data-testid={`button-reject-${metadata.entryId}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Updates Feed */}
      <div className="space-y-4">
        {filteredUpdates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground text-center">
                {searchQuery.trim() ? "No updates found matching your search" : "No updates available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUpdates.map((update) => (
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUpdate(update);
                        }}
                        data-testid={`button-edit-update-${update.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
                    </div>
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

      {/* Create/Edit Update Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setEditingUpdate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUpdate ? "Edit Update" : "Create Update"}</DialogTitle>
            <DialogDescription>
              {editingUpdate ? "Update the announcement details" : "Share an announcement or update with your team"}
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
                  <SelectItem value="specific_users">
                    Specific Users
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.visibility === "specific_users" && (
              <>
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
                        <CommandEmpty>
                          {isLoadingUsers ? "Loading users..." : "No users found."}
                        </CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {isLoadingUsers ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Loading users...
                            </div>
                          ) : users.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No users available
                            </div>
                          ) : (
                            users.map((user) => (
                              <CommandItem
                                key={user.id}
                                onSelect={() => {
                                  console.log('[Target Users] Toggling user:', user.fullName);
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
                            ))
                          )}
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
                        {formData.targetGroupIds.length > 0
                          ? `${formData.targetGroupIds.length} group(s) selected`
                          : "Select groups..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search groups..." />
                        <CommandEmpty>No groups found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {allGroups.map((group) => (
                            <CommandItem
                              key={group.id}
                              onSelect={() => {
                                const isSelected = formData.targetGroupIds.includes(group.id);
                                setFormData({
                                  ...formData,
                                  targetGroupIds: isSelected
                                    ? formData.targetGroupIds.filter((id) => id !== group.id)
                                    : [...formData.targetGroupIds, group.id],
                                });
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.targetGroupIds.includes(group.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {group.name} ({group.category})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formData.targetGroupIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.targetGroupIds.map((groupId) => {
                        const group = allGroups.find((g) => g.id === groupId);
                        return group ? (
                          <Badge key={groupId} variant="secondary">
                            {group.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Attachment Upload Section */}
            <div className="border-t pt-4 mt-4">
              <Label>Attachment (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Add one file to this update (max 10MB)
              </p>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
              />

              {!attachment ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAttachmentButtonClick}
                  disabled={isUploadingAttachment}
                  className="w-full"
                >
                  {isUploadingAttachment ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-4 w-4 mr-2" />
                      Add Attachment
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Paperclip className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAttachment}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
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
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-update"
            >
              {editingUpdate
                ? (updateMutation.isPending ? "Saving..." : "Save Changes")
                : (createMutation.isPending ? "Creating..." : "Create Update")}
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

                {/* Attachment */}
                {selectedUpdate.attachments && selectedUpdate.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Attachment</h3>
                    <a
                      href={selectedUpdate.attachments[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 border rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Paperclip className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedUpdate.attachments[0].name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedUpdate.attachments[0].size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </a>
                  </div>
                )}

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
