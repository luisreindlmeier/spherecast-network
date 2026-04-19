'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, Check, Menu } from 'lucide-react'
import { Select } from 'radix-ui'
import type { GlobalSearchItem } from '@/lib/global-search'
import { parseGlobalSearchItems } from '@/lib/global-search'
import { useCompanyScope } from '@/lib/company-scope-context'
import { useMobileNav } from '@/lib/mobile-nav-context'

interface AppTopNavProps {
  searchItems: GlobalSearchItem[]
}

const MAX_RESULTS = 60

function kindBadgeClass(kind: GlobalSearchItem['kind']): string {
  switch (kind) {
    case 'company':
      return 'app-top-nav-hit-badge app-top-nav-hit-badge-purple'
    case 'supplier':
      return 'app-top-nav-hit-badge app-top-nav-hit-badge-cyan'
    case 'finished-good':
      return 'app-top-nav-hit-badge app-top-nav-hit-badge-blue'
    case 'raw-material':
      return 'app-top-nav-hit-badge app-top-nav-hit-badge-green'
    default:
      return 'app-top-nav-hit-badge'
  }
}

export default function AppTopNav({ searchItems }: AppTopNavProps) {
  const router = useRouter()
  const { toggle: toggleMobileNav } = useMobileNav()
  const { companyId, setCompanyId, companies } = useCompanyScope()
  const items = useMemo(
    () => parseGlobalSearchItems(searchItems),
    [searchItems]
  )

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, MAX_RESULTS)
    return items
      .filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          it.subtitle.toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS)
  }, [items, query])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery('')
      setHighlight(0)
      router.push(href)
    },
    [router]
  )

  const selectValue = companyId === null ? 'all' : String(companyId)

  const onSelectCompany = (value: string) => {
    void (async () => {
      if (value === 'all') await setCompanyId(null)
      else {
        const n = Number(value)
        if (Number.isFinite(n)) await setCompanyId(n)
      }
    })()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key === 'ArrowDown' && query.trim() !== '') {
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      const row = filtered[highlight]
      if (row) go(row.href)
    }
  }

  return (
    <header className="app-top-nav">
      <div className="app-top-nav-inner">
        <button
          className="app-top-nav-hamburger"
          onClick={toggleMobileNav}
          aria-label="Toggle navigation"
          type="button"
        >
          <Menu size={20} />
        </button>
        <div className="app-top-nav-search-cell" ref={rootRef}>
          <div className="app-top-nav-search-wrap">
            <Search size={15} className="app-top-nav-search-icon" aria-hidden />
            <input
              className="app-top-nav-search-input"
              type="search"
              placeholder="SKU, company, supplier…"
              value={query}
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={open && query.trim() !== ''}
              aria-controls="global-search-results"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlight(0)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
            />
            {open && query.trim() !== '' && (
              <div
                id="global-search-results"
                className="app-top-nav-results"
                role="listbox"
              >
                {filtered.length === 0 ? (
                  <div className="app-top-nav-empty">No matches</div>
                ) : (
                  filtered.map((row, idx) => (
                    <button
                      key={`${row.kind}-${row.id}`}
                      type="button"
                      role="option"
                      aria-selected={idx === highlight}
                      className="app-top-nav-hit"
                      data-active={idx === highlight}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(row.href)}
                    >
                      <span className={kindBadgeClass(row.kind)}>
                        {row.kind === 'finished-good'
                          ? 'Finished good'
                          : row.kind === 'raw-material'
                            ? 'Raw material'
                            : row.kind === 'company'
                              ? 'Company'
                              : 'Supplier'}
                      </span>
                      <span className="app-top-nav-hit-main">
                        <span className="app-top-nav-hit-label">
                          {row.label}
                        </span>
                        <span className="app-top-nav-hit-sub">
                          {row.subtitle}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="app-top-nav-company">
          <Select.Root value={selectValue} onValueChange={onSelectCompany}>
            <Select.Trigger
              className="app-top-nav-select-trigger"
              aria-label="Company"
            >
              <Select.Value placeholder="All companies" />
              <Select.Icon className="app-top-nav-select-chevron">
                <ChevronDown size={14} aria-hidden />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="app-top-nav-select-content"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="app-top-nav-select-viewport">
                  <Select.Item value="all" className="app-top-nav-select-item">
                    <Select.ItemText>All companies</Select.ItemText>
                    <Select.ItemIndicator className="app-top-nav-select-check">
                      <Check size={14} aria-hidden />
                    </Select.ItemIndicator>
                  </Select.Item>
                  {companies.map((c) => (
                    <Select.Item
                      key={c.id}
                      value={String(c.id)}
                      className="app-top-nav-select-item"
                    >
                      <Select.ItemText>{c.name}</Select.ItemText>
                      <Select.ItemIndicator className="app-top-nav-select-check">
                        <Check size={14} aria-hidden />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>
    </header>
  )
}
