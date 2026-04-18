import { suppliers } from '@/lib/mock-data'
import { Truck } from 'lucide-react'

export default function SuppliersPage() {
  return (
    <div style={{ maxWidth: 1000 }}>
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
            Suppliers
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {suppliers.length} qualified suppliers in the network
          </p>
        </div>
        <button
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Truck size={14} /> Add Supplier
        </button>
      </div>

      <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Supplier</th>
              <th>Country</th>
              <th>Categories</th>
              <th style={{ textAlign: 'right' }}>Products</th>
              <th style={{ textAlign: 'right' }}>Rating</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s, i) => (
              <tr key={s.id} style={{ cursor: 'pointer' }}>
                <td
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    width: 32,
                  }}
                >
                  {i + 1}
                </td>
                <td style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {s.country}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {s.categories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          background: 'var(--bg-elevated)',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontSize: 13 }}>
                  {s.products}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color:
                        s.rating >= 4.7
                          ? '#22c55e'
                          : s.rating >= 4.4
                            ? '#eab308'
                            : '#f97316',
                    }}
                  >
                    {s.rating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    /5
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
