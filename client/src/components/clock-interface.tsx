import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import CurrentShift from "@/components/clock-current-shift";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Camera, PenTool } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TimeEntry } from "@shared/schema";

// ---- Props definition for ClockInterface ----
type ClockInterfaceProps = {
  userName?: string;
  currentJob?: string;
  currentSubJob?: string;
  activeEntry?: TimeEntry | null;
  onClockOutSuccess?: (args: { timeEntryId: string; jobCode?: string }) => void;
};

export default function ClockInterface({
  userName,
  currentJob,
  currentSubJob,
  activeEntry,
  onClockOutSuccess,
}: ClockInterfaceProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const isClockedIn = !!activeEntry;

  // Check if current shift is AdventHealth IPU (photos optional)
  const isAdventHealthIPU = currentJob &&
    (currentJob.toLowerCase().includes('advent') || currentJob.toLowerCase().includes('adventhealth')) &&
    currentJob.toLowerCase().includes('ipu');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (activeEntry) {
        const clockInTime = new Date(activeEntry.clockIn).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - clockInTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeEntry]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/time/clock-in", {
        location: "Office",
        notes: "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/active"] });
      toast({
        title: "Clocked In",
        description: "You have successfully clocked in",
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

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/time/clock-out", {
        shiftNoteAttachments: uploadedPhotos,
        relievingNurseSignature: signature,
      });
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    }, // <-- keep this comma here

    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "/api/time/entries" ||
          q.queryKey[0] === "/api/time/active",
      });

      setUploadedPhotos([]);
      setSignature(null);
      setShowNotesDialog(false);

      const timeEntryId =
        data?.timeEntryId ??
        data?.id ??
        data?.entry?.id ??
        data?.timeEntry?.id ??
        (activeEntry as any)?.id ??
        "";

      const jobCode =
        data?.jobCode ??
        data?.entry?.jobCode ??
        data?.timeEntry?.jobCode ??
        data?.location ??
        data?.jobName ??
        currentJob;

      onClockOutSuccess?.({
        timeEntryId: String(timeEntryId),
        jobCode: jobCode ? String(jobCode) : undefined,
      });

      toast({
        title: "Clocked Out",
        description: "You have successfully clocked out",
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

  // ---------- Helper functions (MUST be above return) ----------

  // Format HH:MM:SS for the running timer
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Trigger the hidden file input
  const handleAddPhoto = () => fileInputRef.current?.click();

  // Upload an image and add its URL to uploadedPhotos
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const fileUrl = `/api/files/${data.file.filename}`;

      setUploadedPhotos((prev) => [...prev, fileUrl]);
      toast({ title: "Photo uploaded", description: `${file.name} added` });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Could not upload photo",
        variant: "destructive",
      });
    }
  };

  // Handle Clock In / Clock Out
  const handleClockToggle = () => {
    if (isClockedIn) {
      // Clocking out triggers the parent popups (upload + optional notes)
      setShowNotesDialog(true); // show the required notes dialog first
    } else {
      clockInMutation.mutate();
    }
  };

  // When user confirms clock out inside the notes dialog:
  const confirmClockOut = () => {
    clockOutMutation.mutate();
  };
  // Signature drawing helpers (must be above `return`)
  const startDrawing = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };
  // -------------------- JSX --------------------
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Clock</CardTitle>
        <CardDescription>
          {currentTime.toLocaleTimeString()} ·{" "}
          {currentTime.toLocaleDateString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          {isClockedIn && (
            <div className="space-y-2">
              <div
                className="text-4xl font-mono font-bold text-primary"
                data-testid="text-elapsed-time"
              >
                {formatTime(elapsedTime)}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Currently Clocked In</span>
              </div>
            </div>
          )}

          <Button
            size="lg"
            className={`min-h-16 w-full text-lg font-semibold ${
              isClockedIn
                ? "bg-chart-2 hover:bg-chart-2/90 text-white"
                : "bg-primary hover:bg-primary/90"
            }`}
            onClick={handleClockToggle}
            disabled={clockOutMutation.isPending || clockInMutation.isPending}
            data-testid={isClockedIn ? "button-clock-out" : "button-clock-in"}
          >
            {isClockedIn
              ? clockOutMutation.isPending
                ? "Clocking Out..."
                : "Clock Out"
              : clockInMutation.isPending
                ? "Clocking In..."
                : "Clock In"}
          </Button>

          {isClockedIn && (
            <div className="grid grid-cols-2 gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleAddPhoto}
                data-testid="button-add-photo"
              >
                <Camera className="h-4 w-4" />
                {uploadedPhotos.length > 0
                  ? `${uploadedPhotos.length} Photo${uploadedPhotos.length !== 1 ? "s" : ""}`
                  : "Add Photo"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowSignaturePad(true)}
                data-testid="button-add-signature"
              >
                <PenTool className="h-4 w-4" />
                {signature ? "✓ Signed" : "Signature"}
              </Button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <CurrentShift />
        </div>
      </CardContent>

      {/* Notes (photos) – required before clock out (except AdventHealth IPU) */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Attach shift notes {isAdventHealthIPU ? '(optional)' : '(required)'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isAdventHealthIPU
                ? 'Take photos of your paper notes if applicable.'
                : 'Take photos of your paper notes. At least one image is required to clock out.'}
            </p>

            {uploadedPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {uploadedPhotos.map((src, i) => (
                  <div key={src + i} className="relative">
                    <img
                      src={src}
                      alt={`note-${i}`}
                      className="h-24 w-full object-cover rounded"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 rounded"
                      onClick={() =>
                        setUploadedPhotos((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleAddPhoto}>
                Use camera / upload
              </Button>
              <span className="text-xs text-muted-foreground">
                {uploadedPhotos.length} photo
                {uploadedPhotos.length === 1 ? "" : "s"} attached
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmClockOut}
              disabled={
                clockOutMutation.isPending ||
                (!isAdventHealthIPU && uploadedPhotos.length === 0)
              }
            >
              {clockOutMutation.isPending
                ? "Clocking Out..."
                : "Confirm Clock Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Pad Dialog */}
      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Relieving Nurse Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md bg-white">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full touch-none"
                onMouseDown={(e) => startDrawing(e)}
                onMouseMove={(e) => draw(e)}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => startDrawing(e)}
                onTouchMove={(e) => draw(e)}
                onTouchEnd={stopDrawing}
                style={{ cursor: "crosshair" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Sign above to capture the relieving nurse's signature
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
              }}
            >
              Clear
            </Button>
            <Button
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const dataUrl = canvas.toDataURL("image/png");
                setSignature(dataUrl);
                setShowSignaturePad(false);
                toast({
                  title: "Signature Saved",
                  description: "Relieving nurse signature captured",
                });
              }}
            >
              Save Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
