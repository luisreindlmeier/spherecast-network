import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

export default function SimilarityMapPage() {
  return (
    <>
      <PageHeader
        eyebrow="My Intelligence"
        title="Similarity Map"
        description="2D embedding space of your raw material catalogue — cluster proximity signals substitutability."
      />
      <DummyBlock title="Embedding viewer" hint="149 raw materials" />
    </>
  )
}
