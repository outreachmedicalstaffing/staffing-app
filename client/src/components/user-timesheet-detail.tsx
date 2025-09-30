import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { TimeEntry, User } from "@shared/schema";
import { format } from "date-fns";

interface UserTimesheetDetailProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

export function UserTimesheetDetail({ user, open, onClose }: UserTimesheetDetailProps) {
  const [dateRange, setDateRange] = useState("09/22 - 10/05");
  const [payPeriod, setPayPeriod] = useState("all");

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time/entries', user?.id],
    enabled: !!user,
  });

  if (!user) return null;

  // Group entries by date
  const entriesByDate = timeEntries.reduce((acc, entry) => {
    const date = format(new Date(entry.clockIn), 'EEE M/d');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  // Calculate totals
  const regularHours = timeEntries.reduce((sum, entry) => {
    if (entry.clockOut) {
      const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }
    return sum;
  }, 0);

  const workedDays = Object.keys(entriesByDate).length;
  const totalPay = regularHours * 30; // $30/hour example rate

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                <AvatarFallback>{user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <DialogTitle className="text-xl">{user.fullName}</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" data-testid="button-pay-period">
              Pay period
            </Button>
            <Button variant="outline" size="sm" data-testid="button-date-range-detail">
              <Calendar className="h-4 w-4 mr-2" />
              {dateRange}
            </Button>
            <Button variant="outline" size="sm" data-testid="button-all-days">
              All days
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4 pb-4 border-b">
            <div>
              <p className="text-sm text-muted-foreground">Regular</p>
              <p className="text-lg font-semibold">{regularHours.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid time off</p>
              <p className="text-lg font-semibold">0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid hours</p>
              <p className="text-lg font-semibold">{regularHours.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Worked Days</p>
              <p className="text-lg font-semibold">{workedDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unpaid time off</p>
              <p className="text-lg font-semibold">0</p>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Date</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Total hours</TableHead>
                  <TableHead>Hourly rate</TableHead>
                  <TableHead>Daily total</TableHead>
                  <TableHead>Daily pay</TableHead>
                  <TableHead>Weekly total</TableHead>
                  <TableHead>Regular</TableHead>
                  <TableHead>Holiday</TableHead>
                  <TableHead>Relieving Nurse...</TableHead>
                  <TableHead>Attach ALL shift</TableHead>
                  <TableHead>Employee notes</TableHead>
                  <TableHead>Manager notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(entriesByDate).map(([date, entries]) => (
                  entries.map((entry, idx) => {
                    const hours = entry.clockOut 
                      ? (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
                      : 0;
                    const dailyPay = hours * 30;

                    return (
                      <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                        <TableCell className="font-medium">{date}</TableCell>
                        <TableCell>
                          {entry.clockOut ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              View On...
                            </Badge>
                          ) : (
                            <Select defaultValue="select">
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="select">Select</SelectItem>
                                <SelectItem value="job1">Central Florida</SelectItem>
                                <SelectItem value="job2">North Region</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut ? format(new Date(entry.clockIn), 'h:mm a') : '—'}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut ? format(new Date(entry.clockOut), 'h:mm a') : '—'}
                        </TableCell>
                        <TableCell>{entry.clockOut ? hours.toFixed(2) : '—'}</TableCell>
                        <TableCell>{entry.clockOut ? '$30' : '—'}</TableCell>
                        <TableCell>{entry.clockOut ? hours.toFixed(2) : '—'}</TableCell>
                        <TableCell>{entry.clockOut ? `$${dailyPay.toFixed(2)}` : '$0.00'}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>{entry.clockOut ? hours.toFixed(2) : '—'}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          {entry.notes ? (
                            <Button variant="ghost" size="sm" className="text-blue-600 p-0 h-auto">
                              2 Images
                            </Button>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{entry.notes || '—'}</TableCell>
                        <TableCell>—</TableCell>
                      </TableRow>
                    );
                  })
                ))}
                {timeEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                      No time entries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" data-testid="button-conflicts">
                Conflicts
              </Button>
              <Button variant="outline" data-testid="button-add">
                Add
              </Button>
              <Button variant="outline" data-testid="button-export-detail">
                Export
              </Button>
            </div>
            <Button data-testid="button-approve-user">
              Approve
            </Button>
          </div>

          {/* Summary Footer */}
          <div className="flex justify-end gap-8 text-sm pt-2">
            <div className="text-right">
              <p className="text-muted-foreground">Pay per dates</p>
              <p className="font-semibold">${totalPay.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
