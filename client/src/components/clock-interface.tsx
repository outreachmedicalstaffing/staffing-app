import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Camera, PenTool } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClockInterfaceProps {
  userName?: string;
  currentJob?: string;
  currentSubJob?: string;
}

export function ClockInterface({ 
  userName = "John Doe",
  currentJob = "Central Florida",
  currentSubJob = "7P-7A"
}: ClockInterfaceProps) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (isClockedIn) {
        setElapsedTime(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isClockedIn]);

  const handleClockToggle = () => {
    if (!isClockedIn) {
      setElapsedTime(0);
    }
    setIsClockedIn(!isClockedIn);
    console.log(isClockedIn ? 'Clocked out' : 'Clocked in');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Clock</CardTitle>
        <CardDescription>
          {currentTime.toLocaleTimeString()} · {currentTime.toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          {isClockedIn && (
            <div className="space-y-2">
              <div className="text-4xl font-mono font-bold text-primary" data-testid="text-elapsed-time">
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
              <Button variant="outline" className="gap-2" data-testid="button-add-photo">
                <Camera className="h-4 w-4" />
                Add Photo
              </Button>
              <Button variant="outline" className="gap-2" data-testid="button-add-signature">
                <PenTool className="h-4 w-4" />
                Signature
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Assignment</span>
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
    </Card>
  );
}
