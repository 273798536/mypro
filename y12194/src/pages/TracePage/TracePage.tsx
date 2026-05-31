import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GitBranch,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  FileCode,
  BarChart3,
  Target,
} from 'lucide-react';
import { useChartStore } from '../../store/useChartStore';
import { TraceNode, QualityIssue } from '../../types';
import { cn, formatTimestamp, formatTime } from '../../utils';
import { ProjectSidebar } from '../../components/ProjectSidebar/ProjectSidebar';

const nodeTypeConfig: Record<string, { icon: any; label: string }> = {
  parse: { icon: FileCode, label: '解析' },
  align: { icon: Target, label: '对齐' },
  analyze: { icon: BarChart3, label: '分析' },
  result: { icon: CheckCircle, label: '结果' },
};

const statusConfig: Record<string, { bg: string; border: string; icon: any; label: string }> = {
  success: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/50',
    icon: CheckCircle,
    label: '成功',
  },
  warning: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    icon: AlertTriangle,
    label: '警告',
  },
  error: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    icon: XCircle,
    label: '失败',
  },
};

export const TracePage = () => {
  const navigate = useNavigate();
  const { issueId } = useParams<{ issueId: string }>();
  const { getCurrentProject } = useChartStore();
  const project = getCurrentProject();

  if (!project) {
    return (
      <div className="flex h-[calc(100vh-64px)]">
        <ProjectSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">请先选择或导入一个谱面项目</p>
          </div>
        </div>
      </div>
    );
  }

  const issue = issueId ? project.issues.find(i => i.id === issueId) : null;
  const traceNodes = project.traceGraph;

  const getRelatedNodes = (issue: QualityIssue) => {
    return traceNodes.filter(node =>
      node.type === 'analyze' ||
      (issue.type === 'timing_offset' && node.name.includes('音画偏移')) ||
      (issue.type === 'dense_chord' && node.name.includes('双押')) ||
      (issue.type === 'hold_miss' && node.name.includes('长按'))
    );
  };

  const relatedNodes = issue ? getRelatedNodes(issue) : traceNodes;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ProjectSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/analysis')}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">结果追溯</h1>
              <p className="text-slate-400 text-sm">
                {issue ? `追溯问题: ${issue.description}` : '查看完整处理链路'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {issue && (
              <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <XCircle className="w-6 h-6 text-red-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{issue.description}</h3>
                    <p className="text-sm text-slate-400">时间: {formatTime(issue.time)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">类型:</span>
                    <span className="text-slate-300 ml-2">{issue.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">严重程度:</span>
                    <span className="text-slate-300 ml-2">{issue.severity}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">关联Note:</span>
                    <span className="text-slate-300 ml-2">{issue.relatedNotes.length}个</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Trace ID:</span>
                    <span className="text-slate-300 ml-2 font-mono text-xs">{issue.traceId.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                处理链路
              </h3>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />

                {traceNodes.map((node, index) => {
                  const typeInfo = nodeTypeConfig[node.type];
                  const statusInfo = statusConfig[node.status];
                  const TypeIcon = typeInfo?.icon || FileCode;
                  const StatusIcon = statusInfo.icon;
                  const isRelated = relatedNodes.some(n => n.id === node.id);

                  return (
                    <div key={node.id} className="relative mb-4">
                      <div
                        className={cn(
                          'ml-12 p-4 rounded-lg border transition-all duration-200',
                          statusInfo.bg,
                          statusInfo.border,
                          isRelated && 'ring-2 ring-indigo-500/50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                              <TypeIcon className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-white">{node.name}</h4>
                                <span className={cn(
                                  'text-xs px-2 py-0.5 rounded',
                                  statusInfo.bg,
                                  statusInfo.border,
                                  'border'
                                )}>
                                  <span className="flex items-center gap-1">
                                    <StatusIcon className="w-3 h-3" />
                                    {statusInfo.label}
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(node.timestamp)}
                                <span className="mx-1">|</span>
                                {typeInfo?.label || node.type}
                              </div>
                            </div>
                          </div>
                        </div>

                        {Object.keys(node.data).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-500 mb-2">节点数据:</p>
                            <pre className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(node.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      <div className={cn(
                        'absolute left-4 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        statusInfo.bg,
                        statusInfo.border
                      )}>
                        <StatusIcon className="w-3 h-3" />
                      </div>

                      {index < traceNodes.length - 1 && (
                        <div className={cn(
                          'absolute left-8 top-9 w-0.5 h-6',
                          node.status === 'error' ? 'bg-red-500/50' : 'bg-slate-600'
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-72 border-l border-slate-700 bg-slate-800/30 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-slate-300 mb-4">统计信息</h3>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-500 mb-1">总节点数</p>
                <p className="text-xl font-bold text-white">{traceNodes.length}</p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-xs text-emerald-400 mb-1">成功节点</p>
                <p className="text-xl font-bold text-emerald-400">
                  {traceNodes.filter(n => n.status === 'success').length}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs text-amber-400 mb-1">警告节点</p>
                <p className="text-xl font-bold text-amber-400">
                  {traceNodes.filter(n => n.status === 'warning').length}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-400 mb-1">失败节点</p>
                <p className="text-xl font-bold text-red-400">
                  {traceNodes.filter(n => n.status === 'error').length}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-slate-300 mb-3">失败路径高亮</h3>
              {traceNodes.filter(n => n.status === 'error').length === 0 ? (
                <p className="text-xs text-slate-500">无失败节点</p>
              ) : (
                <div className="space-y-2">
                  {traceNodes
                    .filter(n => n.status === 'error')
                    .map(node => (
                      <div
                        key={node.id}
                        className="p-2 rounded bg-red-500/10 border border-red-500/30"
                      >
                        <p className="text-xs text-red-400 font-medium">{node.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatTimestamp(node.timestamp)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
