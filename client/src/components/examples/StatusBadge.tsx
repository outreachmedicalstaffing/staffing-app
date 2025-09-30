import { StatusBadge } from '../status-badge'

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-3 p-6">
      <StatusBadge status="approved" />
      <StatusBadge status="completed" />
      <StatusBadge status="pending" />
      <StatusBadge status="submitted" />
      <StatusBadge status="claimed" />
      <StatusBadge status="rejected" />
      <StatusBadge status="expired" />
      <StatusBadge status="cancelled" />
      <StatusBadge status="expiring" />
      <StatusBadge status="warning" />
      <StatusBadge status="draft" />
      <StatusBadge status="open" />
    </div>
  )
}
