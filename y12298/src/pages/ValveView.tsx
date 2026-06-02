import ValvePanel from '@/components/valve/ValvePanel'

export default function ValveView() {
  return (
    <div className="flex h-full w-full flex-col overflow-auto p-4" style={{ background: '#0A1628' }}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold" style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>
          阀门管理中心
        </h1>
        <p className="mt-1 text-xs" style={{ color: '#94A3B8', fontFamily: 'Noto Sans SC, sans-serif' }}>
          阀门编号核验、重号检测、模型备注与实际编号一致性检查
        </p>
      </div>
      <div className="flex flex-1 overflow-hidden rounded-lg border" style={{ background: '#0F1D2F', borderColor: '#1E3A5F' }}>
        <ValvePanel />
      </div>
    </div>
  )
}
