import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { api } from '../utils/api';
import { FileUp, Calendar, AlertTriangle, CheckCircle, XCircle, Trash2, Plus } from 'lucide-react';
import type { TariffTable, UsageRecord, TariffTier } from '../../shared/types';

export function DataImport() {
  const tariffs = useAppStore((state) => state.tariffs);
  const usageRecords = useAppStore((state) => state.usageRecords);
  const loadTariffs = useAppStore((state) => state.loadTariffs);
  const loadUsageRecords = useAppStore((state) => state.loadUsageRecords);
  const [activeTab, setActiveTab] = useState<'tariffs' | 'usage'>('tariffs');

  useEffect(() => {
    loadTariffs();
    loadUsageRecords();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileUp className="w-7 h-7 text-brand" />
            数据导入
          </h2>
          <p className="text-slate-500 mt-1">管理电价表和用电记录数据</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'tariffs'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('tariffs')}
        >
          电价表管理 ({tariffs.length})
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'usage'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('usage')}
        >
          用电记录 ({usageRecords.length})
        </button>
      </div>

      {activeTab === 'tariffs' ? (
        <TariffTableList tariffs={tariffs} onRefresh={loadTariffs} />
      ) : (
        <UsageRecordList records={usageRecords} onRefresh={loadUsageRecords} />
      )}
    </div>
  );
}

interface TariffTableListProps {
  tariffs: TariffTable[];
  onRefresh: () => void;
}

function TariffTableList({ tariffs, onRefresh }: TariffTableListProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const deleteTariff = useCallback(async (id: string) => {
    await api.tariffs.delete(id);
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          系统内置 3 套电价表，包含 2023 版（已过期）、2024 版和商业峰谷电价
        </p>
        <button
          className="btn-primary text-sm flex items-center gap-2"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4" />
          新增电价表
        </button>
      </div>

      {showAddForm && (
        <AddTariffForm
          onSuccess={() => {
            setShowAddForm(false);
            onRefresh();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tariffs.map((tariff) => (
          <TariffCard key={tariff.id} tariff={tariff} onDelete={() => deleteTariff(tariff.id)} />
        ))}
      </div>
    </div>
  );
}

interface TariffCardProps {
  tariff: TariffTable;
  onDelete: () => void;
}

function TariffCard({ tariff, onDelete }: TariffCardProps) {
  return (
    <div className={`card card-hover p-5 ${tariff.isExpired ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-800">{tariff.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            {tariff.isExpired ? (
              <span className="badge-warning">已过期</span>
            ) : (
              <span className="badge-success">生效中</span>
            )}
          </div>
        </div>
        <button
          className="text-slate-400 hover:text-red-500 transition-colors p-1"
          onClick={onDelete}
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {tariff.effectiveFrom} 至 {tariff.effectiveTo}
      </div>

      <div className="space-y-2">
        {tariff.tiers.map((tier, index) => (
          <div
            key={tier.tierId}
            className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0"
          >
            <span className="text-slate-600">{tier.tierName}</span>
            <span className="font-mono text-slate-800">
              {tier.pricePerKwh.toFixed(2)} 元/kWh
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-400 font-mono">
          ID: {tariff.id}
        </div>
      </div>
    </div>
  );
}

interface AddTariffFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function AddTariffForm({ onSuccess, onCancel }: AddTariffFormProps) {
  const [name, setName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [tiers, setTiers] = useState<TariffTier[]>([
    { tierId: 't1', tierName: '第一档', minKwh: 0, maxKwh: 200, pricePerKwh: 0.56 },
    { tierId: 't2', tierName: '第二档', minKwh: 200, maxKwh: 400, pricePerKwh: 0.61 },
    { tierId: 't3', tierName: '第三档', minKwh: 400, maxKwh: null, pricePerKwh: 0.86 },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !effectiveFrom || !effectiveTo) {
      setError('请填写完整信息');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.tariffs.create({
        name,
        effectiveFrom,
        effectiveTo,
        tiers,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 bg-slate-50">
      <h4 className="font-semibold text-slate-800 mb-4">新增电价表</h4>
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="label">名称</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：居民阶梯电价-2025版"
          />
        </div>
        <div>
          <label className="label">生效日期</label>
          <input
            type="date"
            className="input"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">截止日期</label>
          <input
            type="date"
            className="input"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-secondary text-sm" onClick={onCancel}>
          取消
        </button>
        <button
          className="btn-primary text-sm"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}

interface UsageRecordListProps {
  records: UsageRecord[];
  onRefresh: () => void;
}

function UsageRecordList({ records, onRefresh }: UsageRecordListProps) {
  const deleteRecord = useCallback(async (id: string) => {
    await api.usageRecords.delete(id);
    onRefresh();
  }, [onRefresh]);

  const hasNegative = (r: UsageRecord) => {
    return (
      (r.peakUsage !== undefined && r.peakUsage < 0) ||
      (r.valleyUsage !== undefined && r.valleyUsage < 0) ||
      (r.flatUsage !== undefined && r.flatUsage < 0) ||
      (r.totalUsage !== undefined && r.totalUsage < 0)
    );
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              <th className="table-cell text-left">记录日期</th>
              <th className="table-cell text-right">总电费</th>
              <th className="table-cell text-right">峰时用量</th>
              <th className="table-cell text-right">谷时用量</th>
              <th className="table-cell text-right">平时用量</th>
              <th className="table-cell text-right">总用量</th>
              <th className="table-cell text-left">客户备注</th>
              <th className="table-cell text-left">来源文件</th>
              <th className="table-cell text-left">状态</th>
              <th className="table-cell text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {records.map((record) => {
              const hasNeg = hasNegative(record);
              return (
                <tr key={record.id} className={`hover:bg-slate-50 ${hasNeg ? 'bg-red-50/30' : ''}`}>
                  <td className="table-cell font-mono text-sm">{record.recordDate}</td>
                  <td className="table-cell text-right font-mono font-semibold">
                    ¥{record.totalBill.toFixed(2)}
                  </td>
                  <td className={`table-cell text-right font-mono ${record.peakUsage && record.peakUsage < 0 ? 'text-red-600 font-semibold' : ''}`}>
                    {record.peakUsage !== undefined ? `${record.peakUsage} kWh` : '-'}
                  </td>
                  <td className={`table-cell text-right font-mono ${record.valleyUsage && record.valleyUsage < 0 ? 'text-red-600 font-semibold' : ''}`}>
                    {record.valleyUsage !== undefined ? `${record.valleyUsage} kWh` : '-'}
                  </td>
                  <td className={`table-cell text-right font-mono ${record.flatUsage && record.flatUsage < 0 ? 'text-red-600 font-semibold' : ''}`}>
                    {record.flatUsage !== undefined ? `${record.flatUsage} kWh` : '-'}
                  </td>
                  <td className="table-cell text-right font-mono font-semibold">
                    {record.totalUsage !== undefined ? `${record.totalUsage} kWh` : '-'}
                  </td>
                  <td className="table-cell max-w-[200px] truncate text-sm text-slate-600">
                    {record.customerNote || '-'}
                  </td>
                  <td className="table-cell text-sm text-slate-500 font-mono">
                    {record.sourceFile}
                  </td>
                  <td className="table-cell">
                    {hasNeg ? (
                      <span className="badge-error flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        异常
                      </span>
                    ) : (
                      <span className="badge-success flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        正常
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-center">
                    <button
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      onClick={() => deleteRecord(record.id)}
                      title="删除"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
