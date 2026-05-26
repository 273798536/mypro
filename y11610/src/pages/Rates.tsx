import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useUIStore } from '../store/useUIStore';
import { ExchangeRate, Currency } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { db } from '../db/dexie';

export default function Rates() {
  const { loadAllData, isLoaded, rates, refreshData } = useDataStore();
  const { showToast, setLoading } = useUIStore();
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    baseCurrency: 'USD' as Currency,
    targetCurrency: 'CNY' as Currency,
    rate: 0,
    source: 'manual',
  });

  useEffect(() => {
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true, '正在保存...');

    try {
      if (editingRate) {
        await db.exchangeRates.update(editingRate.id, {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        showToast('success', '汇率已更新');
      } else {
        const exists = await db.exchangeRates
          .where('[baseCurrency+targetCurrency+date]')
          .equals([formData.baseCurrency, formData.targetCurrency, formData.date])
          .first();

        if (exists) {
          showToast('error', '该日期的汇率已存在');
          setLoading(false);
          return;
        }

        await db.exchangeRates.add({
          ...formData,
          id: `rate_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showToast('success', '汇率已添加');
      }

      await refreshData();
      setShowForm(false);
      setEditingRate(null);
      resetForm();
    } catch (error) {
      showToast('error', '保存失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setFormData({
      date: rate.date,
      baseCurrency: rate.baseCurrency,
      targetCurrency: rate.targetCurrency,
      rate: rate.rate,
      source: rate.source,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条汇率吗？')) return;

    setLoading(true, '正在删除...');
    try {
      await db.exchangeRates.delete(id);
      await refreshData();
      showToast('success', '汇率已删除');
    } catch (error) {
      showToast('error', '删除失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      baseCurrency: 'USD',
      targetCurrency: 'CNY',
      rate: 0,
      source: 'manual',
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRate(null);
    resetForm();
  };

  const currencies: Currency[] = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'HKD', 'AUD', 'CAD'];

  const groupedRates = rates.reduce((acc, rate) => {
    const key = `${rate.baseCurrency}_${rate.targetCurrency}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rate);
    return acc;
  }, {} as Record<string, ExchangeRate[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">汇率管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(true);
              setEditingRate(null);
            }}
            className="btn btn-primary"
          >
            <Plus size={18} />
            添加汇率
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">汇率记录</p>
          <p className="text-2xl font-bold text-gray-800">{rates.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">币种对</p>
          <p className="text-2xl font-bold text-primary-600">{Object.keys(groupedRates).length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">手动录入</p>
          <p className="text-2xl font-bold text-warning-600">
            {rates.filter((r) => r.source === 'manual').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">系统导入</p>
          <p className="text-2xl font-bold text-success-600">
            {rates.filter((r) => r.source !== 'manual').length}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingRate ? '编辑汇率' : '添加汇率'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">源币种</label>
              <select
                value={formData.baseCurrency}
                onChange={(e) =>
                  setFormData({ ...formData, baseCurrency: e.target.value as Currency })
                }
                className="input"
                required
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标币种</label>
              <select
                value={formData.targetCurrency}
                onChange={(e) =>
                  setFormData({ ...formData, targetCurrency: e.target.value as Currency })
                }
                className="input"
                required
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">汇率</label>
              <input
                type="number"
                step="0.0001"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                className="input"
                placeholder="如 7.25"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                {editingRate ? '更新' : '添加'}
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {Object.entries(groupedRates).map(([pair, pairRates]) => {
        const [base, target] = pair.split('_');
        const latestRate = pairRates.sort((a, b) => b.date.localeCompare(a.date))[0];
        return (
          <div key={pair} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {base} → {target}
                </h3>
                <p className="text-sm text-gray-500">
                  当前汇率：
                  <span className="font-medium text-primary-600 ml-1">
                    {latestRate?.rate || '-'}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    更新于 {latestRate ? formatDate(latestRate.date) : '-'}
                  </span>
                </p>
              </div>
              <span className="badge bg-primary-100 text-primary-700">
                {pairRates.length} 条记录
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">日期</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">汇率</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">来源</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pairRates
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 10)
                    .map((rate) => (
                      <tr key={rate.id} className="border-b border-gray-100 table-row-hover">
                        <td className="px-4 py-2 text-gray-600">{formatDate(rate.date)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">
                          {rate.rate}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`badge ${
                              rate.source === 'manual'
                                ? 'bg-warning-100 text-warning-700'
                                : 'bg-success-100 text-success-700'
                            }`}
                          >
                            {rate.source === 'manual' ? '手动录入' : '系统导入'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(rate)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                              title="编辑"
                            >
                              <Edit size={16} />
                            </button>
                            {rate.source === 'manual' && (
                              <button
                                onClick={() => handleDelete(rate.id)}
                                className="p-1.5 rounded hover:bg-danger-50 text-gray-500 hover:text-danger-600"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {pairRates.length > 10 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                仅显示最近 10 条记录
              </p>
            )}
          </div>
        );
      })}

      {rates.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-400 mb-4">暂无汇率数据</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <Plus size={18} />
            添加第一条汇率
          </button>
        </div>
      )}
    </div>
  );
}
