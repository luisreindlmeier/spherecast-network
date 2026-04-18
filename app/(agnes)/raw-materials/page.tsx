import { rawMaterials } from '@/lib/mock-data'
import { Package } from 'lucide-react'

function ConfidenceBar({ score }: { score: number }) {
  const color =
    score >= 90
      ? '#22c55e'
      : score >= 70
        ? '#eab308'
        : score >= 50
          ? '#f97316'
          : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          background: 'var(--bg-elevated)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          color,
          fontWeight: 500,
          width: 30,
          textAlign: 'right',
        }}
      >
        {score}%
      </span>
    </div>
  )
}

export default function RawMaterialsPage() {
  return (
    <div style={{ maxWidth: 1100 }}>
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
            Raw Materials
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            876 ingredients indexed · showing top 20 by activity
          </p>
        </div>
        <button
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Package size={14} /> Add Material
        </button>
      </div>

      <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Category</th>
              <th>CAS</th>
              <th style={{ textAlign: 'right' }}>Suppliers</th>
              <th style={{ textAlign: 'right' }}>Customers</th>
              <th style={{ width: 140 }}>Agnes Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rawMaterials.map((rm) => (
              <tr key={rm.id} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{rm.name}</div>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      background: 'var(--bg-elevated)',
                      padding: '2px 7px',
                      borderRadius: 4,
                    }}
                  >
                    {rm.category}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {rm.cas}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontSize: 13 }}>
                  {rm.suppliersCount}
                </td>
                <td style={{ textAlign: 'right', fontSize: 13 }}>
                  {rm.customersCount}
                </td>
                <td style={{ width: 140 }}>
                  <ConfidenceBar score={rm.confidenceScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: '8px 12px',
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Showing 20 of 876 materials
        </span>
        <button
          className="btn-ghost"
          style={{ fontSize: 12, padding: '4px 10px' }}
        >
          Load more
        </button>
      </div>
    </div>
  )
}
