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
import { Plus, CheckCircle, Clock, AlertTriangle, Search, FileText, Eye, Upload, X, Trash, User as UserIcon } from "lucide-react";

interface Document {
  id: string;
  title: string;
  description: string;
  hasExpiration?: boolean; // optional for backward compatibility
  expirationDate: string;
  uploadedDate: string;
  fileName?: string;
  fileData?: string; // base64 encoded file data
  fileType?: string; // MIME type
  notes: string;
  visibleToUsers: boolean;
  enableUserUpload: boolean;
  requireReview: boolean;
  status?: "approved" | "expired" | "pending" | "rejected";
  rejectionReason?: string;
  userId?: number; // ID of user who uploaded the document
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
  const [uploadExpirationDate, setUploadExpirationDate] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDocumentsModal, setShowUserDocumentsModal] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [documentToReject, setDocumentToReject] = useState<Document | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Get current user to check role
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Fetch all users (for admins)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: currentUser?.role?.toLowerCase() === "owner" || currentUser?.role?.toLowerCase() === "admin",
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
    // Use saved hasExpiration value, or fallback to checking if expirationDate exists (for backward compatibility)
    setHasExpiration(doc.hasExpiration !== undefined ? doc.hasExpiration : !!doc.expirationDate);
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
            hasExpiration: hasExpiration,
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
      // Get current local date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const currentDate = `${year}-${month}-${day}`;

      // Create new document object (no status - this is a requirement/template, not an uploaded document)
      const newDocument: Document = {
        id: Date.now().toString(),
        title: documentTitle,
        description: documentDescription,
        hasExpiration: hasExpiration,
        expirationDate: hasExpiration ? expirationDate : "",
        uploadedDate: currentDate,
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
    setUploadExpirationDate("");
    setShowUploadModal(true);
  };

  const handleSaveUpload = async () => {
    if (!uploadModalFile) {
      alert("Please select a file to upload");
      return;
    }

    if (!documentToUpload) return;

    // Convert file to base64
    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(uploadModalFile);
    });

    // Determine status based on requireReview setting
    const status: "approved" | "pending" = documentToUpload.requireReview ? "pending" : "approved";

    // Get current local date in YYYY-MM-DD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;

    // Update document with uploaded file info and status
    const updatedDocuments = documents.map(doc => {
      if (doc.id === documentToUpload.id) {
        return {
          ...doc,
          fileName: uploadModalFile.name,
          fileData: fileData,
          fileType: uploadModalFile.type,
          uploadedDate: currentDate,
          expirationDate: uploadExpirationDate || doc.expirationDate,
          notes: uploadNotes,
          status: status,
          userId: currentUser?.id, // Track which user uploaded the document
        };
      }
      return doc;
    });

    setDocuments(updatedDocuments);
    localStorage.setItem("documents", JSON.stringify(updatedDocuments));

    // Reset and close modal
    setUploadModalFile(null);
    setUploadNotes("");
    setUploadExpirationDate("");
    setDocumentToUpload(null);
    setShowUploadModal(false);
  };

  const handleCancelUpload = () => {
    setUploadModalFile(null);
    setUploadNotes("");
    setUploadExpirationDate("");
    setDocumentToUpload(null);
    setShowUploadModal(false);
  };

  const handleApproveDocument = (documentId: string) => {
    // Update document status to approved
    const updatedDocuments = documents.map(doc => {
      if (doc.id === documentId) {
        return {
          ...doc,
          status: "approved" as const,
        };
      }
      return doc;
    });

    setDocuments(updatedDocuments);
    localStorage.setItem("documents", JSON.stringify(updatedDocuments));
  };

  const handleInitiateReject = (doc: Document) => {
    setDocumentToReject(doc);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!documentToReject) return;

    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    // Update document status to rejected with reason
    const updatedDocuments = documents.map(doc => {
      if (doc.id === documentToReject.id) {
        return {
          ...doc,
          status: "rejected" as const,
          rejectionReason: rejectionReason,
        };
      }
      return doc;
    });

    setDocuments(updatedDocuments);
    localStorage.setItem("documents", JSON.stringify(updatedDocuments));

    // Reset and close modal
    setShowRejectModal(false);
    setDocumentToReject(null);
    setRejectionReason("");
  };

  const handleCancelReject = () => {
    setShowRejectModal(false);
    setDocumentToReject(null);
    setRejectionReason("");
  };

  const handleViewUserDocuments = (user: User) => {
    setSelectedUser(user);
    setShowUserDocumentsModal(true);
  };

  const handleCloseUserDocuments = () => {
    setSelectedUser(null);
    setShowUserDocumentsModal(false);
  };

  const handleViewDocument = (doc: Document) => {
    if (!doc.fileData) {
      alert("No file uploaded for this document.");
      return;
    }

    // Check file type
    const fileType = doc.fileType || '';

    // For PDFs, open in new tab
    if (fileType === 'application/pdf') {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(
          `<iframe src="${doc.fileData}" style="width:100%; height:100%; border:none;" title="${doc.fileName}"></iframe>`
        );
        newWindow.document.title = doc.fileName || 'Document Preview';
      }
    }
    // For images, show in modal
    else if (fileType.startsWith('image/')) {
      setPreviewDocument(doc);
      setShowFilePreview(true);
    }
    // For other files, download
    else {
      const link = document.createElement('a');
      link.href = doc.fileData;
      link.download = doc.fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper function to get user initials
  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(" ");
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  // Calculate document counts
  const approvedCount = documents.filter(doc =>
    doc.status === "approved" &&
    (!doc.expirationDate || new Date(doc.expirationDate) >= new Date())
  ).length;

  const pendingCount = documents.filter(doc =>
    doc.status === "pending"
  ).length;

  const expiredCount = documents.filter(doc =>
    doc.expirationDate &&
    doc.status !== undefined &&
    new Date(doc.expirationDate) < new Date()
  ).length;

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
            {documentToUpload?.description && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  Document Requirements
                </p>
                <p className="text-sm text-blue-700">
                  {documentToUpload.description}
                </p>
              </div>
            )}
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

            {documentToUpload?.hasExpiration && (
              <div className="space-y-2">
                <Label htmlFor="upload-expiration-date">
                  Expiration Date (Optional)
                </Label>
                <Input
                  id="upload-expiration-date"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={uploadExpirationDate}
                  onChange={(e) => setUploadExpirationDate(e.target.value)}
                />
              </div>
            )}

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

      {/* User Documents Modal */}
      <Dialog open={showUserDocumentsModal} onOpenChange={setShowUserDocumentsModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.fullName}'s Documents
            </DialogTitle>
            <DialogDescription>
              View and manage document submissions for {selectedUser?.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
            {documents.filter(d => d.status && d.userId === selectedUser?.id).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No documents uploaded yet
              </div>
            ) : (
              documents
                .filter(d => d.status && d.userId === selectedUser?.id) // Only show uploaded documents for this user
                .map((doc) => {
                  const formatDate = (dateString: string) => {
                    if (!dateString) return "N/A";
                    // Parse YYYY-MM-DD as local date to avoid timezone issues
                    const [year, month, day] = dateString.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  };

                  const isExpired = doc.expirationDate && doc.status !== undefined
                    ? new Date(doc.expirationDate) < new Date()
                    : false;

                  return (
                    <Card key={doc.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <FileText className="h-6 w-6 text-blue-600 mt-1" />
                              <div className="flex-1">
                                <h3 className="font-semibold">{doc.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Uploaded: {formatDate(doc.uploadedDate)}
                                </p>
                                {doc.expirationDate && (
                                  <p className={`text-sm mt-1 ${isExpired ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                    Expires: {formatDate(doc.expirationDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge
                              className={
                                isExpired
                                  ? "bg-red-100 text-red-800 hover:bg-red-100"
                                  : doc.status === "rejected"
                                  ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                  : doc.status === "pending"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                  : "bg-green-100 text-green-800 hover:bg-green-100"
                              }
                            >
                              {isExpired ? "Expired" : doc.status === "rejected" ? "Rejected" : doc.status === "pending" ? "Pending Review" : "Approved"}
                            </Badge>
                          </div>

                          {doc.status === "rejected" && doc.rejectionReason && (
                            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                              <p className="text-sm font-medium text-orange-800 mb-1">
                                Rejection Reason
                              </p>
                              <p className="text-sm text-orange-700">
                                {doc.rejectionReason}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {doc.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveDocument(doc.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleInitiateReject(doc)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleCloseUserDocuments}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDocument?.fileName || "Document Preview"}</DialogTitle>
            <DialogDescription>
              {previewDocument?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 overflow-auto max-h-[70vh] flex items-center justify-center">
            {previewDocument?.fileData && (
              <img
                src={previewDocument.fileData}
                alt={previewDocument.fileName || "Document"}
                className="max-w-full h-auto"
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            {previewDocument?.fileData && (
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = previewDocument.fileData!;
                  link.download = previewDocument.fileName || 'document';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Download
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowFilePreview(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Document Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {documentToReject?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Reason for rejection <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this document is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelReject}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
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
                <div className="text-3xl font-bold">{approvedCount}</div>
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
                <div className="text-3xl font-bold">{pendingCount}</div>
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
                <div className="text-3xl font-bold">{expiredCount}</div>
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
            {isAdmin && (
              <TabsTrigger value="user-documents">User Documents</TabsTrigger>
            )}
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
                      // Parse YYYY-MM-DD as local date to avoid timezone issues
                      const [year, month, day] = dateString.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    };

                    // Check if document is expired based on expiration date
                    const isExpired = doc.expirationDate && doc.status !== undefined
                      ? new Date(doc.expirationDate) < new Date()
                      : doc.status === "expired";
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
                                </div>
                              </div>
                              {hasStatus && (
                                <Badge
                                  className={
                                    isExpired
                                      ? "bg-red-100 text-red-800 hover:bg-red-100"
                                      : doc.status === "rejected"
                                      ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                      : doc.status === "pending"
                                      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                      : "bg-green-100 text-green-800 hover:bg-green-100"
                                  }
                                >
                                  {isExpired ? "Expired" : doc.status === "rejected" ? "Rejected" : doc.status === "pending" ? "Pending Review" : "Approved"}
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

                            {doc.status === "rejected" && doc.rejectionReason && (
                              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                                <p className="text-sm font-medium text-orange-800 mb-1">
                                  Document Rejected
                                </p>
                                <p className="text-sm text-orange-700">
                                  {doc.rejectionReason}
                                </p>
                              </div>
                            )}

                            <div className="flex gap-2">
                              {!hasStatus ? (
                                // Document requirement/template
                                isAdmin ? (
                                  // Admin view: Edit and Delete
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDocument(doc)}
                                    >
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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDocument(doc)}
                                    >
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
                                  // Admin view: View, Edit, Delete, and Approve for pending
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDocument(doc)}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    {doc.status === "pending" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApproveDocument(doc.id)}
                                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                    )}
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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDocument(doc)}
                                    >
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
                                  // Admin view: View, Edit, Delete, and Approve for pending
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDocument(doc)}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    {doc.status === "pending" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApproveDocument(doc.id)}
                                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                    )}
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

          {isAdmin && (
            <TabsContent value="user-documents" className="mt-4">
              <div className="space-y-4">
                {/* Section Header */}
                <div>
                  <h2 className="text-xl font-semibold">User Documents</h2>
                  <p className="text-sm text-muted-foreground">
                    View and manage document submissions from all users
                  </p>
                </div>

                {/* User Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.filter(u => {
                    const role = u.role?.toLowerCase();
                    return role !== "owner" && role !== "admin";
                  }).length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    users
                      .filter(u => {
                        const role = u.role?.toLowerCase();
                        return role !== "owner" && role !== "admin";
                      })
                      .map((user) => {
                      // Calculate document completion for this user
                      // Total required documents that users need to upload
                      const totalDocuments = documents.filter(d => !d.status && d.enableUserUpload).length;
                      // Documents uploaded by this specific user
                      const uploadedDocuments = documents.filter(d => d.status && d.userId === user.id).length;
                      // Pending documents for this user
                      const pendingDocuments = documents.filter(d => d.status === "pending" && d.userId === user.id).length;

                      return {
                        user,
                        totalDocuments,
                        uploadedDocuments,
                        pendingDocuments,
                      };
                    })
                    .sort((a, b) => {
                      // Sort users with pending documents to the top
                      if (a.pendingDocuments > 0 && b.pendingDocuments === 0) return -1;
                      if (a.pendingDocuments === 0 && b.pendingDocuments > 0) return 1;
                      // Then sort by pending count descending
                      if (a.pendingDocuments !== b.pendingDocuments) {
                        return b.pendingDocuments - a.pendingDocuments;
                      }
                      // Finally sort alphabetically by name
                      return a.user.fullName.localeCompare(b.user.fullName);
                    })
                    .map(({ user, totalDocuments, uploadedDocuments, pendingDocuments }) => (
                      <Card
                        key={user.id}
                        className={`cursor-pointer hover:shadow-lg transition-all ${
                          pendingDocuments > 0
                            ? "border-blue-300 bg-blue-50/50 shadow-md"
                            : ""
                        }`}
                        onClick={() => handleViewUserDocuments(user)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start space-x-4">
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <span className="text-lg font-semibold">
                                {getInitials(user.fullName)}
                              </span>
                              {pendingDocuments > 0 && (
                                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
                                  {pendingDocuments}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate">{user.fullName}</h3>
                                {pendingDocuments > 0 && (
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {pendingDocuments} pending
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground capitalize">
                                {user.role}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${totalDocuments > 0 ? (uploadedDocuments / totalDocuments) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {uploadedDocuments}/{totalDocuments}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
