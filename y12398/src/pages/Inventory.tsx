import React, { useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, getStatusText } from '../utils/format';

export const Inventory: React.FC = () => {
  const {
    devices,
    inventoryChecks,
    loading,
    fetchInventory,
    createBorrow
  } = useStore();

  useEffect(() => {
    if (inventoryChecks.length === 0) fetchInventory();
  }, []);

  const latestCheck = inventoryChecks[0];

  const mismatchCount = latestCheck
    ? latestCheck.items.filter(item => !item.isMatch).length
    : 0;

  const handleCreateCheck = async () => {
    try {
      const response = await fetch('/api/inventory', { method: 'POST' });
      if (response.ok) {
        await fetchInventory();
      }
    } catch (error) {
      console.error('创建盘点失败:', error);
    }
  };

  const handleCompleteCheck = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory/${id}/complete`, { method: 'POST' });
      if (response.ok) {
        await fetchInventory();
      }
    } catch (error) {
      console.error('完成盘点失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {latestCheck && (
            <>
              <span className="text-sm text-slate-500">
                最近盘点：{formatDate(latestCheck.checkDate)}
              </span>
              {mismatchCount > 0 && (
                <span className="badge bg-rose-100 text-rose-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {mismatchCount} 项差异
                </span>
              )}
            </>
          )}
        </div>
        <button
          onClick={handleCreateCheck}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建盘点
        </button>
      </div>

      {latestCheck && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-serif font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary-600" />
              盘点报告 · {formatDate(latestCheck.checkDate)}
            </h3>
            <div className="flex items-center gap-2">
              <StatusBadge type="device" value={latestCheck.status === 'completed' ? 'in_stock' : 'borrowed'} />
              {latestCheck.status === 'draft' && (
                <span className="badge bg-blue-100 text-blue-800">草稿</span>
              )}
              {latestCheck.status === 'completed' && (
                <span className="badge bg-emerald-100 text-emerald-800">已完成</span>
              )}
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-header">设备ID</th>
                <th className="table-header">设备名称</th>
                <th className="table-header">账面状态</th>
                <th className="table-header">实际状态</th>
                <th className="table-header">比对结果</th>
                <th className="table-header">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {latestCheck.items.map((item, index) => (
                <tr
                  key={item.deviceId}
                  className={`hover:bg-slate-50 transition-colors animate-stagger ${
                    !item.isMatch ? 'bg-rose-50/50' : ''
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="table-cell font-mono text-xs text-slate-500">{item.deviceId}</td>
                  <td className="table-cell font-medium text-slate-900">{item.deviceName}</td>
                  <td className="table-cell">
                    <StatusBadge type="device" value={item.expectedStatus} />
                  </td>
                  <td className="table-cell">
                    <StatusBadge type="device" value={item.actualStatus} />
                  </td>
                  <td className="table-cell">
                    {item.isMatch ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        一致
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-600 text-sm font-medium">
                        <XCircle className="w-4 h-4" />
                        不一致
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-slate-600">
                    {item.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {latestCheck.status === 'draft' && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                如实际状态与账面不同，请修改上方"实际状态"列后完成盘点
              </p>
              <button
                onClick={() => handleCompleteCheck(latestCheck.id)}
                disabled={loading}
                className="btn btn-primary"
              >
                完成盘点
              </button>
            </div>
          )}
        </div>
      )}

      {!latestCheck && (
        <div className="card p-12 text-center text-slate-500">
          暂无盘点记录，点击"新建盘点"开始
        </div>
      )}

      {inventoryChecks.length > 1 && (
        <div>
          <h3 className="font-serif font-semibold text-slate-900 mb-3">历史盘点</h3>
          <div className="grid grid-cols-3 gap-4">
            {inventoryChecks.slice(1).map((check, index) => (
              <div key={check.id} className="card p-4 animate-stagger" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-900">{formatDate(check.checkDate)}</span>
                  {check.status === 'completed' ? (
                    <span className="badge bg-emerald-100 text-emerald-800">已完成</span>
                  ) : (
                    <span className="badge bg-blue-100 text-blue-800">草稿</span>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  <span>总 {check.items.length} 项</span>
                  <span className="mx-2">·</span>
                  <span className={check.items.filter(i => !i.isMatch).length > 0 ? 'text-rose-600' : ''}>
                    差异 {check.items.filter(i => !i.isMatch).length} 项
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
