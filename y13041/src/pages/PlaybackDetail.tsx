import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, Download, History } from 'lucide-react'
import { usePlaybackStore } from '@/store/playbackStore'
import StatusBadge from '@/components/StatusBadge'
import ConclusionBadge from '@/components/ConclusionBadge'
import ApprovalTimeline from '@/components/ApprovalTimeline'
import NormalRecordPanel from '@/components/NormalRecordPanel'
import NotesPanel from '@/components/NotesPanel'
import RejudgeModal from '@/components/RejudgeModal'
import HistoryDrawer from '@/components/HistoryDrawer'
import { downloadReport } from '@/services/api'

const DEFAULT_OPERATOR = '小周'

export default function PlaybackDetail() {
  const { id } = useParams<{ id: string }>()
  const loadDetail = usePlaybackStore((state) => state.loadDetail)
  const doConfirm = usePlaybackStore((state) => state.doConfirm)
  const currentDetail = usePlaybackStore((state) => state.currentDetail)
  const loading = usePlaybackStore((state) => state.loading)
  const [rejudgeOpen, setRejudgeOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    if (id) {
      loadDetail(id)
    }
  }, [id, loadDetail])

  const handleExportReport = async () => {
    if (!id) return
    const store = usePlaybackStore.getState()
    await store.doGenerateReport(id, { operatorName: DEFAULT_OPERATOR })
    const latest = usePlaybackStore.getState().currentDetail?.reports.slice(-1)[0]
    if (latest) {
      downloadReport(id, latest.id)
    }
  }

  const handleConfirm = async () => {
    if (!id) return
    await doConfirm(id, { operatorName: DEFAULT_OPERATOR })
  }

  if (!currentDetail) {
    return (
      <div className="flex items-center justify-center h-full text-slatefinance-400">
        {loading ? '加载中...' : '未找到数据'}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-5">
      <nav className="flex items-center gap-1.5 text-sm text-slatefinance-500">
        <Link to="/" className="hover:text-deepsea-600 transition-colors">
          异常回放列表
        </Link>
        <ChevronRight size={14} />
        <span className="text-slatefinance-700">详情</span>
      </nav>

      <div className="rounded-xl bg-white shadow-sm border border-slatefinance-100 p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-2xl font-bold text-deepsea-800" style={{ fontSize: 24 }}>
                {currentDetail.enterpriseName}
              </h1>
              <StatusBadge status={currentDetail.status} />
              <ConclusionBadge conclusion={currentDetail.conclusion} />
            </div>
            <div className="mt-3 flex items-center gap-6 text-sm text-slatefinance-600 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slatefinance-400">批次号：</span>
                <span className="font-mono text-slatefinance-700">{currentDetail.batchNo}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slatefinance-400">最后操作人：</span>
                <span className="text-slatefinance-700">{currentDetail.lastOperator}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slatefinance-400">最后更新时间：</span>
                <span className="text-slatefinance-700">
                  {new Date(currentDetail.lastUpdatedAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button
              onClick={() => setRejudgeOpen(true)}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              改判
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slatefinance-200 bg-white px-4 py-2 text-sm font-medium text-slatefinance-700 hover:bg-slatefinance-50 transition-colors"
            >
              <History size={16} />
              查看历史
            </button>
            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slatefinance-200 bg-white px-4 py-2 text-sm font-medium text-slatefinance-700 hover:bg-slatefinance-50 transition-colors"
            >
              <Download size={16} />
              导出报告
            </button>
            <button
              onClick={handleConfirm}
              disabled={currentDetail.status === 'confirmed'}
              className="rounded-lg bg-deepsea-600 px-4 py-2 text-sm font-medium text-white hover:bg-deepsea-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              人工确认
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid gap-5 min-h-0" style={{ gridTemplateColumns: '7fr 5fr' }}>
        <div className="min-h-0">
          <ApprovalTimeline emails={currentDetail.emails} />
        </div>
        <div className="flex flex-col gap-5 min-h-0">
          <div className="flex-1 min-h-0" style={{ minHeight: 200 }}>
            <NormalRecordPanel records={currentDetail.normalRecords} />
          </div>
          <div className="flex-1 min-h-0" style={{ minHeight: 280 }}>
            {id && (
              <NotesPanel
                playbackId={id}
                notes={currentDetail.notes}
                operatorName={DEFAULT_OPERATOR}
              />
            )}
          </div>
        </div>
      </div>

      {id && (
        <>
          <RejudgeModal
            isOpen={rejudgeOpen}
            onClose={() => setRejudgeOpen(false)}
            playbackId={id}
            operatorName={DEFAULT_OPERATOR}
          />
          <HistoryDrawer
            isOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
            playbackId={id}
          />
        </>
      )}
    </div>
  )
}
