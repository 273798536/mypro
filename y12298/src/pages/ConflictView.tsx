import ConflictPanel from '@/components/conflict/ConflictPanel'

export default function ConflictView() {
  return (
    <div className="flex h-full w-full flex-col overflow-auto p-4" style={{ background: '#0A1628' }}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold" style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>
          冲突检测中心
        </h1>
        <p className="mt-1 text-xs" style={{ color: '#94A3B8', fontFamily: 'Noto Sans SC, sans-serif' }}>
          阀门重号检测、路线穿禁区检测、模型与编号不一致检测
        </p>
      </div>
      <div className="flex flex-1 overflow-hidden rounded-lg border" style={{ background: '#0F1D2F', borderColor: '#1E3A5F' }}>
        <ConflictPanel />
      </div>
    </div>
  )
}
