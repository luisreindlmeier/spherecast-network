'use client'

import { useState, useEffect, useCallback } from 'react'

const LAST_RUN_KEY = 'agnes-last-scan'

type AgentStatus = 'idle' | 'running' | 'done'

type Agent = {
  id: string
  name: string
  description: string
  status: AgentStatus
}

const AGENTS: Agent[] = [
  {
    id: 'opportunity-scanner',
    name: 'Opportunity Scanner',
    description: 'Ranking substitution matches across SKUs',
    status: 'idle',
  },
  {
    id: 'supplier-validator',
    name: 'Supplier Validator',
    description: 'Checking compliance & performance metrics',
    status: 'idle',
  },
  {
    id: 'consolidation-analyst',
    name: 'Consolidation Analyst',
    description: 'Mapping cross-brand pooling opportunities',
    status: 'idle',
  },
]

function useLastRun() {
  const [lastRun, setLastRun] = useState<Date | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(LAST_RUN_KEY)
    if (stored) setLastRun(new Date(stored))
  }, [])

  const save = useCallback(() => {
    const now = new Date()
    localStorage.setItem(LAST_RUN_KEY, now.toISOString())
    setLastRun(now)
  }, [])

  return { lastRun, save }
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin === 1) return '1 minute ago'
  if (diffMin < 60) return `${diffMin} minutes ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH === 1) return '1 hour ago'
  return `${diffH} hours ago`
}

type Popover = { type: 'export' } | { type: 'scan'; agents: Agent[] }

export default function CockpitActions() {
  const { lastRun, save } = useLastRun()
  const [popover, setPopover] = useState<Popover | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!lastRun) return
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [lastRun])

  const handleExport = useCallback(() => {
    setPopover({ type: 'export' })
    setTimeout(() => setPopover(null), 3000)
  }, [])

  const handleScan = useCallback(() => {
    const initial: Agent[] = AGENTS.map((a) => ({ ...a, status: 'idle' }))
    setPopover({ type: 'scan', agents: initial })

    const delays = [0, 500, 1000]
    delays.forEach((startDelay, i) => {
      setTimeout(() => {
        setPopover((prev) => {
          if (!prev || prev.type !== 'scan') return prev
          return {
            type: 'scan',
            agents: prev.agents.map((a, j) =>
              j === i ? { ...a, status: 'running' } : a
            ),
          }
        })
        setTimeout(
          () => {
            setPopover((prev) => {
              if (!prev || prev.type !== 'scan') return prev
              return {
                type: 'scan',
                agents: prev.agents.map((a, j) =>
                  j === i ? { ...a, status: 'done' } : a
                ),
              }
            })
          },
          1100 + i * 80
        )
      }, startDelay)
    })

    setTimeout(() => {
      setPopover(null)
      save()
    }, 3000)
  }, [save])

  return (
    <>
      {/* Buttons — identical layout to before */}
      <button type="button" className="btn btn-ghost" onClick={handleExport}>
        Export
      </button>

      {/* Scan button in relative wrapper so popover can anchor to it */}
      <div className="cockpit-scan-anchor">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleScan}
          disabled={popover?.type === 'scan'}
        >
          Run Agnes scan
        </button>
        {lastRun && !popover && (
          <span className="cockpit-last-run">
            Last run {relativeTime(lastRun)}
          </span>
        )}

        {/* Floating popover anchored above the button */}
        {popover && (
          <div className="cockpit-popover" role="status" aria-live="polite">
            {popover.type === 'export' && (
              <p className="cockpit-popover-msg">
                Export is coming soon — stay tuned.
              </p>
            )}

            {popover.type === 'scan' && (
              <>
                <div className="cockpit-popover-title">Starting Agnes…</div>
                <ul className="cockpit-scan-agent-list">
                  {popover.agents.map((agent) => (
                    <li key={agent.id} className="cockpit-scan-agent">
                      <span
                        className={`cockpit-scan-agent-dot cockpit-scan-agent-dot--${agent.status}`}
                      >
                        {agent.status === 'done' ? '✓' : ''}
                      </span>
                      <span className="cockpit-scan-agent-info">
                        <span className="cockpit-scan-agent-name">
                          {agent.name}
                        </span>
                        <span className="cockpit-scan-agent-desc">
                          {agent.description}
                        </span>
                      </span>
                      {agent.status === 'running' && (
                        <span className="cockpit-scan-spinner" aria-hidden />
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
