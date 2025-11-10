import { useState } from "react";
import { DocumentCard } from "@/components/document-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, AlertTriangle, CheckCircle, Clock, Upload as UploadIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Document } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFileType, setUploadFileType] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiryDate, setUploadExpiryDate] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (documentData: any) => {
      console.log('[uploadMutation] Starting mutation');
      console.log('[uploadMutation] Sending document data:', documentData);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
      });

      console.log('[uploadMutation] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[uploadMutation] Server error response:', errorData);

        // Handle Zod validation errors (array of error objects)
        if (Array.isArray(errorData.error)) {
          const errorMessages = errorData.error.map((err: any) =>
            `${err.path?.join('.') || 'Field'}: ${err.message}`
          ).join('\n');
          throw new Error(errorMessages);
        }

        // Handle simple error message
        const errorMessage = errorData.error || errorData.message || 'Failed to save document';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[uploadMutation] Document created successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[uploadMutation] onSuccess called with:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setShowUploadModal(false);
      // Reset form
      resetUploadForm();
    },
    onError: (error: Error) => {
      console.error('[uploadMutation] onError called:', error);
      alert(`Error saving document:\n\n${error.message}`);
    },
  });

  const now = new Date();
  
  const myDocuments = documents.map(doc => {
    let status = doc.status as any;
    if (doc.expiryDate) {
      const daysUntilExpiry = differenceInDays(new Date(doc.expiryDate), now);
      if (daysUntilExpiry < 0) status = 'expired';
      else if (daysUntilExpiry <= 30) status = 'expiring';
    }
    
    return {
      id: doc.id,
      title: doc.title,
      description: doc.description || '',
      status,
      uploadedDate: format(new Date(doc.uploadedDate), 'MMM d, yyyy'),
      expiryDate: doc.expiryDate ? format(new Date(doc.expiryDate), 'MMM d, yyyy') : undefined
    };
  });

  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const pendingCount = documents.filter(d => d.status === 'submitted').length;
  const actionRequired = documents.filter(d => {
    if (!d.expiryDate) return false;
    const days = differenceInDays(new Date(d.expiryDate), now);
    return days <= 30;
  }).length;

  const requiredDocuments: any[] = [];

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDescription("");
    setUploadFileType("");
    setUploadFile(null);
    setUploadExpiryDate("");
    setUploadNotes("");
  };

  const handleOpenUploadModal = () => {
    resetUploadForm();
    setShowUploadModal(true);
  };

  const handleUploadDocument = () => {
    console.log('[handleUploadDocument] Save button clicked');
    console.log('[handleUploadDocument] uploadTitle:', uploadTitle);

    // Validate required fields
    if (!uploadTitle.trim()) {
      console.log('[handleUploadDocument] Validation failed: Title is empty');
      alert("Please enter a document title");
      return;
    }

    // Prepare document data
    const documentData = {
      title: uploadTitle.trim(),
      description: uploadDescription?.trim() || undefined,
      fileType: uploadFileType || undefined,
      fileUrl: uploadFile ? `/uploads/${uploadFile.name}` : undefined,
      status: "submitted",
      expiryDate: uploadExpiryDate ? new Date(uploadExpiryDate).toISOString() : undefined,
      notes: uploadNotes?.trim() || undefined,
      // Don't send uploadedDate - it's auto-set by the database with defaultNow()
      // Don't send userId - it's set by the backend from the session
      // Don't send checkbox fields - they have defaults in the database
    };

    console.log('[handleUploadDocument] Document data prepared:', documentData);
    console.log('[handleUploadDocument] Calling mutation.mutate()');

    uploadMutation.mutate(documentData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Auto-detect file type
      const extension = file.name.split('.').pop()?.toLowerCase();
      setUploadFileType(extension || "");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-documents">Documents</h1>
          <p className="text-muted-foreground">Manage your credentials and certifications</p>
        </div>
        <Button onClick={handleOpenUploadModal} data-testid="button-upload-document">
          <Plus className="h-4 w-4 mr-2" />
          Create Document
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Documents approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionRequired}</div>
            <p className="text-xs text-muted-foreground">Expired or expiring</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-documents"
        />
      </div>

      <Tabs defaultValue="my-documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-documents" data-testid="tab-my-documents">
            My Documents
          </TabsTrigger>
          <TabsTrigger value="required" data-testid="tab-required">
            Required
          </TabsTrigger>
          <TabsTrigger value="packs" data-testid="tab-packs">
            Document Packs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Documents</CardTitle>
              <CardDescription>{myDocuments.length} documents uploaded</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    {...doc}
                    onView={() => console.log(`View doc ${doc.id}`)}
                    onUpload={() => console.log(`Upload doc ${doc.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="required" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>{requiredDocuments.length} documents need attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {requiredDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    {...doc}
                    onUpload={() => console.log(`Upload doc ${doc.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Packs</CardTitle>
              <CardDescription>Grouped document requirements</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No document packs assigned</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Document</DialogTitle>
            <DialogDescription>Create a new document requirement</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-title">Document Title *</Label>
              <Input
                id="upload-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g., RN License, CPR Certification"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-description">Description</Label>
              <Textarea
                id="upload-description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Optional description of the document"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-expiry">Expiration Date</Label>
              <Input
                id="upload-expiry"
                type="date"
                value={uploadExpiryDate}
                onChange={(e) => setUploadExpiryDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-file">Upload File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="upload-file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
              {uploadFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {uploadFile.name} ({uploadFileType})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-notes">Notes</Label>
              <Textarea
                id="upload-notes"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Optional notes about this document"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadDocument}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
