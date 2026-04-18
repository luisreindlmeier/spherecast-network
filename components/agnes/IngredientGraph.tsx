'use client'

import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import type { Core } from 'cytoscape'

const nodes = [
  { id: 'tio2', label: 'TiO2', category: 'Pigments' },
  { id: 'sles', label: 'SLES', category: 'Surfactants' },
  { id: 'capb', label: 'CAPB', category: 'Surfactants' },
  { id: 'sls', label: 'SLS', category: 'Surfactants' },
  { id: 'citric', label: 'Citric Acid', category: 'Organic Acids' },
  { id: 'lactic', label: 'Lactic Acid', category: 'Organic Acids' },
  { id: 'pg', label: 'Propylene Glycol', category: 'Polyols' },
  { id: 'glycerin', label: 'Glycerin', category: 'Polyols' },
  { id: 'fragA', label: 'Fragrance A-42', category: 'Fragrances' },
  { id: 'benzyl', label: 'Benzyl Alcohol', category: 'Aromatic Alcohols' },
  { id: 'xanthan', label: 'Xanthan Gum', category: 'Hydrocolloids' },
  { id: 'carrageenan', label: 'Carrageenan', category: 'Hydrocolloids' },
  { id: 'mci', label: 'MCI', category: 'Preservatives' },
  { id: 'phenoxy', label: 'Phenoxyethanol', category: 'Preservatives' },
]

const edges = [
  { source: 'sles', target: 'capb', score: 0.91 },
  { source: 'sles', target: 'sls', score: 0.88 },
  { source: 'capb', target: 'sls', score: 0.82 },
  { source: 'citric', target: 'lactic', score: 0.87 },
  { source: 'pg', target: 'glycerin', score: 0.94 },
  { source: 'fragA', target: 'benzyl', score: 0.78 },
  { source: 'xanthan', target: 'carrageenan', score: 0.85 },
  { source: 'mci', target: 'phenoxy', score: 0.71 },
  { source: 'tio2', target: 'sles', score: 0.42 },
  { source: 'citric', target: 'pg', score: 0.39 },
]

const catColor: Record<string, string> = {
  Pigments: '#a855f7',
  Surfactants: '#3b82f6',
  'Organic Acids': '#22c55e',
  Polyols: '#06b6d4',
  Fragrances: '#f97316',
  'Aromatic Alcohols': '#eab308',
  Hydrocolloids: '#8b5cf6',
  Preservatives: '#ef4444',
}

export default function IngredientGraph() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map((n) => ({
          data: { id: n.id, label: n.label, category: n.category },
        })),
        ...edges.map((e, i) => ({
          data: {
            id: `e${i}`,
            source: e.source,
            target: e.target,
            score: e.score.toFixed(2),
            weight: e.score * 5,
            strong: e.score >= 0.9,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: cytoscape.NodeSingular) =>
              catColor[ele.data('category') as string] ?? '#1c2030',
            'background-opacity': 0.25,
            'border-width': 1.5,
            'border-color': (ele: cytoscape.NodeSingular) =>
              catColor[ele.data('category') as string] ?? '#3b82f6',
            label: 'data(label)',
            color: '#e8eaf0',
            'font-size': 11,
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 28,
            height: 28,
          },
        },
        {
          selector: 'edge',
          style: {
            'line-color': 'rgba(255,255,255,0.12)',
            width: 'data(weight)',
            label: 'data(score)',
            'font-size': 10,
            color: '#555b6e',
            'text-rotation': 'autorotate',
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[?strong]',
          style: { 'line-color': '#22c55e' },
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 3, 'border-color': '#22c55e' },
        },
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 120,
        nodeOverlap: 20,
        animate: false,
      } as cytoscape.CoseLayoutOptions,
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg-surface)',
        borderRadius: 8,
      }}
    />
  )
}
