import { useState } from "react";
import { ShiftCard } from "@/components/shift-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Grid, List, Search, Plus, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Schedule() {
  const [searchQuery, setSearchQuery] = useState("");

  const myShifts = [
    { 
      id: "1", 
      job: "Central Florida", 
      subJob: "7A-7P Day", 
      date: "Dec 15, 2024", 
      startTime: "7:00 AM", 
      endTime: "7:00 PM", 
      location: "Orlando Medical", 
      status: "approved" as const, 
      tasksCount: 5, 
      attachmentsCount: 2,
      assignedTo: "You"
    },
    { 
      id: "2", 
      job: "Treasure Coast", 
      subJob: "7P-7A Night", 
      date: "Dec 16, 2024", 
      startTime: "7:00 PM", 
      endTime: "7:00 AM", 
      location: "Stuart Regional", 
      status: "approved" as const, 
      tasksCount: 3,
      assignedTo: "You"
    },
  ];

  const openShifts = [
    { 
      id: "3", 
      job: "Jacksonville", 
      subJob: "12P-12A Evening", 
      date: "Dec 18, 2024", 
      startTime: "12:00 PM", 
      endTime: "12:00 AM", 
      location: "Jacksonville General", 
      status: "open" as const, 
      tasksCount: 4
    },
    { 
      id: "4", 
      job: "Brevard", 
      subJob: "7A-7P Day", 
      date: "Dec 19, 2024", 
      startTime: "7:00 AM", 
      endTime: "7:00 PM", 
      status: "open" as const, 
      tasksCount: 6
    },
  ];

  const teamShifts = [
    { 
      id: "5", 
      job: "Nature Coast", 
      subJob: "7A-7P Day", 
      date: "Dec 15, 2024", 
      startTime: "7:00 AM", 
      endTime: "7:00 PM", 
      status: "approved" as const, 
      tasksCount: 4,
      assignedTo: "Jane Smith"
    },
    { 
      id: "6", 
      job: "Citrus", 
      subJob: "7P-7A Night", 
      date: "Dec 15, 2024", 
      startTime: "7:00 PM", 
      endTime: "7:00 AM", 
      status: "pending" as const, 
      tasksCount: 5,
      assignedTo: "Mike Johnson"
    },
  ];

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
