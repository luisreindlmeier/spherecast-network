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

type ToastType = 'info' | 'scan'

type Toast =
  | { type: 'info'; message: string }
  | { type: 'scan'; agents: Agent[] }

export default function CockpitActions() {
  const { lastRun, save } = useLastRun()
  const [toast, setToast] = useState<Toast | null>(null)
  const [, setTick] = useState(0)

  // Re-render every minute so relative time stays fresh
  useEffect(() => {
    if (!lastRun) return
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [lastRun])

  const handleExport = useCallback(() => {
    setToast({ type: 'info', message: 'Export is coming soon — stay tuned.' })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const handleScan = useCallback(() => {
    const initial: Agent[] = AGENTS.map((a) => ({ ...a, status: 'idle' }))
    setToast({ type: 'scan', agents: initial })

    // Stagger agent start: 0ms, 500ms, 1100ms
    // Each runs for ~1200ms then marks done
    const delays = [0, 500, 1100]

    delays.forEach((startDelay, i) => {
      setTimeout(() => {
        setToast((prev) => {
          if (!prev || prev.type !== 'scan') return prev
          const next = prev.agents.map((a, j) =>
            j === i ? { ...a, status: 'running' as AgentStatus } : a
          )
          return { type: 'scan', agents: next }
        })

        setTimeout(
          () => {
            setToast((prev) => {
              if (!prev || prev.type !== 'scan') return prev
              const next = prev.agents.map((a, j) =>
                j === i ? { ...a, status: 'done' as AgentStatus } : a
              )
              return { type: 'scan', agents: next }
            })
          },
          1200 + i * 100
        )
      }, startDelay)
    })

    // All done at ~0 + 1200 + 1100 + 1200 + 100 = ~2.6s, dismiss at 3s
    setTimeout(() => {
      setToast(null)
      save()
    }, 3200)
  }, [save])

  return (
    <div className="cockpit-actions-root">
      <div className="cockpit-actions-buttons">
        <button type="button" className="btn btn-ghost" onClick={handleExport}>
          Export
        </button>
        <div className="cockpit-scan-wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleScan}
            disabled={toast?.type === 'scan'}
          >
            Run Agnes scan
          </button>
          {lastRun && !toast && (
            <span className="cockpit-last-run">
              Last run {relativeTime(lastRun)}
            </span>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`cockpit-toast cockpit-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'info' && (
            <span className="cockpit-toast-msg">{toast.message}</span>
          )}
          {toast.type === 'scan' && (
            <div className="cockpit-scan-panel">
              <div className="cockpit-scan-panel-title">Starting Agnes…</div>
              <ul className="cockpit-scan-agent-list">
                {toast.agents.map((agent) => (
                  <li key={agent.id} className="cockpit-scan-agent">
                    <span
                      className={`cockpit-scan-agent-dot cockpit-scan-agent-dot--${agent.status}`}
                    >
                      {agent.status === 'done'
                        ? '✓'
                        : agent.status === 'running'
                          ? ''
                          : '·'}
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
