import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import {
  FileText,
  Search,
  Filter,
  Clock,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Package,
  MessageSquare,
  Download,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TYPE_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string; icon: typeof FileText }> = {
  create: { label: '创建', dotColor: 'bg-sky-500', bgColor: 'bg-sky-50', textColor: 'text-sky-700', icon: Package },
  update: { label: '更新', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700', icon: RotateCcw },
  confirm: { label: '确认', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', icon: CheckCircle },
  export: { label: '导出', dotColor: 'bg-violet-500', bgColor: 'bg-violet-50', textColor: 'text-violet-700', icon: Download },
  rule_change: { label: '规则变更', dotColor: 'bg-rose-500', bgColor: 'bg-rose-50', textColor: 'text-rose-700', icon: Shield },
  note: { label: '备注', dotColor: 'bg-gray-400', bgColor: 'bg-gray-50', textColor: 'text-gray-600', icon: MessageSquare },
};

const OPERATION_TYPES = [
  { value: '', label: '全部' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'confirm', label: '确认' },
  { value: 'export', label: '导出' },
  { value: 'rule_change', label: '规则变更' },
  { value: 'note', label: '备注' },
];

const OPERATORS = [
  { value: '', label: '全部' },
  { value: '系统', label: '系统' },
  { value: '李结算', label: '李结算' },
  { value: '王海波', label: '王海波' },
  { value: '张晓东', label: '张晓东' },
  { value: '陈明', label: '陈明' },
  { value: '赵工', label: '赵工' },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
}

export default function Audit() {
  const { operationLogs, rules, containers } = useStore();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [expandedRuleChangeIds, setExpandedRuleChangeIds] = useState<Set<string>>(new Set());

  const toggleRuleChangeExpand = (id: string) => {
    setExpandedRuleChangeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredLogs = useMemo(() => {
    return [...operationLogs]
      .sort((a, b) => b.operatedAt.localeCompare(a.operatedAt))
      .filter((log) => {
        if (typeFilter && log.operationType !== typeFilter) return false;
        if (operatorFilter && log.operator !== operatorFilter) return false;
        if (searchText) {
          const q = searchText.toLowerCase();
          const matchContainerId = log.containerId?.toLowerCase().includes(q) ?? false;
          const matchDetail = log.detail.toLowerCase().includes(q);
          if (!matchContainerId && !matchDetail) return false;
        }
        return true;
      });
  }, [operationLogs, searchText, typeFilter, operatorFilter]);

  const stats = useMemo(() => {
    const total = operationLogs.length;
    const ruleChangeCount = operationLogs.filter((l) => l.operationType === 'rule_change').length;
    const uniqueContainers = new Set(operationLogs.filter((l) => l.containerId).map((l) => l.containerId!)).size;
    return { total, ruleChangeCount, uniqueContainers };
  }, [operationLogs]);

  const allRuleChanges = useMemo(() => {
    const changes: Array<{
      ruleName: string;
      changeLog: import('@/types').RuleChangeLog;
    }> = [];
    for (const rule of rules) {
      for (const cl of rule.changeLogs) {
        changes.push({ ruleName: rule.ruleName, changeLog: cl });
      }
    }
    return changes.sort((a, b) => b.changeLog.changedAt.localeCompare(a.changeLog.changedAt));
  }, [rules]);

  const getContainerNo = (containerId: string) => {
    const c = containers.find((ct) => ct.id === containerId);
    return c?.containerNo ?? containerId;
  };

  const handleReset = () => {
    setSearchText('');
    setTypeFilter('');
    setOperatorFilter('');
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-port-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-port-500">证据追踪中心</h1>
            <p className="text-sm text-gray-500">完整审计链，所有操作留痕可追溯</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索箱ID / 操作详情..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-port-400 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-port-400"
              >
                {OPERATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-port-400"
              >
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">操作总数</p>
              <p className="text-xl font-bold text-port-500">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">规则变更次数</p>
              <p className="text-xl font-bold text-port-500">{stats.ruleChangeCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">涉及箱数</p>
              <p className="text-xl font-bold text-port-500">{stats.uniqueContainers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-port-500 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            操作日志时间线
          </h2>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">暂无匹配的操作记录</p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {filteredLogs.map((log) => {
                  const config = TYPE_CONFIG[log.operationType] ?? TYPE_CONFIG.note;
                  const IconComp = config.icon;
                  const isRuleChange = log.operationType === 'rule_change';
                  return (
                    <div key={log.id} className="relative">
                      <div
                        className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white ${config.dotColor} shadow-sm`}
                      />
                      <div
                        className={`ml-2 rounded-lg border p-4 ${
                          isRuleChange
                            ? 'border-rose-200 border-l-4 bg-rose-50/30'
                            : 'border-gray-100 bg-gray-50/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.textColor}`}
                              >
                                {isRuleChange && <AlertTriangle className="w-3 h-3" />}
                                <IconComp className="w-3 h-3" />
                                {config.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed">{log.detail}</p>
                            {log.note && (
                              <p className="mt-1.5 text-xs text-gray-400 italic flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {log.note}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-port-500 text-white text-xs flex items-center justify-center font-medium">
                                {log.operator.charAt(0)}
                              </div>
                              <span className="text-xs text-gray-500">{log.operator}</span>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">
                              {formatDateTime(log.operatedAt)}
                            </span>
                          </div>
                        </div>
                        {log.containerId && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <Link
                              to={`/container/${log.containerId}`}
                              className="inline-flex items-center gap-1 text-xs text-port-400 hover:text-port-500 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              查看集装箱
                              <span className="text-gray-400 font-mono">({log.containerId})</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-port-500 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            规则变更历史
          </h2>
          {allRuleChanges.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Shield className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">暂无规则变更记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allRuleChanges.map(({ ruleName, changeLog }) => {
                const expanded = expandedRuleChangeIds.has(changeLog.id);
                return (
                  <div
                    key={changeLog.id}
                    className="border border-rose-200 border-l-4 rounded-lg p-4 bg-rose-50/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span className="font-semibold text-sm text-port-500">{ruleName}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm text-gray-600">
                            {changeLog.fieldName === 'value' ? '值' : changeLog.fieldName}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-mono bg-red-100 text-red-700 rounded">
                            {changeLog.oldValue}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="px-2 py-0.5 text-xs font-mono bg-green-100 text-green-700 rounded">
                            {changeLog.newValue}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          原因：{changeLog.changeReason}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {changeLog.changedBy}
                          </span>
                          <span className="font-mono">{formatDateTime(changeLog.changedAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs text-gray-500">
                          影响箱数：
                          <span className="font-semibold text-rose-600">
                            {changeLog.affectedContainerIds.length}
                          </span>
                        </span>
                        {changeLog.affectedContainerIds.length > 0 && (
                          <button
                            onClick={() => toggleRuleChangeExpand(changeLog.id)}
                            className="text-xs text-port-400 hover:text-port-500 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            {expanded ? '收起' : '查看受影响箱'}
                          </button>
                        )}
                      </div>
                    </div>
                    {expanded && changeLog.affectedContainerIds.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-rose-200">
                        <div className="flex flex-wrap gap-2">
                          {changeLog.affectedContainerIds.map((cid) => (
                            <Link
                              key={cid}
                              to={`/container/${cid}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:border-port-400 transition-colors"
                            >
                              <Package className="w-3 h-3 text-gray-400" />
                              <span className="font-mono text-gray-700">{cid}</span>
                              <span className="text-gray-400">({getContainerNo(cid)})</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
