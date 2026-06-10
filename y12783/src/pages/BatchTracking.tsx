import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDateShort } from '../../shared/utils/calculate';
import { Plus, Search, Upload, Eye, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { Batch } from '../../shared/types';

export function BatchTracking() {
  const navigate = useNavigate();
  const { batches, fetchBatches } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ today: 0, pending: 0, completed: 0, exception: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = batches.filter((b) => b.createdAt.startsWith(today)).length;
    const pending = batches.filter((b) => b.status === 'pending').length;
    const completed = batches.filter((b) => b.status === 'completed').length;
    const exception = batches.filter((b) => b.status === 'exception').length;
    setStats({ today: todayCount, pending, completed, exception });
  }, [batches]);

  const filteredBatches = batches.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        b.batchNo.toLowerCase().includes(s) ||
        b.materialNo.toLowerCase().includes(s) ||
        b.materialName.toLowerCase().includes(s) ||
        b.operator.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleCreateBatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      batchNo: formData.get('batchNo') as string,
      materialNo: formData.get('materialNo') as string,
      materialName: formData.get('materialName') as string,
      substrateType: formData.get('substrateType') as string,
      coatingType: formData.get('coatingType') as string,
      operator: formData.get('operator') as string,
      status: 'pending' as const,
      remark: formData.get('remark') as string,
    };

    try {
      await useAppStore.getState().addBatch(data);
      setShowCreateModal(false);
    } catch (err) {
      alert('创建失败：' + (err as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      const items = JSON.parse(importText);
      const result = await useAppStore.getState().importBatches(items);
      setImportResult(result);
    } catch (err) {
      alert('导入失败：' + (err as Error).message);
    }
  };

  const statCards = [
    { label: '今日批次', value: stats.today, icon: Clock, color: 'bg-blue-500' },
    { label: '待处理', value: stats.pending, icon: AlertTriangle, color: 'bg-amber-500' },
    { label: '已完成', value: stats.completed, icon: CheckCircle, color: 'bg-emerald-500' },
    { label: '异常', value: stats.exception, icon: XCircle, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-2xl font-semibold text-slate-800 mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-md ${card.color} bg-opacity-10 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">最近批次</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              导入批次
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-sky-600 rounded-md hover:bg-sky-700"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              新建批次
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索批次号、材料编号、名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">状态：</span>
            {['all', 'pending', 'processing', 'completed', 'exception'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  statusFilter === s
                    ? 'bg-sky-50 border-sky-300 text-sky-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? '全部' : s === 'pending' ? '待处理' : s === 'processing' ? '处理中' : s === 'completed' ? '已完成' : '异常'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">批次号</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">材料编号</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">材料名称</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">衬底</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">镀层类型</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">操作员</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">创建时间</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">状态</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    暂无批次数据
                  </td>
                </tr>
              ) : (
                filteredBatches.slice(0, 20).map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700">{batch.batchNo}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{batch.materialNo}</td>
                    <td className="px-4 py-3 text-slate-700">{batch.materialName}</td>
                    <td className="px-4 py-3 text-slate-600">{batch.substrateType}</td>
                    <td className="px-4 py-3 text-slate-600">{batch.coatingType}</td>
                    <td className="px-4 py-3 text-slate-600">{batch.operator}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateShort(batch.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={batch.status} type="batch" />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/thickness/${batch.id}`)}
                        className="inline-flex items-center text-sky-600 hover:text-sky-700"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        厚度估算
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-4">新建批次</h3>
            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">批次号 *</label>
                  <input
                    name="batchNo"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">材料编号 *</label>
                  <input
                    name="materialNo"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">材料名称</label>
                <input
                  name="materialName"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">衬底类型</label>
                  <input
                    name="substrateType"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">镀层类型</label>
                  <input
                    name="coatingType"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">操作员</label>
                <input
                  name="operator"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">备注</label>
                <textarea
                  name="remark"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md hover:bg-sky-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-2">批量导入批次</h3>
            <p className="text-sm text-slate-500 mb-4">
              粘贴 JSON 数组，系统会按「批次号 + 材料编号」自动去重
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              placeholder={`[\n  {\n    "batchNo": "COAT-2026-001",\n    "materialNo": "MAT-001",\n    "materialName": "SiO2薄膜",\n    "substrateType": "单晶硅片",\n    "coatingType": "SiO2",\n    "operator": "李工"\n  }\n]`}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {importResult && (
              <div className="mt-3 p-3 bg-slate-50 rounded-md text-sm">
                <p>共 {importResult.total} 条，新增 {importResult.created}，跳过 {importResult.skipped}</p>
                {importResult.errors?.length > 0 && (
                  <p className="text-red-600 mt-1">错误：{importResult.errors.join('; ')}</p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                关闭
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md hover:bg-sky-700"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
