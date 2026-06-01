import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ScatterChart
} from 'lucide-react';
import { AnalysisRecord, STATUS_LABELS, PENDING_REASON_LABELS, ABNORMAL_REASON_LABELS } from '../types';
import { cn } from '../lib/utils';
import EvidenceChain from './EvidenceChain';
import RecordChart from './RecordChart';

interface RecordCardProps {
  record: AnalysisRecord;
  onEdit?: () => void;
  onDelete?: () => void;
  showEvidence?: boolean;
}

const statusConfig = {
  normal: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/30',
    labelColor: 'bg-emerald-500/10 text-emerald-400',
  },
  pending: {
    icon: Clock,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/30',
    labelColor: 'bg-amber-500/10 text-amber-400',
  },
  abnormal: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/30',
    labelColor: 'bg-red-500/10 text-red-400',
  },
};

export default function RecordCard({ record, onEdit, onDelete, showEvidence = false }: RecordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const config = statusConfig[record.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn(
      'rounded-lg border transition-all duration-200',
      config.bgColor,
      config.borderColor,
      expanded && 'ring-1 ring-offset-0 ring-offset-slate-900',
      record.lagModified && 'ring-2 ring-purple-500/50'
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-slate-300">
                {record.id}
                {record.lagModified && (
                  <span className="ml-1 text-purple-400 text-xs">*</span>
                )}
              </span>
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                config.labelColor
              )}>
                <StatusIcon className="w-3 h-3 inline mr-1" />
                {STATUS_LABELS[record.status]}
              </span>
              {record.pendingReason && (
                <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400">
                  {PENDING_REASON_LABELS[record.pendingReason]}
                </span>
              )}
              {record.abnormalReason && (
                <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400">
                  {ABNORMAL_REASON_LABELS[record.abnormalReason]}
                </span>
              )}
              {record.lagModified && (
                <span className="px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400">
                  滞后已人工修改
                </span>
              )}
            </div>
            
            <h3 className="text-base font-semibold mt-2 text-white">
              <span className="text-blue-400">{record.metricA}</span>
              <span className="text-slate-500 mx-2">→</span>
              <span className="text-cyan-400">{record.metricB}</span>
            </h3>
            
            <p className="text-sm text-slate-400 mt-1">{record.judgment}</p>
            
            <div className="flex items-center gap-4 mt-3 flex-wrap text-xs">
              <span className="text-slate-500">
                样本量: <span className="text-slate-300 font-mono">{record.sampleSize}</span>
              </span>
              <span className="text-slate-500">
                相关系数: <span className="text-slate-300 font-mono">r={record.correlationCoeff.toFixed(3)}</span>
              </span>
              <span className="text-slate-500">
                P值: <span className="text-slate-300 font-mono">p={record.pValue.toFixed(4)}</span>
              </span>
              <span className="text-slate-500">
                滞后: <span className={cn('font-mono', record.lagModified && 'text-purple-400')}>{record.lagValue}天</span>
              </span>
              {record.groupField && (
                <span className="text-slate-500">
                  分组: <span className="text-slate-300">{record.groupField}</span>
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setShowChart(!showChart)}
              className={cn(
                'p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors',
                showChart && 'text-blue-400 bg-slate-800'
              )}
              title="查看图表"
            >
              <ScatterChart className="w-4 h-4" />
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="人工干预"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="删除记录"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {showChart && (
          <div className="mt-4 border-t border-slate-700/50 pt-4">
            <RecordChart record={record} />
          </div>
        )}
        
        {expanded && (
          <div className="mt-4 border-t border-slate-700/50 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">数据来源:</span>
                <span className="text-slate-300 ml-2">{record.dataSource}</span>
              </div>
              <div>
                <span className="text-slate-500">创建时间:</span>
                <span className="text-slate-300 ml-2">{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              {record.groupFieldAddedAt && (
                <div>
                  <span className="text-slate-500">分组补充时间:</span>
                  <span className="text-slate-300 ml-2">{new Date(record.groupFieldAddedAt).toLocaleString('zh-CN')}</span>
                </div>
              )}
              {record.eventNoteAddedAt && (
                <div>
                  <span className="text-slate-500">备注补充时间:</span>
                  <span className="text-slate-300 ml-2">{new Date(record.eventNoteAddedAt).toLocaleString('zh-CN')}</span>
                </div>
              )}
              {record.eventNote && (
                <div className="col-span-2">
                  <span className="text-slate-500">事件备注:</span>
                  <span className="text-slate-300 ml-2">{record.eventNote}</span>
                </div>
              )}
              {record.originalLagJudgment && record.lagModified && (
                <div className="col-span-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <p className="text-xs text-purple-400 mb-1">原始判断（滞后修改前）:</p>
                  <p className="text-sm text-slate-300">{record.originalLagJudgment}</p>
                </div>
              )}
            </div>
            
            {showEvidence && (
              <EvidenceChain evidence={record.evidenceChain} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
