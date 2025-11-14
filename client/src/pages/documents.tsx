import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import {
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  FileText,
  Eye,
  Upload,
  X,
  Trash,
  User as UserIcon,
  Download,
  EyeOff,
  Loader2,
} from "lucide-react";

interface DocumentType {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  fileType: string | null;
  category: string | null;
  status: string;
  uploadedDate: string;
  expiryDate: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  visibleToUsers: boolean;
  enableUserUpload: boolean;
  requireReview: boolean;
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documentToUpload, setDocumentToUpload] = useState<DocumentType | null>(null);
  const [uploadModalFile, setUploadModalFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadExpirationDate, setUploadExpirationDate] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDocumentsModal, setShowUserDocumentsModal] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentType | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [documentToReject, setDocumentToReject] = useState<DocumentType | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [uploading, setUploading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user to check role
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Fetch all users (for admins)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled:
      currentUser?.role?.toLowerCase() === "owner" ||
      currentUser?.role?.toLowerCase() === "admin",
  });

  // Fetch all documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<DocumentType[]>({
    queryKey: ["/api/documents"],
  });

  // Check if user is admin or owner (case-insensitive check)
  const isAdmin =
    currentUser?.role?.toLowerCase() === "owner" ||
    currentUser?.role?.toLowerCase() === "admin";

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      fileUrl: string | null;
      fileType: string | null;
      expiryDate: string | null;
      notes: string;
      visibleToUsers: boolean;
      enableUserUpload: boolean;
      requireReview: boolean;
      status: string;
      userId: string;
    }) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<DocumentType>;
    }) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete document mutation (using PATCH to set status)
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "deleted" }),
      });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve document mutation
  const approveDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document approved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject document mutation
  const rejectDocumentMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/documents/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reject document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document rejected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleEditDocument = (doc: DocumentType) => {
    setDocumentTitle(doc.title);
    setDocumentDescription(doc.description || "");
    setHasExpiration(!!doc.expiryDate);
    setExpirationDate(doc.expiryDate || "");
    setNotes(doc.notes || "");
    setVisibleToUsers(doc.visibleToUsers);
    setEnableUserUpload(doc.enableUserUpload);
    setRequireReview(doc.requireReview);
    setIsEditMode(true);
    setEditingDocumentId(doc.id);
    setShowCreateModal(true);
  };

  const uploadFileToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload file");
    }

    const data = await res.json();
    return data.url; // Returns something like "/uploads/filename-123456789.pdf"
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

    if (!currentUser) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      let fileUrl: string | null = null;
      let fileType: string | null = null;

      if (uploadFile) {
        fileUrl = await uploadFileToServer(uploadFile);
        fileType = uploadFile.type;
      }

      if (isEditMode && editingDocumentId) {
        // Update existing document
        await updateDocumentMutation.mutateAsync({
          id: editingDocumentId,
          data: {
            title: documentTitle,
            description: documentDescription,
            expiryDate: hasExpiration ? expirationDate : null,
            ...(fileUrl && { fileUrl, fileType }),
            notes: notes,
            visibleToUsers: visibleToUsers,
            enableUserUpload: enableUserUpload,
            requireReview: requireReview,
          },
        });
      } else {
        // Create new document
        await createDocumentMutation.mutateAsync({
          title: documentTitle,
          description: documentDescription,
          fileUrl: fileUrl,
          fileType: fileType,
          expiryDate: hasExpiration ? expirationDate : null,
          notes: notes,
          visibleToUsers: visibleToUsers,
          enableUserUpload: enableUserUpload,
          requireReview: requireReview,
          status: "submitted",
          userId: currentUser.id,
        });
      }

      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error saving document:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleInitiateDelete = (documentId: string) => {
    setDocumentToDelete(documentId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocumentMutation.mutateAsync(documentToDelete);
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDocumentToDelete(null);
  };

  const handleOpenUploadModal = (doc: DocumentType) => {
    setDocumentToUpload(doc);
    setUploadModalFile(null);
    setUploadNotes("");
    setUploadExpirationDate(doc.expiryDate || "");
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

    if (!documentToUpload || !currentUser) return;

    try {
      setUploading(true);

      const fileUrl = await uploadFileToServer(uploadModalFile);
      const fileType = uploadModalFile.type;

      const isAdminUploadingForUser = selectedUser && showUserDocumentsModal;
      const status = isAdminUploadingForUser
        ? "approved"
        : documentToUpload.requireReview
          ? "submitted"
          : "approved";

      const documentUserId = isAdminUploadingForUser
        ? selectedUser.id
        : currentUser.id;

      // Create a new document for this user
      await createDocumentMutation.mutateAsync({
        title: documentToUpload.title,
        description: documentToUpload.description || "",
        fileUrl: fileUrl,
        fileType: fileType,
        expiryDate: uploadExpirationDate || documentToUpload.expiryDate,
        notes: uploadNotes,
        visibleToUsers: documentToUpload.visibleToUsers,
        enableUserUpload: documentToUpload.enableUserUpload,
        requireReview: documentToUpload.requireReview,
        status: status,
        userId: documentUserId,
      });

      setUploadModalFile(null);
      setUploadNotes("");
      setUploadExpirationDate("");
      setDocumentToUpload(null);
      setShowUploadModal(false);
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setUploadModalFile(null);
    setUploadNotes("");
    setUploadExpirationDate("");
    setDocumentToUpload(null);
    setShowUploadModal(false);
  };

  const handleApproveDocument = async (documentId: string) => {
    await approveDocumentMutation.mutateAsync(documentId);
  };

  const handleInitiateReject = (doc: DocumentType) => {
    setDocumentToReject(doc);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!documentToReject) return;

    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    await rejectDocumentMutation.mutateAsync({
      id: documentToReject.id,
      reason: rejectionReason,
    });

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

  const handleViewDocument = (doc: DocumentType) => {
    if (!doc.fileUrl) {
      toast({
        title: "Error",
        description: "No file uploaded for this document.",
        variant: "destructive",
      });
      return;
    }

    setPreviewDocument(doc);
    setShowFilePreview(true);
  };

  const handleClosePreview = () => {
    setShowFilePreview(false);
    setPreviewDocument(null);
  };

  const handleDownloadDocument = (doc: DocumentType) => {
    if (!doc.fileUrl) {
      toast({
        title: "Error",
        description: "No file to download",
        variant: "destructive",
      });
      return;
    }

    window.open(doc.fileUrl, "_blank");
  };

  // Filter documents by search query
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch && doc.status !== "deleted";
  });

  // Get user-specific documents for current user (non-admins only see their own)
  const userDocuments = isAdmin
    ? filteredDocuments
    : filteredDocuments.filter((doc) => doc.userId === currentUser?.id);

  // Get requirements (documents without file uploads, created by admins for users to upload to)
  const requirements = filteredDocuments.filter(
    (doc) => !doc.fileUrl && doc.enableUserUpload
  );

  // Get documents that need review
  const pendingDocuments = filteredDocuments.filter(
    (doc) => doc.status === "submitted" || doc.status === "pending"
  );

  // Get approved documents
  const approvedDocuments = filteredDocuments.filter(
    (doc) => doc.status === "approved"
  );

  // Get rejected documents
  const rejectedDocuments = filteredDocuments.filter(
    (doc) => doc.status === "rejected"
  );

  // Get expired documents
  const expiredDocuments = filteredDocuments.filter((doc) => {
    if (!doc.expiryDate) return false;
    const expiry = new Date(doc.expiryDate);
    const now = new Date();
    return expiry < now;
  });

  // Get expiring soon documents (within 30 days)
  const expiringSoonDocuments = filteredDocuments.filter((doc) => {
    if (!doc.expiryDate) return false;
    const expiry = new Date(doc.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return expiry > now && expiry <= thirtyDaysFromNow;
  });

  // Helper to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "submitted":
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-gray-500 hover:bg-gray-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case "expiring":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expiring Soon
          </Badge>
        );
      default:
        return null;
    }
  };

  // Helper to get expiration badge
  const getExpirationBadge = (doc: DocumentType) => {
    if (!doc.expiryDate) return null;

    const expiry = new Date(doc.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiry < now) {
      return (
        <Badge variant="destructive" className="ml-2">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    } else if (expiry <= thirtyDaysFromNow) {
      return (
        <Badge className="ml-2 bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expires Soon
        </Badge>
      );
    }
    return null;
  };

  // Get user by ID
  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  // Get count of user's documents by status
  const getUserDocumentCounts = (userId: string) => {
    const userDocs = documents.filter((doc) => doc.userId === userId);
    return {
      total: userDocs.length,
      pending: userDocs.filter((d) => d.status === "submitted" || d.status === "pending").length,
      approved: userDocs.filter((d) => d.status === "approved").length,
      rejected: userDocs.filter((d) => d.status === "rejected").length,
      expired: userDocs.filter((d) => {
        if (!d.expiryDate) return false;
        return new Date(d.expiryDate) < new Date();
      }).length,
    };
  };

  if (documentsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Manage document requirements and review employee uploads"
              : "View document requirements and upload your documents"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Requirement
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isAdmin ? "all" : "my-documents"}>
        <TabsList>
          {isAdmin && (
            <>
              <TabsTrigger value="all">
                All Documents ({filteredDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending Review ({pendingDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="requirements">
                Requirements ({requirements.length})
              </TabsTrigger>
              <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            </>
          )}
          {!isAdmin && (
            <>
              <TabsTrigger value="my-documents">
                My Documents ({userDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="requirements">
                Requirements ({requirements.length})
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="approved">
            Approved ({approvedDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired ({expiredDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Soon ({expiringSoonDocuments.length})
          </TabsTrigger>
        </TabsList>

        {/* All Documents Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="all" className="space-y-4">
            {filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No documents found</p>
                </CardContent>
              </Card>
            ) : (
              filteredDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{doc.title}</h3>
                          {getStatusBadge(doc.status)}
                          {getExpirationBadge(doc)}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <strong>Uploaded by:</strong>{" "}
                            {getUserById(doc.userId)?.fullName || "Unknown"}
                          </p>
                          <p>
                            <strong>Uploaded:</strong>{" "}
                            {new Date(doc.uploadedDate).toLocaleDateString()}
                          </p>
                          {doc.expiryDate && (
                            <p>
                              <strong>Expires:</strong>{" "}
                              {new Date(doc.expiryDate).toLocaleDateString()}
                            </p>
                          )}
                          {doc.notes && (
                            <p>
                              <strong>Notes:</strong> {doc.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {doc.fileUrl && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {(doc.status === "submitted" || doc.status === "pending") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleApproveDocument(doc.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleInitiateReject(doc)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDocument(doc)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInitiateDelete(doc.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* Pending Review Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="pending" className="space-y-4">
            {pendingDocuments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No documents pending review
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{doc.title}</h3>
                          {getStatusBadge(doc.status)}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <strong>Uploaded by:</strong>{" "}
                            {getUserById(doc.userId)?.fullName || "Unknown"}
                          </p>
                          <p>
                            <strong>Uploaded:</strong>{" "}
                            {new Date(doc.uploadedDate).toLocaleDateString()}
                          </p>
                          {doc.notes && (
                            <p>
                              <strong>Notes:</strong> {doc.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {doc.fileUrl && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveDocument(doc.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleInitiateReject(doc)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-4">
          {requirements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No document requirements</p>
              </CardContent>
            </Card>
          ) : (
            requirements.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{doc.title}</h3>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {doc.description}
                        </p>
                      )}
                      {doc.expiryDate && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Expiration:</strong>{" "}
                          {new Date(doc.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                      {doc.requireReview && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Requires review after upload
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isAdmin && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenUploadModal(doc)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      )}
                      {isAdmin && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDocument(doc)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInitiateDelete(doc.id)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* My Documents Tab (Non-admin) */}
        {!isAdmin && (
          <TabsContent value="my-documents" className="space-y-4">
            {userDocuments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No documents uploaded yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              userDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{doc.title}</h3>
                          {getStatusBadge(doc.status)}
                          {getExpirationBadge(doc)}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <strong>Uploaded:</strong>{" "}
                            {new Date(doc.uploadedDate).toLocaleDateString()}
                          </p>
                          {doc.expiryDate && (
                            <p>
                              <strong>Expires:</strong>{" "}
                              {new Date(doc.expiryDate).toLocaleDateString()}
                            </p>
                          )}
                          {doc.notes && (
                            <p>
                              <strong>Notes:</strong> {doc.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {doc.fileUrl && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* Users Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-4">
            {users.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </CardContent>
              </Card>
            ) : (
              users.map((user) => {
                const counts = getUserDocumentCounts(user.id);
                return (
                  <Card key={user.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">
                            {user.fullName}
                          </h3>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>Total: {counts.total}</span>
                            <span className="text-yellow-600">
                              Pending: {counts.pending}
                            </span>
                            <span className="text-green-600">
                              Approved: {counts.approved}
                            </span>
                            <span className="text-red-600">
                              Rejected: {counts.rejected}
                            </span>
                            <span className="text-orange-600">
                              Expired: {counts.expired}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUserDocuments(user)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Documents
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        )}

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          {approvedDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No approved documents</p>
              </CardContent>
            </Card>
          ) : (
            approvedDocuments.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{doc.title}</h3>
                        {getStatusBadge(doc.status)}
                        {getExpirationBadge(doc)}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {isAdmin && (
                          <p>
                            <strong>User:</strong>{" "}
                            {getUserById(doc.userId)?.fullName || "Unknown"}
                          </p>
                        )}
                        <p>
                          <strong>Uploaded:</strong>{" "}
                          {new Date(doc.uploadedDate).toLocaleDateString()}
                        </p>
                        {doc.expiryDate && (
                          <p>
                            <strong>Expires:</strong>{" "}
                            {new Date(doc.expiryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.fileUrl && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4">
          {rejectedDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <X className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No rejected documents</p>
              </CardContent>
            </Card>
          ) : (
            rejectedDocuments.map((doc) => (
              <Card key={doc.id} className="border-red-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{doc.title}</h3>
                        {getStatusBadge(doc.status)}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {isAdmin && (
                          <p>
                            <strong>User:</strong>{" "}
                            {getUserById(doc.userId)?.fullName || "Unknown"}
                          </p>
                        )}
                        <p>
                          <strong>Uploaded:</strong>{" "}
                          {new Date(doc.uploadedDate).toLocaleDateString()}
                        </p>
                      </div>
                      {/* Rejection reason is not in current schema, would need to add */}
                    </div>
                    <div className="flex gap-2">
                      {doc.fileUrl && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Expired Tab */}
        <TabsContent value="expired" className="space-y-4">
          {expiredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No expired documents</p>
              </CardContent>
            </Card>
          ) : (
            expiredDocuments.map((doc) => (
              <Card key={doc.id} className="border-red-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{doc.title}</h3>
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Expired
                        </Badge>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {isAdmin && (
                          <p>
                            <strong>User:</strong>{" "}
                            {getUserById(doc.userId)?.fullName || "Unknown"}
                          </p>
                        )}
                        <p className="text-red-600">
                          <strong>Expired:</strong>{" "}
                          {new Date(doc.expiryDate!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.fileUrl && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {!isAdmin && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenUploadModal(doc)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Re-upload
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Expiring Soon Tab */}
        <TabsContent value="expiring" className="space-y-4">
          {expiringSoonDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No documents expiring soon
                </p>
              </CardContent>
            </Card>
          ) : (
            expiringSoonDocuments.map((doc) => (
              <Card key={doc.id} className="border-orange-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{doc.title}</h3>
                        <Badge className="bg-orange-500 hover:bg-orange-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Expires Soon
                        </Badge>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {isAdmin && (
                          <p>
                            <strong>User:</strong>{" "}
                            {getUserById(doc.userId)?.fullName || "Unknown"}
                          </p>
                        )}
                        <p className="text-orange-600">
                          <strong>Expires:</strong>{" "}
                          {new Date(doc.expiryDate!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.fileUrl && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {!isAdmin && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenUploadModal(doc)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Update
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Document Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Document" : "Add Document Requirement"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the document information"
                : "Create a new document requirement for employees to upload"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="e.g., RN License, CPR Certification"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                placeholder="Provide details about this document requirement"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasExpiration"
                checked={hasExpiration}
                onCheckedChange={(checked) =>
                  setHasExpiration(checked as boolean)
                }
              />
              <Label htmlFor="hasExpiration">This document expires</Label>
            </div>
            {hasExpiration && (
              <div>
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="file">Attach File (Optional)</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or instructions"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="visibleToUsers"
                  checked={visibleToUsers}
                  onCheckedChange={(checked) =>
                    setVisibleToUsers(checked as boolean)
                  }
                />
                <Label htmlFor="visibleToUsers">
                  Visible to users in mobile app
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableUserUpload"
                  checked={enableUserUpload}
                  onCheckedChange={(checked) =>
                    setEnableUserUpload(checked as boolean)
                  }
                />
                <Label htmlFor="enableUserUpload">
                  Allow users to upload this document
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireReview"
                  checked={requireReview}
                  onCheckedChange={(checked) =>
                    setRequireReview(checked as boolean)
                  }
                />
                <Label htmlFor="requireReview">
                  Require review after user upload
                </Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowCreateModal(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveDocument} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditMode ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload your document for: {documentToUpload?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="uploadFile">Select File *</Label>
              <Input
                id="uploadFile"
                type="file"
                onChange={(e) => setUploadModalFile(e.target.files?.[0] || null)}
              />
            </div>
            {documentToUpload?.expiryDate && (
              <div>
                <Label htmlFor="uploadExpirationDate">Expiration Date</Label>
                <Input
                  id="uploadExpirationDate"
                  type="date"
                  value={uploadExpirationDate}
                  onChange={(e) => setUploadExpirationDate(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="uploadNotes">Notes</Label>
              <Textarea
                id="uploadNotes"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Add any notes about this document"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleCancelUpload}>
              Cancel
            </Button>
            <Button onClick={handleSaveUpload} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Documents Modal */}
      <Dialog
        open={showUserDocumentsModal}
        onOpenChange={setShowUserDocumentsModal}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Documents for {selectedUser?.fullName}
            </DialogTitle>
            <DialogDescription>
              View and manage documents for this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser &&
              documents
                .filter((doc) => doc.userId === selectedUser.id)
                .map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{doc.title}</h4>
                            {getStatusBadge(doc.status)}
                            {getExpirationBadge(doc)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              Uploaded:{" "}
                              {new Date(doc.uploadedDate).toLocaleDateString()}
                            </p>
                            {doc.expiryDate && (
                              <p>
                                Expires:{" "}
                                {new Date(doc.expiryDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {doc.fileUrl && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(doc)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadDocument(doc)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(doc.status === "submitted" ||
                            doc.status === "pending") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleApproveDocument(doc.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600"
                                onClick={() => handleInitiateReject(doc)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            {selectedUser &&
              documents.filter((doc) => doc.userId === selectedUser.id)
                .length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No documents uploaded yet
                </p>
              )}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (requirements.length > 0) {
                    handleOpenUploadModal(requirements[0]);
                  }
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document for User
              </Button>
              <Button variant="outline" onClick={handleCloseUserDocuments}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDocument?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewDocument?.fileUrl &&
              (previewDocument.fileType?.startsWith("image/") ? (
                <img
                  src={previewDocument.fileUrl}
                  alt={previewDocument.title}
                  className="w-full h-auto"
                />
              ) : previewDocument.fileType === "application/pdf" ? (
                <iframe
                  src={previewDocument.fileUrl}
                  className="w-full h-[70vh]"
                  title={previewDocument.title}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Preview not available for this file type
                  </p>
                  <Button onClick={() => handleDownloadDocument(previewDocument)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                </div>
              ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleDownloadDocument(previewDocument!)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleClosePreview}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Document Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this document is being rejected"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleCancelReject}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject}>
              Reject Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this document. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
