import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatDateShort } from '../../shared/utils/calculate';
import { Plus, Search, Upload, Download, ArrowDownCircle, ArrowUpCircle, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import type { Reagent } from '../../shared/types';

export function ReagentLedger() {
  const { reagents, fetchReagents } = useAppStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    fetchReagents();
  }, [fetchReagents]);

  useEffect(() => {
    const cats = Array.from(new Set(reagents.map((r) => r.category)));
    setCategories(cats);
  }, [reagents]);

  const filteredReagents = reagents.filter((r) => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (lowStockOnly && r.stock > r.minStock) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(s) ||
        r.catalogNo.toLowerCase().includes(s) ||
        r.batchNo.toLowerCase().includes(s) ||
        r.manufacturer.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      catalogNo: formData.get('catalogNo') as string,
      casNo: formData.get('casNo') as string,
      category: formData.get('category') as string,
      specification: formData.get('specification') as string,
      stock: Number(formData.get('stock') || 0),
      unit: formData.get('unit') as string,
      minStock: Number(formData.get('minStock') || 0),
      manufacturer: formData.get('manufacturer') as string,
      batchNo: formData.get('batchNo') as string,
      expiryDate: formData.get('expiryDate') as string,
      location: formData.get('location') as string,
      remark: formData.get('remark') as string,
    };

    try {
      await useAppStore.getState().addReagent(data as any);
      setShowCreateModal(false);
    } catch (err) {
      alert('创建失败：' + (err as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      const items = JSON.parse(importText);
      const result = await useAppStore.getState().importReagents(items);
      setImportResult(result);
    } catch (err) {
      alert('导入失败：' + (err as Error).message);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/reagents/export/download';
  };

  const handleShowTransactions = async (reagent: Reagent) => {
    setSelectedReagent(reagent);
    setShowTransactionModal(true);
    try {
      const data = await fetch('/api/reagents/' + reagent.id + '/transactions').then((r) => r.json());
      setTransactions(data);
    } catch {
      setTransactions([]);
    }
  };

  const handleAddTransaction = async (type: 'in' | 'out') => {
    if (!selectedReagent) return;
    const quantity = Number(prompt('请输入数量：'));
    if (isNaN(quantity) || quantity <= 0) return;

    try {
      await useAppStore.getState().addReagentTransaction(
        selectedReagent.id,
        { type, quantity, operator: '管理员' } as any
      );
      const data = await fetch('/api/reagents/' + selectedReagent.id + '/transactions').then((r) => r.json());
      setTransactions(data);
      fetchReagents();
    } catch (err) {
      alert('操作失败：' + (err as Error).message);
    }
  };

  const getStockLevel = (reagent: Reagent) => {
    if (reagent.stock <= 0) return 'text-red-600 bg-red-50';
    if (reagent.stock <= reagent.minStock) return 'text-amber-600 bg-amber-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">试剂台账</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <Download className="w-4 h-4 mr-1.5" />
              导出 CSV
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              导入
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-sky-600 rounded-md hover:bg-sky-700"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              新增试剂
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索试剂名称、目录号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">分类：</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">全部分类</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm text-slate-600">仅显示低库存</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">目录号</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">名称</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">分类</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">规格</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">库存</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">生产厂家</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">批次号</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">存放位置</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReagents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    暂无试剂数据
                  </td>
                </tr>
              ) : (
                filteredReagents.map((reagent) => (
                  <tr key={reagent.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700">{reagent.catalogNo}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      <div>{reagent.name}</div>
                      {reagent.casNo && <div className="text-xs text-slate-400">CAS: {reagent.casNo}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">
                        {reagent.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{reagent.specification}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${getStockLevel(reagent)}`}>
                          {reagent.stock} {reagent.unit}
                        </span>
                        {reagent.stock <= reagent.minStock && reagent.stock > 0 && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{reagent.manufacturer}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{reagent.batchNo}</td>
                    <td className="px-4 py-3 text-slate-600">{reagent.location}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShowTransactions(reagent)}
                          className="text-sky-600 hover:text-sky-700"
                          title="出入库记录"
                        >
                          <ArrowDownCircle className="w-4 h-4" />
                        </button>
                      </div>
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
          <div className="bg-white rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-slate-800 mb-4">新增试剂</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">名称 *</label>
                  <input
                    name="name"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">目录号 *</label>
                  <input
                    name="catalogNo"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">CAS号</label>
                  <input
                    name="casNo"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">分类</label>
                  <input
                    name="category"
                    defaultValue="未分类"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">规格</label>
                <input
                  name="specification"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">库存</label>
                  <input
                    name="stock"
                    type="number"
                    defaultValue={0}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">单位</label>
                  <input
                    name="unit"
                    defaultValue="g"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">最低库存</label>
                  <input
                    name="minStock"
                    type="number"
                    defaultValue={0}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">生产厂家</label>
                  <input
                    name="manufacturer"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">批次号</label>
                  <input
                    name="batchNo"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">有效期</label>
                  <input
                    name="expiryDate"
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">存放位置</label>
                  <input
                    name="location"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
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
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-2">批量导入试剂</h3>
            <p className="text-sm text-slate-500 mb-4">
              粘贴 JSON 数组，系统会按「目录号」自动去重。导出文件内容与界面完全一致。
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              placeholder={`[\n  {\n    "name": "无水乙醇",\n    "catalogNo": "REA-001",\n    "category": "溶剂",\n    "specification": "AR",\n    "stock": 500,\n    "unit": "mL"\n  }\n]`}
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

      {showTransactionModal && selectedReagent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-1">
              {selectedReagent.name} - 出入库记录
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              当前库存：
              <span className="font-medium text-slate-700">
                {selectedReagent.stock} {selectedReagent.unit}
              </span>
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleAddTransaction('in')}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100"
              >
                <ArrowDownCircle className="w-4 h-4 mr-1.5" />
                入库
              </button>
              <button
                onClick={() => handleAddTransaction('out')}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
              >
                <ArrowUpCircle className="w-4 h-4 mr-1.5" />
                出库
              </button>
            </div>

            <div className="border border-slate-200 rounded-md max-h-64 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">暂无出入库记录</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">类型</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">数量</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              t.type === 'in'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {t.type === 'in' ? '入库' : '出库'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono">{t.quantity}</td>
                        <td className="px-3 py-2 text-slate-500">{formatDateShort(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowTransactionModal(false)}
                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
