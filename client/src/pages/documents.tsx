import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, CheckCircle, Clock, AlertTriangle, Search, FileText, Eye, Upload, X, Trash } from "lucide-react";

interface Document {
  id: string;
  title: string;
  description: string;
  expirationDate: string;
  uploadedDate: string;
  fileName?: string;
  notes: string;
  visibleToUsers: boolean;
  enableUserUpload: boolean;
  requireReview: boolean;
  status?: "approved" | "expired" | "pending";
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [visibleToUsers, setVisibleToUsers] = useState(true);
  const [enableUserUpload, setEnableUserUpload] = useState(true);
  const [requireReview, setRequireReview] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documentToUpload, setDocumentToUpload] = useState<Document | null>(null);
  const [uploadModalFile, setUploadModalFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");

  // Get current user to check role
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Check if user is admin or owner (case-insensitive check)
  const isAdmin = currentUser?.role?.toLowerCase() === "owner" || currentUser?.role?.toLowerCase() === "admin";

  // Load documents from localStorage on mount
  useEffect(() => {
    const savedDocuments = localStorage.getItem("documents");
    if (savedDocuments) {
      try {
        const parsedDocuments = JSON.parse(savedDocuments);
        setDocuments(parsedDocuments);
      } catch (error) {
        console.error("Error loading documents from localStorage:", error);
      }
    }
  }, []);

  const resetForm = () => {
    setDocumentTitle("");
    setDocumentDescription("");
    setHasExpiration(false);
    setExpirationDate("");
    setUploadFile(null);
    setNotes("");
    setVisibleToUsers(true);
    setEnableUserUpload(true);
    setRequireReview(true);
    setIsEditMode(false);
    setEditingDocumentId(null);
  };

  const handleEditDocument = (doc: Document) => {
    // Pre-fill form with document data
    setDocumentTitle(doc.title);
    setDocumentDescription(doc.description);
    setHasExpiration(!!doc.expirationDate);
    setExpirationDate(doc.expirationDate);
    setNotes(doc.notes);
    setVisibleToUsers(doc.visibleToUsers);
    setEnableUserUpload(doc.enableUserUpload);
    setRequireReview(doc.requireReview);

    // Set edit mode
    setIsEditMode(true);
    setEditingDocumentId(doc.id);

    // Open modal
    setShowCreateModal(true);
  };

  const handleSaveDocument = () => {
    if (!documentTitle.trim()) {
      alert("Please enter a document title");
      return;
    }

    if (isEditMode && editingDocumentId) {
      // Update existing document
      const updatedDocuments = documents.map(doc => {
        if (doc.id === editingDocumentId) {
          return {
            ...doc,
            title: documentTitle,
            description: documentDescription,
            expirationDate: hasExpiration ? expirationDate : "",
            fileName: uploadFile?.name || doc.fileName,
            notes: notes,
            visibleToUsers: visibleToUsers,
            enableUserUpload: enableUserUpload,
            requireReview: requireReview,
          };
        }
        return doc;
      });

      setDocuments(updatedDocuments);
      localStorage.setItem("documents", JSON.stringify(updatedDocuments));
    } else {
      // Create new document object (no status - this is a requirement/template, not an uploaded document)
      const newDocument: Document = {
        id: Date.now().toString(),
        title: documentTitle,
        description: documentDescription,
        expirationDate: hasExpiration ? expirationDate : "",
        uploadedDate: new Date().toISOString().split('T')[0],
        fileName: uploadFile?.name,
        notes: notes,
        visibleToUsers: visibleToUsers,
        enableUserUpload: enableUserUpload,
        requireReview: requireReview,
      };

      // Add to documents array
      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);

      // Save to localStorage
      localStorage.setItem("documents", JSON.stringify(updatedDocuments));
    }

    // Reset form and close modal
    resetForm();
    setShowCreateModal(false);
  };

  const handleInitiateDelete = (documentId: string) => {
    setDocumentToDelete(documentId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (documentToDelete) {
      // Remove document from array
      const updatedDocuments = documents.filter(doc => doc.id !== documentToDelete);
      setDocuments(updatedDocuments);

      // Update localStorage
      localStorage.setItem("documents", JSON.stringify(updatedDocuments));

      // Close dialog and reset state
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDocumentToDelete(null);
  };

  const handleOpenUploadModal = (doc: Document) => {
    setDocumentToUpload(doc);
    setUploadModalFile(null);
    setUploadNotes("");
    setShowUploadModal(true);
  };

  const handleSaveUpload = () => {
    if (!uploadModalFile) {
      alert("Please select a file to upload");
      return;
    }

    if (!documentToUpload) return;

    // Determine status based on requireReview setting
    const status: "approved" | "pending" = documentToUpload.requireReview ? "pending" : "approved";

    // Update document with uploaded file info and status
    const updatedDocuments = documents.map(doc => {
      if (doc.id === documentToUpload.id) {
        return {
          ...doc,
          fileName: uploadModalFile.name,
          uploadedDate: new Date().toISOString().split('T')[0],
          notes: uploadNotes,
          status: status,
        };
      }
      return doc;
    });

    setDocuments(updatedDocuments);
    localStorage.setItem("documents", JSON.stringify(updatedDocuments));

    // Reset and close modal
    setUploadModalFile(null);
    setUploadNotes("");
    setDocumentToUpload(null);
    setShowUploadModal(false);
  };

  const handleCancelUpload = () => {
    setUploadModalFile(null);
    setUploadNotes("");
    setDocumentToUpload(null);
    setShowUploadModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage your credentials and certifications
          </p>
        </div>
        {isAdmin && (
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Document
          </Button>
        )}
      </div>

      {/* Create/Edit Document Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Document" : "Create Document"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edit document requirement" : "Create a new document requirement"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="document-title">
                Document Title <span className="text-red-600">*</span>
              </Label>
              <Input
                id="document-title"
                placeholder="e.g., RN License, CPR Certification"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-description">Description</Label>
              <Textarea
                id="document-description"
                placeholder="Optional description of the document"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="has-expiration"
                checked={hasExpiration}
                onCheckedChange={(checked) => {
                  setHasExpiration(checked as boolean);
                  if (!checked) {
                    setExpirationDate("");
                  }
                }}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="has-expiration"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  This document expires
                </Label>
              </div>
            </div>

            {hasExpiration && (
              <div className="space-y-2">
                <Label htmlFor="expiration-date">Expiration Date</Label>
                <Input
                  id="expiration-date"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="upload-file">Upload File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="upload-file"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
              </div>
              {uploadFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {uploadFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this document"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="visible-to-users"
                  checked={visibleToUsers}
                  onCheckedChange={(checked) => setVisibleToUsers(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="visible-to-users"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Visible to users in the mobile app
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="enable-user-upload"
                  checked={enableUserUpload}
                  onCheckedChange={(checked) => setEnableUserUpload(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="enable-user-upload"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enable users to upload via the mobile app and user's view
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    If disabled only owners and admins can upload documents
                  </p>
                </div>
              </div>

              {enableUserUpload && (
                <div className="flex items-start space-x-2 pl-6">
                  <Checkbox
                    id="require-review"
                    checked={requireReview}
                    onCheckedChange={(checked) => setRequireReview(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="require-review"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Require review for uploaded documents
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Only for documents uploaded by users
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowCreateModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSaveDocument}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload {documentToUpload?.title}</DialogTitle>
            <DialogDescription>
              Upload your document file for review
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="upload-file-input">
                File <span className="text-red-600">*</span>
              </Label>
              <Input
                id="upload-file-input"
                type="file"
                onChange={(e) => setUploadModalFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {uploadModalFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {uploadModalFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-notes">Notes (Optional)</Label>
              <Textarea
                id="upload-notes"
                placeholder="Add any notes about this document"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelUpload}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSaveUpload}
            >
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Approved Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">1</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents approved
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Review Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">0</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Awaiting approval
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Action Required Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">1</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Expired or expiring
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-documents">
          <TabsList>
            <TabsTrigger value="my-documents">My Documents</TabsTrigger>
            <TabsTrigger value="required">Required</TabsTrigger>
            <TabsTrigger value="document-packs">Document Packs</TabsTrigger>
          </TabsList>

          <TabsContent value="my-documents" className="mt-4">
            <div className="space-y-4">
              {/* Section Header */}
              <div>
                <h2 className="text-xl font-semibold">Your Documents</h2>
                <p className="text-sm text-muted-foreground">
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'} uploaded
                </p>
              </div>

              {/* Document Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    No documents uploaded yet. Click "Create Document" to add your first document.
                  </div>
                ) : (
                  documents.map((doc) => {
                    const formatDate = (dateString: string) => {
                      if (!dateString) return "N/A";
                      const date = new Date(dateString);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    };

                    const isExpired = doc.status === "expired";
                    const hasStatus = doc.status !== undefined;

                    return (
                      <Card key={doc.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <FileText className="h-8 w-8 text-blue-600 mt-1" />
                                <div>
                                  <h3 className="font-semibold">{doc.title}</h3>
                                  {doc.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {doc.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {hasStatus && (
                                <Badge
                                  className={
                                    isExpired
                                      ? "bg-red-100 text-red-800 hover:bg-red-100"
                                      : "bg-green-100 text-green-800 hover:bg-green-100"
                                  }
                                >
                                  {isExpired ? "Expired" : "Approved"}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-1 text-sm">
                              <p className="text-muted-foreground">
                                {hasStatus ? "Uploaded:" : "Created:"} {formatDate(doc.uploadedDate)}
                              </p>
                              {doc.expirationDate && (
                                <p
                                  className={
                                    isExpired
                                      ? "text-red-600 font-medium"
                                      : "text-muted-foreground"
                                  }
                                >
                                  Expires: {formatDate(doc.expirationDate)}
                                </p>
                              )}
                            </div>

                            {isExpired && (
                              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-sm text-red-800">
                                  This document has expired and needs renewal
                                </p>
                              </div>
                            )}

                            <div className="flex gap-2">
                              {!hasStatus ? (
                                // Document requirement/template
                                isAdmin ? (
                                  // Admin view: Edit and Delete
                                  <>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditDocument(doc)}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleInitiateDelete(doc.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  // Regular user view: View and Upload
                                  <>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenUploadModal(doc)}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload
                                    </Button>
                                  </>
                                )
                              ) : !isExpired ? (
                                // Uploaded document (not expired)
                                isAdmin ? (
                                  // Admin view: View, Edit, Delete
                                  <>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditDocument(doc)}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleInitiateDelete(doc.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  // Regular user view: View and Upload
                                  <>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenUploadModal(doc)}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload
                                    </Button>
                                  </>
                                )
                              ) : (
                                // Expired document
                                isAdmin ? (
                                  // Admin view: View, Edit, Delete
                                  <>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditDocument(doc)}
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleInitiateDelete(doc.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  // Regular user view: Upload only
                                  <Button
                                    className="w-full bg-red-600 hover:bg-red-700"
                                    onClick={() => handleOpenUploadModal(doc)}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Document
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="required" className="mt-4">
            <div className="text-muted-foreground">
              Required documents content will go here
            </div>
          </TabsContent>

          <TabsContent value="document-packs" className="mt-4">
            <div className="text-muted-foreground">
              Document Packs content will go here
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
