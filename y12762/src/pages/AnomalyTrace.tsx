import { useState, useMemo } from 'react';
import { useBatchStore } from '@/store/useBatchStore';
import { useAnomalyStore } from '@/store/useAnomalyStore';
import { buildTraceChain, findAnomaliesByWeighingNumber } from '@/utils/trace/traceChain';
import type { Anomaly, AnomalySeverity, TraceNode, TraceChain } from '@/types';
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  FlaskConical,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const severityOrder: AnomalySeverity[] = ['critical', 'error', 'warning'];

const nodeTypeConfig: Record<string, {
  label: string;
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  border: string;
}> = {
  anomaly: {
    label: '异常节点',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300',
  },
  reagent: {
    label: '试剂节点',
    icon: FlaskConical,
    color: 'text-[#0d9488]',
    bg: 'bg-teal-50',
    border: 'border-teal-300',
  },
  weighing: {
    label: '称量单节点',
    icon: FileText,
    color: 'text-[#1e3a5f]',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
  },
  opinion: {
    label: '处理意见节点',
    icon: MessageSquare,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
  },
};

const severityConfig: Record<AnomalySeverity, {
  label: string;
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  dot: string;
}> = {
  critical: {
    label: '严重',
    icon: XCircle,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    dot: 'bg-red-600',
  },
  error: {
    label: '错误',
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
  },
  warning: {
    label: '警告',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
  },
};

const typeLabels: Record<string, string> = {
  ph_out_of_range: 'pH值越界',
  concentration_error: '浓度异常',
  temperature_abnormal: '温度异常',
  formula_error: '化学式错误',
};

