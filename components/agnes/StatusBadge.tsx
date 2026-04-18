import type {
  OpportunityStatus,
  AgentStatus,
  DecisionStatus,
} from '@/lib/mock-data'

type BadgeVariant = OpportunityStatus | AgentStatus | DecisionStatus

const config: Record<BadgeVariant, string> = {
  active: 'badge badge-active',
  pending: 'badge badge-pending',
  verified: 'badge badge-verified',
  critical: 'badge badge-critical',
  running: 'badge badge-running',
  completed: 'badge badge-completed',
  accepted: 'badge badge-accepted',
  rejected: 'badge badge-rejected',
  failed: 'badge badge-failed',
}

const labels: Record<BadgeVariant, string> = {
  active: 'Active',
  pending: 'Pending',
  verified: 'Verified',
  critical: 'Critical',
  running: 'Running',
  completed: 'Completed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  failed: 'Failed',
}

export default function StatusBadge({ status }: { status: BadgeVariant }) {
  return <span className={config[status]}>{labels[status]}</span>
}
