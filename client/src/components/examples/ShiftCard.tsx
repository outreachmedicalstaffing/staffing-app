import { ShiftCard } from '../shift-card'

export default function ShiftCardExample() {
  return (
    <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      <ShiftCard
        id="1"
        job="Central Florida"
        subJob="7A-7P Day Shift"
        date="Dec 15, 2024"
        startTime="7:00 AM"
        endTime="7:00 PM"
        location="Orlando Medical Center"
        status="approved"
        tasksCount={5}
        attachmentsCount={2}
        assignedTo="Jane Smith"
        onView={() => console.log('View shift 1')}
      />
      <ShiftCard
        id="2"
        job="Treasure Coast"
        subJob="7P-7A Night Shift"
        date="Dec 16, 2024"
        startTime="7:00 PM"
        endTime="7:00 AM"
        location="Stuart Regional"
        status="open"
        tasksCount={3}
        onClaim={() => console.log('Claim shift 2')}
        onView={() => console.log('View shift 2')}
      />
      <ShiftCard
        id="3"
        job="Jacksonville"
        subJob="12P-12A Evening"
        date="Dec 17, 2024"
        startTime="12:00 PM"
        endTime="12:00 AM"
        status="pending"
        assignedTo="Mike Johnson"
        onView={() => console.log('View shift 3')}
      />
    </div>
  )
}
