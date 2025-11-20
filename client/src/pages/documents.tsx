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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, CheckCircle, Clock, AlertTriangle, Search, FileText, Eye, Upload, X, Trash, User as UserIcon, Download, EyeOff, LoaderCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  userId?: string; // ID of user who uploaded the document (matches User.id type)
  category?: "General" | "AdventHealth"; // Document category for filtering
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
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
  const [documentCategory, setDocumentCategory] = useState<"General" | "AdventHealth">("General");
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
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();

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
    setDocumentCategory("General");
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
    setDocumentCategory(doc.category || "General");

    // Set edit mode
    setIsEditMode(true);
    setEditingDocumentId(doc.id);

    // Open modal
    setShowCreateModal(true);
  };

  const handleSaveDocument = async () => {
    if (!documentTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit for localStorage)
    if (uploadFile && uploadFile.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB. Please choose a smaller file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64 if a new file was uploaded
      let fileData: string | undefined = undefined;
      let fileType: string | undefined = undefined;

      if (uploadFile) {
        try {
          fileData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(uploadFile);
          });
          fileType = uploadFile.type;
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to read file. Please try again.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
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
              fileData: fileData || doc.fileData,
              fileType: fileType || doc.fileType,
              notes: notes,
              visibleToUsers: visibleToUsers,
              enableUserUpload: enableUserUpload,
              requireReview: requireReview,
              category: documentCategory,
            };
          }
          return doc;
        });

        setDocuments(updatedDocuments);
        try {
          localStorage.setItem("documents", JSON.stringify(updatedDocuments));
          toast({
            title: "Success",
            description: "Document updated successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Storage quota exceeded. Please delete some documents or reduce file sizes.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
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
          fileData: fileData,
          fileType: fileType,
          notes: notes,
          visibleToUsers: visibleToUsers,
          enableUserUpload: enableUserUpload,
          requireReview: requireReview,
          category: documentCategory,
        };

        // Add to documents array
        const updatedDocuments = [...documents, newDocument];
        setDocuments(updatedDocuments);

        // Save to localStorage
        try {
          localStorage.setItem("documents", JSON.stringify(updatedDocuments));
          toast({
            title: "Success",
            description: "Document requirement created successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Storage quota exceeded. Please delete some documents or reduce file sizes.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }

      // Reset form and close modal
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        title: "Error",
        description: "Failed to save document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!documentToUpload) return;

    // Validate file size (5MB limit for localStorage)
    if (uploadModalFile.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB. Please choose a smaller file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file type (common document and image types)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(uploadModalFile.type)) {
      toast({
        title: "Error",
        description: "Invalid file type. Please upload a PDF, image, or document file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      let fileData: string;
      try {
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(uploadModalFile);
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to read file. Please try again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Determine status - if admin is uploading for user, auto-approve; otherwise use requireReview
      const isAdminUploadingForUser = selectedUser && showUserDocumentsModal;
      const status: "approved" | "pending" = isAdminUploadingForUser ? "approved" : (documentToUpload.requireReview ? "pending" : "approved");

      // Get current local date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const currentDate = `${year}-${month}-${day}`;

      // Determine which user this document belongs to
      const documentUserId = isAdminUploadingForUser ? selectedUser.id : currentUser?.id;

      // Create a new uploaded document entry (don't modify the requirement)
      const newUploadedDocument: Document = {
        id: `${documentToUpload.id}-${documentUserId}-${Date.now()}`, // Unique ID combining requirement ID, user ID, and timestamp
        title: documentToUpload.title,
        description: documentToUpload.description,
        hasExpiration: documentToUpload.hasExpiration,
        expirationDate: uploadExpirationDate || documentToUpload.expirationDate,
        uploadedDate: currentDate,
        fileName: uploadModalFile.name,
        fileData: fileData,
        fileType: uploadModalFile.type,
        notes: uploadNotes,
        visibleToUsers: documentToUpload.visibleToUsers,
        enableUserUpload: documentToUpload.enableUserUpload,
        requireReview: documentToUpload.requireReview,
        status: status,
        userId: documentUserId, // Track which user this document belongs to
      };

      // Add the new uploaded document to the array (keep the requirement unchanged)
      const updatedDocuments = [...documents, newUploadedDocument];

      setDocuments(updatedDocuments);

      // Save to localStorage with error handling
      try {
        localStorage.setItem("documents", JSON.stringify(updatedDocuments));
      } catch (error) {
        toast({
          title: "Error",
          description: "Storage quota exceeded. Please delete some documents or reduce file sizes.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Show success message
      toast({
        title: "Success",
        description: status === "pending"
          ? "Document uploaded successfully and is pending review"
          : "Document uploaded and approved successfully",
      });

      // Reset and close modal
      setUploadModalFile(null);
      setUploadNotes("");
      setUploadExpirationDate("");
      setDocumentToUpload(null);
      setShowUploadModal(false);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
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

      toast({
        title: "Success",
        description: "Document rejected successfully",
      });

      // Reset and close modal
      setShowRejectModal(false);
      setDocumentToReject(null);
      setRejectionReason("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject document. Please try again.",
        variant: "destructive",
      });
    }
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
      toast({
        title: "Error",
        description: "No file uploaded for this document.",
        variant: "destructive",
      });
      return;
    }

    try {
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
        } else {
          toast({
            title: "Error",
            description: "Unable to open document. Please check your popup blocker settings.",
            variant: "destructive",
          });
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
    } catch (error) {
      console.error("Error viewing document:", error);
      toast({
        title: "Error",
        description: "Failed to view document. Please try again.",
        variant: "destructive",
      });
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
  const approvedCount = documents.filter(doc => {
    // For regular users, only count their own documents that are visible to users
    if (!isAdmin && (doc.userId !== currentUser?.id || !doc.visibleToUsers)) return false;

    return doc.status === "approved" &&
      (!doc.expirationDate || new Date(doc.expirationDate) >= new Date());
  }).length;

  const pendingCount = documents.filter(doc => {
    // For regular users, only count their own documents that are visible to users
    if (!isAdmin && (doc.userId !== currentUser?.id || !doc.visibleToUsers)) return false;

    return doc.status === "pending";
  }).length;

  const expiredCount = documents.filter(doc => {
    // For regular users, only count their own documents that are visible to users
    if (!isAdmin && (doc.userId !== currentUser?.id || !doc.visibleToUsers)) return false;

    return doc.expirationDate &&
      doc.status !== undefined &&
      new Date(doc.expirationDate) < new Date();
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your credentials and certifications
          </p>
        </div>
        {/* Admin action button for creating document requirements */}
        {isAdmin && (
          <Button
            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
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

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={documentCategory} onValueChange={(value: "General" | "AdventHealth") => setDocumentCategory(value)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="AdventHealth">AdventHealth</SelectItem>
                </SelectContent>
              </Select>
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
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSaveDocument}
              disabled={isUploading}
            >
              {isUploading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? "Saving..." : "Save"}
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
              {selectedUser && showUserDocumentsModal
                ? `Upload document for ${selectedUser.fullName}`
                : "Upload your document file for review"}
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
            {documentToUpload?.notes && (
              <div className="bg-amber-50 border border-amber-300 rounded-md p-3">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Instructions:
                </p>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">
                  {documentToUpload.notes}
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
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => setUploadModalFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {uploadModalFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {uploadModalFile.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Accepted formats: Images, PDF, Word documents (Max 5MB)
              </p>
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
            <Button variant="outline" onClick={handleCancelUpload} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSaveUpload}
              disabled={isUploading}
            >
              {isUploading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Documents Modal */}
      <Dialog open={showUserDocumentsModal} onOpenChange={setShowUserDocumentsModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.fullName}'s Documents
            </DialogTitle>
            <DialogDescription>
              View and manage document submissions for {selectedUser?.fullName}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="all" className="w-full">
            {(() => {
              // Calculate counts for each tab - only count visible requirements for this user
              const allRequirements = documents.filter(d => !d.status && d.visibleToUsers);
              const userDocs = documents.filter(d => d.status && d.userId === selectedUser?.id);

              const pendingUploadDocs = allRequirements.filter(requirement => {
                return !userDocs.some(doc => doc.title === requirement.title);
              });

              const pendingApprovalDocs = userDocs.filter(doc => doc.status === "pending");

              const noApprovalDocs = userDocs.filter(doc => {
                const requirement = allRequirements.find(r => r.title === doc.title);
                return doc.status === "approved" && requirement && !requirement.requireReview;
              });

              const approvedDocs = userDocs.filter(doc => {
                const requirement = allRequirements.find(r => r.title === doc.title);
                const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
                return doc.status === "approved" && requirement && requirement.requireReview && !isExpired;
              });

              const expiringExpiredDocs = userDocs.filter(doc => {
                return doc.expirationDate && new Date(doc.expirationDate) < new Date();
              });

              const allDocsCount = pendingUploadDocs.length + userDocs.length;

              return (
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1">
                  <TabsTrigger value="all" className="text-xs">
                    All ({allDocsCount})
                  </TabsTrigger>
                  <TabsTrigger value="pending-upload" className="text-xs">
                    Pending Upload ({pendingUploadDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending-approval" className="text-xs">
                    Pending Approval ({pendingApprovalDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="no-approval" className="text-xs">
                    No Approval ({noApprovalDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="text-xs">
                    Approved ({approvedDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="expiring" className="text-xs">
                    Expiring/Expired ({expiringExpiredDocs.length})
                  </TabsTrigger>
                </TabsList>
              );
            })()}

            {/* All Tab */}
            <TabsContent value="all" className="space-y-4 py-4 overflow-y-auto max-h-[55vh]">
              {documents.filter(d => !d.status && d.visibleToUsers).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No document requirements created yet
                </div>
              ) : (
                documents
                  .filter(d => !d.status && d.visibleToUsers) // Get visible requirements (templates) only
                  .map((requirement) => {
                    // Find if this user has uploaded this document
                    const userDoc = documents.find(d =>
                      d.status &&
                      d.userId === selectedUser?.id &&
                      d.title === requirement.title
                    );

                    const hasBeenUploaded = !!userDoc;

                    const formatDate = (dateString: string) => {
                      if (!dateString) return "N/A";
                      const [year, month, day] = dateString.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    };

                    const isExpired = userDoc?.expirationDate && userDoc.status !== undefined
                      ? new Date(userDoc.expirationDate) < new Date()
                      : false;

                    return (
                      <Card key={requirement.id}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <FileText className="h-6 w-6 text-blue-600 mt-1" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold">{requirement.title}</h3>
                                    {!requirement.visibleToUsers && (
                                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                        <EyeOff className="h-3 w-3 mr-1" />
                                        Admin Only
                                      </Badge>
                                    )}
                                  </div>
                                  {hasBeenUploaded && userDoc ? (
                                    <>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Uploaded: {formatDate(userDoc.uploadedDate)}
                                      </p>
                                      {userDoc.expirationDate && (
                                        <p className={`text-sm mt-1 ${isExpired ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                          Expires: {formatDate(userDoc.expirationDate)}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-sm text-amber-600 mt-1">
                                      Not uploaded yet
                                    </p>
                                  )}
                                </div>
                              </div>
                              {hasBeenUploaded && userDoc && (
                                <Badge
                                  className={
                                    isExpired
                                      ? "bg-red-100 text-red-800 hover:bg-red-100"
                                      : userDoc.status === "rejected"
                                      ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                      : userDoc.status === "pending"
                                      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                      : "bg-green-100 text-green-800 hover:bg-green-100"
                                  }
                                >
                                  {isExpired ? "Expired" : userDoc.status === "rejected" ? "Rejected" : userDoc.status === "pending" ? "Pending Review" : "Approved"}
                                </Badge>
                              )}
                            </div>

                            {hasBeenUploaded && userDoc?.status === "rejected" && userDoc.rejectionReason && (
                              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                                <p className="text-sm font-medium text-orange-800 mb-1">
                                  Rejection Reason
                                </p>
                                <p className="text-sm text-orange-700">
                                  {userDoc.rejectionReason}
                                </p>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2 border-t">
                              {hasBeenUploaded && userDoc ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewDocument(userDoc)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                  {userDoc.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveDocument(userDoc.id)}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleInitiateReject(userDoc)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <X className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDocumentToUpload(requirement);
                                    setShowUploadModal(true);
                                  }}
                                  className="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload for User
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </TabsContent>

            {/* Pending Upload Tab */}
            <TabsContent value="pending-upload" className="space-y-4 py-4 overflow-y-auto max-h-[55vh]">
              {documents.filter(d => !d.status && d.visibleToUsers).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No document requirements created yet
                </div>
              ) : (
                documents
                  .filter(d => !d.status && d.visibleToUsers)
                  .filter(requirement => {
                    const userDoc = documents.find(d =>
                      d.status &&
                      d.userId === selectedUser?.id &&
                      d.title === requirement.title
                    );
                    return !userDoc;
                  })
                  .map((requirement) => {
                    return (
                      <Card key={requirement.id}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <FileText className="h-6 w-6 text-amber-600 mt-1" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold">{requirement.title}</h3>
                                    {!requirement.visibleToUsers && (
                                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                        <EyeOff className="h-3 w-3 mr-1" />
                                        Admin Only
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-amber-600 mt-1 font-medium">
                                    Not uploaded yet
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setDocumentToUpload(requirement);
                                  setShowUploadModal(true);
                                }}
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload for User
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
              {documents.filter(d => !d.status && d.visibleToUsers).filter(requirement => {
                const userDoc = documents.find(d =>
                  d.status &&
                  d.userId === selectedUser?.id &&
                  d.title === requirement.title
                );
                return !userDoc;
              }).length === 0 && documents.filter(d => !d.status && d.visibleToUsers).length > 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  All documents have been uploaded
                </div>
              )}
            </TabsContent>

            {/* Pending Approval Tab */}
            <TabsContent value="pending-approval" className="space-y-4 py-4 overflow-y-auto max-h-[55vh]">
              {documents
                .filter(d => d.status === "pending" && d.userId === selectedUser?.id)
                .map((doc) => {
                  const formatDate = (dateString: string) => {
                    if (!dateString) return "N/A";
                    const [year, month, day] = dateString.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  };

                  const requirement = documents.find(d => !d.status && d.title === doc.title);

                  return (
                    <Card key={doc.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <Clock className="h-6 w-6 text-blue-600 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">{doc.title}</h3>
                                  {requirement && !requirement.visibleToUsers && (
                                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Admin Only
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Uploaded: {formatDate(doc.uploadedDate)}
                                </p>
                                {doc.expirationDate && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Expires: {formatDate(doc.expirationDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              Pending Review
                            </Badge>
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              }
              {documents.filter(d => d.status === "pending" && d.userId === selectedUser?.id).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No documents pending approval
                </div>
              )}
            </TabsContent>

            {/* No Approval Needed Tab */}
            <TabsContent value="no-approval" className="space-y-4 py-4 overflow-y-auto max-h-[55vh]">
              {documents
                .filter(d => {
                  if (d.status !== "approved" || d.userId !== selectedUser?.id) return false;
                  const requirement = documents.find(r => !r.status && r.title === d.title);
                  return requirement && !requirement.requireReview;
                })
                .map((doc) => {
                  const formatDate = (dateString: string) => {
                    if (!dateString) return "N/A";
                    const [year, month, day] = dateString.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  };

                  const requirement = documents.find(d => !d.status && d.title === doc.title);
                  const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();

                  return (
                    <Card key={doc.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">{doc.title}</h3>
                                  {requirement && !requirement.visibleToUsers && (
                                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Admin Only
                                    </Badge>
                                  )}
                                </div>
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
                            <Badge className={isExpired ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-green-100 text-green-800 hover:bg-green-100"}>
                              {isExpired ? "Expired" : "Auto-Approved"}
                            </Badge>
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              }
              {documents.filter(d => {
                if (d.status !== "approved" || d.userId !== selectedUser?.id) return false;
                const requirement = documents.find(r => !r.status && r.title === d.title);
                return requirement && !requirement.requireReview;
              }).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No auto-approved documents
                </div>
              )}
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-4 py-4 overflow-y-auto max-h-[55vh]">
              {documents
                .filter(d => {
                  if (d.status !== "approved" || d.userId !== selectedUser?.id) return false;
                  const requirement = documents.find(r => !r.status && r.title === d.title);
                  const isExpired = d.expirationDate && new Date(d.expirationDate) < new Date();
                  return requirement && requirement.requireReview && !isExpired;
                })
                .map((doc) => {
                  const formatDate = (dateString: string) => {
                    if (!dateString) return "N/A";
                    const [year, month, day] = dateString.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  };

                  const requirement = documents.find(d => !d.status && d.title === doc.title);

                  return (
                    <Card key={doc.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">{doc.title}</h3>
                                  {requirement && !requirement.visibleToUsers && (
                                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Admin Only
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Uploaded: {formatDate(doc.uploadedDate)}
                                </p>
                                {doc.expirationDate && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Expires: {formatDate(doc.expirationDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Approved
                            </Badge>
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              }
              {documents.filter(d => {
                if (d.status !== "approved" || d.userId !== selectedUser?.id) return false;
                const requirement = documents.find(r => !r.status && r.title === d.title);
                const isExpired = d.expirationDate && new Date(d.expirationDate) < new Date();
                return requirement && requirement.requireReview && !isExpired;
              }).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No approved documents
                </div>
              )}
            </TabsContent>

            {/* Expiring/Expired Tab */}
            <TabsContent value="expiring" className="space-y-4 py-4 overflow-y-auto max-h-[55vh]">
              {documents
                .filter(d => {
                  if (!d.status || d.userId !== selectedUser?.id) return false;
                  return d.expirationDate && new Date(d.expirationDate) < new Date();
                })
                .map((doc) => {
                  const formatDate = (dateString: string) => {
                    if (!dateString) return "N/A";
                    const [year, month, day] = dateString.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  };

                  const requirement = documents.find(d => !d.status && d.title === doc.title);

                  return (
                    <Card key={doc.id} className="border-red-200 bg-red-50/30">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">{doc.title}</h3>
                                  {requirement && !requirement.visibleToUsers && (
                                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Admin Only
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Uploaded: {formatDate(doc.uploadedDate)}
                                </p>
                                {doc.expirationDate && (
                                  <p className="text-sm text-red-600 font-medium mt-1">
                                    Expired: {formatDate(doc.expirationDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                              Expired
                            </Badge>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-800">
                              This document has expired and needs renewal
                            </p>
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (requirement) {
                                  setDocumentToUpload(requirement);
                                  setShowUploadModal(true);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Renewal
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              }
              {documents.filter(d => {
                if (!d.status || d.userId !== selectedUser?.id) return false;
                return d.expirationDate && new Date(d.expirationDate) < new Date();
              }).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No expired documents
                </div>
              )}
            </TabsContent>
          </Tabs>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Approved Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-2xl sm:text-3xl font-bold">{approvedCount}</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Documents approved
                </p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Review Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-2xl sm:text-3xl font-bold">{pendingCount}</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Awaiting approval
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        {/* Action Required Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-2xl sm:text-3xl font-bold">{expiredCount}</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Expired or expiring
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0 ml-2" />
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
            <TabsTrigger value="my-documents">{isAdmin ? "Documents" : "My Documents"}</TabsTrigger>
            {!isAdmin && (
              <TabsTrigger value="expired">Expired</TabsTrigger>
            )}
            {isAdmin && (
              <>
                <TabsTrigger value="user-documents">All Users</TabsTrigger>
                <TabsTrigger value="adventhealth">AdventHealth</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="my-documents" className="mt-4">
            <div className="space-y-4">
              {/* Section Header */}
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">{isAdmin ? "Document Requirements" : "Your Documents"}</h2>
              </div>

              {/* Document Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    No documents uploaded yet. Click "Create Document" to add your first document.
                  </div>
                ) : (
                  documents
                    .filter(doc => {
                      if (isAdmin) {
                        // Admins only see requirements (no status = templates)
                        return !doc.status;
                      } else {
                        // Users see: visible requirements OR their own uploaded documents (that are also marked as visible)
                        return doc.visibleToUsers && (!doc.status || doc.userId === currentUser?.id);
                      }
                    })
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

                    // Check if document is expired based on expiration date
                    const isExpired = doc.expirationDate && doc.status !== undefined
                      ? new Date(doc.expirationDate) < new Date()
                      : doc.status === "expired";
                    const hasStatus = doc.status !== undefined;

                    return (
                      <Card key={doc.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                <FileText className="h-8 w-8 text-blue-600 mt-1 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold break-words">{doc.title}</h3>
                                </div>
                              </div>
                              {hasStatus && (
                                <Badge
                                  className={`flex-shrink-0 ${
                                    isExpired
                                      ? "bg-red-100 text-red-800 hover:bg-red-100"
                                      : doc.status === "rejected"
                                      ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                      : doc.status === "pending"
                                      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                      : "bg-green-100 text-green-800 hover:bg-green-100"
                                  }`}
                                >
                                  {isExpired ? "Expired" : doc.status === "rejected" ? "Rejected" : doc.status === "pending" ? "Pending Review" : "Approved"}
                                </Badge>
                              )}
                            </div>

                            {(hasStatus || isAdmin) && (
                              <div className="space-y-1 text-sm">
                                <p className="text-muted-foreground">
                                  {hasStatus ? "Uploaded:" : "Created:"} {formatDate(doc.uploadedDate)}
                                </p>
                                {hasStatus && doc.expirationDate && (
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
                            )}

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

                            <div className="flex flex-col sm:flex-row gap-2">
                              {!hasStatus ? (
                                // Document requirement/template
                                isAdmin ? (
                                  // Admin view: View Template (if exists), Edit and Delete
                                  <>
                                    {doc.fileData && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewDocument(doc)}
                                        className="w-full sm:w-auto"
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        View Template
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditDocument(doc)}
                                      className="w-full sm:w-auto"
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleInitiateDelete(doc.id)}
                                      className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  // Regular user view: View Template (if exists) and Upload
                                  <>
                                    {doc.fileData && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewDocument(doc)}
                                        className="w-full sm:w-auto"
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        View Template
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenUploadModal(doc)}
                                      className="w-full sm:w-auto"
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
                                      className="w-full sm:w-auto"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    {doc.status === "pending" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApproveDocument(doc.id)}
                                        className="w-full sm:w-auto bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditDocument(doc)}
                                      className="w-full sm:w-auto"
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleInitiateDelete(doc.id)}
                                      className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                      className="w-full sm:w-auto"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenUploadModal(doc)}
                                      className="w-full sm:w-auto"
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
                                      className="w-full sm:w-auto"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    {doc.status === "pending" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApproveDocument(doc.id)}
                                        className="w-full sm:w-auto bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditDocument(doc)}
                                      className="w-full sm:w-auto"
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleInitiateDelete(doc.id)}
                                      className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
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

          {/* Expired Tab - Regular Users Only */}
          {!isAdmin && (
            <TabsContent value="expired" className="mt-4">
              <div className="space-y-4">
                {/* Section Header */}
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">Expired Documents</h2>
                  <p className="text-sm text-muted-foreground">
                    Documents that are expired or expiring soon
                  </p>
                </div>

                {/* Expired Document Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents
                    .filter(doc => {
                      // Only show user's own uploaded documents that are expired and visible
                      if (!doc.status || doc.userId !== currentUser?.id || !doc.visibleToUsers) return false;

                      // Check if document is expired
                      const isExpired = doc.expirationDate
                        ? new Date(doc.expirationDate) < new Date()
                        : doc.status === "expired";

                      return isExpired;
                    })
                    .length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      No expired documents
                    </div>
                  ) : (
                    documents
                      .filter(doc => {
                        // Only show user's own uploaded documents that are expired and visible
                        if (!doc.status || doc.userId !== currentUser?.id || !doc.visibleToUsers) return false;

                        // Check if document is expired
                        const isExpired = doc.expirationDate
                          ? new Date(doc.expirationDate) < new Date()
                          : doc.status === "expired";

                        return isExpired;
                      })
                      .map((doc) => {
                      const formatDate = (dateString: string) => {
                        if (!dateString) return "N/A";
                        const [year, month, day] = dateString.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      };

                      return (
                        <Card key={doc.id}>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex items-start space-x-3 flex-1 min-w-0">
                                  <FileText className="h-8 w-8 text-blue-600 mt-1 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold break-words">{doc.title}</h3>
                                  </div>
                                </div>
                                <Badge className="flex-shrink-0 bg-red-100 text-red-800 hover:bg-red-100">
                                  Expired
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm">
                                <p className="text-muted-foreground">
                                  Uploaded: {formatDate(doc.uploadedDate)}
                                </p>
                                {doc.expirationDate && (
                                  <p className="text-red-600 font-medium">
                                    Expired: {formatDate(doc.expirationDate)}
                                  </p>
                                )}
                              </div>

                              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-sm text-red-800">
                                  This document has expired and needs renewal
                                </p>
                              </div>

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

                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDocument(doc)}
                                  className="w-full sm:w-auto"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                                <Button
                                  className="w-full bg-red-600 hover:bg-red-700"
                                  onClick={() => handleOpenUploadModal(doc)}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload Document
                                </Button>
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
          )}

          {isAdmin && (
            <>
              <TabsContent value="user-documents" className="mt-4">
              <div className="space-y-4">
                {/* Section Header */}
                <div>
                  <h2 className="text-xl font-semibold">All Users</h2>
                  <p className="text-sm text-muted-foreground">
                    View and manage document submissions from all users
                  </p>
                </div>

                {/* User Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search users by name..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* User Cards Grid - Only showing regular users (employees/staff), excluding admins and owners */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.filter(u => {
                    const role = u.role?.toLowerCase();
                    const matchesSearch = userSearchQuery.trim() === "" ||
                      u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase());
                    // Exclude owner and admin users - only show regular employees/staff
                    return role !== "owner" && role !== "admin" && matchesSearch;
                  }).length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-muted-foreground">
                      {userSearchQuery.trim() === "" ? "No users found" : `No users found matching "${userSearchQuery}"`}
                    </div>
                  ) : (
                    users
                      .filter(u => {
                        const role = u.role?.toLowerCase();
                        const matchesSearch = userSearchQuery.trim() === "" ||
                          u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase());
                        // Exclude owner and admin users - only show regular employees/staff
                        return role !== "owner" && role !== "admin" && matchesSearch;
                      })
                      .map((user) => {
                      // Calculate document completion for this user
                      // Total required documents (all requirements including hidden ones)
                      const totalDocuments = documents.filter(d => !d.status).length;
                      // Documents uploaded by this specific user
                      const uploadedDocuments = documents.filter(d => d.status && d.userId === user.id).length;
                      // Pending documents for this user
                      const pendingDocuments = documents.filter(d => d.status === "pending" && d.userId === user.id).length;
                      // Approved documents for this user (not expired)
                      const approvedDocuments = documents.filter(d => {
                        if (d.status !== "approved" || d.userId !== user.id) return false;
                        const isExpired = d.expirationDate && new Date(d.expirationDate) < new Date();
                        return !isExpired;
                      }).length;
                      // Expired documents for this user
                      const expiredDocuments = documents.filter(d =>
                        d.status &&
                        d.userId === user.id &&
                        d.expirationDate &&
                        new Date(d.expirationDate) < new Date()
                      ).length;

                      return {
                        user,
                        totalDocuments,
                        uploadedDocuments,
                        pendingDocuments,
                        approvedDocuments,
                        expiredDocuments,
                      };
                    })
                    .sort((a, b) => {
                      // Sort users with expired documents to the top (highest priority)
                      if (a.expiredDocuments > 0 && b.expiredDocuments === 0) return -1;
                      if (a.expiredDocuments === 0 && b.expiredDocuments > 0) return 1;
                      // Then sort by expired count descending
                      if (a.expiredDocuments !== b.expiredDocuments) {
                        return b.expiredDocuments - a.expiredDocuments;
                      }
                      // Then sort users with pending documents
                      if (a.pendingDocuments > 0 && b.pendingDocuments === 0) return -1;
                      if (a.pendingDocuments === 0 && b.pendingDocuments > 0) return 1;
                      // Then sort by pending count descending
                      if (a.pendingDocuments !== b.pendingDocuments) {
                        return b.pendingDocuments - a.pendingDocuments;
                      }
                      // Finally sort alphabetically by name
                      return a.user.fullName.localeCompare(b.user.fullName);
                    })
                    .map(({ user, totalDocuments, uploadedDocuments, pendingDocuments, approvedDocuments, expiredDocuments }) => (
                      <Card
                        key={user.id}
                        className={`cursor-pointer hover:shadow-lg transition-all ${
                          expiredDocuments > 0
                            ? "border-red-400 bg-red-50/50 shadow-md border-2"
                            : pendingDocuments > 0
                            ? "border-blue-300 bg-blue-50/50 shadow-md"
                            : ""
                        }`}
                        onClick={() => handleViewUserDocuments(user)}
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start space-x-4">
                              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                                <span className="text-lg font-semibold">
                                  {getInitials(user.fullName)}
                                </span>
                                {expiredDocuments > 0 ? (
                                  <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
                                    {expiredDocuments}
                                  </div>
                                ) : pendingDocuments > 0 ? (
                                  <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                                    {pendingDocuments}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold truncate">{user.fullName}</h3>
                                  {expiredDocuments > 0 && (
                                    <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {expiredDocuments} expired
                                    </Badge>
                                  )}
                                  {pendingDocuments > 0 && (
                                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                                      {pendingDocuments} pending
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {user.role}
                                </p>
                              </div>
                            </div>

                            {/* Document Stats */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                                <div className="text-lg font-bold text-green-700">{approvedDocuments}</div>
                                <div className="text-xs text-green-600">Approved</div>
                              </div>
                              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                                <div className="text-lg font-bold text-blue-700">{pendingDocuments}</div>
                                <div className="text-xs text-blue-600">Pending</div>
                              </div>
                              <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                                <div className="text-lg font-bold text-red-700">{expiredDocuments}</div>
                                <div className="text-xs text-red-600">Expired</div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Documents Uploaded</span>
                                <span className="font-medium">
                                  {uploadedDocuments}/{totalDocuments}
                                </span>
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full transition-all"
                                  style={{ width: `${totalDocuments > 0 ? (uploadedDocuments / totalDocuments) * 100 : 0}%` }}
                                />
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

            {/* AdventHealth Tab */}
            <TabsContent value="adventhealth" className="mt-4">
              <div className="space-y-4">
                {/* Section Header */}
                <div>
                  <h2 className="text-xl font-semibold">AdventHealth Documents</h2>
                  <p className="text-sm text-muted-foreground">
                    Document requirements assigned to AdventHealth
                  </p>
                </div>

                {/* Document Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.filter(doc => !doc.status && doc.category === "AdventHealth").length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      No AdventHealth documents found. Create a new document and assign it to the AdventHealth category.
                    </div>
                  ) : (
                    documents
                      .filter(doc => !doc.status && doc.category === "AdventHealth")
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

                      return (
                        <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-lg truncate">{doc.title}</h3>
                                  {doc.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {doc.description}
                                    </p>
                                  )}
                                </div>
                                <Badge className="ml-2 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
                                  AdventHealth
                                </Badge>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Uploaded:</span>
                                  <span className="font-medium">{formatDate(doc.uploadedDate)}</span>
                                </div>
                                {doc.hasExpiration && doc.expirationDate && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Expires:</span>
                                    <span className="font-medium">{formatDate(doc.expirationDate)}</span>
                                  </div>
                                )}
                                {doc.fileName && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">File:</span>
                                    <span className="font-medium truncate ml-2">{doc.fileName}</span>
                                  </div>
                                )}
                              </div>

                              {doc.notes && (
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-sm text-muted-foreground">{doc.notes}</p>
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-2">
                                {doc.visibleToUsers && (
                                  <Badge variant="outline" className="text-xs">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Visible to users
                                  </Badge>
                                )}
                                {!doc.visibleToUsers && (
                                  <Badge variant="outline" className="text-xs">
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Hidden from users
                                  </Badge>
                                )}
                                {doc.enableUserUpload && (
                                  <Badge variant="outline" className="text-xs">
                                    <Upload className="h-3 w-3 mr-1" />
                                    User upload enabled
                                  </Badge>
                                )}
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditDocument(doc)}
                                  className="flex-1"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setDocumentToDelete(doc.id);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="flex-1"
                                >
                                  <Trash className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
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
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
