import { useState } from 'react'
import { Flame, Activity, AlertTriangle } from 'lucide-react'
import TrendChart from '@/components/TrendChart'
import ComplaintMap from '@/components/ComplaintMap'
import SampleList from '@/components/SampleList'
import { complaints, trendData } from '@/mock/data'

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const handlePointClick = (date: string) => {
    setSelectedDate(date)
    console.log('Selected date:', date)
  }

  const stats = [
    {
      label: '今日投诉',
      value: '128',
      change: '+12%',
      icon: Flame,
      color: 'text-fire-orange',
      bgColor: 'bg-fire-orange/10',
    },
    {
      label: '异常投诉',
      value: '23',
      change: '+5%',
      icon: AlertTriangle,
      color: 'text-duplicate-yellow',
      bgColor: 'bg-duplicate-yellow/10',
    },
    {
      label: '已处理',
      value: '86',
      change: '+8%',
      icon: Activity,
      color: 'text-success-green',
      bgColor: 'bg-success-green/10',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fire-white font-serif flex items-center gap-3">
            <span className="w-3 h-3 bg-fire-orange rounded-full animate-pulse" />
            投诉管理控制台
          </h1>
          <p className="text-fire-white/60 mt-1">实时监控投诉数据，快速响应异常情况</p>
        </div>
        {selectedDate && (
          <div className="px-4 py-2 bg-fire-orange/10 border border-fire-orange/30 rounded-lg">
            <span className="text-fire-white/60 text-sm">已选择日期：</span>
            <span className="text-fire-orange font-medium ml-1">{selectedDate}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-caliber-blue/50 rounded-xl p-5 border border-fire-orange/20 card-hover"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fire-white/60 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-fire-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon size={28} className={stat.color} />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-sm font-medium ${stat.color}`}>{stat.change}</span>
              <span className="text-fire-white/40 text-sm ml-1">较昨日</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart data={trendData} onPointClick={handlePointClick} />
        <ComplaintMap data={complaints} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <SampleList data={complaints} />
      </div>
    </div>
  )
}
