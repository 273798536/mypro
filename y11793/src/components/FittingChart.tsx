import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { cn } from '@/utils/cn'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface GapRange {
  startIndex: number
  endIndex: number
}

interface HighlightRange {
  startIndex: number
  endIndex: number
}

interface FittingChartProps {
  times: number[]
  voltages: number[]
  fittedVoltages?: number[]
  currents?: number[]
  gaps?: GapRange[]
  highlightRange?: HighlightRange | null
  className?: string
}

export default function FittingChart({
  times,
  voltages,
  fittedVoltages,
  currents,
  gaps,
  highlightRange,
  className,
}: FittingChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null)

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const { ctx, chartArea } = chart
    if (!chartArea) return

    ctx.save()

    if (gaps && gaps.length > 0) {
      const xScale = chart.scales.x
      gaps.forEach((gap) => {
        const startX = xScale.getPixelForValue(times[gap.startIndex])
        const endX = xScale.getPixelForValue(times[gap.endIndex])
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
        ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top)
      })
    }

    if (highlightRange) {
      const xScale = chart.scales.x
      const startX = xScale.getPixelForValue(times[highlightRange.startIndex])
      const endX = xScale.getPixelForValue(times[highlightRange.endIndex])
      ctx.fillStyle = 'rgba(251, 191, 36, 0.25)'
      ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top)
    }

    ctx.restore()
  }, [times, gaps, highlightRange])

  const labels = times.map((t) => t.toFixed(1))

  const datasets: ChartData<'line'>['datasets'] = [
    {
      label: '原始电压',
      data: voltages,
      borderColor: 'rgba(59, 130, 246, 0.8)',
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderWidth: 0,
      pointRadius: 3,
      pointHoverRadius: 5,
      showLine: false,
      yAxisID: 'y',
    },
  ]

  if (fittedVoltages) {
    datasets.push({
      label: '拟合电压',
      data: fittedVoltages,
      borderColor: 'rgba(249, 115, 22, 0.9)',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      showLine: true,
      tension: 0.3,
      yAxisID: 'y',
    })
  }

  if (currents) {
    datasets.push({
      label: '电流',
      data: currents,
      borderColor: 'rgba(16, 185, 129, 0.7)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 3,
      showLine: true,
      tension: 0.2,
      yAxisID: 'y1',
    })
  }

  const data: ChartData<'line'> = {
    labels,
    datasets,
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9CA3AF',
          usePointStyle: true,
          padding: 16,
        },
      },
      title: {
        display: true,
        text: 'RC等效模型拟合曲线',
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
            const unit = item.dataset.yAxisID === 'y1' ? 'A' : 'V'
            return `${label}: ${value.toFixed(4)} ${unit}`
          },
        },
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
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: '电压 (V)',
          color: '#9CA3AF',
        },
        ticks: {
          color: '#6B7280',
        },
        grid: {
          color: 'rgba(55, 65, 81, 0.5)',
        },
      },
      y1: currents
        ? {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '电流 (A)',
              color: '#9CA3AF',
            },
            ticks: {
              color: '#6B7280',
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        : undefined,
    },
  }

  return (
    <div className={cn('w-full h-full bg-gray-900 rounded-lg p-4', className)}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  )
}
