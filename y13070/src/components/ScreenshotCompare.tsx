import { useReviewStore } from '@/store'
import { ImageIcon, Archive } from 'lucide-react'

interface ScreenshotCompareProps {
  annotationId: string | null
}

export default function ScreenshotCompare({ annotationId }: ScreenshotCompareProps) {
  const { getAnnotationScreenshots } = useReviewStore()

  if (!annotationId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        请在左侧时间线选择一条批注
      </div>
    )
  }

  const screenshots = getAnnotationScreenshots(annotationId)

  if (screenshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        该批注暂无截图记录
      </div>
    )
  }

  const sorted = [...screenshots].sort((a, b) => a.version - b.version)
  const latest = sorted[sorted.length - 1]
  const older = sorted.slice(0, -1)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const ScreenshotPanel = ({
    dataUrl,
    description,
    version,
    capturedAt,
    isOld,
  }: {
    dataUrl: string
    description: string
    version: number
    capturedAt: string
    isOld: boolean
  }) => (
    <div
      className={`flex-1 rounded-lg overflow-hidden ${
        isOld ? 'border-2 border-dashed border-red-500' : 'border border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800">
        {isOld ? (
          <Archive size={14} className="text-red-400" />
        ) : (
          <ImageIcon size={14} className="text-blue-400" />
        )}
        <span
          className={`text-xs font-medium ${
            isOld ? 'text-red-400' : 'text-blue-400'
          }`}
        >
          {isOld ? '历史版本' : '当前版本'}
        </span>
        <span className="text-xs text-slate-500">v{version}</span>
        <span className="text-xs text-slate-500">{formatDate(capturedAt)}</span>
      </div>
      <div className="h-48 bg-slate-900 flex items-center justify-center">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={description}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <ImageIcon size={32} />
            <p className="text-xs text-center px-4">{description}</p>
          </div>
        )}
      </div>
      <div className="px-3 py-2 bg-slate-800">
        <p className="text-xs text-slate-400 truncate">{description}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {older.length > 0 && (
        <div className="flex gap-3">
          {older.map((s) => (
            <ScreenshotPanel
              key={s.id}
              dataUrl={s.dataUrl}
              description={s.description}
              version={s.version}
              capturedAt={s.capturedAt}
              isOld
            />
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <div className="flex-1">
          <ScreenshotPanel
            dataUrl={latest.dataUrl}
            description={latest.description}
            version={latest.version}
            capturedAt={latest.capturedAt}
            isOld={older.length > 0}
          />
        </div>
        {older.length === 0 && (
          <div className="flex-1 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center">
            <p className="text-xs text-slate-500">无历史版本对比</p>
          </div>
        )}
      </div>
    </div>
  )
}
