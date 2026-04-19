'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App route error', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="detail-card app-error-card">
      <h2 className="app-error-title">Something went wrong</h2>
      <p className="app-error-description">
        The page could not be loaded. Please retry.
      </p>
      <button
        type="button"
        className="agent-action-btn app-error-retry"
        onClick={reset}
      >
        Retry
      </button>
    </div>
  )
}
