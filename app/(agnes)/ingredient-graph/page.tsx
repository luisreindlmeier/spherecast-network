import dynamic from 'next/dynamic'

const IngredientGraph = dynamic(
  () => import('@/components/agnes/IngredientGraph'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          flex: 1,
          background: 'var(--bg-surface)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        Loading ingredient graph…
      </div>
    ),
  }
)

export default function IngredientGraphPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 48px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
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
            Ingredient Graph
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Force-directed similarity network · edge weight encodes similarity
            score · thicker = more similar
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 24,
                height: 2,
                background: '#22c55e',
                borderRadius: 1,
              }}
            />
            Strong edge (≥90%)
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 8,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 24,
                height: 1,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 1,
              }}
            />
            Weak edge
          </span>
        </div>
      </div>

      <div
        className="card-lg"
        style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: 0 }}
      >
        <IngredientGraph />
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '10px 14px',
          background: 'var(--bg-surface)',
          borderRadius: 8,
          border: '0.5px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        Node color = ingredient category · Edge thickness = embedding similarity
        · Green edges = similarity ≥ 90% · Click a node to highlight connections
      </div>
    </div>
  )
}
