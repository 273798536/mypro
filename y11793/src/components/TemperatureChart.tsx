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

interface DriftRegion {
  startIndex: number
  endIndex: number
  driftRate: number
}

interface TemperatureChartProps {
  times: number[]
  temperatures: number[]
  driftRegions?: DriftRegion[]
  className?: string
}

export default function TemperatureChart({
  times,
  temperatures,
  driftRegions,
  className,
}: TemperatureChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null)

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const { ctx, chartArea } = chart
    if (!chartArea) return

    ctx.save()

    if (driftRegions && driftRegions.length > 0) {
      const xScale = chart.scales.x
      driftRegions.forEach((region) => {
        const startX = xScale.getPixelForValue(times[region.startIndex])
        const endX = xScale.getPixelForValue(times[region.endIndex])
        ctx.fillStyle = 'rgba(249, 115, 22, 0.15)'
        ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top)
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.strokeRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top)
        ctx.setLineDash([])
      })
    }

    ctx.restore()
  }, [times, driftRegions])

  const labels = times.map((t) => t.toFixed(1))

  const data: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: '温度',
        data: temperatures,
        borderColor: 'rgba(236, 72, 153, 0.9)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        showLine: true,
        tension: 0.3,
        fill: true,
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
          padding: 16,
        },
      },
      title: {
        display: true,
        text: '温度变化曲线',
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
            return `${label}: ${value.toFixed(2)} °C`
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
        title: {
          display: true,
          text: '温度 (°C)',
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

  const minTemp = Math.min(...temperatures)
  const maxTemp = Math.max(...temperatures)
  const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length

  return (
    <div className={cn('w-full h-full flex flex-col bg-gray-900 rounded-lg p-4', className)}>
      <div className="flex-1 min-h-0">
        <Line ref={chartRef} data={data} options={options} />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">最低温度</div>
          <div className="text-lg font-mono font-semibold text-blue-400">
            {minTemp.toFixed(2)} °C
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">平均温度</div>
          <div className="text-lg font-mono font-semibold text-emerald-400">
            {avgTemp.toFixed(2)} °C
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">最高温度</div>
          <div className="text-lg font-mono font-semibold text-red-400">
            {maxTemp.toFixed(2)} °C
          </div>
        </div>
      </div>
    </div>
  )
}
