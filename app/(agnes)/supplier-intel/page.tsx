import dynamic from 'next/dynamic'
import { suppliers, customers } from '@/lib/mock-data'

const SupplierMap = dynamic(() => import('@/components/agnes/SupplierMap'), {
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
      Loading supplier map…
    </div>
  ),
})

export default function SupplierIntelPage() {
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
            Supplier Intel
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {suppliers.length} suppliers · {customers.length} customers · hover
            for details
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#3b82f6',
                display: 'inline-block',
              }}
            />
            Supplier
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block',
              }}
            />
            Customer
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 20,
                height: 1,
                background: 'rgba(59,130,246,0.4)',
                borderRadius: 1,
              }}
            />
            Connection
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: 12, minHeight: 0 }}>
        <div
          className="card-lg"
          style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: 0 }}
        >
          <SupplierMap />
        </div>

        <div
          style={{
            width: 260,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflowY: 'auto',
          }}
        >
          <div className="card" style={{ padding: '12px 14px' }}>
            <div className="section-label" style={{ marginBottom: 10 }}>
              Top Suppliers
            </div>
            {suppliers.slice(0, 6).map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 0',
                  borderBottom: i < 5 ? '0.5px solid var(--border)' : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    width: 14,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {s.country} · {s.products} products
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--accent-yellow)',
                    fontWeight: 500,
                  }}
                >
                  {s.rating.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
