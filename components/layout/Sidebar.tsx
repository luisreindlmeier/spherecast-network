'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutGrid,
  Target,
  Sparkles,
  Network,
  Box,
  Atom,
  Building2,
  FileText,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { useViewer } from '@/lib/viewer-context'

interface SidebarProps {
  productsBadge?: number
  rawMaterialsBadge?: number
  suppliersBadge?: number
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string | number
}

interface NavSection {
  id: string
  label: string
  collapsible?: boolean
  items: NavItem[]
}

const topItems: NavItem[] = [
  {
    label: 'Cockpit',
    href: '/cockpit',
    icon: <LayoutGrid size={16} />,
  },
]

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className="nav-link" data-active={active}>
      <span className="nav-link-icon">{item.icon}</span>
      <span className="nav-link-label">{item.label}</span>
      {item.badge !== undefined && (
        <span className="nav-link-badge">{item.badge}</span>
      )}
    </Link>
  )
}

function SectionHeader({
  label,
  collapsible,
  open,
  onToggle,
  trailingIcon,
}: {
  label: string
  collapsible: boolean
  open: boolean
  onToggle?: () => void
  trailingIcon?: React.ReactNode
}) {
  const Component = collapsible ? 'button' : 'div'
  return (
    <Component
      className="nav-section-header"
      data-collapsible={collapsible}
      onClick={collapsible ? onToggle : undefined}
      type={collapsible ? 'button' : undefined}
    >
      {collapsible && (
        <ChevronDown
          size={11}
          style={{
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        />
      )}
      <span
        className="nav-section-label"
        style={{ flex: 1, textAlign: 'left' }}
      >
        {label}
      </span>
      {trailingIcon}
    </Component>
  )
}

export default function Sidebar({
  productsBadge,
  rawMaterialsBadge,
  suppliersBadge,
}: SidebarProps) {
  const pathname = usePathname()
  const { viewer, toggle } = useViewer()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    intelligence: true,
    sourcing: true,
    admin: true,
  })

  const toggleSection = (id: string) =>
    setOpenSections((s) => ({ ...s, [id]: !s[id] }))

  return (
    <aside className="sidebar">
      {/* Brand */}
      <Link
        href="/cockpit"
        className="sidebar-brand"
        aria-label="Spherecast home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/spherecast-network.png"
          alt="Spherecast"
          className="sidebar-brand-logo"
        />
      </Link>

      {/* Nav */}
      <nav className="sidebar-nav">
        {/* Top-level items (no section header) */}
        <div className="nav-section-items" style={{ marginTop: 0 }}>
          {topItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={
                pathname === item.href || pathname.startsWith(item.href + '/')
              }
            />
          ))}
        </div>

        {[
          {
            id: 'intelligence',
            label: 'My Intelligence',
            collapsible: true,
            items: [
              {
                label: 'Opportunities',
                href: '/opportunities',
                icon: <Target size={16} />,
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
            ],
          },
          {
            id: 'sourcing',
            label: 'Sourcing',
            collapsible: true,
            items: [
              {
                label: 'Products',
                href: '/products',
                icon: <Box size={16} />,
                badge: productsBadge,
              },
              {
                label: 'Raw Materials',
                href: '/raw-materials',
                icon: <Atom size={16} />,
                badge: rawMaterialsBadge,
              },
              {
                label: 'Companies',
                href: '/companies',
                icon: <Building2 size={16} />,
              },
              {
                label: 'Suppliers',
                href: '/suppliers',
                icon: <Building2 size={16} />,
                badge: suppliersBadge,
              },
              {
                label: 'Evidence Trails',
                href: '/evidence-trails',
                icon: <FileText size={16} />,
              },
            ],
          },
        ].map((section) => {
          const open = openSections[section.id]
          return (
            <div key={section.id} className="nav-section">
              <SectionHeader
                label={section.label}
                collapsible={section.collapsible ?? false}
                open={open}
                onToggle={() => toggleSection(section.id)}
              />
              {open && (
                <div className="nav-section-items">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={
                        pathname === item.href ||
                        pathname.startsWith(item.href + '/')
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Admin-only section */}
        <div className="nav-section">
          <SectionHeader
            label="Spherecast Only"
            collapsible
            open={openSections.admin}
            onToggle={() => toggleSection('admin')}
            trailingIcon={<Lock size={10} color="var(--text-muted)" />}
          />
          {openSections.admin && (
            <div className="nav-section-items">
              <div className="nav-locked-notice">
                <Lock size={11} />
                <span>Admin access only</span>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Viewer */}
      <div
        className="viewer-footer"
        onClick={toggle}
        style={{ cursor: 'pointer' }}
      >
        <span className="viewer-org">{viewer.orgName}</span>
        <span className="viewer-role">
          {viewer.role === 'customer' ? 'Customer view' : 'Spherecast admin'}
        </span>
      </div>
    </aside>
  )
}
