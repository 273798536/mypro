import type { WarningRecord } from '@/types'
import { getSceneDescription, SOURCE_LABEL, STATUS_LABEL } from '@/utils/format'
import { Info, FileText, Scale, BookOpen } from 'lucide-react'

interface Props {
  selectedRecord: WarningRecord | null
}

export default function SidePanel({ selectedRecord }: Props) {
  return (
    <div className="bg-white rounded-xl border border-surface-dark p-5 space-y-5 sticky top-5">
      <div className="flex items-center gap-2 text-navy">
        <BookOpen className="w-4 h-4" />
        <h2 className="font-bold text-sm">侧边说明</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-steel">
            <Info className="w-3.5 h-3.5" />
            当前场景
          </div>
          <p className="text-sm text-navy/80 leading-relaxed bg-surface rounded-lg p-3">
            {selectedRecord
              ? getSceneDescription(selectedRecord.sceneLabel)
              : '点击左侧预警卡片查看该记录的场景说明。'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-steel">
            <FileText className="w-3.5 h-3.5" />
            备注来源
          </div>
          <div className="space-y-1.5">
            {(Object.entries(SOURCE_LABEL) as [string, string][]).map(([key, label]) => (
              <div
                key={key}
                className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                  selectedRecord?.noteSource === key
                    ? 'bg-navy/5 border-navy/20 text-navy font-medium'
                    : 'bg-surface border-transparent text-steel'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-steel">
            <Scale className="w-3.5 h-3.5" />
            判定规则
          </div>
          <ul className="text-xs text-navy/70 space-y-1.5 leading-relaxed">
            <li>实测值 &gt; 阈值 → 预警状态</li>
            <li>实测值 ≤ 阈值 → 正常状态</li>
            <li>设备编号与已有预警重复 → 挂起待确认</li>
            <li>运营主管确认 → 已确认</li>
            <li>运营主管驳回 → 已驳回</li>
          </ul>
        </div>
      </div>

      {selectedRecord && (
        <div className="space-y-2 bg-surface rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-steel">
            <span>📌</span>
            数字来源线索
          </div>
          <ul className="text-xs text-navy/70 space-y-1 leading-relaxed">
            <li>• 设备编号：{selectedRecord.deviceId}</li>
            <li>• 实测值 {selectedRecord.measuredValue.toFixed(1)}mm：{selectedRecord.sourceTag}</li>
            <li>• 阈值 {selectedRecord.threshold.toFixed(1)}mm：依据《公路桥梁技术状况评定标准》</li>
            <li>• 状态 {STATUS_LABEL[selectedRecord.status]}：由系统自动判定</li>
          </ul>
        </div>
      )}

      {selectedRecord?.isBackfilled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
          <span className="font-medium">补录说明：</span>
          该记录为后补录入，原始事件时间与录入时间不同。补录记录标注"补录"标签，数据来源标记为"补录自原始记录"。
        </div>
      )}

      <div className="text-xs text-steel/60 leading-relaxed border-t border-surface-dark pt-3">
        以上说明文字与场景标注、页面摘要源自同一数据字段，确保三处描述一致。
      </div>
    </div>
  )
}
