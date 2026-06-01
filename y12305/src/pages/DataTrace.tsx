import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  GitBranch,
  ArrowLeft,
  ChevronRight,
  FileText,
  Zap,
  Calculator,
  AlertTriangle,
  Info,
  Database,
  ArrowRight,
  FileJson,
  Calendar,
  Tag,
} from 'lucide-react';
import type { TraceNode, TariffTable, UsageRecord } from '../../shared/types';
import { api } from '../utils/api';

type NodeIconType = 'result' | 'tier_calc' | 'input' | 'tariff' | 'warning';

const nodeIconMap: Record<NodeIconType, typeof Calculator> = {
  result: Calculator,
  tier_calc: Zap,
  input: FileText,
  tariff: Database,
  warning: AlertTriangle,
};

const nodeColorMap: Record<NodeIconType, string> = {
  result: 'bg-brand text-white',
  tier_calc: 'bg-blue-500 text-white',
  input: 'bg-emerald-500 text-white',
  tariff: 'bg-purple-500 text-white',
  warning: 'bg-amber-500 text-white',
};

const nodeBgMap: Record<NodeIconType, string> = {
  result: 'bg-brand/5 border-brand/20',
  tier_calc: 'bg-blue-50 border-blue-200',
  input: 'bg-emerald-50 border-emerald-200',
  tariff: 'bg-purple-50 border-purple-200',
  warning: 'bg-amber-50 border-amber-200',
};

