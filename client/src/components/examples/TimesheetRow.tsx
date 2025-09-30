import { TimesheetRow } from '../timesheet-row'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function TimesheetRowExample() {
  return (
    <div className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Job / Sub-Job</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attachments</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TimesheetRow
            id="1"
            date="Dec 12, 2024"
            job="Central Florida"
            subJob="7A-7P Day"
            clockIn="7:02 AM"
            clockOut="7:15 PM"
            totalHours={12.22}
            status="approved"
            hasEdit={false}
            hasAttachments={true}
            onEdit={() => console.log('Edit entry 1')}
          />
          <TimesheetRow
            id="2"
            date="Dec 13, 2024"
            job="Treasure Coast"
            subJob="7P-7A Night"
            clockIn="7:00 PM"
            clockOut="7:30 AM"
            totalHours={12.5}
            status="pending"
            hasEdit={true}
            hasAttachments={false}
            onEdit={() => console.log('Edit entry 2')}
            onViewHistory={() => console.log('View history 2')}
          />
          <TimesheetRow
            id="3"
            date="Dec 14, 2024"
            job="Jacksonville"
            subJob="12P-12A Evening"
            clockIn="12:00 PM"
            clockOut="11:45 PM"
            totalHours={11.75}
            status="rejected"
            hasEdit={true}
            hasAttachments={true}
            onEdit={() => console.log('Edit entry 3')}
            onViewHistory={() => console.log('View history 3')}
          />
        </TableBody>
      </Table>
    </div>
  )
}
