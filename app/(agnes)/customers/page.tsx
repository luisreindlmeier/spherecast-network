import { customers } from '@/lib/mock-data'
import { Users } from 'lucide-react'

export default function CustomersPage() {
  return (
    <div style={{ maxWidth: 900 }}>
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
            Customers
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {customers.length} CPG brands in the network
          </p>
        </div>
        <button
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Users size={14} /> Add Customer
        </button>
      </div>

      <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Raw Materials</th>
              <th style={{ textAlign: 'right' }}>Active Contracts</th>
              <th style={{ textAlign: 'right' }}>Opportunities</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => {
              const opps = [876, 734, 623, 589, 412, 367, 298][i] ?? 0
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }}>
                  <td
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      width: 32,
                    }}
                  >
                    {i + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      {c.name}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13 }}>
                    {c.materials.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13 }}>
                    {c.activeContracts}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        color: 'var(--accent-yellow)',
                        fontWeight: 500,
                        fontSize: 13,
                      }}
                    >
                      {[4, 3, 3, 3, 2, 2, 4][i] ?? 0}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
