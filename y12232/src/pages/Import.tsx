import { useState, useEffect, useCallback } from 'react'
import { importData, getBatches } from '@/api'
import FileUpload from '@/components/FileUpload'
import type { ImportBatch } from '@/types'
import { Database, Users, Map, Navigation, FileText, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const uploadConfigs = [
  {
    type: 'farmer',
    label: '农户档案',
    description: '支持 .xlsx / .csv 格式',
    accept: '.xlsx,.csv',
    icon: Users,
  },
  {
    type: 'area',
    label: '面积申报',
    description: '支持 .xlsx / .csv 格式',
    accept: '.xlsx,.csv',
    icon: Map,
  },
  {
    type: 'track',
    label: '北斗轨迹',
    description: '支持 .xlsx / .csv 格式',
    accept: '.xlsx,.csv',
    icon: Navigation,
  },
  {
    type: 'rule',
    label: '补贴规则',
    description: '支持 .xlsx / .csv 格式',
    accept: '.xlsx,.csv',
    icon: FileText,
  },
]

const typeLabels: Record<string, string> = {
  farmer: '农户档案',
  area: '面积申报',
  track: '北斗轨迹',
  rule: '补贴规则',
}

export default function ImportPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBatches = useCallback(async () => {
    try {
      const data = await getBatches()
      setBatches(data)
    } catch {
      setBatches([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const handleUpload = async (type: string, file: File) => {
    await importData(type, file)
    await fetchBatches()
  }

  function formatTime(timeStr: string) {
    return new Date(timeStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function StatusIcon({ status }: { status: string }) {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-danger" />
      default:
        return <Loader2 className="w-4 h-4 text-warning animate-spin" />
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-serif font-semibold text-primary">数据导入</h2>
        <p className="text-sm text-gray-500 mt-1">导入农户档案、面积申报、北斗轨迹和补贴规则数据</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {uploadConfigs.map((cfg) => (
          <FileUpload
            key={cfg.type}
            accept={cfg.accept}
            label={cfg.label}
            description={cfg.description}
            onUpload={(file) => handleUpload(cfg.type, file)}
          />
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-serif font-semibold text-primary">已导入批次</h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-3 w-20" />
              </div>
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="card p-12 text-center">
            <Database className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">暂无导入记录</p>
            <p className="text-xs text-gray-300 mt-1">上传文件后将在此显示导入批次</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
              <div key={batch.id} className="card p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    {typeLabels[batch.type] || batch.type}
                  </span>
                  <StatusIcon status={batch.status} />
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">{batch.filename}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(batch.uploadedAt)}
                  </span>
                  <span className="font-mono">{batch.recordCount} 条</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
