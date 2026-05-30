import { useState } from 'react';
import { Clock, User, CheckCircle, AlertTriangle, XCircle, Edit2, Trash2, ArrowUpRight, ChevronDown, ChevronUp, History, ArrowLeftRight } from 'lucide-react';
import type { CalculationRecord } from '../../types/records';
import { getFieldDisplayName, formatValue } from '../../utils/validation/reviewEngine';
import { getVolumeForDisplay } from '../../utils/math/volumeCalculator';

interface RecordItemProps {
  record: CalculationRecord;
  isActive: boolean;
  onLoad: (record: CalculationRecord) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function RecordItem({ record, isActive, onLoad, onDelete, onApprove, onReject }: RecordItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const statusConfig = {
    approved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: '已通过' },
    pending: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: '待审核' },
    needs_review: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: '待确认' },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: '已驳回' },
  }[record.reviewStatus];

  const StatusIcon = statusConfig.icon;
  const axisLabel = record.params.rotationAxis === 'x' ? 'X轴' : record.params.rotationAxis === 'y' ? 'Y轴' : '自定义轴';

  return (
    <div
      className={`group rounded-xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'bg-blue-900/30 border-blue-500/50 shadow-lg shadow-blue-500/10'
          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50'
      }`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-sm font-mono text-blue-400 truncate">
                f(x) = {record.params.functionExpr}
              </code>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 ${statusConfig.bg} ${statusConfig.color} rounded-full text-xs flex-shrink-0`}>
                <StatusIcon size={10} />
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ArrowUpRight size={10} />
                {axisLabel}
              </span>
              <span>[{record.params.intervalA}, {record.params.intervalB}]</span>
              <span className="text-green-400 font-mono">
                V = {getVolumeForDisplay(record.result.volume)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <Clock size={10} />
              <span>{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
              {record.modificationHistory.length > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <History size={10} />
                  {record.modificationHistory.length} 次修改
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onLoad(record)}
              className="p-1.5 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors"
              title="加载此记录"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-900/50 rounded-lg">
                <div className="text-slate-500 mb-0.5">函数曲线</div>
                <code className="text-blue-400 font-mono">{record.params.functionExpr}</code>
              </div>
              <div className="p-2 bg-slate-900/50 rounded-lg">
                <div className="text-slate-500 mb-0.5">旋转轴</div>
                <div className="text-purple-400">{axisLabel}</div>
              </div>
              <div className="p-2 bg-slate-900/50 rounded-lg">
                <div className="text-slate-500 mb-0.5">区间</div>
                <div className="text-green-400 font-mono">[{record.params.intervalA}, {record.params.intervalB}]</div>
              </div>
              <div className="p-2 bg-slate-900/50 rounded-lg">
                <div className="text-slate-500 mb-0.5">切片数</div>
                <div className="text-amber-400 font-mono">{record.params.sliceCount}</div>
              </div>
              <div className="p-2 bg-slate-900/50 rounded-lg col-span-2">
                <div className="text-slate-500 mb-0.5">体积结果</div>
                <div className="text-lg font-bold text-white font-mono">
                  V = {getVolumeForDisplay(record.result.volume)}
                </div>
              </div>
            </div>

            {record.reviewNotes && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="text-xs text-amber-400 mb-1">备注</div>
                <div className="text-xs text-slate-300">{record.reviewNotes}</div>
              </div>
            )}

            {(record.reviewStatus === 'needs_review' || record.reviewStatus === 'pending') && (
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(record.id)}
                  className="flex-1 py-1.5 px-3 bg-green-600/20 text-green-400 rounded-lg text-xs hover:bg-green-600/30 transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle size={12} />
                  通过
                </button>
                <button
                  onClick={() => onReject(record.id)}
                  className="flex-1 py-1.5 px-3 bg-red-600/20 text-red-400 rounded-lg text-xs hover:bg-red-600/30 transition-colors flex items-center justify-center gap-1"
                >
                  <XCircle size={12} />
                  驳回
                </button>
              </div>
            )}

            {record.modificationHistory.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeftRight size={12} />
                  {showHistory ? '收起' : '查看'}修改历史 ({record.modificationHistory.length})
                </button>

                {showHistory && (
                  <div className="mt-2 space-y-2">
                    {record.modificationHistory.map((mod) => (
                      <div key={mod.id} className="p-2 bg-slate-900/50 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-400">
                            {getFieldDisplayName(mod.field)}
                          </span>
                          <span className="text-slate-500">
                            {new Date(mod.timestamp).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 font-mono line-through">
                            {formatValue(mod.field, mod.oldValue)}
                          </span>
                          <ArrowLeftRight size={10} className="text-slate-600" />
                          <span className="text-green-400 font-mono">
                            {formatValue(mod.field, mod.newValue)}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-1 flex items-center gap-1">
                          <User size={10} />
                          {mod.user}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => onDelete(record.id)}
              className="w-full py-1.5 px-3 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 size={12} />
              删除此记录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
