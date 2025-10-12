import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Flag,
  Paperclip,
  Moon,
  CornerRightUp,
  CornerLeftDown,
} from "lucide-react";
import { StatusBadge } from "./status-badge";

// Helper used below
const isMidnight = (t: string) => /^12:0?0\s?AM$/i.test((t || "").trim());

interface TimesheetRowProps {
  id: string;
  date: string;
  job: string;
  subJob: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  status: "approved" | "pending" | "rejected";
  hasEdit: boolean;
  hasAttachments: boolean;
  onEdit?: () => void;
  onViewHistory?: () => void;
}

export function TimesheetRow({
  id,
  date,
  job,
  subJob,
  clockIn,
  clockOut,
  totalHours,
  status,
  hasEdit,
  hasAttachments,
  onEdit,
  onViewHistory,
}: TimesheetRowProps) {
  return (
    <TableRow data-testid={`row-timesheet-${id}`}>
      <TableCell className="font-medium">{date}</TableCell>

      <TableCell>
        <div className="space-y-0.5">
          <div className="font-medium">{job}</div>
          <div className="text-sm text-muted-foreground">{subJob}</div>
        </div>
      </TableCell>

      {/* Start / Clock-in */}
      <TableCell className="font-mono text-sm">
        {clockIn}
        {isMidnight(clockIn) && (
          <div className="mt-1 flex items-center gap-1 text-[11px] leading-none text-blue-600">
            <Moon className="h-3 w-3" />
            <CornerRightUp className="h-3 w-3" />
            <span>from previous day</span>
          </div>
        )}
      </TableCell>

      {/* End / Clock-out */}
      <TableCell className="font-mono text-sm">
        {clockOut}
        {isMidnight(clockOut) && (
          <div className="mt-1 flex items-center gap-1 text-[11px] leading-none text-blue-600">
            <span>continues</span>
            <CornerLeftDown className="h-3 w-3" />
            <Moon className="h-3 w-3" />
          </div>
        )}
      </TableCell>

      <TableCell className="font-semibold">{totalHours.toFixed(2)}h</TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {hasEdit && (
            <div title="This entry has been manually edited">
              <Flag
                className="h-4 w-4 text-orange-500"
                data-testid={`icon-edited-${id}`}
              />
            </div>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          {hasAttachments && (
            <Badge variant="secondary" className="gap-1">
              <Paperclip className="h-3 w-3" />
              Files
            </Badge>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            data-testid={`button-edit-${id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {hasEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewHistory}
              data-testid={`button-history-${id}`}
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
