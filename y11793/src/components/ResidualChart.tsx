import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { cn } from '@/utils/cn'
import type { ResidualStats } from '@/types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface ResidualChartProps {
  times: number[]
  residuals: number[]
  residualStats: ResidualStats
  className?: string
}

export default function ResidualChart({
  times,
  residuals,
  residualStats,
  className,
}: ResidualChartProps) {
  const { mean, stdDev, max, min } = residualStats

  const sigma2 = 2 * stdDev
  const sigma3 = 3 * stdDev

  const { normalData, outlierData } = useMemo(() => {
    const normal: (number | null)[] = []
    const outliers: (number | null)[] = []

    residuals.forEach((residual) => {
      if (Math.abs(residual) > sigma3) {
        normal.push(null)
        outliers.push(residual)
      } else {
        normal.push(residual)
        outliers.push(null)
      }
    })

    return { normalData: normal, outlierData: outliers }
  }, [residuals, sigma3])

  const sigma2Upper = Array(times.length).fill(mean + sigma2)
  const sigma2Lower = Array(times.length).fill(mean - sigma2)
  const sigma3Upper = Array(times.length).fill(mean + sigma3)
  const sigma3Lower = Array(times.length).fill(mean - sigma3)
  const meanLine = Array(times.length).fill(mean)

  const labels = times.map((t) => t.toFixed(1))

  const data: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: '正常残差',
        data: normalData,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 0.8)',
        borderWidth: 0,
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: false,
      },
      {
        label: '异常残差 (>3σ)',
        data: outlierData,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 0,
        pointRadius: 8,
        pointHoverRadius: 10,
        showLine: false,
      },
      {
        label: '±2σ',
        data: sigma2Upper,
        borderColor: 'rgba(251, 191, 36, 0.7)',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        showLine: true,
        fill: false,
      },
      {
        label: '±2σ',
        data: sigma2Lower,
        borderColor: 'rgba(251, 191, 36, 0.7)',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        showLine: true,
        fill: false,
      },
      {
        label: '±3σ',
        data: sigma3Upper,
        borderColor: 'rgba(239, 68, 68, 0.7)',
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0,
        showLine: true,
        fill: false,
      },
      {
        label: '±3σ',
        data: sigma3Lower,
        borderColor: 'rgba(239, 68, 68, 0.7)',
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0,
        showLine: true,
        fill: false,
      },
      {
        label: '均值',
        data: meanLine,
        borderColor: 'rgba(16, 185, 129, 0.8)',
        borderWidth: 2,
        pointRadius: 0,
        showLine: true,
        fill: false,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9CA3AF',
          usePointStyle: true,
          padding: 12,
          filter: (item) => {
            if (item.text === '±2σ' && item.datasetIndex !== 2) return false
            if (item.text === '±3σ' && item.datasetIndex !== 4) return false
            return true
          },
        },
      },
      title: {
        display: true,
        text: '残差诊断图',
        color: '#F3F4F6',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (items) => `时间: ${items[0].label}s`,
          label: (item) => {
            const label = item.dataset.label || ''
            const value = item.parsed.y
            if (value === null || value === undefined) return ''
            return `${label}: ${value.toFixed(6)} V`
          },
        },
        filter: (item) => item.parsed.y !== null && item.parsed.y !== undefined,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '时间 (s)',
          color: '#9CA3AF',
        },
        ticks: {
          color: '#6B7280',
          maxTicksLimit: 12,
        },
        grid: {
          color: 'rgba(55, 65, 81, 0.5)',
        },
      },
      y: {
        title: {
          display: true,
          text: '残差 (V)',
          color: '#9CA3AF',
        },
        ticks: {
          color: '#6B7280',
        },
        grid: {
          color: 'rgba(55, 65, 81, 0.5)',
        },
      },
    },
  }

  const statsCards = [
    { label: '均值', value: mean, unit: 'V', color: 'text-emerald-400' },
    { label: '标准差', value: stdDev, unit: 'V', color: 'text-blue-400' },
    { label: '最大值', value: max, unit: 'V', color: 'text-orange-400' },
    { label: '最小值', value: min, unit: 'V', color: 'text-purple-400' },
  ]

  return (
    <div className={cn('w-full h-full flex flex-col bg-gray-900 rounded-lg p-4', className)}>
      <div className="flex-1 min-h-0">
        <Line data={data} options={options} />
      </div>
      <div className="grid grid-cols-4 gap-3 mt-4">
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-800 rounded-lg p-3 border border-gray-700"
          >
            <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
            <div className={cn('text-lg font-mono font-semibold', stat.color)}>
              {stat.value.toExponential(4)}
            </div>
            <div className="text-xs text-gray-500">{stat.unit}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
