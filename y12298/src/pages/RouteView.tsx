import RoutePanel from '@/components/route/RoutePanel'

export default function RouteView() {
  return (
    <div className="flex h-full w-full flex-col overflow-auto p-4" style={{ background: '#0A1628' }}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold" style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>
          路线规划管理
        </h1>
        <p className="mt-1 text-xs" style={{ color: '#94A3B8', fontFamily: 'Noto Sans SC, sans-serif' }}>
          管理巡检路线版本、检测禁区穿越、保留失败路径证据
        </p>
      </div>
      <div className="flex flex-1 overflow-hidden rounded-lg border" style={{ background: '#0F1D2F', borderColor: '#1E3A5F' }}>
        <RoutePanel />
      </div>
    </div>
  )
}
