import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import PageHeader from '@/components/layout/PageHeader'
import OpportunityDemoDetailView from '@/components/opportunities/OpportunityDemoDetailView'
import {
  getOpportunityDetail,
  INGREDIENT_CATEGORY_COLORS,
  type IngredientCategory,
} from '@/lib/ingredient-similarity-data'
import { getDemoOpportunityById } from '@/lib/opportunities-demo-data'
import { ArrowLeft } from 'lucide-react'

const paramsSchema = z.object({
  opportunityId: z.string().min(1).max(200),
})

function categoryLabel(c: IngredientCategory): string {
  const labels: Record<IngredientCategory, string> = {
    vitamins: 'Vitamins',
    minerals: 'Minerals',
    proteins: 'Proteins',
    oils: 'Oils',
    excipients: 'Excipients',
    carbohydrates: 'Carbohydrates',
    botanicals: 'Botanicals',
  }
  return labels[c]
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>
}) {
  const raw = await params
  const parsed = paramsSchema.safeParse(raw)
  if (!parsed.success) notFound()

  const { opportunityId } = parsed.data

  const demo = getDemoOpportunityById(opportunityId)
  if (demo) {
    return (
      <>
        <div className="detail-back">
          <Link href="/opportunities" className="detail-back-link">
            <ArrowLeft size={13} />
            Opportunities
          </Link>
        </div>
        <PageHeader
          eyebrow="Network Intelligence"
          title={demo.ingredientName}
          description="Demo consolidation opportunity — match reasoning and proposal below."
          actions={
            <Link href="/opportunities" className="btn btn-ghost">
              Back to list
            </Link>
          }
        />
        <OpportunityDemoDetailView row={demo} />
      </>
    )
  }

  const similarity = getOpportunityDetail(opportunityId)
  if (similarity) {
    const catColor = INGREDIENT_CATEGORY_COLORS[similarity.category]

    return (
      <>
        <PageHeader
          eyebrow="Network Intelligence"
          title={similarity.title}
          description="Fictitious opportunity record for demo — opened from the ingredient similarity map."
          actions={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/similarity-map" className="btn btn-ghost">
                Back to map
              </Link>
              <Link href="/opportunities" className="btn btn-ghost">
                All opportunities
              </Link>
            </div>
          }
        />
        <section
          className="dummy-block"
          style={{ marginTop: 16, maxWidth: 560 }}
        >
          <div
            className="dummy-block-body"
            style={{ display: 'grid', gap: 16 }}
          >
            <div>
              <div className="stat-label">Category</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: catColor,
                  }}
                />
                <span className="stat-value" style={{ fontSize: 18 }}>
                  {categoryLabel(similarity.category)}
                </span>
              </div>
            </div>
            <div>
              <div className="stat-label">Companies using ingredient</div>
              <div className="stat-value">{similarity.companyCount}</div>
            </div>
            <div>
              <div className="stat-label">Top suppliers</div>
              <p className="page-description" style={{ marginTop: 6 }}>
                {similarity.topSuppliers.join(' · ')}
              </p>
            </div>
            <div>
              <div className="stat-label">Summary</div>
              <p className="page-description" style={{ marginTop: 6 }}>
                {similarity.summary}
              </p>
            </div>
            <p className="page-description" style={{ fontSize: 12 }}>
              ID:{' '}
              <span style={{ fontFamily: 'var(--font-secondary)' }}>
                {similarity.opportunityId}
              </span>
            </p>
          </div>
        </section>
      </>
    )
  }

  notFound()
}
