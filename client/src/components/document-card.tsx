import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Eye, AlertTriangle } from "lucide-react";
import { StatusBadge } from "./status-badge";

type DocumentStatus = "approved" | "submitted" | "rejected" | "expired" | "expiring";

interface DocumentCardProps {
  id: string;
  title: string;
  description?: string;
  status: DocumentStatus;
  expiryDate?: string;
  uploadedDate?: string;
  onUpload?: () => void;
  onView?: () => void;
}

export function DocumentCard({
  id,
  title,
  description,
  status,
  expiryDate,
  uploadedDate,
  onUpload,
  onView,
}: DocumentCardProps) {
  const needsUpload = status === "rejected" || status === "expired";
  
  return (
    <Card className="hover-elevate" data-testid={`card-document-${id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-semibold leading-tight">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          {uploadedDate && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Uploaded:</span>
              <span className="font-medium">{uploadedDate}</span>
            </div>
          )}
          {expiryDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expires:</span>
              <span className={`font-medium ${
                status === "expiring" || status === "expired" ? "text-destructive" : ""
              }`}>
                {expiryDate}
              </span>
            </div>
          )}
        </div>

        {(status === "expiring" || status === "expired") && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-destructive">
              {status === "expired" 
                ? "This document has expired and needs renewal" 
                : "This document will expire soon"}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {needsUpload ? (
            <Button
              size="sm"
              variant="default"
              className="w-full gap-2"
              onClick={onUpload}
              data-testid={`button-upload-${id}`}
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          ) : (
            <>
              {onView && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={onView}
                  data-testid={`button-view-${id}`}
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              )}
              {onUpload && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={onUpload}
                  data-testid={`button-update-${id}`}
                >
                  <Upload className="h-4 w-4" />
                  Update
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
