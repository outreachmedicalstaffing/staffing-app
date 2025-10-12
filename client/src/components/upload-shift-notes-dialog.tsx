import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  timeEntryId: string | null;
  requireAtLeastOne?: boolean;
  onUploaded?: (count: number) => void;
};

export default function UploadShiftNotesDialog({
  open,
  onOpenChange,
  timeEntryId,
  requireAtLeastOne = true,
  onUploaded,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!timeEntryId) return false;
    if (requireAtLeastOne) return files.length > 0;
    return true;
  }, [files.length, requireAtLeastOne, timeEntryId]);

  const removeAt = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!timeEntryId) throw new Error("Missing timeEntryId");
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      // NOTE: your apiRequest comes from "@/lib/queryClient"
      // and uses (method, url, body)
      const res = await apiRequest(
        "POST",
        `/api/time/entries/${timeEntryId}/attachments`,
        fd,
      );
      const data = await res.json();
      return data as { attachments?: Array<{ id: string; url: string }> };
    },
    onSuccess: (data) => {
      // refresh time entries so timesheet shows the new images
      queryClient.invalidateQueries({
        predicate: (q) =>
          (q.queryKey?.[0] as string)?.startsWith("/api/time/entries") ?? false,
      });
      onUploaded?.(data.attachments?.length ?? 0);
      setFiles([]);
      setError(null);
      onOpenChange(false);
    },
    onError: (e: any) => {
      setError(e?.message ?? "Upload failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Shift Notes</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />

          {files.length > 0 && (
            <ScrollArea className="h-48 rounded border p-2">
              <div className="grid grid-cols-3 gap-2">
                {files.map((f, idx) => {
                  const url = URL.createObjectURL(f);
                  return (
                    <div key={idx} className="relative rounded border">
                      <button
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                        onClick={() => removeAt(idx)}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <img
                        src={url}
                        className="h-28 w-full rounded object-cover"
                      />
                      <div className="truncate px-2 py-1 text-xs">{f.name}</div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {requireAtLeastOne && files.length === 0 && (
            <p className="text-xs text-muted-foreground">
              At least one image is required.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            type="button"
          >
            Cancel
          </Button>
          <Button onClick={() => mutate()} disabled={!canSubmit || isPending}>
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
