'use client'

import { useMemo, useState } from 'react'

type Confidence = 'high' | 'medium' | 'low'

type OpportunityRow = {
  id: string
  confidence: Confidence
  ingredient: string
  brandA: string
  brandB: string
  supplier: string
  impact: string
}

const SEED_OPPORTUNITIES: OpportunityRow[] = [
  {
    id: '1',
    confidence: 'high',
    ingredient: 'Vitamin D3 (cholecalciferol)',
    brandA: 'Nordic Naturals',
    brandB: 'Thorne',
    supplier: 'DSM Nutritional',
    impact: '$420k/yr est.',
  },
  {
    id: '2',
    confidence: 'high',
    ingredient: 'Magnesium bisglycinate',
    brandA: 'Pure Encapsulations',
    brandB: 'Designs for Health',
    supplier: 'Albion Minerals',
    impact: '$310k/yr est.',
  },
  {
    id: '3',
    confidence: 'medium',
    ingredient: 'Omega-3 fish oil concentrate',
    brandA: 'Carlson',
    brandB: 'Nordic Naturals',
    supplier: 'EPAX AS',
    impact: '$280k/yr est.',
  },
  {
    id: '4',
    confidence: 'medium',
    ingredient: 'Zinc picolinate',
    brandA: 'Thorne',
    brandB: 'Seeking Health',
    supplier: 'Jost Chemical',
    impact: '$195k/yr est.',
  },
  {
    id: '5',
    confidence: 'low',
    ingredient: 'Ashwagandha root extract',
    brandA: 'Gaia Herbs',
    brandB: 'Organic India',
    supplier: 'Ixoreal Biomed',
    impact: '$140k/yr est.',
  },
  {
    id: '6',
    confidence: 'high',
    ingredient: 'Methylcobalamin (B12)',
    brandA: 'Jarrow Formulas',
    brandB: 'NOW Foods',
    supplier: 'Flamma S.p.A.',
    impact: '$125k/yr est.',
  },
  {
    id: '7',
    confidence: 'medium',
    ingredient: 'Curcumin C3 complex',
    brandA: 'Sports Research',
    brandB: "Doctor's Best",
    supplier: 'Sabinsa',
    impact: '$118k/yr est.',
  },
]

function confidenceLabel(c: Confidence): string {
  if (c === 'high') return 'High'
  if (c === 'medium') return 'Medium'
  return 'Low'
}

export default function CockpitOpportunityFeed() {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())

  const visible = useMemo(
    () => SEED_OPPORTUNITIES.filter((o) => !hidden.has(o.id)),
    [hidden]
  )

  function dismiss(id: string) {
    setHidden((prev) => new Set(prev).add(id))
  }

  return (
    <section className="cockpit-panel" aria-labelledby="cockpit-opps-heading">
      <div className="cockpit-panel-header">
        <h2 className="cockpit-panel-title" id="cockpit-opps-heading">
          Opportunity feed
        </h2>
        <span className="cockpit-panel-hint">Top matches</span>
      </div>
      <div className="cockpit-panel-body">
        {visible.length === 0 ? (
          <p className="cockpit-empty-hint">
            No open opportunities in this view.
          </p>
        ) : (
          <ul className="cockpit-opp-list">
            {visible.map((row) => (
              <li key={row.id} className="cockpit-opp-row">
                <span
                  className={`cockpit-confidence cockpit-confidence--${row.confidence}`}
                >
                  {confidenceLabel(row.confidence)}
                </span>
                <span className="cockpit-opp-ingredient">{row.ingredient}</span>
                <span className="cockpit-opp-brands cockpit-opp-row-brands">
                  {row.brandA} + {row.brandB}
                </span>
                <span className="cockpit-opp-supplier">{row.supplier}</span>
                <span className="cockpit-opp-impact">{row.impact}</span>
                <div className="cockpit-opp-actions cockpit-opp-row-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-compact"
                    onClick={() => dismiss(row.id)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    onClick={() => dismiss(row.id)}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
