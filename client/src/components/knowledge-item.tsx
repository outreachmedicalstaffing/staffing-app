import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderOpen, Image, Eye, Edit } from "lucide-react";

type KnowledgeItemType = "page" | "pdf" | "image" | "folder";

interface KnowledgeItemProps {
  id: string;
  title: string;
  type: KnowledgeItemType;
  description?: string;
  category?: string;
  lastUpdated?: string;
  publishStatus?: "published" | "draft" | "archived";
  onView?: () => void;
  onEdit?: () => void;
}

const typeIcons = {
  page: FileText,
  pdf: FileText,
  image: Image,
  folder: FolderOpen,
};

const typeColors = {
  page: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pdf: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  image: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  folder: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function KnowledgeItem({
  id,
  title,
  type,
  description,
  category,
  lastUpdated,
  publishStatus = "published",
  onView,
  onEdit,
}: KnowledgeItemProps) {
  const Icon = typeIcons[type];

  return (
    <Card className="hover-elevate" data-testid={`card-knowledge-${id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`flex h-10 w-10 items-center justify-center rounded-md shrink-0 ${typeColors[type]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-semibold leading-tight">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
        </div>
        {publishStatus && publishStatus !== "published" && (
          <Badge 
            variant="secondary"
            className={publishStatus === "draft" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : ""}
          >
            {publishStatus}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          {category && (
            <Badge variant="secondary">{category}</Badge>
          )}
          {lastUpdated && (
            <span className="text-muted-foreground">Updated {lastUpdated}</span>
          )}
        </div>

        <div className="flex gap-2">
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
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
              onClick={onEdit}
              data-testid={`button-edit-${id}`}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
