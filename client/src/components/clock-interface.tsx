import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, MapPin, Camera, PenTool } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

interface ClockInterfaceProps {
  userName?: string;
  currentJob?: string;
  currentSubJob?: string;
  activeEntry?: TimeEntry;
}
const jobLocations = [
  "Vitas Central Florida",
  "Vitas Citrus",
  "Vitas Nature Coast",
  "Vitas Jacksonville",
  "Vitas V/F/P",
  "Vitas Midstate",
  "Vitas Brevard",
  "Vitas Treasure Coast",
  "Vitas Palm Beach",
  "Vitas Dade/Monroe",
  "Vitas Jacksonville (St. Johns)",
  "Vitas Broward",
  "AdventHealth IPU",
  "AdventHealth Central Florida",
  "Haven",
];
export function ClockInterface({
  userName = "John Doe",
  currentJob = "Central Florida",
  currentSubJob = "7P-7A",
  activeEntry,
}: ClockInterfaceProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const isClockedIn = !!activeEntry;

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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/active"] });
      setUploadedPhotos([]);
      setSignature(null);
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

  const handleClockToggle = () => {
    if (isClockedIn) {
      clockOutMutation.mutate();
    } else {
      clockInMutation.mutate();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            const fileUrl = `/api/files/${data.file.filename}`;
            setUploadedPhotos((prev) => [...prev, fileUrl]);
            toast({
              title: "Photo Uploaded",
              description: `${file.name} has been added`,
            });
          } else {
            throw new Error("Upload failed");
          }
        } catch (error) {
          toast({
            title: "Upload Failed",
            description: "Failed to upload photo",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddSignature = () => {
    setShowSignaturePad(true);
  };

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

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      setSignature(dataUrl);
      setShowSignaturePad(false);
      toast({
        title: "Signature Saved",
        description: "Relieving nurse signature captured",
      });
    }
  };

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
            variant={isClockedIn ? "default" : "default"}
            className={`min-h-16 w-full text-lg font-semibold ${
              isClockedIn
                ? "bg-chart-2 hover:bg-chart-2/90 text-white"
                : "bg-primary hover:bg-primary/90"
            }`}
            onClick={handleClockToggle}
            data-testid={isClockedIn ? "button-clock-out" : "button-clock-in"}
          >
            {isClockedIn ? "Clock Out" : "Clock In"}
          </Button>

          {isClockedIn && (
            <div className="grid grid-cols-2 gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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
                onClick={handleAddSignature}
                data-testid="button-add-signature"
              >
                <PenTool className="h-4 w-4" />
                {signature ? "✓ Signed" : "Signature"}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Current Assignment
            </span>
            <Badge variant="secondary" data-testid="badge-job">
              {currentJob}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Shift</span>
            <Badge variant="secondary" data-testid="badge-subjob">
              {currentSubJob}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Location tracking enabled</span>
          </div>
        </div>
      </CardContent>

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
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ cursor: "crosshair" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Sign above to capture the relieving nurse's signature
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={clearSignature}>
              Clear
            </Button>
            <Button onClick={saveSignature}>Save Signature</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
