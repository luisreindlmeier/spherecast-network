import PageHeader from '@/components/layout/PageHeader'
import SimilarityMapPlotSection from '@/components/similarity-map/SimilarityMapPlotSection'

export default function SimilarityMapPage() {
  return (
    <div className="page-network-map">
      <div className="page-network-map-intro">
        <PageHeader
          eyebrow="Network Intelligence"
          title="Similarity Map"
          description="Interactive UMAP (3D) over ingredient embeddings — scroll or pinch to zoom, drag to orbit. Dot size reflects how many companies use the material; each dot is one supplier for that ingredient."
        />
      </div>
      <SimilarityMapPlotSection />
    </div>
  )
}
