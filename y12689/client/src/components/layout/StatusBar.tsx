import { useRecordStore } from '@/store/useRecordStore'
import { Database, Circle, Wifi } from 'lucide-react'

function StatusBar() {
  const { records, loading, error } = useRecordStore()

  return (
    <footer className="h-8 bg-bg-card border-t border-border flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Database size={12} />
          <span>记录数: {records.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle
            size={8}
            className={loading ? 'text-warning fill-warning' : error ? 'text-danger fill-danger' : 'text-success fill-success'}
          />
          <span className={loading ? 'text-warning' : error ? 'text-danger' : 'text-success'}>
            {loading ? '加载中...' : error ? error : '就绪'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-text-muted">
        <div className="flex items-center gap-1.5">
          <Wifi size={12} />
          <span>已连接</span>
        </div>
        <span>v1.0.0</span>
      </div>
    </footer>
  )
}

export default StatusBar
