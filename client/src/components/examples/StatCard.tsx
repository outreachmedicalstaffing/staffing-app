import { StatCard } from '../stat-card'
import { Clock, Calendar, CheckCircle, AlertTriangle } from 'lucide-react'

export default function StatCardExample() {
  return (
    <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Hours This Week"
        value="42.5"
        icon={Clock}
        description="5 shifts completed"
      />
      <StatCard
        title="Upcoming Shifts"
        value={8}
        icon={Calendar}
        description="Next 7 days"
      />
      <StatCard
        title="Completed Tasks"
        value="24/28"
        icon={CheckCircle}
        trend={{ value: "+12%", isPositive: true }}
      />
      <StatCard
        title="Pending Approvals"
        value={3}
        icon={AlertTriangle}
        description="Requires attention"
      />
    </div>
  )
}
