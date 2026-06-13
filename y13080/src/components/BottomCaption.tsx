import { useReviewStore } from '@/store/useReviewStore'
import { ImageIcon, Link } from 'lucide-react'
import { useMemo } from 'react'
import { generateDescriptions } from '@/utils/generateDescription'

export function BottomCaption() {
  const { selectedLocation, selectedComments, selectedTimeline, currentView } = useReviewStore()

  const descriptions = useMemo(
    () => generateDescriptions(selectedLocation, selectedComments, selectedTimeline, currentView),
    [selectedLocation, selectedComments, selectedTimeline, currentView]
  )

  const viewLabel = {
    byArea: '按库区视角',
    byHazard: '按危险等级视角',
    byTimeline: '按时间轴视角',
  }[currentView]

  return (
    <div className="panel h-40 flex flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">截图说明</span>
          <span className="text-xs text-steel-400">
            与场景标注、侧边明细数据同源
          </span>
          <span className="flex items-center gap-1 text-[10px] text-green-400">
            <Link size={12} />
            三套话一致
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-steel-400">
          <ImageIcon size={14} />
          {viewLabel}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="font-mono text-sm text-steel-200 whitespace-pre-wrap leading-relaxed">
          {descriptions.screenshotCaption}
        </div>

        {selectedLocation && (
          <div className="mt-3 pt-3 border-t border-steel-700/50 flex items-center justify-between">
            <div className="text-xs text-steel-500">
              数据来源：码头危险品库管理系统 / 评审批注表 / 作业记录表
            </div>
            <div className="text-xs text-steel-500 font-mono">
              生成时间：{new Date().toLocaleString('zh-CN')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
