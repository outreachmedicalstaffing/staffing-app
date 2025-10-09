// client/src/pages/schedule.tsx
import React, { useMemo, useState } from "react";
import {
  addWeeks,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  eachDayOfInterval,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

// shadcn/ui
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// icons
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  X,
  Clock,
  Users as UsersIcon,
  DollarSign,
  ClipboardList,
  MoreVertical,
} from "lucide-react";

// ------------- Types -------------
type ID = string;

interface User {
  id: ID;
  fullName: string;
  role?: string;
  defaultHourlyRate?: string;
}

interface Shift {
  id: ID;
  userId: ID | null;
  startTime: string; // ISO
  endTime: string; // ISO
  jobName?: string;
  rate?: string;
}

type AvailabilityType = "preferred" | "unavailable";

interface Availability {
  id: ID;
  userId: ID;
  date: string; // yyyy-MM-dd or ISO date (we always normalize per-day)
  type: AvailabilityType;
  allDay?: boolean;
  // (Optional) time window for partial day; we keep but don't use for "All day"
  startTime?: string;
  endTime?: string;
}

// ------------- Helpers -------------
function toDayKey(d: Date) {
  const x = startOfDay(d);
  return format(x, "yyyy-MM-dd");
}

function hoursBetween(startISO: string, endISO: string) {
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

function dollar(n: number) {
  return `$${n.toFixed(2)}`;
}

// ------------- Page -------------
export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  // ------- Data -------
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: [
      "/api/shifts",
      { start: weekStart.toISOString(), end: weekEnd.toISOString() },
    ],
    queryFn: async () => {
      // server can accept range; if not, fetch all and filter here
      const res = await apiRequest(
        "GET",
        `/api/shifts?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
      );
      return res.json();
    },
  });

  const { data: availability = [] } = useQuery<Availability[]>({
    queryKey: [
      "/api/availability",
      { start: weekStart.toISOString(), end: weekEnd.toISOString() },
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/availability?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
      );
      return res.json();
    },
  });

  // ------- Mutations for availability -------
  const createAvailabilityMutation = useMutation({
    mutationFn: async (payload: {
      userId: ID;
      date: Date;
      type: AvailabilityType;
      allDay?: boolean;
      startTime?: string;
      endTime?: string;
    }) => {
      const dayKey = toDayKey(payload.date);
      const body = {
        userId: payload.userId,
        date: dayKey,
        type: payload.type,
        allDay: payload.allDay ?? true,
        startTime: payload.startTime ?? null,
        endTime: payload.endTime ?? null,
      };
      const res = await apiRequest("POST", "/api/availability", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: ID) => {
      const res = await apiRequest("DELETE", `/api/availability/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
  });

  // ------- Derived -------
  const weekRangeLabel = `${format(weekStart, "MMM d")} - ${format(
    weekEnd,
    "MMM d",
  )}`;

  const unassignedShifts = useMemo(
    () =>
      shifts.filter((s) => {
        const st = new Date(s.startTime);
        return (
          !s.userId && isWithinInterval(st, { start: weekStart, end: weekEnd })
        );
      }),
    [shifts, weekStart, weekEnd],
  );

  function shiftsForUserOnDay(userId: ID, day: Date) {
    return shifts.filter((s) => {
      if (s.userId !== userId) return false;
      return isSameDay(new Date(s.startTime), day);
    });
  }

  function availabilityFor(userId: ID, day: Date) {
    const key = toDayKey(day);
    return availability.find((a) => a.userId === userId && a.date === key);
  }

  // ------- Summary -------
  const totalHours = useMemo(() => {
    return shifts.reduce(
      (acc, s) => acc + hoursBetween(s.startTime, s.endTime),
      0,
    );
  }, [shifts]);

  const totalShifts = shifts.length;
  const totalUsers = users.length;

  // naive labor: hours * (shift.rate or user.defaultHourlyRate or 32)
  const labor = useMemo(() => {
    return shifts.reduce((acc, s) => {
      const hrs = hoursBetween(s.startTime, s.endTime);
      const u = users.find((u) => u.id === s.userId);
      const rate = parseFloat(s.rate ?? u?.defaultHourlyRate ?? "32");
      return acc + hrs * (isNaN(rate) ? 32 : rate);
    }, 0);
  }, [shifts, users]);

  // ------- UI handlers -------
  const markUnavailable = (userId: ID, day: Date) => {
    createAvailabilityMutation.mutate({
      userId,
      date: day,
      type: "unavailable",
      allDay: true,
    });
  };

  const markPreferredAllDay = (userId: ID, day: Date) => {
    createAvailabilityMutation.mutate({
      userId,
      date: day,
      type: "preferred",
      allDay: true,
    });
  };

  const clearAvailability = (av: Availability | undefined) => {
    if (!av) return;
    deleteAvailabilityMutation.mutate(av.id);
  };

  // ------- Render -------
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((s) => subWeeks(s, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button variant="outline" className="min-w-[160px]">
            {weekRangeLabel}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((s) => addWeeks(s, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Today
          </Button>
        </div>
      </div>

      {/* Grid */}
      <Card className="overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[220px_repeat(5,minmax(180px,1fr))] border-b bg-muted/40">
          <div className="p-3 text-sm font-medium">Week view</div>
          {weekDays.map((d) => (
            <div key={d.toISOString()} className="p-3">
              <div className="text-center text-sm font-medium">
                {format(d, "EEE M/d")}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground text-center grid grid-cols-3">
                <span>Labor</span>
                <span>Scheduled</span>
                <span>Actual</span>
              </div>
            </div>
          ))}
        </div>

        {/* Unassigned row */}
        <div className="grid grid-cols-[220px_repeat(5,minmax(180px,1fr))]">
          <div className="border-r p-2 flex items-center gap-2 bg-muted/30">
            <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">Unassigned shifts</div>
            </div>
          </div>

          {weekDays.map((d) => {
            const dayShifts = unassignedShifts.filter((s) =>
              isSameDay(new Date(s.startTime), d),
            );
            return (
              <div
                key={d.toISOString()}
                className="min-h-[72px] border-r p-2 bg-background"
              >
                {dayShifts.length === 0 ? (
                  <div className="h-[60px] rounded-md border-dashed border text-muted-foreground grid place-items-center text-xs">
                    —
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayShifts.map((s) => (
                      <Card
                        key={s.id}
                        className="px-2 py-1.5 bg-emerald-700 text-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold">
                            {format(new Date(s.startTime), "h:mma")} -{" "}
                            {format(new Date(s.endTime), "h:mma")}
                          </div>
                          <div className="flex items-center gap-2 opacity-90">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                            >
                              <X className="h-3.5 w-3.5 text-white/90" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                            >
                              <Heart className="h-3.5 w-3.5 text-white/90" />
                            </Button>
                            <MoreVertical className="h-3.5 w-3.5 text-white/90" />
                          </div>
                        </div>
                        <div className="mt-0.5 text-white/90 text-[10px] truncate">
                          {s.jobName && `${s.jobName} • `}
                          Unassigned
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Users rows */}
        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-[220px_repeat(5,minmax(180px,1fr))] border-t"
          >
            {/* User cell */}
            <div className="border-r p-3">
              <div className="text-sm font-medium">{user.fullName}</div>
              <div className="text-xs text-muted-foreground">0.0h • $0</div>
            </div>

            {/* Day cells */}
            {weekDays.map((day, dayIdx) => {
              const userDayShifts = shiftsForUserOnDay(user.id, day);
              const av = availabilityFor(user.id, day);
              const isUnavailable = av?.type === "unavailable";

              return (
                <div
                  key={`${user.id}-${dayIdx}`}
                  className={`relative min-h-[112px] border-r p-2 ${
                    isUnavailable
                      ? "bg-red-50/60 dark:bg-red-950/10"
                      : av?.type === "preferred"
                        ? "bg-emerald-50/60 dark:bg-emerald-950/10"
                        : "bg-background"
                  } group`}
                >
                  {/* Availability controls */}
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {!av && userDayShifts.length === 0 && (
                      <>
                        {/* Unavailable (red X) */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 bg-background/80 hover:bg-red-100 dark:hover:bg-red-950/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            markUnavailable(user.id, day);
                          }}
                          title="Mark unavailable"
                          data-testid={`button-mark-unavailable-${user.id}-${dayIdx}`}
                        >
                          <X className="h-3 w-3 text-red-600" />
                        </Button>

                        {/* Preferred (green heart) — All day */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 bg-background/80 hover:bg-green-100 dark:hover:bg-green-950/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            markPreferredAllDay(user.id, day);
                          }}
                          title="Mark preferred"
                          data-testid={`button-mark-preferred-${user.id}-${dayIdx}`}
                        >
                          <Heart className="h-3 w-3 text-green-600" />
                        </Button>
                      </>
                    )}

                    {!!av && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 bg-background/80"
                            title="Availability options"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => clearAvailability(av)}
                          >
                            Clear availability
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Availability Display */}
                  {av && (
                    <div
                      className="text-center mb-2 space-y-0.5"
                      data-testid={`availability-display-${user.id}-${dayIdx}`}
                    >
                      <div
                        className={`text-xs font-semibold ${
                          isUnavailable
                            ? "text-red-600 dark:text-red-500"
                            : "text-green-600 dark:text-green-500"
                        }`}
                      >
                        {isUnavailable ? "Unavailable" : "Prefer to work"}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          isUnavailable
                            ? "text-red-600 dark:text-red-500"
                            : "text-green-600 dark:text-green-500"
                        }`}
                      >
                        All day
                      </div>
                    </div>
                  )}

                  {/* Shifts */}
                  {userDayShifts.length === 0 ? (
                    <div className="h-[72px] rounded-md border-dashed border text-muted-foreground grid place-items-center text-xs">
                      —
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userDayShifts.map((s) => (
                        <Card
                          key={s.id}
                          className="px-2 py-1.5 bg-emerald-700 text-white"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold">
                              {format(new Date(s.startTime), "h:mma")} -{" "}
                              {format(new Date(s.endTime), "h:mma")}
                            </div>
                            <div className="flex items-center gap-2 opacity-90">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                title="Remove"
                              >
                                <X className="h-3.5 w-3.5 text-white/90" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                title="Favorite"
                              >
                                <Heart className="h-3.5 w-3.5 text-white/90" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-0.5 text-white/90 text-[10px] truncate">
                            {s.jobName && `${s.jobName} • `}
                            {user.fullName}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Bottom Summary Bar */}
        <Card className="p-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hours:</span>
                <span className="font-medium">{totalHours.toFixed(1)}</span>
              </div>

              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Shifts:</span>
                <span className="font-medium">{totalShifts}</span>
              </div>

              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Users:</span>
                <span className="font-medium">{totalUsers}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Labor:</span>
              <span className="font-medium">{dollar(labor)}</span>
            </div>
          </div>
        </Card>
      </Card>
    </div>
  );
}
