import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Upload,
  Sparkles,
  Edit3,
  MessageSquare,
  CheckCircle2,
  User,
  Clock,
  FileText,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import dayjs from 'dayjs';
import { TracePathResult, TraceNode, NodeType } from '@/types';
import { useSampleStore } from '@/stores/sampleStore';
import { cn } from '@/lib/utils';

interface TracePathProps {
  tracePath: TracePathResult | null;
  onJumpToSource: (sourceOriginId: string) => void;
  onJumpToVersion: (versionId: string) => void;
}

const nodeTypeConfig: Record<
  NodeType,
  { icon: any; color: string; bgColor: string; label: string }
> = {
  import: {
    icon: Upload,
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
    label: '数据导入',
  },
  ai_analysis: {
    icon: Sparkles,
    color: 'text-accent-600',
    bgColor: 'bg-accent-100',
    label: 'AI分析',
  },
  manual_correction: {
    icon: Edit3,
    color: 'text-warning-600',
    bgColor: 'bg-warning-100',
    label: '人工修正',
  },
  review: {
    icon: MessageSquare,
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
    label: '复核意见',
  },
  conclusion: {
    icon: CheckCircle2,
    color: 'text-accent-600',
    bgColor: 'bg-accent-100',
    label: '最终结论',
  },
};

export function TracePath({ tracePath, onJumpToSource, onJumpToVersion }: TracePathProps) {
  const { users, versions } = useSampleStore();
  const [animatingIndex, setAnimatingIndex] = useState(-1);

  useEffect(() => {
    if (tracePath && tracePath.nodes.length > 0) {
      setAnimatingIndex(-1);
      const timer = setTimeout(() => {
        let index = 0;
        const interval = setInterval(() => {
          setAnimatingIndex(index);
          index++;
          if (index >= tracePath.nodes.length) {
            clearInterval(interval);
          }
        }, 300);
        return () => clearInterval(interval);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tracePath]);

  if (!tracePath) {
    return (
      <div className="lab-card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
          <ChevronRight className="text-primary-500" size={32} />
        </div>
        <h3 className="text-lg font-medium text-lab-text mb-2">选择一条最终结论</h3>
        <p className="text-lab-textMuted text-sm">从右侧列表选择已确认的结论，查看完整追溯链路</p>
      </div>
    );
  }

  const operatorNames = tracePath.operators
    .map((id) => users.find((u) => u.id === id)?.name || id)
    .join('、');

  const duration = dayjs(tracePath.timeSpan.end).diff(
    dayjs(tracePath.timeSpan.start),
    'hour',
    true
  );

  return (
    <div className="lab-card p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-serif font-bold text-primary-600 flex items-center gap-2">
            <FileText size={20} />
            追溯链路
          </h3>
          <span className="font-mono font-bold text-accent-600">{tracePath.barcode}</span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-lab-textMuted">
          <span className="flex items-center gap-1">
            <span className="font-medium text-lab-text">{tracePath.totalSteps}</span> 个处理节点
          </span>
          <span className="flex items-center gap-1">
            涉及操作人: <span className="font-medium text-lab-text">{operatorNames}</span>
          </span>
          <span className="flex items-center gap-1">
            处理时长: <span className="font-medium text-lab-text">{duration.toFixed(1)} 小时</span>
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary-200 via-accent-200 to-accent-400" />

        {tracePath.nodes.map((node, index) => {
          const config = nodeTypeConfig[node.nodeType];
          const Icon = config.icon;
          const operator = users.find((u) => u.id === node.operatorId);
          const isAnimating = animatingIndex >= index;
          const isLast = index === tracePath.nodes.length - 1;

          return (
            <div
              key={node.nodeId}
              className={cn(
                'relative pl-16 pb-8 last:pb-0 transition-all duration-500',
                isAnimating ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              )}
            >
              <div
                className={cn(
                  'absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10',
                  config.bgColor,
                  isAnimating && 'animate-pulse-slow'
                )}
              >
                <Icon size={20} className={config.color} />
              </div>

              <div
                className={cn(
                  'p-4 rounded-xl border transition-all duration-300',
                  isLast
                    ? 'bg-gradient-to-r from-accent-50 to-white border-accent-200 shadow-md'
                    : 'bg-white border-lab-border hover:shadow-sm',
                  isAnimating && 'animate-trace-flow'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('font-medium', config.color)}>{config.label}</span>
                      <span className="text-xs text-lab-textMuted">
                        步骤 {index + 1}/{tracePath.nodes.length}
                      </span>
                    </div>
                    <p className="text-sm text-lab-text">
                      {node.nodeType === 'conclusion'
                        ? node.dataSnapshot.conclusion
                        : node.nodeType === 'ai_analysis'
                        ? `AI模型分析完成，异常评分: ${node.dataSnapshot.anomalyScore || 'N/A'}`
                        : node.nodeType === 'manual_correction'
                        ? `人工修正字段: ${node.dataSnapshot.manualCorrections?.length || 0} 处`
                        : node.nodeType === 'review'
                        ? '质控组复核意见已录入'
                        : `初始数据导入，基因: ${node.dataSnapshot.sequencingResult?.geneName || 'N/A'}`}
                    </p>
                  </div>

                  {!isLast && (
                    <ArrowRight
                      size={20}
                      className={cn(
                        'text-lab-textMuted transition-colors',
                        isAnimating && 'text-accent-500'
                      )}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-lab-textMuted">
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {operator?.name || '未知'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {dayjs(node.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                  <button
                    onClick={() => onJumpToSource(node.sourceOriginId)}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    <FileText size={12} />
                    查看来源
                    <ExternalLink size={10} />
                  </button>
                  {node.dataSnapshot.versionId && (
                    <button
                      onClick={() => onJumpToVersion(node.dataSnapshot.versionId)}
                      className="flex items-center gap-1 text-accent-600 hover:text-accent-700 hover:underline"
                    >
                      <FileText size={12} />
                      查看版本
                      <ExternalLink size={10} />
                    </button>
                  )}
                </div>

                {node.nodeType === 'conclusion' && (
                  <div className="mt-3 p-3 bg-accent-50 rounded-lg border border-accent-100">
                    <p className="text-sm font-medium text-accent-800 mb-1">最终结论</p>
                    <p className="text-sm text-accent-700">{node.dataSnapshot.finalResult}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
