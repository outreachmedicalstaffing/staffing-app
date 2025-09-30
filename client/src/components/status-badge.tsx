import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = 
  | "approved" | "completed" 
  | "pending" | "submitted" | "claimed"
  | "rejected" | "expired" | "cancelled"
  | "expiring" | "warning"
  | "draft" | "open";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig = {
  approved: { 
    label: "Approved", 
    icon: CheckCircle, 
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
  },
  completed: { 
    label: "Completed", 
    icon: CheckCircle, 
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
  },
  pending: { 
    label: "Pending", 
    icon: Clock, 
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" 
  },
  submitted: { 
    label: "Submitted", 
    icon: Clock, 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" 
  },
  claimed: { 
    label: "Claimed", 
    icon: Clock, 
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" 
  },
  rejected: { 
    label: "Rejected", 
    icon: XCircle, 
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" 
  },
  expired: { 
    label: "Expired", 
    icon: XCircle, 
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" 
  },
  cancelled: { 
    label: "Cancelled", 
    icon: XCircle, 
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" 
  },
  expiring: { 
    label: "Expiring Soon", 
    icon: AlertTriangle, 
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" 
  },
  warning: { 
    label: "Warning", 
    icon: AlertTriangle, 
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" 
  },
  draft: { 
    label: "Draft", 
    icon: Circle, 
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" 
  },
  open: { 
    label: "Open", 
    icon: Circle, 
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="secondary" 
      className={cn(config.className, "gap-1", className)}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
