import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

export default function IngredientGraphPage() {
  return (
    <>
      <PageHeader
        eyebrow="My Intelligence"
        title="Ingredient Graph"
        description="How your finished goods decompose into raw materials, and where materials are shared across products."
      />
      <DummyBlock title="Graph view" hint="22 products · 149 ingredients" />
    </>
  )
}
