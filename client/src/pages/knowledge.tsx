import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, FileText, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Article = {
  id: string;
  title: string;
  description: string;
  category: "Getting Started" | "HR" | "Compliance" | "Operations";
  status: "Draft" | "Published";
  content: string;
  lastUpdated: string;
};

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Form fields for Create Article
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<"Getting Started" | "HR" | "Compliance" | "Operations">("Getting Started");
  const [newStatus, setNewStatus] = useState<"Draft" | "Published">("Draft");
  const [newContent, setNewContent] = useState("");

  // Form fields for Edit Article
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<"Getting Started" | "HR" | "Compliance" | "Operations">("Getting Started");
  const [editStatus, setEditStatus] = useState<"Draft" | "Published">("Draft");
  const [editContent, setEditContent] = useState("");

  // Sample articles data
  const [articles, setArticles] = useState<Article[]>([
    {
      id: "1",
      title: "Welcome to Outreach Medical Staffing",
      description: "Your guide to getting started with our platform",
      category: "Getting Started",
      status: "Published",
      content: "# Welcome\n\nGet started with our platform...",
      lastUpdated: "2 days ago",
    },
    {
      id: "2",
      title: "Employee Handbook",
      description: "Complete guide for all employees",
      category: "HR",
      status: "Published",
      content: "# Employee Handbook\n\nPolicies and procedures...",
      lastUpdated: "1 week ago",
    },
    {
      id: "3",
      title: "HIPAA Compliance Training",
      description: "Required annual training materials",
      category: "Compliance",
      status: "Published",
      content: "# HIPAA Training\n\nCompliance requirements...",
      lastUpdated: "3 days ago",
    },
    {
      id: "4",
      title: "Shift Protocols",
      description: "Standard operating procedures for shifts",
      category: "Operations",
      status: "Published",
      content: "# Shift Protocols\n\nOperating procedures...",
      lastUpdated: "5 days ago",
    },
    {
      id: "5",
      title: "New Hire Onboarding Checklist",
      description: "Step-by-step process for new employees",
      category: "Getting Started",
      status: "Draft",
      content: "# Onboarding Checklist\n\nSteps for new hires...",
      lastUpdated: "1 day ago",
    },
    {
      id: "6",
      title: "Time Off Request Policy",
      description: "How to request and manage time off",
      category: "HR",
      status: "Published",
      content: "# Time Off Policy\n\nRequest procedures...",
      lastUpdated: "2 weeks ago",
    },
  ]);

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
      default:
        return "text-gray-600";
    }
  };

  const filterArticlesByCategory = (category?: string) => {
    if (!category) return articles;
    return articles.filter((article) => article.category === category);
  };

  const handleSaveArticle = () => {
    if (!newTitle.trim()) {
      alert("Please fill in the title");
      return;
    }

    const newArticle: Article = {
      id: Date.now().toString(),
      title: newTitle,
      description: "",
      category: newCategory,
      status: newStatus,
      content: newContent,
      lastUpdated: "just now",
    };

    setArticles([...articles, newArticle]);

    // Reset form
    setNewTitle("");
    setNewCategory("Getting Started");
    setNewStatus("Draft");
    setNewContent("");
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
    setEditStatus(article.status);
    setEditContent(article.content);
    setShowEditDialog(true);
  };

  const handleUpdateArticle = () => {
    if (!editTitle.trim()) {
      alert("Please fill in the title");
      return;
    }

    if (!editingArticle) return;

    const updatedArticles = articles.map((article) =>
      article.id === editingArticle.id
        ? {
            ...article,
            title: editTitle,
            category: editCategory,
            status: editStatus,
            content: editContent,
            lastUpdated: "just now",
          }
        : article
    );

    setArticles(updatedArticles);

    // Reset form
    setEditingArticle(null);
    setEditTitle("");
    setEditCategory("Getting Started");
    setEditStatus("Draft");
    setEditContent("");
    setShowEditDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Access policies, procedures, and training materials
          </p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Article
        </Button>
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

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Content
          </TabsTrigger>
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
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Articles & Resources</CardTitle>
              <CardDescription>{articles.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditArticle(article)}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="getting-started" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>{filterArticlesByCategory("Getting Started").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Getting Started").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditArticle(article)}>
                            Edit
                          </Button>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("HR").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditArticle(article)}>
                            Edit
                          </Button>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Compliance").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditArticle(article)}>
                            Edit
                          </Button>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Operations").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewArticle(article)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditArticle(article)}>
                            Edit
                          </Button>
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

            <div className="grid grid-cols-2 gap-4">
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="article-status">Status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as any)}>
                  <SelectTrigger id="article-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                <Badge variant={viewingArticle?.status === "Published" ? "default" : "secondary"}>
                  {viewingArticle?.status}
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  Updated {viewingArticle?.lastUpdated}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm">
              {viewingArticle?.content}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
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

            <div className="grid grid-cols-2 gap-4">
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-article-status">Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as any)}>
                  <SelectTrigger id="edit-article-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
    </div>
  );
}
