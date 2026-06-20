import { SummaryCards } from "@/components/SummaryCards"
import { FilterBar, BatchActionBar } from "@/components/FilterBar"
import { QueueList } from "@/components/QueueList"
import { DetailDrawer } from "@/components/DetailDrawer"
import { ImportModal } from "@/components/ImportModal"
import { useQueueStore } from "@/store/queueStore"
import { FlaskConical } from "lucide-react"

export default function Home() {
  const selectedIds = useQueueStore(s => s.selectedIds)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center">
              <FlaskConical className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-100 leading-tight">训练队列成本看板</h1>
              <p className="text-xs text-zinc-500">MLOps 值班复核工具 · 本地数据驱动</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
        <SummaryCards />
        <FilterBar />
        {selectedIds.length > 0 && <BatchActionBar />}
        <QueueList />
      </main>

      <DetailDrawer />
      <ImportModal />
    </div>
  )
}
