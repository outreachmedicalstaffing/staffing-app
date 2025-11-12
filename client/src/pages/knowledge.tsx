import { useState } from "react";
import { KnowledgeItem } from "@/components/knowledge-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, FolderOpen, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Article = {
  id: string;
  title: string;
  type: "page" | "pdf" | "folder";
  description: string;
  category: string;
  lastUpdated: string;
  publishStatus: "published" | "draft";
  content?: string;
};

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewArticle, setViewArticle] = useState<Article | null>(null);
  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedContent, setEditedContent] = useState("");

  // Create Article state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<string>("Getting Started");
  const [newType, setNewType] = useState<"page" | "pdf" | "folder">("page");
  const [newContent, setNewContent] = useState("");
  const [newStatus, setNewStatus] = useState<"published" | "draft">("draft");

  const [gettingStartedDocuments, setGettingStartedDocuments] = useState<Article[]>([
    { id: "0", title: "Welcome to Outreach Medical Staffing", type: "page" as const, description: "Your guide to getting started", category: "Getting Started", lastUpdated: "1 day ago", publishStatus: "published" as const, content: "# Welcome to Outreach Medical Staffing\n\nWelcome to our team! This guide will help you get started with our platform and learn the basics.\n\n## Quick Start Steps\n1. Complete your profile\n2. Review our employee handbook\n3. Set up your schedule preferences\n4. Review required compliance training\n\n## Important Resources\n- Employee Handbook\n- Safety Protocols\n- Contact Information\n\n## Questions?\nReach out to your supervisor or HR team for assistance." },
  ]);

  const [hrDocuments, setHrDocuments] = useState<Article[]>([
    { id: "1", title: "Employee Handbook", type: "page" as const, description: "Complete guide for all employees", category: "HR", lastUpdated: "2 days ago", publishStatus: "published" as const, content: "# Employee Handbook\n\nWelcome to our organization! This handbook contains important policies, procedures, and guidelines that govern employment with our company.\n\n## Code of Conduct\nAll employees are expected to maintain professional behavior and treat colleagues with respect.\n\n## Work Hours\nStandard work hours are 9:00 AM to 5:00 PM, Monday through Friday.\n\n## Benefits\nWe offer competitive benefits including health insurance, retirement plans, and paid time off." },
    { id: "2", title: "New Hire Checklist", type: "page" as const, description: "Step-by-step onboarding process", category: "HR", lastUpdated: "1 day ago", publishStatus: "draft" as const, content: "# New Hire Checklist\n\n## Before Day One\n- [ ] Complete employment paperwork\n- [ ] Submit I-9 documentation\n- [ ] Enroll in benefits\n\n## First Day\n- [ ] Meet your team\n- [ ] Complete IT setup\n- [ ] Review company policies\n\n## First Week\n- [ ] Complete required training\n- [ ] Set up email and accounts\n- [ ] Schedule one-on-one with manager" },
  ]);

  const [complianceDocuments, setComplianceDocuments] = useState<Article[]>([
    { id: "3", title: "HIPAA Compliance Training", type: "pdf" as const, description: "Required annual training materials", category: "Compliance", lastUpdated: "1 week ago", publishStatus: "published" as const, content: "# HIPAA Compliance Training\n\nThis document contains essential information about HIPAA compliance requirements.\n\n## What is HIPAA?\nThe Health Insurance Portability and Accountability Act (HIPAA) establishes standards for protecting sensitive patient health information.\n\n## Key Requirements\n- Maintain patient privacy at all times\n- Secure all electronic health records\n- Report any potential breaches immediately" },
    { id: "4", title: "Safety Protocols", type: "folder" as const, description: "Workplace safety guidelines", category: "Compliance", lastUpdated: "2 weeks ago", publishStatus: "published" as const, content: "# Safety Protocols\n\nThis folder contains comprehensive safety guidelines for all workplace situations.\n\n## General Safety\n- Always wear appropriate PPE\n- Report hazards immediately\n- Keep emergency exits clear\n\n## Emergency Contacts\n- Security: x5555\n- First Aid: x5556\n- Facilities: x5557" },
  ]);

  const [operationsDocuments, setOperationsDocuments] = useState<Article[]>([
    { id: "5", title: "Shift Protocols", type: "folder" as const, description: "Standard operating procedures", category: "Operations", lastUpdated: "3 weeks ago", publishStatus: "published" as const, content: "# Shift Protocols\n\n## Shift Changes\n- Arrive 15 minutes before your shift\n- Complete handoff documentation\n- Review pending tasks\n\n## Documentation\n- Log all activities in the system\n- Complete end-of-shift reports\n- Note any issues for the next shift" },
    { id: "6", title: "Emergency Procedures", type: "page" as const, description: "Critical response guidelines", category: "Operations", lastUpdated: "5 days ago", publishStatus: "published" as const, content: "# Emergency Procedures\n\n## Fire Emergency\n1. Activate fire alarm\n2. Evacuate immediately\n3. Call 911\n4. Meet at designated assembly point\n\n## Medical Emergency\n1. Call for help\n2. Do not move the injured person\n3. Provide first aid if trained\n4. Contact emergency services\n\n## Severe Weather\n1. Move to designated shelter area\n2. Stay away from windows\n3. Monitor weather alerts\n4. Wait for all-clear signal" },
  ]);

  const handleView = (article: Article) => {
    setViewArticle(article);
  };

  const handleEdit = (article: Article) => {
    setEditArticle(article);
    setEditedTitle(article.title);
    setEditedDescription(article.description);
    setEditedContent(article.content || "");
  };

  const handleSaveEdit = () => {
    // In a real app, this would save to a backend
    console.log("Saving article:", {
      id: editArticle?.id,
      title: editedTitle,
      description: editedDescription,
      content: editedContent,
    });
    setEditArticle(null);
  };

  const handleOpenCreateModal = () => {
    // Reset form fields
    setNewTitle("");
    setNewDescription("");
    setNewCategory("Getting Started");
    setNewType("page");
    setNewContent("");
    setNewStatus("draft");
    setShowCreateModal(true);
  };

  const handleCreateArticle = () => {
    // Validate required fields
    if (!newTitle.trim() || !newDescription.trim()) {
      alert("Please fill in both title and description");
      return;
    }

    // Generate a new ID (in a real app, this would come from the backend)
    const newId = String(Date.now());

    // Create the new article
    const newArticle: Article = {
      id: newId,
      title: newTitle,
      description: newDescription,
      category: newCategory,
      type: newType,
      content: newContent,
      publishStatus: newStatus,
      lastUpdated: "just now",
    };

    // Add to the appropriate category
    if (newCategory === "Getting Started") {
      setGettingStartedDocuments([...gettingStartedDocuments, newArticle]);
    } else if (newCategory === "HR") {
      setHrDocuments([...hrDocuments, newArticle]);
    } else if (newCategory === "Compliance") {
      setComplianceDocuments([...complianceDocuments, newArticle]);
    } else if (newCategory === "Operations") {
      setOperationsDocuments([...operationsDocuments, newArticle]);
    }

    // Close modal and reset form
    setShowCreateModal(false);
    console.log("Created new article:", newArticle);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-knowledge">Knowledge Base</h1>
          <p className="text-muted-foreground">Access policies, procedures, and training materials</p>
        </div>
        <Button onClick={handleOpenCreateModal} data-testid="button-create-article">
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
          data-testid="input-search-knowledge"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All Content
          </TabsTrigger>
          <TabsTrigger value="getting-started" data-testid="tab-getting-started">
            Getting Started
          </TabsTrigger>
          <TabsTrigger value="hr" data-testid="tab-hr">
            <FolderOpen className="h-4 w-4 mr-2" />
            HR
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            Compliance
          </TabsTrigger>
          <TabsTrigger value="operations" data-testid="tab-operations">
            Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Articles & Resources</CardTitle>
              <CardDescription>{gettingStartedDocuments.length + hrDocuments.length + complianceDocuments.length + operationsDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...gettingStartedDocuments, ...hrDocuments, ...complianceDocuments, ...operationsDocuments].map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => handleView(item)}
                    onEdit={() => handleEdit(item)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="getting-started" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>{gettingStartedDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {gettingStartedDocuments.map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => handleView(item)}
                    onEdit={() => handleEdit(item)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HR & People</CardTitle>
              <CardDescription>{hrDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hrDocuments.map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => handleView(item)}
                    onEdit={() => handleEdit(item)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Training</CardTitle>
              <CardDescription>{complianceDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {complianceDocuments.map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => handleView(item)}
                    onEdit={() => handleEdit(item)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>{operationsDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {operationsDocuments.map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => handleView(item)}
                    onEdit={() => handleEdit(item)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Article Dialog */}
      <Dialog open={!!viewArticle} onOpenChange={() => setViewArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewArticle?.title}</DialogTitle>
            <DialogDescription>{viewArticle?.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Category:</span>
              <span>{viewArticle?.category}</span>
              <span className="mx-2">•</span>
              <span>Updated {viewArticle?.lastUpdated}</span>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{viewArticle?.content}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Article Dialog */}
      <Dialog open={!!editArticle} onOpenChange={() => setEditArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>Make changes to the article below</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Article title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Article content (supports markdown)"
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditArticle(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Article Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Article</DialogTitle>
            <DialogDescription>Add a new article to the knowledge base</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Title *</Label>
              <Input
                id="new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Article title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-description">Description *</Label>
              <Input
                id="new-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-category">Category *</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger id="new-category">
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
                <Label htmlFor="new-type">Type</Label>
                <Select value={newType} onValueChange={(value) => setNewType(value as "page" | "pdf" | "folder")}>
                  <SelectTrigger id="new-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page">Page</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="folder">Folder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-status">Status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as "published" | "draft")}>
                  <SelectTrigger id="new-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-content">Content</Label>
              <Textarea
                id="new-content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Article content (supports markdown)"
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateArticle}>
                Create Article
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
