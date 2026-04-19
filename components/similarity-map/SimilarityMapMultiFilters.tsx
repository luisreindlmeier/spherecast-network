'use client'

import { useMemo, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type IngredientCategory,
} from '@/components/similarity-map/similarity-map-categories'
import type { SimilarityPoint } from '@/types/similarity-map'

function summaryList(
  labels: string[],
  emptyLabel: string,
  maxLen = 28
): string {
  if (labels.length === 0) return emptyLabel
  const joined = labels.join(', ')
  if (joined.length <= maxLen) return joined
  return `${joined.slice(0, maxLen - 1)}…`
}

function MultiDropdown({
  ariaLabel,
  summary,
  contentClassName,
  dropdownAlign = 'end',
  children,
}: {
  ariaLabel: string
  summary: string
  contentClassName?: string
  dropdownAlign?: 'start' | 'end'
  children: ReactNode
}) {
  return (
    <div className="similarity-map-multi-filter">
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          type="button"
          className="app-top-nav-select-trigger similarity-map-multi-filter-trigger"
          aria-label={ariaLabel}
        >
          <span className="similarity-map-multi-filter-trigger-text">
            {summary}
          </span>
          <ChevronDown
            size={14}
            className="app-top-nav-select-chevron"
            aria-hidden
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={[
              'app-top-nav-select-content',
              'similarity-map-multi-filter-content',
              contentClassName ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
            sideOffset={4}
            align={dropdownAlign}
          >
            {children}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

type Props = {
  className?: string
  dropdownAlign?: 'start' | 'end'
  points: readonly SimilarityPoint[]
  selectedCategories: readonly IngredientCategory[]
  selectedSuppliers: readonly string[]
  onCategoriesChange: (next: IngredientCategory[]) => void
  onSuppliersChange: (next: string[]) => void
}

export default function SimilarityMapMultiFilters({
  className,
  dropdownAlign = 'end',
  points,
  selectedCategories,
  selectedSuppliers,
  onCategoriesChange,
  onSuppliersChange,
}: Props) {
  const supplierNames = useMemo(() => {
    const s = new Set<string>()
    for (const p of points) {
      if (p.supplierName.trim() !== '') s.add(p.supplierName)
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [points])

  const categorySummary = useMemo(() => {
    const labels = selectedCategories.map((c) => CATEGORY_LABEL[c])
    return summaryList(labels, 'All categories')
  }, [selectedCategories])

  const supplierSummary = useMemo(() => {
    return summaryList([...selectedSuppliers], 'All suppliers')
  }, [selectedSuppliers])

  const toggleCategory = (cat: IngredientCategory, checked: boolean) => {
    const set = new Set(selectedCategories)
    if (checked) set.add(cat)
    else set.delete(cat)
    onCategoriesChange(Array.from(set))
  }

  const toggleSupplier = (name: string, checked: boolean) => {
    const set = new Set(selectedSuppliers)
    if (checked) set.add(name)
    else set.delete(name)
    onSuppliersChange(Array.from(set))
  }

  return (
    <div
      className={['similarity-map-multi-filters', className]
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label="Map filters"
    >
      <div className="opportunities-filter">
        <span className="opportunities-filter-label">Category</span>
        <MultiDropdown
          ariaLabel="Kategorien filtern"
          summary={categorySummary}
          dropdownAlign={dropdownAlign}
        >
          {CATEGORY_ORDER.map((cat) => (
            <DropdownMenu.CheckboxItem
              key={cat}
              className="app-top-nav-select-item similarity-map-multi-filter-item"
              checked={selectedCategories.includes(cat)}
              onCheckedChange={(c) => toggleCategory(cat, c === true)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="similarity-map-multi-filter-item-text">
                {CATEGORY_LABEL[cat]}
              </span>
              <DropdownMenu.ItemIndicator className="app-top-nav-select-check">
                <Check size={14} aria-hidden />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.CheckboxItem>
          ))}
          <DropdownMenu.Separator className="similarity-map-multi-filter-sep" />
          <DropdownMenu.Item
            className="app-top-nav-select-item similarity-map-multi-filter-clear"
            onSelect={(e) => {
              e.preventDefault()
              onCategoriesChange([])
            }}
          >
            Clear category filter
          </DropdownMenu.Item>
        </MultiDropdown>
      </div>

      <div className="opportunities-filter">
        <span className="opportunities-filter-label">Supplier</span>
        <MultiDropdown
          ariaLabel="Lieferanten filtern"
          summary={supplierSummary}
          contentClassName="similarity-map-multi-filter-content--scroll"
          dropdownAlign={dropdownAlign}
        >
          {supplierNames.map((name) => (
            <DropdownMenu.CheckboxItem
              key={name}
              className="app-top-nav-select-item similarity-map-multi-filter-item"
              checked={selectedSuppliers.includes(name)}
              onCheckedChange={(c) => toggleSupplier(name, c === true)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="similarity-map-multi-filter-item-text">
                {name}
              </span>
              <DropdownMenu.ItemIndicator className="app-top-nav-select-check">
                <Check size={14} aria-hidden />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.CheckboxItem>
          ))}
          <DropdownMenu.Separator className="similarity-map-multi-filter-sep" />
          <DropdownMenu.Item
            className="app-top-nav-select-item similarity-map-multi-filter-clear"
            onSelect={(e) => {
              e.preventDefault()
              onSuppliersChange([])
            }}
          >
            Clear supplier filter
          </DropdownMenu.Item>
        </MultiDropdown>
      </div>
    </div>
  )
}
