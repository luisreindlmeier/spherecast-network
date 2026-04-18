'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap,
  LayoutDashboard,
  Sparkles,
  Network,
  Globe,
  FileText,
  Users,
  Package,
  Truck,
  BarChart2,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string | number
}

const planningNav: NavItem[] = [
  {
    label: 'Cockpit',
    href: '/cockpit',
    icon: <LayoutDashboard size={16} />,
    badge: 12,
  },
  {
    label: 'Opportunities',
    href: '/opportunities',
    icon: <BarChart2 size={16} />,
    badge: 12,
  },
  {
    label: 'Similarity Map',
    href: '/similarity-map',
    icon: <Sparkles size={16} />,
  },
  {
    label: 'Ingredient Graph',
    href: '/ingredient-graph',
    icon: <Network size={16} />,
  },
  {
    label: 'Supplier Intel',
    href: '/supplier-intel',
    icon: <Globe size={16} />,
  },
  {
    label: 'Evidence Trails',
    href: '/evidence-trails',
    icon: <FileText size={16} />,
  },
]

const recordsNav: NavItem[] = [
  {
    label: 'Customers',
    href: '/customers',
    icon: <Users size={16} />,
    badge: 7,
  },
  {
    label: 'Raw Materials',
    href: '/raw-materials',
    icon: <Package size={16} />,
    badge: 876,
  },
  {
    label: 'Suppliers',
    href: '/suppliers',
    icon: <Truck size={16} />,
    badge: 40,
  },
]

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 6,
        textDecoration: 'none',
        fontSize: 13,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      <span
        style={{
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        {item.icon}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge !== undefined && (
        <span
          style={{
            background: 'var(--accent-blue)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 500,
            padding: '1px 6px',
            borderRadius: 999,
            minWidth: 20,
            textAlign: 'center',
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--bg-sidebar)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '18px 16px 14px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Zap size={16} color="var(--accent-blue)" />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Spherecast
        </span>
      </div>

      {/* Agnes badge */}
      <div style={{ padding: '10px 16px 6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(59,130,246,0.10)',
            border: '0.5px solid rgba(59,130,246,0.25)',
            borderRadius: 6,
            padding: '5px 10px',
          }}
        >
          <Zap size={12} color="var(--accent-blue)" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--accent-blue)',
            }}
          >
            Agnes AI
          </span>
          <span className="pulse-dot" style={{ marginLeft: 'auto' }} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflow: 'auto', padding: '12px 8px' }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ padding: '4px 12px 8px' }} className="section-label">
            Planning
          </div>
          {planningNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
            />
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ padding: '4px 12px 8px' }} className="section-label">
            Records
          </div>
          {recordsNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '0.5px solid var(--border)',
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        Last scan: 14 min ago
      </div>
    </aside>
  )
}
