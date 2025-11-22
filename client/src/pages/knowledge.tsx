import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, FileText, Eye, Check, ChevronsUpDown, Trash2, Upload, X, Download, Paperclip } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PROGRAM_OPTIONS } from "@/lib/constants";
import type { KnowledgeArticle, User } from "@shared/schema";

type Article = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: "Getting Started" | "HR" | "Compliance" | "Operations" | "VITAS" | "Documentation" | "Contact";
  publishStatus: "draft" | "published";
  visibility?: string;
  targetGroupIds?: string[] | null;
  content: string | null;
  authorId: string;
  attachments?: string[] | null;
  lastUpdated: Date;
  createdAt: Date;
};

interface ProgramGroup {
  id: string;
  name: string;
}

export default function Knowledge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current user to check role
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = currentUser?.role?.toLowerCase() === "owner" || currentUser?.role?.toLowerCase() === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteConfirmArticle, setDeleteConfirmArticle] = useState<Article | null>(null);
  const [openProgramSelect, setOpenProgramSelect] = useState(false);

  // Form fields for Create Article
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<"Getting Started" | "HR" | "Compliance" | "Operations" | "VITAS" | "Documentation" | "Contact">("Getting Started");
  const [newVisibility, setNewVisibility] = useState("all");
  const [newTargetProgramIds, setNewTargetProgramIds] = useState<string[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form fields for Edit Article
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<"Getting Started" | "HR" | "Compliance" | "Operations" | "VITAS" | "Documentation" | "Contact">("Getting Started");
  const [editVisibility, setEditVisibility] = useState("all");
  const [editTargetProgramIds, setEditTargetProgramIds] = useState<string[]>([]);
  const [editContent, setEditContent] = useState("");
  const [editAttachments, setEditAttachments] = useState<string[]>([]);
  const [openEditProgramSelect, setOpenEditProgramSelect] = useState(false);

  // Create program groups from the predefined program options
  const programGroups = useMemo((): ProgramGroup[] => {
    return PROGRAM_OPTIONS.map(programName => ({
      id: `auto-program-${programName}`,
      name: programName,
    }));
  }, []);

  // Fetch articles from API
  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/knowledge"],
  });

  // Create article mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create article");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      toast({ title: "Article created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create article", variant: "destructive" });
    },
  });

  // Update article mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update article");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      toast({ title: "Article updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update article", variant: "destructive" });
    },
  });

  // Delete article mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete article");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      toast({ title: "Article deleted successfully" });
      setDeleteConfirmArticle(null);
    },
    onError: () => {
      toast({ title: "Failed to delete article", variant: "destructive" });
    },
  });

  const handleDeleteArticle = () => {
    if (deleteConfirmArticle) {
      deleteMutation.mutate(deleteConfirmArticle.id);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();

      // Add the file URL to attachments
      if (isEdit) {
        setEditAttachments([...editAttachments, data.url]);
      } else {
        setNewAttachments([...newAttachments, data.url]);
      }

      toast({ title: "File uploaded successfully" });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (url: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditAttachments(editAttachments.filter(a => a !== url));
    } else {
      setNewAttachments(newAttachments.filter(a => a !== url));
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Getting Started":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "HR":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Compliance":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "Operations":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "VITAS":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      case "Documentation":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Contact":
        return "bg-teal-100 text-teal-800 hover:bg-teal-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getIconColor = (category: string) => {
    switch (category) {
      case "Getting Started":
        return "text-blue-600";
      case "HR":
        return "text-yellow-600";
      case "Compliance":
        return "text-red-600";
      case "Operations":
        return "text-purple-600";
      case "VITAS":
        return "text-orange-600";
      case "Documentation":
        return "text-green-600";
      case "Contact":
        return "text-teal-600";
      default:
        return "text-gray-600";
    }
  };

  const filterArticlesByCategory = (category?: string) => {
    if (!category) return articles;
    return articles.filter((article) => article.category === category);
  };

  const handleSaveArticle = async () => {
    if (!newTitle.trim()) {
      toast({ title: "Please fill in the title", variant: "destructive" });
      return;
    }

    await createMutation.mutateAsync({
      title: newTitle,
      description: "",
      type: "page",
      category: newCategory,
      publishStatus: "published",
      visibility: newVisibility,
      targetGroupIds: newTargetProgramIds.length > 0 ? newTargetProgramIds : null,
      content: newContent || "",
      attachments: newAttachments.length > 0 ? newAttachments : null,
    });

    // Reset form
    setNewTitle("");
    setNewCategory("Getting Started");
    setNewVisibility("all");
    setNewTargetProgramIds([]);
    setNewContent("");
    setNewAttachments([]);
    setShowCreateDialog(false);
  };

  const handleViewArticle = (article: Article) => {
    setViewingArticle(article);
    setShowViewDialog(true);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setEditTitle(article.title);
    setEditCategory(article.category);
    setEditVisibility(article.visibility || "all");
    setEditTargetProgramIds(article.targetGroupIds || []);
    setEditContent(article.content || "");
    setEditAttachments(article.attachments || []);
    setShowEditDialog(true);
  };

  const handleUpdateArticle = async () => {
    if (!editTitle.trim()) {
      toast({ title: "Please fill in the title", variant: "destructive" });
      return;
    }

    if (!editingArticle) return;

    await updateMutation.mutateAsync({
      id: editingArticle.id,
      data: {
        title: editTitle,
        category: editCategory,
        publishStatus: "published",
        visibility: editVisibility,
        targetGroupIds: editTargetProgramIds.length > 0 ? editTargetProgramIds : null,
        content: editContent,
        attachments: editAttachments.length > 0 ? editAttachments : null,
      },
    });

    // Reset form
    setEditingArticle(null);
    setEditTitle("");
    setEditCategory("Getting Started");
    setEditVisibility("all");
    setEditTargetProgramIds([]);
    setEditContent("");
    setEditAttachments([]);
    setShowEditDialog(false);
  };

  // Format timestamp helper
  const formatTimestamp = (date: Date | string) => {
    if (!date) return "Unknown";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
    return d.toLocaleDateString();
  };

  // Extract filename from URL
  const getFilenameFromUrl = (url: string) => {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    // Try to extract original name (before timestamp)
    const match = filename.match(/^(.+)-\d+-\d+(\..+)$/);
    if (match) {
      return match[1] + match[2];
    }
    return filename;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading articles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Access policies, procedures, and training materials
          </p>
        </div>
        {isAdmin && (
          <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Article
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search knowledge base..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue={isAdmin ? "all" : "getting-started"} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
            {isAdmin && (
              <TabsTrigger value="all">
                All Content
              </TabsTrigger>
            )}
            <TabsTrigger value="getting-started">
              Getting Started
            </TabsTrigger>
            <TabsTrigger value="hr">
              HR
            </TabsTrigger>
            <TabsTrigger value="compliance">
              Compliance
            </TabsTrigger>
            <TabsTrigger value="operations">
              Operations
            </TabsTrigger>
            <TabsTrigger value="vitas">
              VITAS
            </TabsTrigger>
            <TabsTrigger value="documentation">
              Documentation
            </TabsTrigger>
            <TabsTrigger value="contact-info">
              Contact
            </TabsTrigger>
          </TabsList>
        </div>

        {isAdmin && (
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Articles & Resources</CardTitle>
                <CardDescription>{articles.length} items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {articles.map((article) => (
                    <Card key={article.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3">
                            <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                              {article.description && (
                                <p className="text-sm text-muted-foreground">{article.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <Badge className={getCategoryColor(article.category)}>
                              {article.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Updated {formatTimestamp(article.lastUpdated)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {isAdmin && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleEditArticle(article)}>
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmArticle(article)} className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="getting-started" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>{filterArticlesByCategory("Getting Started").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Getting Started").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            {article.description && (
                              <p className="text-sm text-muted-foreground">{article.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(article.lastUpdated)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEditArticle(article)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmArticle(article)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HR & People</CardTitle>
              <CardDescription>{filterArticlesByCategory("HR").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("HR").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            {article.description && (
                              <p className="text-sm text-muted-foreground">{article.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(article.lastUpdated)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEditArticle(article)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmArticle(article)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Training</CardTitle>
              <CardDescription>{filterArticlesByCategory("Compliance").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Compliance").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            {article.description && (
                              <p className="text-sm text-muted-foreground">{article.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(article.lastUpdated)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEditArticle(article)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmArticle(article)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>{filterArticlesByCategory("Operations").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Operations").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            {article.description && (
                              <p className="text-sm text-muted-foreground">{article.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(article.lastUpdated)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEditArticle(article)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmArticle(article)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vitas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>VITAS</CardTitle>
              <CardDescription>{filterArticlesByCategory("VITAS").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("VITAS").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            {article.description && (
                              <p className="text-sm text-muted-foreground">{article.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(article.lastUpdated)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEditArticle(article)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmArticle(article)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
              <CardDescription>{filterArticlesByCategory("Documentation").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Documentation").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            {article.description && (
                              <p className="text-sm text-muted-foreground">{article.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(article.lastUpdated)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEditArticle(article)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmArticle(article)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>{filterArticlesByCategory("Contact").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Contact").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            {article.description && (
                              <p className="text-sm text-muted-foreground">{article.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(article.lastUpdated)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEditArticle(article)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmArticle(article)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Article Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Article</DialogTitle>
            <DialogDescription>
              Add a new article to the knowledge base
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="article-title">
                Title <span className="text-red-600">*</span>
              </Label>
              <Input
                id="article-title"
                placeholder="Article title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-category">Category</Label>
              <Select value={newCategory} onValueChange={(value) => setNewCategory(value as any)}>
                <SelectTrigger id="article-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Getting Started">Getting Started</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Compliance">Compliance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="VITAS">VITAS</SelectItem>
                  <SelectItem value="Documentation">Documentation</SelectItem>
                  <SelectItem value="Contact">Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-visibility">Visibility</Label>
              <Select value={newVisibility} onValueChange={(value) => setNewVisibility(value)}>
                <SelectTrigger id="article-visibility">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="specific_programs">Specific Programs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newVisibility === "specific_programs" && (
              <div className="space-y-2">
                <Label>Target Programs</Label>
                <Popover open={openProgramSelect} onOpenChange={setOpenProgramSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openProgramSelect}
                      className="w-full justify-between"
                    >
                      {newTargetProgramIds.length > 0
                        ? `${newTargetProgramIds.length} program(s) selected`
                        : "Select programs..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search programs..." />
                      <CommandEmpty>No programs found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {programGroups.map((program) => (
                          <CommandItem
                            key={program.id}
                            onSelect={() => {
                              const isSelected = newTargetProgramIds.includes(program.id);
                              setNewTargetProgramIds(
                                isSelected
                                  ? newTargetProgramIds.filter((id) => id !== program.id)
                                  : [...newTargetProgramIds, program.id]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newTargetProgramIds.includes(program.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {program.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {newTargetProgramIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTargetProgramIds.map((programId) => {
                      const program = programGroups.find((g) => g.id === programId);
                      return program ? (
                        <Badge key={programId} variant="secondary">
                          {program.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="article-content">Content (Supports Markdown)</Label>
              <Textarea
                id="article-content"
                placeholder="Write your article content here..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div className="text-sm text-gray-600 text-center">
                    <label htmlFor="file-upload-new" className="cursor-pointer text-red-600 hover:text-red-700 font-medium">
                      Click to upload
                    </label>
                    <input
                      id="file-upload-new"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, false);
                          e.target.value = '';
                        }
                      }}
                      disabled={uploadingFile}
                    />
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Excel, Text, or Images (max 10MB)
                  </p>
                </div>
              </div>

              {newAttachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {newAttachments.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{getFilenameFromUrl(url)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttachment(url, false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveArticle}>
              Save Article
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Article Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingArticle?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getCategoryColor(viewingArticle?.category || "")}>
                  {viewingArticle?.category}
                </Badge>
                <Badge variant={viewingArticle?.publishStatus === "published" ? "default" : "secondary"}>
                  {viewingArticle?.publishStatus === "published" ? "Published" : "Draft"}
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  Updated {viewingArticle ? formatTimestamp(viewingArticle.lastUpdated) : "Unknown"}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div
              className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm"
              dangerouslySetInnerHTML={{
                __html: (viewingArticle?.content || "No content available")
                  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="pointer-events: none; user-select: none; -webkit-user-drag: none;" oncontextmenu="return false;" draggable="false" />')
              }}
              onContextMenu={(e) => {
                if ((e.target as HTMLElement).tagName === 'IMG') {
                  e.preventDefault();
                }
              }}
              style={{
                // Prevent image download via CSS
                ['--tw-prose-img' as any]: 'pointer-events: none; user-select: none; -webkit-user-drag: none;'
              }}
            />
          </div>

          {viewingArticle?.attachments && viewingArticle.attachments.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </h3>
              <div className="space-y-2">
                {viewingArticle.attachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium">{getFilenameFromUrl(url)}</span>
                    </div>
                    <Download className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {isAdmin && (
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setShowViewDialog(false);
                  if (viewingArticle) {
                    handleEditArticle(viewingArticle);
                  }
                }}
              >
                Edit Article
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Article Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>
              Update the article in the knowledge base
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-article-title">
                Title <span className="text-red-600">*</span>
              </Label>
              <Input
                id="edit-article-title"
                placeholder="Article title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-article-category">Category</Label>
              <Select value={editCategory} onValueChange={(value) => setEditCategory(value as any)}>
                <SelectTrigger id="edit-article-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Getting Started">Getting Started</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Compliance">Compliance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="VITAS">VITAS</SelectItem>
                  <SelectItem value="Documentation">Documentation</SelectItem>
                  <SelectItem value="Contact">Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-article-visibility">Visibility</Label>
              <Select value={editVisibility} onValueChange={(value) => setEditVisibility(value)}>
                <SelectTrigger id="edit-article-visibility">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="specific_programs">Specific Programs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editVisibility === "specific_programs" && (
              <div className="space-y-2">
                <Label>Target Programs</Label>
                <Popover open={openEditProgramSelect} onOpenChange={setOpenEditProgramSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openEditProgramSelect}
                      className="w-full justify-between"
                    >
                      {editTargetProgramIds.length > 0
                        ? `${editTargetProgramIds.length} program(s) selected`
                        : "Select programs..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search programs..." />
                      <CommandEmpty>No programs found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {programGroups.map((program) => (
                          <CommandItem
                            key={program.id}
                            onSelect={() => {
                              const isSelected = editTargetProgramIds.includes(program.id);
                              setEditTargetProgramIds(
                                isSelected
                                  ? editTargetProgramIds.filter((id) => id !== program.id)
                                  : [...editTargetProgramIds, program.id]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editTargetProgramIds.includes(program.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {program.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {editTargetProgramIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTargetProgramIds.map((programId) => {
                      const program = programGroups.find((g) => g.id === programId);
                      return program ? (
                        <Badge key={programId} variant="secondary">
                          {program.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-article-content">Content (Supports Markdown)</Label>
              <Textarea
                id="edit-article-content"
                placeholder="Write your article content here..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div className="text-sm text-gray-600 text-center">
                    <label htmlFor="file-upload-edit" className="cursor-pointer text-red-600 hover:text-red-700 font-medium">
                      Click to upload
                    </label>
                    <input
                      id="file-upload-edit"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, true);
                          e.target.value = '';
                        }
                      }}
                      disabled={uploadingFile}
                    />
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Excel, Text, or Images (max 10MB)
                  </p>
                </div>
              </div>

              {editAttachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {editAttachments.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{getFilenameFromUrl(url)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttachment(url, true)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleUpdateArticle}>
              Update Article
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmArticle} onOpenChange={() => setDeleteConfirmArticle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmArticle?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteArticle} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
