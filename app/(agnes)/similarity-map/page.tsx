import dynamic from 'next/dynamic'
import { categoryColors } from '@/lib/mock-data'

const SimilarityScatter = dynamic(
  () => import('@/components/agnes/SimilarityScatter'),
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
        Loading 3D embedding space…
      </div>
    ),
  }
)

export default function SimilarityMapPage() {
  const categories = Object.entries(categoryColors)

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
            Similarity Map
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            UMAP embedding space · 876 ingredients · colored by category
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(([cat, color]) => (
            <span
              key={cat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div
        className="card-lg"
        style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: 0 }}
      >
        <SimilarityScatter />
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
        Axes have no semantic meaning — UMAP coordinates are
        dimensionality-reduced embeddings. Proximity indicates
        chemical/functional similarity. Drag to rotate · scroll to zoom.
      </div>
    </div>
  )
}
