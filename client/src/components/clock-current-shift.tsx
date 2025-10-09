import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User, Shift } from "@shared/schema";
import { format, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Calendar, Clock, MapPin, Paperclip, Info } from "lucide-react";

type ShiftAssignment = {
  id: string;
  shiftId: string;
  userId: string;
};

function asDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v);
}

export default function CurrentShift() {
  // who am I
  const { data: me, isLoading: meLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // all shifts
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
  });

  // all assignments
  const { data: assignments = [], isLoading: asgLoading } = useQuery<
    ShiftAssignment[]
  >({
    queryKey: ["/api/shift-assignments"],
  });

  const { currentShift, isActive } = useMemo(() => {
    if (!me || !Array.isArray(shifts) || !Array.isArray(assignments)) {
      return { currentShift: null as Shift | null, isActive: false };
    }

    const now = new Date();
    const myShiftIds = new Set(
      assignments
        .filter((a) => String(a.userId) === String(me.id))
        .map((a) => a.shiftId),
    );
    const myShifts = shifts.filter((s) => myShiftIds.has(s.id));

    // active = now within [start, end]
    const active = myShifts.find((s) => {
      const start = asDate(s.startTime);
      const end = asDate(s.endTime);
      return start <= now && now <= end;
    });

    if (active) return { currentShift: active, isActive: true };

    // otherwise, pick earliest *today* (if any)
    const todays = myShifts
      .filter((s) => isSameDay(asDate(s.startTime), now))
      .sort((a, b) => +asDate(a.startTime) - +asDate(b.startTime));

    return { currentShift: todays[0] ?? null, isActive: false };
  }, [me, shifts, assignments]);

  if (meLoading || shiftsLoading || asgLoading) {
    return (
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Current Shift</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Loading your shift…
        </CardContent>
      </Card>
    );
  }

  if (!currentShift) {
    return (
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Current Shift</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4" />
          No assigned shift right now. If you expected one, check the Schedule.
        </CardContent>
      </Card>
    );
  }

  const start = asDate(currentShift.startTime);
  const end = asDate(currentShift.endTime);

  const timeRange = `${format(start, "h:mma")} – ${format(end, "h:mma")}`;
  const dateStr = format(start, "EEEE, MMM d");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Current Shift</CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Upcoming"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{dateStr}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{timeRange}</span>
        </div>

        {(currentShift.jobName || currentShift.title) && (
          <div className="text-sm">
            {currentShift.jobName && (
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: currentShift.color ?? "#64748B" }}
                />
                <span className="font-medium">{currentShift.jobName}</span>
              </div>
            )}
            {currentShift.title && (
              <div className="text-muted-foreground">{currentShift.title}</div>
            )}
          </div>
        )}

        {currentShift.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{currentShift.location}</span>
          </div>
        )}

        <Accordion type="single" collapsible className="mt-2">
          <AccordionItem value="details">
            <AccordionTrigger className="text-sm">
              Shift details
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {currentShift.notes ? (
                <div className="whitespace-pre-wrap text-sm">
                  {currentShift.notes}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No notes for this shift.
                </div>
              )}

              {Array.isArray(currentShift.attachments) &&
                currentShift.attachments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Attachments
                    </div>
                    <div className="grid gap-2">
                      {currentShift.attachments.map((filename, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={() =>
                            window.open(`/api/files/${filename}`, "_blank")
                          }
                        >
                          <Paperclip className="h-4 w-4" />
                          <span className="truncate">{filename}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
