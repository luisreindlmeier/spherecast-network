import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import PageHeader from '@/components/layout/PageHeader'
import OpportunityDetailView from '@/components/opportunities/OpportunityDemoDetailView'
import { ArrowLeft } from 'lucide-react'
import { getOpportunityDetail } from '@/lib/agnes-queries'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'

const paramsSchema = z.object({
  opportunityId: z.string().min(1).max(200).regex(/^\d+$/),
})

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>
}) {
  const raw = await params
  const parsed = paramsSchema.safeParse(raw)
  if (!parsed.success) notFound()

  const { opportunityId } = parsed.data
  const scope = await resolveCompanyScopeFilter()
  const detail = await getOpportunityDetail(Number(opportunityId), scope)
  if (!detail) notFound()

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
        title={detail.row.ingredientName}
        description="Backend recommendation with evidence trail and supplier alternatives."
        actions={
          <Link href="/opportunities" className="btn btn-ghost">
            Back to list
          </Link>
        }
      />
      <OpportunityDetailView detail={detail} />
    </>
  )
}
