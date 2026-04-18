import PageHeader from '@/components/layout/PageHeader'
import SimilarityMapPlotSection from '@/components/similarity-map/SimilarityMapPlotSection'

export default function SimilarityMapPage() {
  return (
    <>
      <PageHeader
        eyebrow="Network Intelligence"
        title="Similarity Map"
        description="Interactive UMAP space (3D) over fictitious ingredient embeddings — point size reflects how many companies use each material. Click a point to open the matching opportunity."
      />
      <SimilarityMapPlotSection />
    </>
  )
}
