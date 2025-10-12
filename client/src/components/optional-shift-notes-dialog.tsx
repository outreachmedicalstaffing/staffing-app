import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  timeEntryId: string | null;
};

export default function OptionalShiftNotesDialog({
  open,
  onOpenChange,
  timeEntryId,
}: Props) {
  const [value, setValue] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!timeEntryId || !value.trim()) return null; // nothing to save if empty
      const res = await apiRequest(
        "PATCH",
        `/api/time/entries/${timeEntryId}`,
        {
          employeeNotes: value.trim(),
        },
      );
      return res.json();
    },
    onSuccess: () => {
      // refresh time entries so the notes show up in the timesheet
      queryClient.invalidateQueries({
        predicate: (q) =>
          (q.queryKey?.[0] as string)?.startsWith("/api/time/entries") ?? false,
      });
      onOpenChange(false);
      setValue("");
    },
    onError: () => {
      // Even on error, let them close; but you could show a toast if you prefer
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !saveMutation.isPending && onOpenChange(v)}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Optional notes for this shift</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Add anything the Owner/Admin should know about this shift
            (optional).
          </p>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Example: Family requested extra linens; pain meds at 10:30p; wound dressing replaced."
            className="min-h-32"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Skip
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !timeEntryId}
          >
            {saveMutation.isPending ? "Saving..." : "Save notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
