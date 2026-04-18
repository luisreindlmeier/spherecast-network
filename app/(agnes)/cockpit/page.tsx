import { opportunities, agentTasks, evidenceEntries } from '@/lib/mock-data'
import StatusBadge from '@/components/agnes/StatusBadge'
import DemandChart from '@/components/agnes/DemandChart'
import {
  Package,
  Truck,
  AlertCircle,
  TrendingUp,
  Zap,
  ChevronRight,
} from 'lucide-react'

function confidenceCell(score: number) {
  let bg: string, color: string, label: string
  if (score >= 90) {
    bg = 'rgba(34,197,94,0.25)'
    color = '#22c55e'
    label = 'Verified'
  } else if (score >= 70) {
    bg = 'rgba(234,179,8,0.25)'
    color = '#eab308'
    label = 'Pending'
  } else if (score >= 50) {
    bg = 'rgba(249,115,22,0.25)'
    color = '#f97316'
    label = 'Review'
  } else {
    bg = 'rgba(239,68,68,0.25)'
    color = '#ef4444'
    label = 'Uncertain'
  }
  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {score}% <span style={{ fontSize: 11, opacity: 0.7 }}>{label}</span>
    </span>
  )
}

const kpis = [
  {
    label: 'Raw Materials',
    value: '876',
    sub: 'in index',
    icon: <Package size={16} />,
    color: 'var(--accent-blue)',
  },
  {
    label: 'Suppliers',
    value: '40',
    sub: 'qualified',
    icon: <Truck size={16} />,
    color: 'var(--accent-purple)',
  },
  {
    label: 'Open Opportunities',
    value: '12',
    sub: 'awaiting review',
    icon: <AlertCircle size={16} />,
    color: 'var(--accent-yellow)',
  },
  {
    label: 'Potential Savings',
    value: '€2.4M',
    sub: 'annual estimate',
    icon: <TrendingUp size={16} />,
    color: 'var(--accent-green)',
  },
]

export default function CockpitPage() {
  const topOpportunities = opportunities.slice(0, 6)
  const totalSavings = opportunities.reduce((s, o) => s + o.savingsEur, 0)

  return (
    <div style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 2,
            }}
          >
            Agnes Cockpit
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Raw material intelligence — Sat 18 Apr 2026, 14:13 UTC
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Zap size={14} />
            Run Agnes Scan
          </button>
          <button className="btn-primary">Export Report</button>
        </div>
      </div>

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: `${kpi.color}18`,
                border: `0.5px solid ${kpi.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: kpi.color,
              }}
            >
              {kpi.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.1,
                }}
              >
                {kpi.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginTop: 2,
                }}
              >
                {kpi.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 1,
                }}
              >
                {kpi.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}
      >
        {/* Left: Opportunities table */}
        <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 16px 12px',
              borderBottom: '0.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Open Opportunities
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}
              >
                Ranked by confidence score · est.{' '}
                {(totalSavings / 1e6).toFixed(1)}M total savings
              </div>
            </div>
            <a
              href="/opportunities"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: 'var(--accent-blue)',
                textDecoration: 'none',
              }}
            >
              View all <ChevronRight size={14} />
            </a>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Customers</th>
                <th style={{ textAlign: 'right' }}>Volume</th>
                <th style={{ textAlign: 'right' }}>Savings</th>
                <th style={{ textAlign: 'center' }}>Confidence</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {topOpportunities.map((opp) => (
                <tr key={opp.id} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      {opp.material}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {opp.category}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                    >
                      {opp.customers.slice(0, 2).join(', ')}
                      {opp.customers.length > 2 && (
                        <span
                          style={{ color: 'var(--text-muted)', marginLeft: 4 }}
                        >
                          +{opp.customers.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12 }}>
                    {(opp.volumeKg / 1000).toFixed(0)}t
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontSize: 12,
                      color: 'var(--accent-green)',
                      fontWeight: 500,
                    }}
                  >
                    €{(opp.savingsEur / 1000).toFixed(0)}k
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {confidenceCell(opp.confidenceScore)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={opp.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* AI Agents */}
          <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '14px 16px 12px',
                borderBottom: '0.5px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Zap size={14} color="var(--accent-blue)" />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                AI Agents
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(59,130,246,0.12)',
                  color: 'var(--accent-blue)',
                  fontSize: 11,
                  padding: '1px 7px',
                  borderRadius: 999,
                  fontWeight: 500,
                }}
              >
                2 running
              </span>
            </div>

            <div>
              {agentTasks.map((task, i) => (
                <div
                  key={task.id}
                  style={{
                    padding: '11px 16px',
                    borderBottom:
                      i < agentTasks.length - 1
                        ? '0.5px solid var(--border)'
                        : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  {task.status === 'running' ? (
                    <span className="pulse-dot" style={{ marginTop: 5 }} />
                  ) : (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        flexShrink: 0,
                        marginTop: 5,
                        background:
                          task.status === 'completed'
                            ? 'var(--accent-green)'
                            : task.status === 'pending'
                              ? 'var(--text-muted)'
                              : 'var(--accent-red)',
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {task.title}
                    </div>
                    {task.progress !== undefined && (
                      <div
                        style={{
                          marginTop: 6,
                          height: 3,
                          background: 'var(--bg-elevated)',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 2,
                            background: 'var(--accent-blue)',
                            width: `${task.progress}%`,
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent decisions */}
          <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '14px 16px 12px',
                borderBottom: '0.5px solid var(--border)',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Recent Decisions
              </span>
            </div>
            {evidenceEntries.slice(0, 3).map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  padding: '10px 16px',
                  borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                    }}
                  >
                    {entry.material.length > 28
                      ? entry.material.slice(0, 28) + '…'
                      : entry.material}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleTimeString('en', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <StatusBadge status={entry.decision} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demand trend */}
      <div
        className="card-lg"
        style={{ marginTop: 12, padding: '16px 16px 12px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Consolidated Volume Trend — Titanium Dioxide (t/month)
          </div>
          <div
            style={{
              display: 'flex',
              gap: 14,
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ color: '#eab308' }}>— Actual</span>
            <span style={{ color: '#8b90a0' }}>— Baseline</span>
            <span style={{ color: '#3b82f6' }}>— Target</span>
            <span style={{ color: '#22c55e' }}>— Consensus</span>
          </div>
        </div>
        <DemandChart />
      </div>
    </div>
  )
}