function TraceNodeCard({ node, index, total }: { node: TraceNode; index: number; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = nodeTypeConfig[node.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center border-2 shadow-sm',
            config.bg,
            config.border
          )}
        >
          <Icon size={20} className={config.color} />
        </div>
        {index < total - 1 && (
          <div className="w-0.5 h-8 bg-gray-200 my-1" />
        )}
      </div>

      <div className="ml-4 flex-1 pb-6">
        <div
          className={cn(
            'rounded-xl border overflow-hidden transition-all',
            expanded ? 'shadow-md' : 'shadow-sm',
            config.border,
            config.bg
          )}
        >
          <div
            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{config.label}</span>
                <span className="text-xs text-gray-300">#{index + 1}</span>
              </div>
              <h4 className={cn('font-semibold mt-0.5', config.color)}>{node.title}</h4>
            </div>
            {node.data && (
              <div className="text-gray-400">
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            )}
          </div>

          <div className="px-4 pb-3">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{node.description}</p>
          </div>

          {expanded && node.data && (
            <div className="px-4 pb-4 border-t border-white/60">
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Object.entries(node.data).map(([key, value]) => {
                  if (value === undefined || value === null) return null;
                  const displayKey = formatKey(key);
                  let displayValue: string;
                  if (typeof value === 'number') {
                    displayValue = String(value);
                  } else if (typeof value === 'boolean') {
                    displayValue = value ? '是' : '否';
                  } else {
                    displayValue = String(value);
                  }
                  return (
                    <div key={key} className="flex gap-2">
                      <span className="text-gray-500 min-w-[80px]">{displayKey}：</span>
                      <span className="text-gray-700 break-all">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    id: '编号',
    name: '名称',
    formula: '化学式',
    molarMass: '摩尔质量',
    concentration: '浓度值',
    concentrationUnit: '浓度单位',
    temperature: '温度',
    phValue: 'pH值',
    solubility: '溶解度',
    weighingRecordId: '称量单ID',
    recordNumber: '单号',
    operator: '操作人',
    weight: '重量',
    weighedAt: '称量时间',
    remarks: '备注',
    content: '内容',
    handler: '处理人',
    handledAt: '处理时间',
    status: '状态',
    severity: '严重程度',
    actualValue: '实际值',
    expectedMin: '期望最小值',
    expectedMax: '期望最大值',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    author: '记录人',
  };
  return keyMap[key] || key;
}

export default function AnomalyTrace() {
  const { batches, currentBatch, currentBatchId, setCurrentBatch } = useBatchStore();
  const { anomalies, selectedAnomalyId, selectAnomaly } = useAnomalyStore();

  const [searchNumber, setSearchNumber] = useState('');
  const [searchResult, setSearchResult] = useState<Anomaly[] | null>(null);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);

  const sortedAnomalies = useMemo(() => {
    if (!currentBatch) return [];
    const reagentIds = currentBatch.reagents.map((r) => r.id);
    const batchAnomalies = anomalies.filter((a) => reagentIds.includes(a.reagentId));
    return [...batchAnomalies].sort(
      (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    );
  }, [currentBatch, anomalies]);

  const selectedAnomaly = useMemo(() => {
    if (searchResult && searchResult.length > 0 && selectedAnomalyId) {
      return searchResult.find((a) => a.id === selectedAnomalyId) || null;
    }
    return anomalies.find((a) => a.id === selectedAnomalyId) || null;
  }, [anomalies, selectedAnomalyId, searchResult]);

  const traceChain: TraceChain | null = useMemo(() => {
    if (!selectedAnomaly || !currentBatch) return null;
    return buildTraceChain(selectedAnomaly, currentBatch);
  }, [selectedAnomaly, currentBatch]);

  const displayAnomalies = searchResult || sortedAnomalies;

  const handleSearch = () => {
    if (!searchNumber.trim() || !currentBatch) {
      setSearchResult(null);
      return;
    }
    const found = findAnomaliesByWeighingNumber(searchNumber.trim(), currentBatch, anomalies);
    setSearchResult(found);
    if (found.length > 0) {
      selectAnomaly(found[0].id);
    }
  };

  const clearSearch = () => {
    setSearchNumber('');
    setSearchResult(null);
    selectAnomaly(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">异常追溯</h1>
        <p className="text-gray-500 mt-1">追溯异常数据来源链路，按严重程度查看详情</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative min-w-[240px]">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">选择批次</label>
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg hover:border-gray-300 bg-white"
              onClick={() => setBatchDropdownOpen(!batchDropdownOpen)}
            >
              <span className="text-gray-800 flex items-center gap-2">
                <Layers size={16} className="text-[#0d9488]" />
                {currentBatch ? currentBatch.name : '请选择批次'}
              </span>
              <ChevronDown size={18} className="text-gray-400" />
            </button>
            {batchDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {batches.map((batch) => (
                  <button
                    key={batch.id}
                    className={cn(
                      'w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors',
                      currentBatchId === batch.id && 'bg-teal-50 text-[#0d9488]'
                    )}
                    onClick={() => {
                      setCurrentBatch(batch.id);
                      setBatchDropdownOpen(false);
                      clearSearch();
                    }}
                  >
                    {batch.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[280px]">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              按称量单号反查异常
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                  placeholder="输入称量单号，如 WL-2026-0601-001"
                />
              </div>
              <button
                className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d4f7a] transition-colors font-medium"
                onClick={handleSearch}
              >
                搜索
              </button>
              {searchResult && (
                <button
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={clearSearch}
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </div>

        {searchResult && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {searchResult.length > 0
              ? `找到 ${searchResult.length} 条关联异常`
              : '未找到匹配的异常记录'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              异常列表
              <span className="text-sm font-normal text-gray-500">
                （共 {displayAnomalies.length} 条）
              </span>
            </h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-[700px] overflow-y-auto">
            {displayAnomalies.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <AlertTriangle size={40} className="mx-auto mb-3 text-gray-300" />
                <p>
                  {searchResult ? '无匹配的异常记录' : '当前批次暂无异常数据'}
                </p>
              </div>
            ) : (
              displayAnomalies.map((anomaly) => {
                const config = severityConfig[anomaly.severity];
                const Icon = config.icon;
                const isSelected = selectedAnomalyId === anomaly.id;
                return (
                  <button
                    key={anomaly.id}
                    className={cn(
                      'w-full text-left p-4 hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-teal-50/50'
                    )}
                    onClick={() => selectAnomaly(anomaly.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
                        <Icon size={16} className={config.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800 text-sm">
                            {typeLabels[anomaly.type] || '数据异常'}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-medium text-white',
                              config.dot
                            )}
                          >
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {anomaly.userFriendlyMessage}
                        </p>
                      </div>
                      {isSelected && (
                        <ArrowRight size={16} className="text-[#0d9488] flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-[#1e3a5f]" />
              追溯链路
            </h2>
          </div>
          <div className="p-5">
            {!traceChain ? (
              <div className="p-16 text-center text-gray-400">
                <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>请从左侧选择一个异常查看追溯链路</p>
              </div>
            ) : (
              <div>
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">当前选中异常</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        severityConfig[traceChain.nodes[0]?.data?.severity as AnomalySeverity]?.dot || 'bg-gray-400'
                      )}
                    />
                    <span className="font-semibold text-gray-800">
                      {traceChain.nodes[0]?.title || '异常'}
                    </span>
                  </div>
                </div>

                <div className="space-y-0">
                  {traceChain.nodes.map((node, idx) => (
                    <TraceNodeCard
                      key={node.id}
                      node={node}
                      index={idx}
                      total={traceChain.nodes.length}
                    />
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="font-medium text-gray-700 mb-3">链路摘要</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {traceChain.nodes.map((node, idx) => {
                      const config = nodeTypeConfig[node.type];
                      return (
                        <div key={node.id} className="flex items-center gap-2">
                          <span
                            className={cn(
                              'px-3 py-1.5 rounded-lg border font-medium',
                              config.bg,
                              config.border,
                              config.color
                            )}
                          >
                            {config.label}
                          </span>
                          {idx < traceChain.nodes.length - 1 && (
                            <ArrowRight size={14} className="text-gray-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
