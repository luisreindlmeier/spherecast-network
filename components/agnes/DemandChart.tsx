'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { demandTrendData } from '@/lib/mock-data'

export default function DemandChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart
        data={demandTrendData}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="month"
          stroke="#555b6e"
          tick={{ fontSize: 11, fill: '#555b6e' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#555b6e"
          tick={{ fontSize: 11, fill: '#555b6e' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#1c2030',
            border: '0.5px solid rgba(255,255,255,0.13)',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
          }}
          labelStyle={{ color: '#8b90a0' }}
          itemStyle={{ color: '#e8eaf0' }}
        />
        <ReferenceLine
          x="Apr"
          stroke="rgba(255,255,255,0.2)"
          strokeDasharray="4 4"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#eab308"
          strokeWidth={1.5}
          dot={false}
          name="Actual"
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="baseline"
          stroke="#8b90a0"
          strokeWidth={1.5}
          dot={false}
          name="Baseline"
        />
        <Line
          type="monotone"
          dataKey="target"
          stroke="#3b82f6"
          strokeWidth={1.5}
          dot={false}
          name="Target"
        />
        <Line
          type="monotone"
          dataKey="consensus"
          stroke="#22c55e"
          strokeWidth={1.5}
          dot={false}
          name="Consensus"
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
