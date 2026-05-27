import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Eye,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  formatDate,
  getSeverityColor,
  getSeverityText,
} from '../utils/calculationEngine';
import type { Anomaly, AnomalySeverity, AnomalyType } from '../types';

const SEVERITY_OPTIONS: { value: AnomalySeverity | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'critical', label: '严重' },
  { value: 'warning', label: '警告' },
  { value: 'info', label: '提示' },
];

const STATUS_OPTIONS: { value: 'all' | 'resolved' | 'pending'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '未解决' },
  { value: 'resolved', label: '已解决' },
];

const TYPE_OPTIONS: { value: AnomalyType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'gift_not_returned', label: '赠品未扣' },
  { value: 'fee_payer_changed', label: '手续费变更' },
  { value: 'partial_treatment', label: '疗程部分完成' },
  { value: 'data_mismatch', label: '数据不一致' },
  { value: 'unverified_treatment', label: '未核销项目' },
];

const SEVERITY_BORDER_COLOR: Record<AnomalySeverity, string> = {
  critical: 'border-l-red-500',
  warning: 'border-l-orange-500',
  info: 'border-l-blue-500',
};

const SEVERITY_BADGE_BG: Record<AnomalySeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-orange-100 text-orange-700',
  info: 'bg-blue-100 text-blue-700',
};

const SEVERITY_ICON: Record<AnomalySeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_STAT_BG: Record<AnomalySeverity, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-orange-50 text-orange-700 border-orange-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

function renderRelatedData(data: Record<string, unknown>) {
  return (
    <div className="mt-3 rounded-md bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4">
          <span className="text-gray-500">{key}</span>
          <span className="text-gray-800 font-medium truncate">
            {Array.isArray(value) ? value.join('、') : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnomaliesPage() {
  const anomalies = useStore((s) => s.anomalies);
  const resolveAnomaly = useStore((s) => s.resolveAnomaly);

  const [keyword, setKeyword] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'resolved' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<AnomalyType | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [resolveOpenId, setResolveOpenId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const stats = useMemo(() => {
    const total = anomalies.length;
    const critical = anomalies.filter((a) => a.severity === 'critical').length;
    const warning = anomalies.filter((a) => a.severity === 'warning').length;
    const info = anomalies.filter((a) => a.severity === 'info').length;
    return { total, critical, warning, info };
  }, [anomalies]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return anomalies.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (statusFilter === 'resolved' && !a.isResolved) return false;
      if (statusFilter === 'pending' && a.isResolved) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (kw) {
        const hit =
          a.title.toLowerCase().includes(kw) ||
          a.description.toLowerCase().includes(kw);
        if (!hit) return false;
      }
      return true;
    });
  }, [anomalies, keyword, severityFilter, statusFilter, typeFilter]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openResolve = (id: string) => {
    setResolveOpenId(id);
    setResolveNote('');
  };

  const closeResolve = () => {
    setResolveOpenId(null);
    setResolveNote('');
  };

  const submitResolve = (id: string) => {
    if (!resolveNote.trim()) return;
    resolveAnomaly(id, resolveNote.trim());
    closeResolve();
  };

  const statItems: {
    key: 'total' | 'critical' | 'warning' | 'info';
    label: string;
    icon: typeof AlertCircle;
    severity?: AnomalySeverity;
  }[] = [
    { key: 'total', label: '异常总数', icon: AlertCircle },
    { key: 'critical', label: '严重异常', icon: AlertCircle, severity: 'critical' },
    { key: 'warning', label: '警告异常', icon: AlertTriangle, severity: 'warning' },
    { key: 'info', label: '提示异常', icon: Info, severity: 'info' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shadow-sm">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">异常监控中心</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              实时监控退款计算过程中的异常情况
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          const value = stats[item.key];
          const statBg = item.severity
            ? SEVERITY_STAT_BG[item.severity]
            : 'bg-gray-50 text-gray-700 border-gray-200';
          return (
            <div
              key={item.key}
              className={`rounded-xl border ${statBg} p-4 flex items-center justify-between transition-all hover:shadow-md`}
            >
              <div>
                <div className="text-sm font-medium opacity-80">{item.label}</div>
                <div className="text-3xl font-bold mt-1">{value}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium text-gray-700">筛选</span>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索异常标题或描述..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:bg-white transition-all"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as AnomalySeverity | 'all')}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:bg-white transition-all"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              严重程度：{opt.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'resolved' | 'pending')}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:bg-white transition-all"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              状态：{opt.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AnomalyType | 'all')}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:bg-white transition-all"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              类型：{opt.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-lg font-semibold text-gray-800">暂无符合条件的异常</div>
          <div className="text-sm text-gray-500 mt-1">
            请尝试调整筛选条件，或查看其他合同数据
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((anomaly) => {
            const SeverityIcon = SEVERITY_ICON[anomaly.severity];
            const expanded = !!expandedIds[anomaly.id];
            const isResolveOpen = resolveOpenId === anomaly.id;
            return (
              <div
                key={anomaly.id}
                className={`bg-white rounded-xl border border-gray-200 border-l-4 ${SEVERITY_BORDER_COLOR[anomaly.severity]} p-5 transition-all hover:shadow-md hover:border-l-[5px] ${anomaly.isResolved ? 'opacity-80' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${SEVERITY_BADGE_BG[anomaly.severity]}`}
                    >
                      <SeverityIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {anomaly.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_BADGE_BG[anomaly.severity]}`}
                        >
                          {getSeverityText(anomaly.severity)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            anomaly.isResolved
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {anomaly.isResolved ? '已解决' : '待处理'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {anomaly.description}
                      </p>
                      {anomaly.relatedData && renderRelatedData(anomaly.relatedData)}
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>检测时间：{formatDate(anomaly.detectedTime)}</span>
                        {anomaly.isResolved && anomaly.resolvedTime && (
                          <span className="ml-2">
                            解决时间：{formatDate(anomaly.resolvedTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleExpanded(anomaly.id)}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {expanded ? '收起建议' : '查看建议'}
                  </button>
                  <div className="flex items-center gap-2">
                    {anomaly.isResolved ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        已解决
                      </span>
                    ) : (
                      <button
                        onClick={() => openResolve(anomaly.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        标记解决
                      </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 rounded-md bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900 leading-relaxed">
                    <div className="font-medium mb-1 flex items-center gap-1.5">
                      <Info className="w-4 h-4" />
                      处理建议
                    </div>
                    <div>{anomaly.suggestion}</div>
                    {anomaly.isResolved && anomaly.resolutionNote && (
                      <div className="mt-3 pt-3 border-t border-blue-200/60 text-xs text-blue-700">
                        解决备注：{anomaly.resolutionNote}
                      </div>
                    )}
                  </div>
                )}

                {isResolveOpen && (
                  <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-800">
                        添加解决备注
                      </div>
                      <button
                        onClick={closeResolve}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      rows={2}
                      placeholder="请输入解决说明..."
                      className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={closeResolve}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => submitResolve(anomaly.id)}
                        disabled={!resolveNote.trim()}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        确认解决
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
