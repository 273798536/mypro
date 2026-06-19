import { useMemo, useState } from 'react'
import { Download, FileJson, FileSpreadsheet } from 'lucide-react'
import { getDownloadUrl } from '@/api'

export default function DownloadPage() {
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [status, setStatus] = useState('')
  const [confidence, setConfidence] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [driftType, setDriftType] = useState('')

  const url = useMemo(() => {
    return getDownloadUrl({
      format,
      status,
      confidence,
      sourceType,
      driftType,
    })
  }, [format, status, confidence, sourceType, driftType])

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="font-serif italic text-2xl mb-1 flex items-center gap-2">
          <Download size={22} className="text-signal-sky" /> 下载中心
        </h2>
        <p className="text-sm text-txt-muted">
          按筛选条件导出漂移记录，含结论与来源引用字段，支持 CSV / JSON 两种格式
        </p>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="text-xs text-txt-muted block mb-2">导出格式</label>
          <div className="flex gap-3">
            <button
              onClick={() => setFormat('csv')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded border transition-colors ${
                format === 'csv'
                  ? 'border-signal-sky bg-signal-sky/5 text-signal-sky'
                  : 'border-border hover:border-border-strong text-txt-muted'
              }`}
            >
              <FileSpreadsheet size={18} />
              <span className="text-sm">CSV（表格软件友好）</span>
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded border transition-colors ${
                format === 'json'
                  ? 'border-signal-sky bg-signal-sky/5 text-signal-sky'
                  : 'border-border hover:border-border-strong text-txt-muted'
              }`}
            >
              <FileJson size={18} />
              <span className="text-sm">JSON（程序处理友好）</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-txt-muted block mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
            >
              <option value="">全部状态</option>
              <option value="pending">待处理</option>
              <option value="corrected">已修正</option>
              <option value="reviewed">已复核</option>
              <option value="confirmed">已确认</option>
              <option value="dismissed">已忽略</option>
              <option value="rolled_back">已回滚</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-txt-muted block mb-1">置信度</label>
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="w-full px-2 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
            >
              <option value="">全部置信度</option>
              <option value="direct_use">可直接用</option>
              <option value="needs_review">需复核</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-txt-muted block mb-1">来源类型</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-2 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
            >
              <option value="">全部来源</option>
              <option value="ticket">业务工单</option>
              <option value="slow_query">慢查询日志</option>
              <option value="migration">迁移执行</option>
              <option value="snapshot">表结构快照</option>
              <option value="schema_diff">Schema Diff</option>
              <option value="permission">权限文档</option>
              <option value="query_analysis">查询分析</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-txt-muted block mb-1">漂移类型</label>
            <select
              value={driftType}
              onChange={(e) => setDriftType(e.target.value)}
              className="w-full px-2 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
            >
              <option value="">全部漂移类型</option>
              <option value="value_added">枚举新增</option>
              <option value="value_removed">枚举移除</option>
              <option value="value_changed">枚举变更</option>
              <option value="duplicate_exec">迁移重复执行</option>
              <option value="null_value">空值</option>
              <option value="mixed_note">备注混写</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="text-xs text-txt-muted mb-2">
            导出将包含：漂移记录基础字段、枚举值、结论、操作人，以及关联快照的脏数据标记
          </div>
          <a
            href={url}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-signal-lime text-bg-bg hover:bg-signal-limeDim transition-colors"
          >
            <Download size={16} />
            下载 {format.toUpperCase()}
          </a>
        </div>
      </div>
    </div>
  )
}
