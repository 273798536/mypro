import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import type { MonteCarloResult } from '@/types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface MonteCarloChartProps {
  result: MonteCarloResult
  unit: string
  height?: number
}

export default function MonteCarloChart({ result, unit, height = 350 }: MonteCarloChartProps) {
  const chartData = useMemo(() => {
    const { bins, counts } = result.histogram
    if (bins.length === 0 || counts.length === 0) {
      return {
        labels: [],
        datasets: [],
      }
    }

    const labels = bins.slice(0, -1).map((bin, i) => {
      const next = bins[i + 1]
      return ((bin + next) / 2).toFixed(3)
    })

    const maxCount = Math.max(...counts)
    const normalizedCurve = counts.map((c) => (c / maxCount) * Math.max(...counts) * 0.9)

    const ciLower = result.confidenceInterval.lower
    const ciUpper = result.confidenceInterval.upper

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: '频率分布',
          data: counts,
          backgroundColor: 'rgba(30, 58, 95, 0.6)',
          borderColor: 'rgba(30, 58, 95, 0.8)',
          borderWidth: 1,
          borderRadius: 2,
          yAxisID: 'y',
        },
        {
          type: 'line' as const,
          label: '正态拟合',
          data: normalizedCurve,
          borderColor: '#10b981',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
        },
      ],
      ciLower,
      ciUpper,
    }
  }, [result])

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeOutQuart' as const,
      },
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(30, 58, 95, 0.9)',
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: (items: any) => {
              if (items.length > 0) {
                return `${items[0].label} ${unit}`
              }
              return ''
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: `数值 (${unit})`,
            font: { size: 12, weight: '500' as const },
          },
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 10,
            font: { size: 11 },
          },
        },
        y: {
          title: {
            display: true,
            text: '频数',
            font: { size: 12, weight: '500' as const },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            font: { size: 11 },
          },
          beginAtZero: true,
        },
      },
    }),
    [unit]
  )

  if (result.samples.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
        style={{ height }}
      >
        <div className="text-center text-gray-400">
          <p className="text-lg font-medium">暂无数据</p>
          <p className="text-sm mt-1">请添加数据记录后查看图表</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      <Bar data={chartData as any} options={options} />
    </div>
  )
}
