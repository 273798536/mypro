import WorkOrderPanel from '@/components/workorder/WorkOrderPanel'

export default function EvidenceView() {
  return (
    <div className="flex h-full w-full flex-col overflow-auto p-4" style={{ background: '#0A1628' }}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold" style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>
          工单证据链
        </h1>
        <p className="mt-1 text-xs" style={{ color: '#94A3B8', fontFamily: 'Noto Sans SC, sans-serif' }}>
          所有变更工单完整留存、关联冲突与路线、证据链可追溯
        </p>
      </div>
      <div className="flex flex-1 overflow-hidden rounded-lg border" style={{ background: '#0F1D2F', borderColor: '#1E3A5F' }}>
        <WorkOrderPanel />
      </div>
    </div>
  )
}
