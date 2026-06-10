import StatCards from "@/components/StatCards"
import TiterChart from "@/components/TiterChart"
import SampleTable from "@/components/SampleTable"
import SynonymCard from "@/components/SynonymCard"
import { useTiterStore } from "@/store"
import { ShieldAlert } from "lucide-react"

export default function Dashboard() {
  const { currentBatch, getContaminatedSamples } = useTiterStore()
  const contaminatedSamples = getContaminatedSamples(currentBatch)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          复核看板
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          试剂批号 {currentBatch} · 滴度复核总览
        </p>
      </div>

      <div className="space-y-6">
        <StatCards />

        <TiterChart />

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <SampleTable />
          </div>
          <div className="space-y-4">
            <SynonymCard />

            {contaminatedSamples.length > 0 && (
              <div
                className="rounded-lg p-5 glow-bad"
                style={{
                  background: "var(--color-slate-card)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={16} style={{ color: "var(--color-red-bad)" }} />
                  <h3 className="text-sm font-medium" style={{ color: "var(--color-red-bad)" }}>
                    污染样本警告
                  </h3>
                </div>
                {contaminatedSamples.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-md p-3 mb-2 text-xs"
                    style={{
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.15)",
                    }}
                  >
                    <p className="font-mono font-medium mb-1" style={{ color: "var(--color-red-bad)" }}>
                      {s.id} · {s.speciesName}
                    </p>
                    <p style={{ color: "var(--color-text-secondary)" }}>
                      该样本物种不在本批次预期范围内，滴度值 1:{s.titerValue} 异常偏低，
                      高度疑似样本混入或标签错误。此样本已被标记为坏数据，不计入统计。
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
