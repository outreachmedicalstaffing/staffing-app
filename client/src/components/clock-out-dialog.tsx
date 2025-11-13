import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClockOut: (photoFilenames: string[]) => void;
  isLoading?: boolean;
}

export function ClockOutDialog({
  open,
  onOpenChange,
  onClockOut,
  isLoading = false,
}: ClockOutDialogProps) {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFilenames, setUploadedFilenames] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter((file) => {
      // Validate file type (images only)
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return false;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add to selected files
    const updatedFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(updatedFiles);

    // Create preview URLs
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  const handleRemoveFile = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);

    // Remove from arrays
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
    setUploadedFilenames(uploadedFilenames.filter((_, i) => i !== index));
  };

  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("photos", file);
      });

      const response = await fetch("/api/upload/shift-notes", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload photos");
      }

      const data = await response.json();
      const filenames = data.files.map((file: any) => file.filename);
      setUploadedFilenames(filenames);

      toast({
        title: "Photos uploaded",
        description: `${filenames.length} photo(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photos",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitClockOut = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Photos required",
        description: "Please upload at least one shift note photo",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload photos first
      setUploading(true);
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("photos", file);
      });

      const response = await fetch("/api/upload/shift-notes", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload photos");
      }

      const data = await response.json();
      const filenames = data.files.map((file: any) => file.filename);

      // Call the clock out handler with the uploaded filenames
      onClockOut(filenames);

      // Clean up
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadedFilenames([]);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URLs
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadedFilenames([]);
    onOpenChange(false);
  };

  const canSubmit = selectedFiles.length > 0 && !uploading && !isLoading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clock Out - Upload Shift Notes</DialogTitle>
          <DialogDescription>
            Please upload photos of your shift notes before clocking out. At least one photo is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <Label htmlFor="photo-upload">Upload Photos</Label>
            <div className="mt-2">
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading || isLoading}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("photo-upload")?.click()}
                disabled={uploading || isLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Photos
              </Button>
            </div>
          </div>

          {/* Preview Grid */}
          {selectedFiles.length > 0 && (
            <div>
              <Label>Selected Photos ({selectedFiles.length})</Label>
              <div className="mt-2 grid grid-cols-3 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={uploading || isLoading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="mt-1 text-xs text-gray-600 truncate">
                      {selectedFiles[index].name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {selectedFiles.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                No photos selected. Click "Select Photos" to add shift note photos.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading || isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmitClockOut}
            disabled={!canSubmit}
            className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
          >
            {uploading ? "Uploading..." : isLoading ? "Clocking Out..." : "Submit & Clock Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
