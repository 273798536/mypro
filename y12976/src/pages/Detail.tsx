import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  Clock,
  ChevronRight,
  Play,
  PlusCircle,
  CheckCircle2,
  FileCode,
  GitCompare,
  Gauge,
  MessageSquare,
  History,
  AlertCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useApprovalStore } from '@/store/approvalStore';
import {
  ANOMALY_TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  OPERATION_TYPE_LABELS,
} from '@/types';
import type {
  AnomalyType,
  Severity,
  OperationType,
} from '@/types';
import { cn } from '@/lib/utils';
import Empty from '@/components/Empty';

const severityColors: Record<Severity, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

const severityBgColors: Record<Severity, string> = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-sky-50 border-sky-200 text-sky-700',
};

const anomalyTypeColors: Record<AnomalyType, string> = {
  pagination_unstable: 'bg-orange-100 text-orange-700',
  backup_gap: 'bg-red-100 text-red-700',
  schema_drift: 'bg-purple-100 text-purple-700',
  slow_query_risk: 'bg-amber-100 text-amber-700',
  breaking_change: 'bg-rose-100 text-rose-700',
};

const operationTypeColors: Record<OperationType, string> = {
  rerun: 'border-sky-400 bg-sky-50 text-sky-700',
  supplement: 'border-amber-400 bg-amber-50 text-amber-700',
  manual_confirm: 'border-emerald-400 bg-emerald-50 text-emerald-700',
};

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getScriptById, addOperation, addConclusion } = useApprovalStore();

  const [activeSection, setActiveSection] = useState('script');
  const [showOperationDialog, setShowOperationDialog] = useState<OperationType | null>(null);
  const [operationNote, setOperationNote] = useState('');
  const [operationResult, setOperationResult] = useState('');
  const [operator] = useState('张明（BI分析师）');
  const [newConclusion, setNewConclusion] = useState('');
  const [showConclusionDialog, setShowConclusionDialog] = useState(false);

  const script = id ? getScriptById(id) : undefined;

  if (!script) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Empty
          title="脚本不存在"
          description="请返回列表重新选择"
          actionText="返回列表"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  const handleOperation = (type: OperationType) => {
    if (!operationResult.trim()) return;

    addOperation(script.id, type, operator, operationNote, operationResult);
    setShowOperationDialog(null);
    setOperationNote('');
    setOperationResult('');
  };

  const handleAddConclusion = () => {
    if (!newConclusion.trim()) return;
    addConclusion(script.id, newConclusion);
    setShowConclusionDialog(false);
    setNewConclusion('');
  };

  const getLineHighlightRange = (lineRange?: string) => {
    if (!lineRange) return null;
    const match = lineRange.match(/L(\d+)(?:-L(\d+))?/);
    if (!match) return null;
    const start = parseInt(match[1]);
    const end = match[2] ? parseInt(match[2]) : start;
    return { start, end };
  };

  const sqlLines = script.sqlContent.split('\n');

  const anomalyHighlightRanges = script.anomalies
    .map((a) => getLineHighlightRange(a.lineRange))
    .filter(Boolean) as { start: number; end: number }[];

  const isLineHighlighted = (lineNum: number) => {
    return anomalyHighlightRanges.some(
      (range) => lineNum >= range.start && lineNum <= range.end
    );
  };

  const sections = [
    { id: 'script', label: '来源脚本', icon: FileCode },
    { id: 'anomalies', label: '异常清单', icon: AlertTriangle },
    { id: 'schema', label: 'Schema 对比', icon: GitCompare },
    { id: 'slowquery', label: '慢查询归因', icon: Gauge },
    { id: 'conclusions', label: '结论对比', icon: MessageSquare },
    { id: 'operations', label: '操作日志', icon: History },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-lg font-semibold text-stone-900 font-mono text-sm truncate">
                  {script.fileName}
                </h1>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    script.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : script.status === 'pending'
                      ? 'bg-stone-100 text-stone-700'
                      : script.status === 'manual_review'
                      ? 'bg-purple-50 text-purple-700'
                      : script.status === 'supplemented'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-sky-50 text-sky-700'
                  )}
                >
                  {STATUS_LABELS[script.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  来源材料: {script.sourceMaterial}
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {script.anomalies.length} 个异常
                </span>
                {script.conclusions.length > 1 && (
                  <span className="text-purple-600">
                    结论版本: v{script.conclusions[script.conclusions.length - 1].version}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <aside className="w-56 flex-shrink-0">
            <nav className="bg-white border border-stone-200 rounded-lg overflow-hidden sticky top-24">
              <div className="px-4 py-3 border-b border-stone-200">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  导航
                </p>
              </div>
              <div className="py-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors',
                      activeSection === section.id
                        ? 'bg-terracotta-50 text-terracotta-700 border-r-2 border-terracotta-600'
                        : 'text-stone-600 hover:bg-stone-50'
                    )}
                  >
                    <section.icon className="w-4 h-4" />
                    <span>{section.label}</span>
                    {section.id === 'anomalies' && script.anomalies.length > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        {script.anomalies.length}
                      </span>
                    )}
                    {section.id === 'conclusions' && script.conclusions.length > 1 && (
                      <span className="ml-auto px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        v{script.conclusions.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </nav>

            <div className="mt-4 bg-white border border-stone-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-200">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  快捷操作
                </p>
              </div>
              <div className="p-3 space-y-2">
                <button
                  onClick={() => setShowOperationDialog('rerun')}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm bg-sky-50 text-sky-700 border border-sky-200 rounded hover:bg-sky-100 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  重复运行
                </button>
                <button
                  onClick={() => setShowOperationDialog('supplement')}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  补录
                </button>
                <button
                  onClick={() => setShowOperationDialog('manual_confirm')}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  人工确认
                </button>
                <button
                  onClick={() => setShowConclusionDialog(true)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm bg-terracotta-50 text-terracotta-700 border border-terracotta-200 rounded hover:bg-terracotta-100 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  更新结论
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-6">
            {activeSection === 'script' && (
              <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-stone-500" />
                    <h2 className="font-medium text-stone-900">来源脚本</h2>
                  </div>
                  <span className="text-xs text-stone-500 font-mono">
                    {sqlLines.length} 行
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute top-3 right-3 px-2 py-1 bg-stone-800 text-stone-200 text-xs rounded font-mono">
                    {script.sourceMaterial}
                  </div>
                  <div className="overflow-auto max-h-[600px]">
                    <table className="w-full font-mono text-sm">
                      <tbody>
                        {sqlLines.map((line, index) => {
                          const lineNum = index + 1;
                          const highlighted = isLineHighlighted(lineNum);
                          return (
                            <tr
                              key={lineNum}
                              className={cn(
                                highlighted && 'bg-amber-50',
                                'hover:bg-stone-50'
                              )}
                            >
                              <td className="px-4 py-0.5 text-right text-stone-400 select-none w-12 border-r border-stone-100">
                                {lineNum}
                              </td>
                              <td className="px-4 py-0.5 whitespace-pre text-stone-700">
                                {line || '\u00A0'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {script.anomalies.some((a) => a.lineRange) && (
                  <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
                    <p className="text-xs text-amber-700 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      黄色高亮行标记了存在异常的代码位置
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'anomalies' && (
              <div className="space-y-4">
                <div className="bg-white border border-stone-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-stone-500" />
                    <h2 className="font-medium text-stone-900">异常清单</h2>
                  </div>
                </div>

                {script.anomalies.length === 0 ? (
                  <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                    <p className="text-stone-600 font-medium">未检测到异常</p>
                    <p className="text-sm text-stone-500 mt-1">脚本通过自动检测</p>
                  </div>
                ) : (
                  script.anomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className="bg-white border border-stone-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className={cn(
                          'px-4 py-3 border-b border-stone-200 flex items-start justify-between',
                          severityBgColors[anomaly.severity].replace(
                            /text-\w+-\d+/,
                            ''
                          )
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                              severityColors[anomaly.severity]
                            )}
                          />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-stone-900">
                                {anomaly.title}
                              </h3>
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-xs font-medium',
                                  anomalyTypeColors[anomaly.type]
                                )}
                              >
                                {ANOMALY_TYPE_LABELS[anomaly.type]}
                              </span>
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-xs font-medium border',
                                  severityBgColors[anomaly.severity]
                                )}
                              >
                                {SEVERITY_LABELS[anomaly.severity]}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-stone-500">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                来源: {anomaly.sourceMaterial}
                              </span>
                              {anomaly.lineRange && (
                                <span className="font-mono">
                                  行: {anomaly.lineRange}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-xs font-medium text-stone-500 mb-1">
                            问题描述
                          </p>
                          <p className="text-sm text-stone-700 leading-relaxed">
                            {anomaly.description}
                          </p>
                        </div>
                        <div className="border-l-4 border-terracotta-500 pl-4 py-2 bg-terracotta-50/50 rounded-r">
                          <p className="text-xs font-medium text-terracotta-700 mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            处理意见
                          </p>
                          <p className="text-sm text-stone-700 leading-relaxed">
                            {anomaly.handlingOpinion}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection === 'schema' && (
              <div className="space-y-4">
                <div className="bg-white border border-stone-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-stone-500" />
                    <h2 className="font-medium text-stone-900">Schema 对比</h2>
                  </div>
                </div>

                {!script.schemaDiff ? (
                  <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
                    <Info className="w-10 h-10 mx-auto mb-3 text-stone-400" />
                    <p className="text-stone-600 font-medium">无 Schema 变更</p>
                    <p className="text-sm text-stone-500 mt-1">
                      该脚本未检测到 Schema 结构变更
                    </p>
                  </div>
                ) : (
                  <>
                    {script.schemaDiff.judgmentChanged && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                        <p className="text-sm text-purple-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">判断已变更：</span>
                          Schema 对比后更新了风险判断，详情请参考结论对比
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-stone-100 border-b border-stone-200">
                          <p className="text-sm font-medium text-stone-700">变更前</p>
                        </div>
                        <div className="p-4 overflow-auto max-h-[400px]">
                          <pre className="font-mono text-xs text-stone-700 whitespace-pre-wrap">
                            {script.schemaDiff.before}
                          </pre>
                        </div>
                      </div>
                      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200">
                          <p className="text-sm font-medium text-emerald-700">变更后</p>
                        </div>
                        <div className="p-4 overflow-auto max-h-[400px]">
                          <pre className="font-mono text-xs text-stone-700 whitespace-pre-wrap">
                            {script.schemaDiff.after}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-200">
                        <p className="text-sm font-medium text-stone-700">变更项</p>
                      </div>
                      <div className="p-4">
                        <ul className="space-y-2">
                          {script.schemaDiff.changes.map((change, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm text-stone-700"
                            >
                              <ChevronRight className="w-4 h-4 text-terracotta-500 flex-shrink-0" />
                              {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeSection === 'slowquery' && (
              <div className="space-y-4">
                <div className="bg-white border border-stone-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-stone-500" />
                    <h2 className="font-medium text-stone-900">慢查询归因</h2>
                  </div>
                </div>

                {!script.slowQueryAttribution ? (
                  <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
                    <Info className="w-10 h-10 mx-auto mb-3 text-stone-400" />
                    <p className="text-stone-600 font-medium">无慢查询分析</p>
                    <p className="text-sm text-stone-500 mt-1">
                      该脚本未检测到慢查询风险
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-stone-200">
                          <p className="text-xs text-stone-500 mb-1">优化前耗时</p>
                          <p className="text-3xl font-semibold text-red-600 font-mono tabular-nums">
                            {script.slowQueryAttribution.beforeMs}
                            <span className="text-lg font-normal text-stone-500 ml-1">
                              ms
                            </span>
                          </p>
                        </div>
                        <div className="px-4 py-3 bg-red-50 border-t border-red-100">
                          <p className="text-xs text-red-700">扫描行数: 52,341</p>
                        </div>
                      </div>
                      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-stone-200">
                          <p className="text-xs text-stone-500 mb-1">优化后耗时</p>
                          <p className="text-3xl font-semibold text-emerald-600 font-mono tabular-nums">
                            {script.slowQueryAttribution.afterMs}
                            <span className="text-lg font-normal text-stone-500 ml-1">
                              ms
                            </span>
                          </p>
                        </div>
                        <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                          <p className="text-xs text-emerald-700">
                            性能提升:{' '}
                            {Math.round(
                              ((script.slowQueryAttribution.beforeMs -
                                script.slowQueryAttribution.afterMs) /
                                script.slowQueryAttribution.beforeMs) *
                                100
                            )}
                            %
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-200">
                        <p className="text-sm font-medium text-stone-700">查询语句</p>
                      </div>
                      <div className="p-4 bg-stone-50 overflow-auto">
                        <pre className="font-mono text-xs text-stone-700 whitespace-pre-wrap">
                          {script.slowQueryAttribution.query}
                        </pre>
                      </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-200">
                        <p className="text-sm font-medium text-stone-700">根因分析</p>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-stone-700 leading-relaxed">
                          {script.slowQueryAttribution.rootCause}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-200">
                        <p className="text-sm font-medium text-stone-700">前后差别</p>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-stone-700 leading-relaxed">
                          {script.slowQueryAttribution.beforeAfterDiff}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeSection === 'conclusions' && (
              <div className="space-y-4">
                <div className="bg-white border border-stone-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-stone-500" />
                      <h2 className="font-medium text-stone-900">结论对比</h2>
                    </div>
                    <button
                      onClick={() => setShowConclusionDialog(true)}
                      className="text-sm text-terracotta-600 hover:text-terracotta-700"
                    >
                      + 更新结论
                    </button>
                  </div>
                </div>

                {script.conclusions.length === 1 ? (
                  <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-700">
                          v{script.conclusions[0].version} · 当前结论
                        </span>
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {script.conclusions[0].createdAt}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-stone-700 leading-relaxed">
                        {script.conclusions[0].content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {script.conclusions.map((conclusion, index) => {
                      const isLatest = index === script.conclusions.length - 1;
                      return (
                        <div
                          key={conclusion.version}
                          className={cn(
                            'bg-white border rounded-lg overflow-hidden',
                            isLatest
                              ? 'border-emerald-300 ring-2 ring-emerald-100'
                              : 'border-stone-200 opacity-75'
                          )}
                        >
                          <div
                            className={cn(
                              'px-4 py-3 border-b',
                              isLatest
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-stone-50 border-stone-200'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  isLatest
                                    ? 'text-emerald-700'
                                    : 'text-stone-500'
                                )}
                              >
                                v{conclusion.version}
                                {isLatest && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded">
                                    最新
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-stone-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {conclusion.createdAt}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="text-sm text-stone-700 leading-relaxed">
                              {conclusion.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {script.conclusions.length > 1 && (
                  <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-stone-200">
                      <p className="text-sm font-medium text-stone-700">版本差异</p>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center">
                            <GitCompare className="w-4 h-4 text-stone-500" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-stone-700 leading-relaxed">
                            从 v1 到 v{script.conclusions.length}，判断从「
                            {script.conclusions[0].content.slice(0, 30)}...」更新为「
                            {script.conclusions[script.conclusions.length - 1].content.slice(0, 30)}...」。
                            {script.schemaDiff?.judgmentChanged &&
                              ' Schema 对比改变了原有判断。'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'operations' && (
              <div className="space-y-4">
                <div className="bg-white border border-stone-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
                    <History className="w-4 h-4 text-stone-500" />
                    <h2 className="font-medium text-stone-900">操作日志</h2>
                  </div>
                </div>

                {script.operations.length === 0 ? (
                  <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
                    <History className="w-10 h-10 mx-auto mb-3 text-stone-400" />
                    <p className="text-stone-600 font-medium">暂无操作记录</p>
                    <p className="text-sm text-stone-500 mt-1">
                      使用左侧快捷操作执行重复运行、补录或人工确认
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                    <div className="relative">
                      <div className="absolute left-6 top-0 bottom-0 w-px bg-stone-200" />
                      <div className="divide-y divide-stone-100">
                        {[...script.operations].reverse().map((operation) => (
                          <div
                            key={operation.id}
                            className="relative px-4 py-4"
                          >
                            <div
                              className={cn(
                                'absolute left-4 w-4 h-4 rounded-full border-2 bg-white',
                                operation.type === 'rerun'
                                  ? 'border-sky-500'
                                  : operation.type === 'supplement'
                                  ? 'border-amber-500'
                                  : 'border-emerald-500'
                              )}
                            />
                            <div className="ml-8">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded text-xs font-medium border',
                                    operationTypeColors[operation.type]
                                  )}
                                >
                                  {OPERATION_TYPE_LABELS[operation.type]}
                                </span>
                                <span className="text-sm text-stone-600">
                                  {operation.operator}
                                </span>
                                <span className="text-xs text-stone-400 ml-auto flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {operation.timestamp}
                                </span>
                              </div>
                              {operation.note && (
                                <div className="mb-2">
                                  <p className="text-xs text-stone-500 mb-1">备注</p>
                                  <p className="text-sm text-stone-700">
                                    {operation.note}
                                  </p>
                                </div>
                              )}
                              <div className="bg-stone-50 rounded px-3 py-2">
                                <p className="text-xs text-stone-500 mb-1">执行结果</p>
                                <p className="text-sm text-stone-700">
                                  {operation.result}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {showOperationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-stone-200">
              <h3 className="font-medium text-stone-900">
                {OPERATION_TYPE_LABELS[showOperationDialog]}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">操作人</label>
                <input
                  type="text"
                  value={operator}
                  disabled
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm bg-stone-50 text-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">备注说明</label>
                <textarea
                  value={operationNote}
                  onChange={(e) => setOperationNote(e.target.value)}
                  placeholder="输入操作备注..."
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">
                  执行结果 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={operationResult}
                  onChange={(e) => setOperationResult(e.target.value)}
                  placeholder="输入执行结果，必须填写"
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowOperationDialog(null);
                  setOperationNote('');
                  setOperationResult('');
                }}
                className="px-4 py-2 text-sm border border-stone-300 rounded hover:bg-stone-50"
              >
                取消
              </button>
              <button
                onClick={() => handleOperation(showOperationDialog)}
                disabled={!operationResult.trim()}
                className={cn(
                  'px-4 py-2 text-sm text-white rounded disabled:opacity-50 disabled:cursor-not-allowed',
                  showOperationDialog === 'rerun'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : showOperationDialog === 'supplement'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                确认{OPERATION_TYPE_LABELS[showOperationDialog]}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConclusionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-stone-200">
              <h3 className="font-medium text-stone-900">更新结论</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm text-stone-600 mb-1">
                新结论内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={newConclusion}
                onChange={(e) => setNewConclusion(e.target.value)}
                placeholder="输入新的结论，将创建新版本..."
                rows={5}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500"
              />
              <p className="text-xs text-stone-500 mt-2">
                将创建 v{script.conclusions.length + 1} 版本的结论
              </p>
            </div>
            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowConclusionDialog(false);
                  setNewConclusion('');
                }}
                className="px-4 py-2 text-sm border border-stone-300 rounded hover:bg-stone-50"
              >
                取消
              </button>
              <button
                onClick={handleAddConclusion}
                disabled={!newConclusion.trim()}
                className="px-4 py-2 text-sm bg-terracotta-600 text-white rounded hover:bg-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存结论
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