export function DataTrace() {
  const { versionId } = useParams<{ versionId: string }>();
  const [searchParams] = useSearchParams();
  const warningTraceId = searchParams.get('warning');

  const loadVersionDetail = useAppStore((state) => state.loadVersionDetail);
  const currentVersion = useAppStore((state) => state.currentVersion);
  const [traceTree, setTraceTree] = useState<TraceNode | null>(null);
  const [sources, setSources] = useState<{
    tariff: TariffTable;
    usageRecord: UsageRecord;
  } | null>(null);
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [warningSource, setWarningSource] = useState<unknown>(null);

  useEffect(() => {
    if (versionId) {
      loadVersionDetail(versionId);
      loadTraceData(versionId);
    }
  }, [versionId]);

  useEffect(() => {
    if (warningTraceId && versionId && traceTree) {
      loadWarningSource(versionId, warningTraceId);
    }
  }, [warningTraceId, versionId, traceTree]);

  const loadTraceData = async (id: string) => {
    setLoading(true);
    try {
      const [traceResult, sourcesResult] = await Promise.all([
        api.trace.getTree(id),
        api.trace.getSources(id),
      ]);
      setTraceTree(traceResult.traceTree);
      if ('tariff' in sourcesResult && 'usageRecord' in sourcesResult) {
        setSources({
          tariff: sourcesResult.tariff,
          usageRecord: sourcesResult.usageRecord,
        });
      }
      if (traceResult.traceTree) {
        expandAllNodes(traceResult.traceTree);
      }
    } catch (err) {
      console.error('加载溯源数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWarningSource = async (versionId: string, traceId: string) => {
    try {
      const result = await api.trace.getWarningSource(versionId, traceId);
      setWarningSource(result);
    } catch (err) {
      console.error('加载警告来源失败:', err);
    }
  };

  const expandAllNodes = (node: TraceNode) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.add(node.id);
      node.children.forEach((child) => expandAllNodes(child));
      return next;
    });
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const tracePath = useMemo(() => {
    if (!traceTree || !selectedNode) return null;

    const findPath = (node: TraceNode, targetId: string, path: TraceNode[]): TraceNode[] | null => {
      const currentPath = [...path, node];
      if (node.id === targetId) return currentPath;

      for (const child of node.children) {
        const result = findPath(child, targetId, currentPath);
        if (result) return result;
      }
      return null;
    };

    return findPath(traceTree, selectedNode.id, []);
  }, [traceTree, selectedNode]);

  if (!versionId) {
    return <div className="text-center py-12 text-slate-500">缺少版本ID参数</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/versions"
          className="p-2 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-brand" />
            数据溯源
          </h2>
          <p className="text-slate-500 mt-1">
            {currentVersion ? (
              <>
                版本: <span className="font-medium text-slate-700">{currentVersion.name}</span>
                <span className="mx-2 text-slate-300">|</span>
                创建于 {new Date(currentVersion.createdAt).toLocaleString('zh-CN')}
              </>
            ) : (
              '加载中...'
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {warningSource && (
            <div className="card p-6 bg-amber-50 border-amber-200">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" />
                异常来源详情
              </h3>
              <WarningSourceDetail source={warningSource} />
            </div>
          )}

          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-brand" />
              计算溯源树
            </h3>

            {loading ? (
              <div className="text-center py-12 text-slate-500">加载中...</div>
            ) : traceTree ? (
              <div className="space-y-2">
                <TraceTreeNode
                  node={traceTree}
                  level={0}
                  expandedNodes={expandedNodes}
                  selectedNodeId={selectedNode?.id}
                  onToggle={toggleNode}
                  onSelect={setSelectedNode}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">暂无溯源数据</div>
            )}
          </div>

          {tracePath && tracePath.length > 1 && (
            <div className="card p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-brand" />
                追溯路径
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {tracePath.map((node, index) => {
                  const Icon = nodeIconMap[node.type as NodeIconType] || Info;
                  return (
                    <div key={node.id} className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                          selectedNode?.id === node.id
                            ? 'bg-brand text-white border-brand'
                            : nodeBgMap[node.type as NodeIconType]
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{node.label}</span>
                      </div>
                      {index < tracePath.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selectedNode && (
            <div className="card p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-brand" />
                节点详情
              </h3>
              <NodeDetail node={selectedNode} />
            </div>
          )}

          {sources && (
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-purple-500" />
                  电价表来源
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">名称</span>
                    <span className="font-medium text-slate-800">{sources.tariff.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">有效期</span>
                    <span className="font-mono text-slate-800">
                      {sources.tariff.effectiveFrom} ~ {sources.tariff.effectiveTo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">状态</span>
                    <span className={sources.tariff.isExpired ? 'badge-warning' : 'badge-success'}>
                      {sources.tariff.isExpired ? '已过期' : '生效中'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500">档位</span>
                    <div className="text-right space-y-1">
                      {sources.tariff.tiers.map((tier) => (
                        <div key={tier.tierId} className="font-mono text-xs text-slate-700">
                          {tier.tierName}: {tier.pricePerKwh}元/kWh
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-500" />
                  用电记录来源
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      账单日期
                    </span>
                    <span className="font-mono text-slate-800">
                      {sources.usageRecord.recordDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">总电费</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ¥{sources.usageRecord.totalBill.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">峰时用量</span>
                    <span className="font-mono text-slate-800">
                      {sources.usageRecord.peakUsage ?? '-'} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">谷时用量</span>
                    <span className="font-mono text-slate-800">
                      {sources.usageRecord.valleyUsage ?? '-'} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">平时用量</span>
                    <span className="font-mono text-slate-800">
                      {sources.usageRecord.flatUsage ?? '-'} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">总用量</span>
                    <span className="font-mono text-slate-800">
                      {sources.usageRecord.totalUsage ?? '-'} kWh
                    </span>
                  </div>
                  {sources.usageRecord.customerNote && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1 mb-1">
                        <Tag className="w-3 h-3" />
                        客户备注
                      </span>
                      <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                        {sources.usageRecord.customerNote}
                      </p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <FileJson className="w-3 h-3" />
                      来源文件
                    </span>
                    <p className="text-sm text-slate-700 font-mono">
                      {sources.usageRecord.sourceFile}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TraceTreeNodeProps {
  node: TraceNode;
  level: number;
  expandedNodes: Set<string>;
  selectedNodeId: string | undefined;
  onToggle: (nodeId: string) => void;
  onSelect: (node: TraceNode) => void;
}

function TraceTreeNode({
  node,
  level,
  expandedNodes,
  selectedNodeId,
  onToggle,
  onSelect,
}: TraceTreeNodeProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const Icon = nodeIconMap[node.type as NodeIconType] || Info;
  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
          isSelected
            ? 'bg-brand/10 border-brand ring-1 ring-brand'
            : nodeBgMap[node.type as NodeIconType]
        }`}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren && (
          <button
            className="p-1 hover:bg-white/50 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronRight className="w-4 h-4 text-slate-500 rotate-90" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div className={`p-1.5 rounded-md ${nodeColorMap[node.type as NodeIconType]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 text-sm">{node.label}</div>
          {node.description && (
            <div className="text-xs text-slate-500 mt-0.5">{node.description}</div>
          )}
          {node.formula && (
            <div className="text-xs font-mono text-slate-600 mt-1 bg-white/50 px-2 py-1 rounded truncate">
              {node.formula}
            </div>
          )}
        </div>

        {node.value !== undefined && node.value !== null && (
          <div className="text-right flex-shrink-0">
            {typeof node.value === 'object' ? (
              <div className="text-xs text-slate-500 font-mono">
                {JSON.stringify(node.value).slice(0, 40)}...
              </div>
            ) : (
              <div className="text-sm font-mono font-semibold text-slate-700">
                {String(node.value)}
              </div>
            )}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TraceTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NodeDetailProps {
  node: TraceNode;
}

function NodeDetail({ node }: NodeDetailProps) {
  const typeLabels: Record<string, string> = {
    result: '计算结果',
    tier_calc: '档位计算',
    input: '输入数据',
    tariff: '电价配置',
    warning: '异常警告',
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wide">节点类型</label>
        <div className="font-medium text-slate-800 mt-1">
          {typeLabels[node.type] || node.type}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wide">节点ID</label>
        <div className="font-mono text-sm text-slate-700 mt-1">{node.id}</div>
      </div>

      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wide">数值</label>
        <div className="mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all">
            {typeof node.value === 'object'
              ? JSON.stringify(node.value, null, 2)
              : String(node.value)}
          </pre>
        </div>
      </div>

      {node.formula && (
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide">计算公式</label>
          <div className="mt-1 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm font-mono text-blue-800 break-all">{node.formula}</p>
          </div>
        </div>
      )}

      {node.sourceRef && (
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide">数据来源</label>
          <div className="font-mono text-sm text-slate-700 mt-1 bg-slate-50 px-2 py-1 rounded">
            {node.sourceRef}
          </div>
        </div>
      )}

      {node.description && (
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide">说明</label>
          <div className="text-sm text-slate-700 mt-1">{node.description}</div>
        </div>
      )}

      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wide">子节点数</label>
        <div className="font-medium text-slate-800 mt-1">{node.children.length} 个</div>
      </div>
    </div>
  );
}

interface WarningSourceDetailProps {
  source: unknown;
}

function WarningSourceDetail({ source }: WarningSourceDetailProps) {
  const s = source as {
    warning?: { type: string; severity: string; message: string; sourceField: string };
    sourceData?: {
      type: string;
      recordId?: string;
      recordDate?: string;
      sourceFile?: string;
      field: string;
      value: unknown;
      customerNote?: string;
      tariffId?: string;
      tariffName?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
    };
    versionInfo?: { name: string; createdAt: string };
  };

  if (!s.warning || !s.sourceData) return null;

  return (
    <div className="space-y-3 text-sm">
      <div className="bg-white rounded-lg p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-800">{s.warning.message}</div>
            <div className="text-xs text-amber-600 mt-1">
              类型: {s.warning.type} | 级别: {s.warning.severity}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <div className="text-xs text-amber-600 mb-1">异常字段</div>
          <div className="font-mono text-amber-800 font-semibold">{s.warning.sourceField}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <div className="text-xs text-amber-600 mb-1">异常值</div>
          <div className="font-mono text-amber-800 font-semibold">
            {String(s.sourceData.value)}
          </div>
        </div>
      </div>

      {s.sourceData.type === 'usage' && (
        <div className="bg-white rounded-lg p-4 border border-amber-200">
          <div className="text-xs text-amber-600 mb-2">原始记录信息</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">记录ID</span>
              <span className="font-mono text-slate-700">{s.sourceData.recordId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">账单日期</span>
              <span className="font-mono text-slate-700">{s.sourceData.recordDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">来源文件</span>
              <span className="font-mono text-slate-700">{s.sourceData.sourceFile}</span>
            </div>
            {s.sourceData.customerNote && (
              <div className="pt-2 mt-2 border-t border-slate-100">
                <span className="text-slate-500">客户备注:</span>
                <p className="text-amber-700 mt-1">{s.sourceData.customerNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {s.sourceData.type === 'tariff' && (
        <div className="bg-white rounded-lg p-4 border border-amber-200">
          <div className="text-xs text-amber-600 mb-2">电价表信息</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">电价表ID</span>
              <span className="font-mono text-slate-700">{s.sourceData.tariffId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">名称</span>
              <span className="font-medium text-slate-700">{s.sourceData.tariffName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">有效期</span>
              <span className="font-mono text-slate-700">
                {s.sourceData.effectiveFrom} ~ {s.sourceData.effectiveTo}
              </span>
            </div>
          </div>
        </div>
      )}

      {s.versionInfo && (
        <div className="text-xs text-slate-500 pt-2 border-t border-amber-200">
          核算版本: {s.versionInfo.name} (创建于 {new Date(s.versionInfo.createdAt).toLocaleString('zh-CN')})
        </div>
      )}
    </div>
  );
}
