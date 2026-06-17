import { useStore } from "@/store/useStore"
import {
  Cloud,
  Waves,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Anchor,
  Ship,
  MapPin,
  Calendar,
  User,
  FileCheck,
  Clock,
} from "lucide-react"

function WeatherColumn() {
  const { compositeReview, batches, selectedBatchId } = useStore()
  const batch = batches.find((b) => b.id === selectedBatchId)
  const { weatherForecast } = compositeReview

  const anomalyCount = weatherForecast.filter((w) => w.anomaly).length

  return (
    <div className="card-dark border-amber/30">
      <div className="section-title mb-4">
        <Cloud className="w-5 h-5 text-ice" />
        <span>气象预报</span>
        <span className="ml-auto text-xs font-normal text-slate-400 flex items-center gap-1">
          <Ship className="w-3 h-3" />
          {batch?.vesselName}
        </span>
      </div>

      {anomalyCount > 0 && (
        <div className="bg-amber/10 border border-amber/30 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-amber">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>本轮复核发现 {anomalyCount} 天气象异常，需关注对冷链温控的影响</span>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs border-b border-ocean-700/50">
            <th className="text-left pb-2 font-medium">日期</th>
            <th className="text-left pb-2 font-medium">天气</th>
            <th className="text-right pb-2 font-medium">风速(kn)</th>
            <th className="text-right pb-2 font-medium">浪高(m)</th>
            <th className="text-center pb-2 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {weatherForecast.map((entry) => (
            <tr
              key={entry.date}
              className={`border-b border-ocean-800/40 last:border-0 ${
                entry.anomaly
                  ? "border-l-2 border-l-amber bg-amber/5"
                  : ""
              }`}
            >
              <td className="py-2.5 data-mono text-xs">{entry.date}</td>
              <td className="py-2.5 text-slate-300">{entry.condition}</td>
              <td className="py-2.5 text-right data-mono text-xs">
                {entry.windSpeed}
              </td>
              <td className="py-2.5 text-right data-mono text-xs">
                {entry.waveHeight}
              </td>
              <td className="py-2.5 text-center">
                {entry.anomaly ? (
                  <span className="inline-flex items-center gap-1 text-amber text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    预警
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-reef text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    正常
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {batch && (
        <div className="mt-3 pt-3 border-t border-ocean-700/40">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {batch.vesselName} · {batch.portName} 作业海域预报
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            数据来源：中央气象台 {new Date().toLocaleDateString("zh-CN")} 发布
          </p>
        </div>
      )}
    </div>
  )
}

function TideColumn() {
  const { compositeReview, selectedBatchId, batches } = useStore()
  const batch = batches.find((b) => b.id === selectedBatchId)
  const { tideTable } = compositeReview

  const anomalyCount = tideTable.filter((t) => t.anomaly).length

  return (
    <div className="card-dark border-ice/30">
      <div className="section-title mb-4">
        <Waves className="w-5 h-5 text-ice" />
        <span>潮汐表</span>
        <span className="ml-auto text-xs font-normal text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {batch?.portName}
        </span>
      </div>

      {anomalyCount > 0 && (
        <div className="bg-ice/10 border border-ice/30 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-ice-light">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>本轮复核发现 {anomalyCount} 天大潮期，靠港时间已修正</span>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs border-b border-ocean-700/50">
            <th className="text-left pb-2 font-medium">日期</th>
            <th className="text-left pb-2 font-medium">高潮时</th>
            <th className="text-left pb-2 font-medium">低潮时</th>
            <th className="text-center pb-2 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {tideTable.map((entry) => (
            <tr
              key={entry.date}
              className={`border-b border-ocean-800/40 last:border-0 ${
                entry.anomaly
                  ? "border-l-2 border-l-ice bg-ice/5"
                  : ""
              }`}
            >
              <td className="py-2.5 data-mono text-xs">{entry.date}</td>
              <td className="py-2.5 text-slate-300 font-mono text-xs">
                {entry.highTide}
              </td>
              <td className="py-2.5 text-slate-300 font-mono text-xs">
                {entry.lowTide}
              </td>
              <td className="py-2.5 text-center">
                {entry.anomaly ? (
                  <span className="inline-flex items-center gap-1 text-ice-light text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    大潮
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-reef text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    正常
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 pt-3 border-t border-ocean-700/40">
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          {batch?.portName} 潮汐站预报
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          数据来源：国家海洋信息中心 {new Date().toLocaleDateString("zh-CN")} 发布
        </p>
      </div>
    </div>
  )
}

function ViolationColumn() {
  const { compositeReview, selectedBatchId, batches } = useStore()
  const batch = batches.find((b) => b.id === selectedBatchId)
  const { navigationZoneViolations } = compositeReview

  const severityStyle: Record<string, string> = {
    "低": "bg-reef/15 text-reef-light border-reef/30",
    "中": "bg-amber/15 text-amber-light border-amber/30",
    "高": "bg-coral/15 text-coral-light border-coral/30",
  }

  return (
    <div className="card-dark border-reef/30">
      <div className="section-title mb-4">
        <ShieldAlert className="w-5 h-5 text-ice" />
        <span>禁航区越界</span>
        <span className="ml-auto text-xs font-normal text-slate-400 flex items-center gap-1">
          <Anchor className="w-3 h-3" />
          {batch?.vesselName}
        </span>
      </div>

      {navigationZoneViolations.length === 0 ? (
        <>
          <div className="bg-reef/10 border border-reef/30 rounded-lg px-3 py-2 mb-3">
            <div className="flex items-center gap-2 text-xs text-reef">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>本轮复核未发现越界记录，航线合规</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-reef/15 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-reef" />
            </div>
            <span className="text-reef font-medium text-sm">无越界记录</span>
            <span className="text-[11px] text-slate-500">
              航线未涉及禁航区，复核通过
            </span>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {navigationZoneViolations.map((v, i) => (
            <div
              key={i}
              className="bg-ocean-800/50 border border-ocean-700/50 rounded-lg p-3.5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-100 font-medium text-sm">
                  {v.zoneName}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                    severityStyle[v.severity] ?? severityStyle["低"]
                  }`}
                >
                  {v.severity}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {v.violationTime}
                </span>
                <span>船号：{v.vesselId}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-ocean-700/40">
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <FileCheck className="w-3 h-3" />
          航线核对：{batch?.portName} 进出港航道
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          数据来源：海事局 AIS 轨迹比对 {new Date().toLocaleDateString("zh-CN")}
        </p>
      </div>
    </div>
  )
}

export default function Composite() {
  const { batches, selectedBatchId, compositeReview } = useStore()
  const batch = batches.find((b) => b.id === selectedBatchId)

  const weatherAnomalies = compositeReview.weatherForecast.filter((w) => w.anomaly).length
  const tideAnomalies = compositeReview.tideTable.filter((t) => t.anomaly).length
  const violations = compositeReview.navigationZoneViolations.length
  const totalAnomalies = weatherAnomalies + tideAnomalies + violations

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="card-dark border-ice/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-ice/15 flex items-center justify-center flex-shrink-0">
            <Anchor className="w-6 h-6 text-ice" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-slate-100 font-bold text-lg">
                {batch?.vesselName ?? "—"} · {selectedBatchId}
              </p>
              <span className="text-[10px] bg-ice/15 text-ice px-2 py-0.5 rounded-full border border-ice/30">
                本轮复核 · 非通用样例
              </span>
            </div>
            <p className="text-slate-400 text-sm">
              {batch?.portName ?? "—"} · 靠港结算复合材料复核
            </p>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                复核人：港口调度员
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                复核时间：{new Date().toLocaleString("zh-CN")}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-slate-500 mb-1">本轮复核异常</div>
            <div className={`data-mono text-2xl font-bold ${
              totalAnomalies > 0 ? "text-amber-light" : "text-reef-light"
            }`}>
              {totalAnomalies} 项
            </div>
          </div>
        </div>

        {totalAnomalies > 0 && (
          <div className="mt-4 pt-4 border-t border-ocean-700/40">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-slate-500">复核摘要：</span>
              {weatherAnomalies > 0 && (
                <span className="text-[11px] bg-amber/10 text-amber px-2 py-0.5 rounded border border-amber/30">
                  气象异常 {weatherAnomalies} 项
                </span>
              )}
              {tideAnomalies > 0 && (
                <span className="text-[11px] bg-ice/10 text-ice-light px-2 py-0.5 rounded border border-ice/30">
                  大潮期 {tideAnomalies} 天
                </span>
              )}
              {violations > 0 && (
                <span className="text-[11px] bg-coral/10 text-coral-light px-2 py-0.5 rounded border border-coral/30">
                  禁航区越界 {violations} 次
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <WeatherColumn />
        <TideColumn />
        <ViolationColumn />
      </div>
    </div>
  )
}
