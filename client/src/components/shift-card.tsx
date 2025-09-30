import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, CheckSquare, Paperclip } from "lucide-react";
import { StatusBadge } from "./status-badge";

type ShiftStatus = "approved" | "pending" | "open" | "completed" | "cancelled" | "claimed";

interface ShiftCardProps {
  id: string;
  job: string;
  subJob: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: ShiftStatus;
  tasksCount?: number;
  attachmentsCount?: number;
  assignedTo?: string;
  onClaim?: () => void;
  onView?: () => void;
}

export function ShiftCard({
  id,
  job,
  subJob,
  date,
  startTime,
  endTime,
  location,
  status,
  tasksCount = 0,
  attachmentsCount = 0,
  assignedTo,
  onClaim,
  onView,
}: ShiftCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-shift-${id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1">
          <h3 className="font-semibold">{job}</h3>
          <p className="text-sm text-muted-foreground">{subJob}</p>
        </div>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{startTime} - {endTime}</span>
          </div>
          {location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}
          {assignedTo && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs">
                {assignedTo.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-sm">{assignedTo}</span>
            </div>
          )}
        </div>

        {(tasksCount > 0 || attachmentsCount > 0) && (
          <div className="flex gap-3">
            {tasksCount > 0 && (
              <Badge variant="secondary" className="gap-1.5">
                <CheckSquare className="h-3 w-3" />
                {tasksCount} Tasks
              </Badge>
            )}
            {attachmentsCount > 0 && (
              <Badge variant="secondary" className="gap-1.5">
                <Paperclip className="h-3 w-3" />
                {attachmentsCount} Files
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {status === "open" && onClaim && (
            <Button 
              size="sm" 
              variant="default" 
              className="flex-1"
              onClick={onClaim}
              data-testid={`button-claim-${id}`}
            >
              Claim Shift
            </Button>
          )}
          <Button 
            size="sm" 
            variant={status === "open" ? "outline" : "default"}
            className={status === "open" ? "flex-1" : "w-full"}
            onClick={onView}
            data-testid={`button-view-${id}`}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
