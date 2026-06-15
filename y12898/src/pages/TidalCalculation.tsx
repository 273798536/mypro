import { useOceanStore } from "@/store/useOceanStore"
import TidalChart from "@/components/TidalChart"
import TidalTable from "@/components/TidalTable"
import TidalSummary from "@/components/TidalSummary"
import WelcomeGuide from "@/components/WelcomeGuide"
import { Calendar, Clock } from "lucide-react"

export default function TidalCalculation() {
  const { tidalRecords, sampleLoaded } = useOceanStore()

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  return (
    <div className="p-6 space-y-6">
      <WelcomeGuide />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ocean-ink">潮汐计算</h2>
          <p className="text-sm text-gray-400 mt-1">日常入口 · 数据概览</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {today}
          </span>
          {sampleLoaded && (
            <span className="flex items-center gap-1.5 text-ocean-light">
              <Clock size={14} />
              {tidalRecords.length} 条记录
            </span>
          )}
        </div>
      </div>

      {!sampleLoaded ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          请先加载示例数据以查看潮汐信息
        </div>
      ) : (
        <div className="space-y-6">
          <TidalChart />
          <TidalTable />
          <TidalSummary />
        </div>
      )}
    </div>
  )
}
