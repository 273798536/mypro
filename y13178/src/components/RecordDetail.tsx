import { useMemo } from 'react';
import {
  Calendar,
  Tag,
  User,
  AlertTriangle,
  Gauge,
  Ruler,
  Weight,
  FileText,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  recordTypeLabels,
  recordTypeBgColors,
  recordTypeTextColors,
  formatDate,
  getNormalizedValue,
} from '@/utils/format';

export default function RecordDetail() {
  const records = useAppStore((s) => s.records);
  const selectedRecordId = useAppStore((s) => s.selectedRecordId);

  const record = useMemo(
    () => records.find((r) => r.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  if (!record) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 border border-slate-800 rounded-lg">
        <Info size={32} className="mb-3 opacity-50" />
        <p className="text-sm">选择左侧记录查看详情</p>
      </div>
    );
  }

  const normalizedValue = getNormalizedValue(record);

  return (
    <div className="h-full flex flex-col bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-800/50 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-sm text-slate-300">
              {formatDate(record.date)}
            </span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded border ${recordTypeBgColors[record.type]} ${recordTypeTextColors[record.type]}`}
          >
            {recordTypeLabels[record.type]}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold font-mono ${
              record.isJumpPoint ? 'text-red-400' : 'text-cyan-400'
            }`}
          >
            {record.value}
          </span>
          <span className="text-sm text-slate-500">
            {record.unitChanged && record.unitAfter === 'nm' ? 'nm' : 'μm'}
          </span>
          {record.unitChanged && (
            <span className="text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              ≈ {normalizedValue.toFixed(2)} μm
            </span>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 来源 */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <User size={12} />
            记录来源
          </div>
          <div className="text-sm text-slate-200">{record.source}</div>
        </div>

        {/* 影响权重 */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <Weight size={12} />
            影响权重
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                style={{ width: `${(record.impactWeight / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-cyan-400 w-8 text-right">
              {record.impactWeight}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            权重越高，对结论的影响越大
          </p>
        </div>

        {/* 记录内容 */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <FileText size={12} />
            记录内容
          </div>
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-slate-300 leading-relaxed">
            {record.content}
          </div>
        </div>

        {/* 跳变信息 */}
        {record.isJumpPoint && (
          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
              <AlertTriangle size={14} />
              跳变点标记
            </div>
            <p className="text-xs text-slate-400">
              该数据点偏离正常范围，已标记为跳变点。
            </p>
          </div>
        )}

        {/* 阈值变动 */}
        {record.isThresholdChanged && (
          <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-2">
              <Gauge size={14} />
              安全阈值变动
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500">修改前</span>
                <div className="font-mono text-slate-300">
                  {record.thresholdBefore} μm
                </div>
              </div>
              <span className="text-slate-600">→</span>
              <div>
                <span className="text-xs text-slate-500">修改后</span>
                <div className="font-mono text-orange-400">
                  {record.thresholdAfter} μm
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              阈值变动会影响该记录在历史标准下的异常判定
            </p>
          </div>
        )}

        {/* 单位变化 */}
        {record.unitChanged && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
              <Ruler size={14} />
              单位变化
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500">原单位</span>
                <div className="font-mono text-slate-300">
                  {record.unitBefore}
                </div>
              </div>
              <span className="text-slate-600">→</span>
              <div>
                <span className="text-xs text-slate-500">现单位</span>
                <div className="font-mono text-amber-400">
                  {record.unitAfter}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              已自动换算：{record.value} {record.unitAfter} = {normalizedValue.toFixed(2)} μm
            </p>
          </div>
        )}

        {/* 记录标签 */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <Tag size={12} />
            相关标签
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
              {record.type === 'old_note' && '历史数据'}
              {record.type === 'normal' && '自动采集'}
              {record.type === 'verbal' && '人工录入'}
            </span>
            {record.isJumpPoint && (
              <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">
                跳变点
              </span>
            )}
            {record.isThresholdChanged && (
              <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20">
                阈值变动
              </span>
            )}
            {record.unitChanged && (
              <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                单位变化
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
