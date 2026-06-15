import FilterBar from './components/FilterBar'
import MaterialPanel from './components/MaterialPanel'
import ReviewPanel from './components/ReviewPanel'
import AnomalyExportPanel from './components/AnomalyExportPanel'
import AuthorizationModal from './components/AuthorizationModal'

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-base">
      <header className="flex items-center gap-3 border-b border-amber/20 bg-surface/60 px-6 py-3 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/20">
          <span className="font-serif text-base font-bold text-amber">返</span>
        </div>
        <div>
          <h1 className="font-serif text-base font-bold tracking-wide text-ivory">剧场返场曲版本复核</h1>
          <p className="text-xs text-ivoryMuted">筛选·备注·摘要联动 · 原始来源保留 · 异常独立标注</p>
        </div>
        <div className="ml-auto flex items-center gap-6 text-xs text-ivoryMuted">
          <div className="flex items-center gap-1.5 rounded bg-white/5 px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-sage" />
            <span>左：放材料</span>
          </div>
          <div className="flex items-center gap-1.5 rounded bg-white/5 px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-mist" />
            <span>中：做复核</span>
          </div>
          <div className="flex items-center gap-1.5 rounded bg-white/5 px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-coral" />
            <span>右：看异常·导出</span>
          </div>
        </div>
      </header>

      <FilterBar />

      <div className="flex flex-1 overflow-hidden">
        <MaterialPanel />
        <ReviewPanel />
        <AnomalyExportPanel />
      </div>

      <AuthorizationModal />
    </div>
  )
}
