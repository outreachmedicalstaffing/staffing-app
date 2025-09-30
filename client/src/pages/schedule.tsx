import { useState } from "react";
import { ShiftCard } from "@/components/shift-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Grid, List, Search, Plus, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Shift } from "@shared/schema";
import { format, isAfter } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Schedule() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  const now = new Date();
  
  const myShifts = shifts.filter(s => s.status === 'assigned' && isAfter(new Date(s.startTime), now))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map(s => ({
      id: s.id,
      job: s.location || 'Unknown',
      subJob: s.title,
      date: format(new Date(s.startTime), 'MMM d, yyyy'),
      startTime: format(new Date(s.startTime), 'h:mm a'),
      endTime: format(new Date(s.endTime), 'h:mm a'),
      location: s.location || 'Unknown',
      status: s.status as any,
      assignedTo: "You"
    }));

  const openShifts = shifts.filter(s => s.status === 'open' && isAfter(new Date(s.startTime), now))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map(s => ({
      id: s.id,
      job: s.location || 'Unknown',
      subJob: s.title,
      date: format(new Date(s.startTime), 'MMM d, yyyy'),
      startTime: format(new Date(s.startTime), 'h:mm a'),
      endTime: format(new Date(s.endTime), 'h:mm a'),
      location: s.location || 'Unknown',
      status: s.status as any
    }));

  const teamShifts = shifts.filter(s => isAfter(new Date(s.startTime), now))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map(s => ({
      id: s.id,
      job: s.location || 'Unknown',
      subJob: s.title,
      date: format(new Date(s.startTime), 'MMM d, yyyy'),
      startTime: format(new Date(s.startTime), 'h:mm a'),
      endTime: format(new Date(s.endTime), 'h:mm a'),
      location: s.location || 'Unknown',
      status: s.status as any,
      assignedTo: s.status === 'assigned' ? 'Team Member' : 'Unassigned'
    }));
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-schedule">Schedule</h1>
          <p className="text-muted-foreground">Manage your shifts and view team schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" data-testid="button-calendar-view">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" data-testid="button-grid-view">
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" data-testid="button-settings">
            <SettingsIcon className="h-4 w-4" />
          </Button>
          <Button data-testid="button-create-shift">
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shifts by job, location, or date..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-shifts"
          />
        </div>
      </div>

      <Tabs defaultValue="my-shifts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-shifts" data-testid="tab-my-shifts">
            <List className="h-4 w-4 mr-2" />
            My Shifts
          </TabsTrigger>
          <TabsTrigger value="open-shifts" data-testid="tab-open-shifts">
            Open Shifts
          </TabsTrigger>
          <TabsTrigger value="team-schedule" data-testid="tab-team-schedule">
            Team Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Assigned Shifts</CardTitle>
              <CardDescription>{myShifts.length} upcoming shifts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    {...shift}
                    onView={() => console.log(`View shift ${shift.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="open-shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Shifts</CardTitle>
              <CardDescription>{openShifts.length} shifts available to claim</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {openShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    {...shift}
                    onClaim={() => console.log(`Claim shift ${shift.id}`)}
                    onView={() => console.log(`View shift ${shift.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Shifts</CardTitle>
              <CardDescription>{teamShifts.length} team members scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    {...shift}
                    onView={() => console.log(`View shift ${shift.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
