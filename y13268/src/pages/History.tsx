import { useState } from 'react';
import {
  History,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import useAppStore from '@/store/useAppStore';
import { formatDateTime, getSourceLabel, formatCapacity } from '@/utils';
import { ACTION_LIST } from '@/types';

export default function HistoryPage() {
  const { historyLogs, points, openDetailDrawer } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleLog = (id: string) => {
    const next = new Set(expandedLogs);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedLogs(next);
  };

  const filteredLogs = historyLogs.filter((log) => {
    const matchSearch =
      log.pointName.includes(searchTerm) ||
      log.operator.includes(searchTerm) ||
      log.reason.includes(searchTerm);
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const handleExportExcel = () => {
    const exportData = points.map((p) => ({
      点位名称: p.name,
      所属社区: p.community,
      地址: p.address,
      设计容量: `${p.capacity} kW`,
      容量上限: `${p.limit} kW`,
      充电桩数量: p.chargerCount,
      处理状态:
        p.status === 'processed'
          ? '已处理'
          : p.status === 'pending_field'
          ? '待现场看'
          : p.status === 'conflict'
          ? '冲突记录'
          : '容量超限',
      数据来源: getSourceLabel(p.source),
      方案类型: p.planType,
      负责人: p.assignee || '',
      备注: p.remark || '',
      更新时间: p.updateTime,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '点位清单');

    const abnormalPoints = points.filter((p) => p.capacity > p.limit).map((p) => ({
      点位名称: p.name,
      所属社区: p.community,
      设计容量: `${p.capacity} kW`,
      容量上限: `${p.limit} kW`,
      超限值: `${p.capacity - p.limit} kW`,
      超限比例: `${(((p.capacity - p.limit) / p.limit) * 100).toFixed(1)}%`,
      处理状态:
        p.status === 'processed'
          ? '已处理'
          : p.status === 'pending_field'
          ? '待现场看'
          : p.status === 'conflict'
          ? '冲突记录'
          : '容量超限',
      备注: p.remark || '',
    }));

    if (abnormalPoints.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(abnormalPoints);
      XLSX.utils.book_append_sheet(wb, ws2, '异常点位明细');
    }

    XLSX.writeFile(wb, '社区充电方案比选结果.xlsx');
  };

  const handleExportReport = () => {
    const totalCount = points.length;
    const processedCount = points.filter((p) => p.status === 'processed').length;
    const pendingCount = points.filter((p) => p.status === 'pending_field').length;
    const conflictCount = points.filter((p) => p.status === 'conflict').length;
    const overCapacityCount = points.filter((p) => p.capacity > p.limit).length;

    const reportContent = `# 社区充电方案比选 - 公示前复盘说明

## 一、总体情况

| 指标 | 数量 |
|------|------|
| 总点位 | ${totalCount} 个 |
| 已处理 | ${processedCount} 个 |
| 待现场看 | ${pendingCount} 个 |
| 冲突记录 | ${conflictCount} 个 |
| 容量超限 | ${overCapacityCount} 个 |

## 二、异常点位列表

${points
  .filter((p) => p.capacity > p.limit)
  .map(
    (p, i) => `${i + 1}. **${p.name}**
   - 社区：${p.community}
   - 设计容量：${formatCapacity(p.capacity)}
   - 容量上限：${formatCapacity(p.limit)}
   - 超限：${formatCapacity(p.capacity - p.limit)}（${(((p.capacity - p.limit) / p.limit) * 100).toFixed(1)}%）
   - 状态：${
     p.status === 'processed'
       ? '已处理'
       : p.status === 'pending_field'
       ? '待现场看'
       : p.status === 'conflict'
       ? '冲突记录'
       : '容量超限'
   }
   - 备注：${p.remark || '无'}`
  )
  .join('\n\n')}

## 三、处理进展

### 已完成
- 已处理点位 ${processedCount} 个，占比 ${((processedCount / totalCount) * 100).toFixed(1)}%

### 进行中
- 待现场看 ${pendingCount} 个
- 冲突记录 ${conflictCount} 个

## 四、待办事项

1. 待现场看点位需在 3 个工作日内完成核查
2. 冲突记录需协调多部门核实数据
3. 容量超限点位需启动方案调整流程

---

*生成时间：${new Date().toLocaleString('zh-CN')}*
*生成人：老何*
`;

    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '公示前复盘说明.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const actionColors: Record<string, string> = {
    import: 'bg-blue-100 text-blue-700',
    field_map: 'bg-purple-100 text-purple-700',
    status_change: 'bg-amber-100 text-amber-700',
    manual_confirm: 'bg-green-100 text-green-700',
    capacity_adjust: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">历史记录</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {historyLogs.length} 条操作记录，人工确认前后变化可追溯
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs" onClick={handleExportReport}>
            <FileText className="w-3.5 h-3.5 mr-1" />
            生成复盘说明
          </button>
          <button className="btn-primary text-xs" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            导出 Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">总操作数</p>
          <p className="text-2xl font-bold text-gray-800 font-mono">{historyLogs.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">人工确认</p>
          <p className="text-2xl font-bold text-green-600 font-mono">
            {historyLogs.filter((h) => h.action === 'manual_confirm').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">状态变更</p>
          <p className="text-2xl font-bold text-amber-600 font-mono">
            {historyLogs.filter((h) => h.action === 'status_change').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">涉及点位</p>
          <p className="text-2xl font-bold text-primary-600 font-mono">
            {new Set(historyLogs.map((h) => h.pointId)).size}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索点位、操作人、原因..."
                className="input pl-9 w-72 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="select text-sm w-36"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="all">全部操作类型</option>
                {ACTION_LIST.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            显示 {filteredLogs.length} 条
          </div>
        </div>

        <div className="p-5">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-6">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogs.has(log.id);
                  const hasChanges =
                    Object.keys(log.beforeData).length > 0 &&
                    Object.keys(log.afterData).length > 0;

                  return (
                    <div key={log.id} className="relative pl-10">
                      <div
                        className={`absolute left-2.5 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${
                          log.action === 'manual_confirm'
                            ? 'bg-green-500'
                            : log.action === 'status_change'
                            ? 'bg-amber-500'
                            : log.action === 'capacity_adjust'
                            ? 'bg-red-500'
                            : 'bg-primary-500'
                        }`}
                      />
                      <div className="bg-gray-50 rounded-sm overflow-hidden">
                        <button
                          className="w-full p-4 text-left hover:bg-gray-100/50 transition-colors"
                          onClick={() => toggleLog(log.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`status-badge ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}
                                >
                                  {log.actionName}
                                </span>
                                <span
                                  className="text-sm font-medium text-gray-800 cursor-pointer hover:text-primary-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetailDrawer(log.pointId);
                                  }}
                                >
                                  {log.pointName}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">{log.reason}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <User className="w-3 h-3" />
                                  {log.operator}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDateTime(log.time)}
                                </div>
                              </div>
                              {hasChanges &&
                                (isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ))}
                            </div>
                          </div>
                        </button>

                        {isExpanded && hasChanges && (
                          <div className="px-4 pb-4 border-t border-gray-200 pt-3">
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              变更前后对比：
                            </p>
                            <div className="bg-white rounded-sm p-3 space-y-2">
                              {Object.entries(log.beforeData).map(([key, value]) => {
                                const afterValue = log.afterData[key];
                                return (
                                  <div
                                    key={key}
                                    className="flex items-center gap-3 text-sm"
                                  >
                                    <span className="text-gray-500 w-24 flex-shrink-0">
                                      {key}
                                    </span>
                                    <span className="line-through text-gray-400">
                                      {String(value)}
                                    </span>
                                    <span className="text-gray-300">→</span>
                                    <span className="text-green-600 font-medium">
                                      {String(afterValue)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 pl-10">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">暂无匹配的历史记录</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">复盘说明示例</h3>
        <div className="bg-gray-50 rounded-sm p-4 text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-800">公示前复盘要点：</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>异常点位：说明超限原因、处理进展、责任人</li>
            <li>冲突记录：说明数据来源差异、核实情况、处理方案</li>
            <li>待办事项：明确时间节点、负责人员、预期结果</li>
            <li>历史变更：人工确认均有记录，可追溯操作人与时间</li>
          </ul>
          <p className="text-xs text-gray-400 mt-2">
            点击"生成复盘说明"按钮可一键导出 Markdown 格式的复盘文档
          </p>
        </div>
      </div>
    </div>
  );
}
