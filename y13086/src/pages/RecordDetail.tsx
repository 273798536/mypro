import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, History, AlertTriangle, PenLine } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { fetchRecordDetail } from '@/utils/api'
import StatusBadge from '@/components/StatusBadge'
import AnomalyBadge from '@/components/AnomalyBadge'
import LevelIndicator from '@/components/LevelIndicator'
import CollapsibleSection from '@/components/CollapsibleSection'
import RejudgeModal from '@/components/RejudgeModal'
import type { MuseumRecord, Photo, Annotation, LightParams } from '@/types'

function parseJsonField<T>(field: T | string, fallback: T): T {
  if (typeof field === 'string') {
    try { return JSON.parse(field) } catch { return fallback }
  }
  return field
}

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recordDetail, setRecordDetail, userRole, rejudgeModalOpen, setRejudgeModalOpen } = useStore()

  useEffect(() => {
    if (!id) return
    fetchRecordDetail(id).then(setRecordDetail).catch(() => setRecordDetail(null))
    return () => setRecordDetail(null)
  }, [id, setRecordDetail])

  if (!recordDetail) {
    return (
      <div className="flex items-center justify-center h-full text-museum-textDim">
        加载中...
      </div>
    )
  }

  const { record, photos, annotations } = recordDetail
  const mainPhoto = photos[0]

  const reloadDetail = () => {
    if (id) fetchRecordDetail(id).then(setRecordDetail)
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/records')}
          className="p-2 rounded-lg bg-museum-card border border-museum-border text-museum-textMuted hover:text-museum-text transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-medium text-museum-text">{record.cabinetNo}</h2>
          <p className="text-xs text-museum-textDim">{record.floor} · {record.unit}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <StatusBadge status={record.status} />
          <AnomalyBadge anomalyType={record.anomalyType} />
          <LevelIndicator level={record.anomalyLevel} />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <PhotoSection photo={mainPhoto} annotations={annotations} />
        </div>

        <div className="w-80 shrink-0 space-y-3">
          <DetailPanel record={record} />

          <button
            onClick={() => navigate(`/records/${id}/history`)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-museum-card border border-museum-border text-sm text-museum-textMuted hover:text-museum-text hover:border-museum-amber/50 transition-colors"
          >
            <History size={16} />
            查看历史记录
          </button>

          {userRole === 'teacher' && (
            <button
              onClick={() => setRejudgeModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-museum-amber/15 border border-museum-amber/30 text-sm text-museum-amber hover:bg-museum-amber/25 transition-colors"
            >
              <PenLine size={16} />
              重审判断
            </button>
          )}
        </div>
      </div>

      {rejudgeModalOpen && (
        <RejudgeModal
          recordId={record.id}
          currentJudgment={record.judgment}
          onClose={() => setRejudgeModalOpen(false)}
          onSuccess={reloadDetail}
        />
      )}
    </div>
  )
}

function PhotoSection({ photo, annotations }: { photo: Photo | undefined; annotations: Annotation[] }) {
  if (!photo) {
    return (
      <div className="bg-museum-card border border-museum-border rounded-xl p-8 text-center text-museum-textDim">
        暂无照片
      </div>
    )
  }

  const exifData = parseJsonField(photo.exifData, {} as Record<string, string>)

  return (
    <div className="space-y-4">
      <div className="bg-museum-card border border-museum-border rounded-xl overflow-hidden">
        <img
          src={photo.storedFilename}
          alt={photo.originalFilename}
          className="w-full max-h-[500px] object-contain bg-museum-bg"
        />
      </div>

      <div className="bg-museum-card border border-museum-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera size={14} className="text-museum-amber" />
          <span className="text-xs font-medium text-museum-text">照片信息</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-museum-textDim">文件名</span>
            <p className="text-museum-text mt-0.5 truncate">{photo.originalFilename}</p>
          </div>
          <div>
            <span className="text-museum-textDim">拍摄时间</span>
            <p className="text-museum-text mt-0.5">{new Date(photo.captureTime).toLocaleString('zh-CN')}</p>
          </div>
          <div>
            <span className="text-museum-textDim">设备</span>
            <p className="text-museum-text mt-0.5">{photo.deviceInfo}</p>
          </div>
          {Object.entries(exifData).map(([key, value]) => (
            <div key={key}>
              <span className="text-museum-textDim">{key}</span>
              <p className="text-museum-text mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {annotations.length > 0 && (
        <div className="bg-museum-card border border-museum-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-museum-amber" />
            <span className="text-xs font-medium text-museum-text">标注信息 ({annotations.length})</span>
          </div>
          <div className="space-y-2">
            {annotations.map((ann) => (
              <div key={ann.id} className="flex items-start gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-museum-amber/15 text-museum-amber shrink-0">
                  {ann.type}
                </span>
                <span className="text-museum-text">{ann.content}</span>
                <span className="text-museum-textDim ml-auto shrink-0">
                  {ann.createdBy}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailPanel({ record }: { record: MuseumRecord }) {
  const lp = parseJsonField<LightParams>(record.lightParams, {
    brightness: 0,
    colorTemp: 0,
    schedule: '',
  })

  const isDirty = !!record.hasDirtyData

  return (
    <div className="space-y-3">
      <CollapsibleSection title="展柜信息">
        <InfoRow label="展柜编号" value={record.cabinetNo} />
        <InfoRow label="楼层" value={record.floor} />
        <InfoRow label="单元" value={record.unit} />
      </CollapsibleSection>

      <CollapsibleSection title="灯光参数">
        <InfoRow label="亮度" value={`${lp.brightness}%`} />
        <InfoRow label="色温" value={`${lp.colorTemp}K`} />
        <InfoRow label="计划时段" value={lp.schedule} />
        {lp.flickerRate !== undefined && <InfoRow label="闪烁频率" value={`${lp.flickerRate}Hz`} />}
        {lp.actualOnTime && <InfoRow label="实际开灯" value={lp.actualOnTime} />}
        {lp.actualOffTime && <InfoRow label="实际关灯" value={lp.actualOffTime} />}
      </CollapsibleSection>

      <CollapsibleSection title="异常描述">
        <AnomalyBadge anomalyType={record.anomalyType} />
        <LevelIndicator level={record.anomalyLevel} />
      </CollapsibleSection>

      {isDirty && (
        <div className="bg-museum-purpleBg border border-museum-purple/30 rounded-lg p-4 space-y-2">
          <span className="text-xs font-medium text-museum-purple">异常数据</span>
          <p className="text-xs text-museum-text">{record.dirtyDataNote}</p>
        </div>
      )}

      <CollapsibleSection title="判断结果">
        {record.originalJudgment && record.originalJudgment !== record.judgment && (
          <div className="text-xs text-museum-textDim mb-1">
            原判断: <span className="line-through">{record.originalJudgment}</span>
            {' → '}
            <span className="text-museum-amber">现判断: {record.judgment}</span>
          </div>
        )}
        {(!record.originalJudgment || record.originalJudgment === record.judgment) && (
          <p className="text-sm text-museum-text">{record.judgment || '未判定'}</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="处理状态">
        <StatusBadge status={record.status} />
      </CollapsibleSection>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-museum-textDim">{label}</span>
      <span className="text-museum-text">{value}</span>
    </div>
  )
}
