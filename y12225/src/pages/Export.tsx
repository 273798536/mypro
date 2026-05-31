import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Download, FileSpreadsheet, CheckCircle, AlertTriangle, Eye, Package, Filter, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';

const statusMap: Record<string, string> = {
  pending: '待处理',
  confirmed: '已确认',
  exported: '已导出',
};

export default function ExportPage() {
  const { containers, operationLogs, addOperationLog } = useStore();

  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [includeRuleChanges, setIncludeRuleChanges] = useState(false);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      if (dateFrom && c.arrivalDate < dateFrom) return false;
      if (dateTo && c.departureDate > dateTo) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [containers, dateFrom, dateTo, statusFilter]);

  const getContainerLogs = (containerId: string) =>
    operationLogs.filter((log) => log.containerId === containerId);

  const exportHistory = useMemo(
    () => operationLogs.filter((log) => log.operationType === 'export'),
    [operationLogs]
  );

  const handleExport = () => {
    const data = filteredContainers.map((c) => {
      const row: Record<string, string | number> = {
        箱号: c.containerNo,
        箱型: c.containerType,
        进港时间: c.arrivalDate,
        出港时间: c.departureDate,
        堆存天数: c.storageDays,
        原费: c.originalFee,
        减免: c.waivedFee,
        实付: c.finalFee,
        状态: statusMap[c.status] || c.status,
      };

      if (includeRuleChanges) {
        row['规则改动标记'] = c.affectedByRuleChange || '';
      }

      if (includeAuditTrail) {
        const logs = getContainerLogs(c.id);
        row['审计记录'] = logs.map((l) => `[${l.operatedAt}] ${l.operator}: ${l.detail}`).join('; ');
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '堆存费核算账单');

    const colCount = Object.keys(data[0] || {}).length;
    ws['!cols'] = Array.from({ length: colCount }, (_, i) => ({
      wch: i === 0 ? 16 : i === 1 ? 8 : i >= 9 ? 40 : 14,
    }));

    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    const filename = `堆存费核算账单_${new Date().toISOString().slice(0, 10)}${ext}`;
    XLSX.writeFile(wb, filename);

    const exportedIds = filteredContainers.map((c) => c.id);
    useStore.setState((state) => ({
      containers: state.containers.map((c) =>
        exportedIds.includes(c.id) ? { ...c, status: 'exported' as const } : c
      ),
    }));

    addOperationLog({
      operationType: 'export',
      operator: useStore.getState().operationLogs.length > 0 ? '李结算' : '系统',
      detail: `导出${filteredContainers.length}条账单记录，格式：${format.toUpperCase()}`,
    });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-port-500 flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-port-500">账单导出</h2>
            <p className="text-sm text-gray-500">生成核算账单，包含规则改动标记和数据溯源</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-port-500" />
          <h3 className="font-medium text-port-500">导出选项</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                  className="text-port-500 focus:ring-port-500"
                />
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span className="text-sm">Excel (.xlsx)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="text-port-500 focus:ring-port-500"
                />
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="text-sm">CSV (.csv)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">附加选项</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRuleChanges}
                  onChange={(e) => setIncludeRuleChanges(e.target.checked)}
                  className="text-port-500 focus:ring-port-500 rounded"
                />
                <AlertTriangle className="w-4 h-4 text-accent-amber" />
                <span className="text-sm">包含规则改动标记</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAuditTrail}
                  onChange={(e) => setIncludeAuditTrail(e.target.checked)}
                  className="text-port-500 focus:ring-port-500 rounded"
                />
                <Eye className="w-4 h-4 text-accent-sky" />
                <span className="text-sm">包含审计追踪</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">日期范围</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-port-300 focus:border-port-300"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-port-300 focus:border-port-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">状态筛选</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-port-300 focus:border-port-300 w-full"
            >
              <option value="all">全部</option>
              <option value="pending">待处理</option>
              <option value="confirmed">已确认</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            <Package className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            将导出 <span className="font-semibold text-port-500">{filteredContainers.length}</span> 条记录
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-port-500" />
          <h3 className="font-medium text-port-500">数据预览</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">箱号</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">箱型</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">进港时间</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">出港时间</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">堆存天数</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">原费</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">减免</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">实付</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">状态</th>
                {includeRuleChanges && (
                  <th className="text-left py-2 px-3 font-medium text-gray-600">规则标记</th>
                )}
                {includeAuditTrail && (
                  <th className="text-left py-2 px-3 font-medium text-gray-600">审计</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredContainers.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 px-3 font-mono text-port-500">{c.containerNo}</td>
                  <td className="py-2 px-3">{c.containerType}</td>
                  <td className="py-2 px-3 text-gray-500">{c.arrivalDate}</td>
                  <td className="py-2 px-3 text-gray-500">{c.departureDate}</td>
                  <td className="py-2 px-3 text-right">{c.storageDays}</td>
                  <td className="py-2 px-3 text-right">¥{c.originalFee}</td>
                  <td className="py-2 px-3 text-right text-accent-emerald">¥{c.waivedFee}</td>
                  <td className="py-2 px-3 text-right font-medium">¥{c.finalFee}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'confirmed'
                          ? 'bg-green-50 text-green-700'
                          : c.status === 'exported'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {c.status === 'confirmed' && <CheckCircle className="w-3 h-3" />}
                      {c.status === 'pending' && <Clock className="w-3 h-3" />}
                      {statusMap[c.status]}
                    </span>
                  </td>
                  {includeRuleChanges && (
                    <td className="py-2 px-3">
                      {c.affectedByRuleChange ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                          <AlertTriangle className="w-3 h-3" />
                          规则改动
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                  {includeAuditTrail && (
                    <td className="py-2 px-3">
                      {getContainerLogs(c.id).length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                          <Eye className="w-3 h-3" />
                          有审计记录
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredContainers.length === 0 && (
                <tr>
                  <td
                    colSpan={9 + (includeRuleChanges ? 1 : 0) + (includeAuditTrail ? 1 : 0)}
                    className="py-8 text-center text-gray-400"
                  >
                    无匹配记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleExport}
          disabled={filteredContainers.length === 0}
          className="flex items-center gap-2 px-8 py-3 bg-port-500 text-white rounded-lg font-medium hover:bg-port-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-port-500/20"
        >
          <Download className="w-5 h-5" />
          导出账单
        </button>
      </div>

      {exportHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-port-500" />
            <h3 className="font-medium text-port-500">导出历史</h3>
          </div>

          <div className="space-y-3">
            {exportHistory.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 px-4 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-700">{log.detail}</p>
                    <p className="text-xs text-gray-400">{log.operator}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{log.operatedAt.slice(0, 10)}</p>
                  <p className="text-xs text-gray-400">{log.operatedAt.slice(11, 19)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <Link
          to="/"
          className="text-sm text-port-400 hover:text-port-500 transition-colors"
        >
          ← 返回减免核算
        </Link>
      </div>
    </div>
  );
}
