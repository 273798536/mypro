import { useEffect, useState } from 'react';
import { useStore } from '../store/index';
import RecordCard from '../components/RecordCard';
import RecordForm from '../components/RecordForm';
import ImpactChain from '../components/ImpactChain';
import type { SamplingRecord, SamplingRecordInput } from '../../shared/types';
import { Plus, Upload, RefreshCw, Trash2, Filter, AlertCircle } from 'lucide-react';

export default function RecordsPage() {
  const { records, loading, fetchRecords, updateRecord, createRecord, deleteRecord, batchImport, impactChain, fetchImpactChain, clearImpactChain } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SamplingRecord | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = filter === 'all'
    ? records
    : records.filter(r => r.risk_level === filter);

  const handleEdit = (record: SamplingRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleSubmit = async (data: SamplingRecordInput & { confirmed?: boolean }) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, data);
      setSuccessMsg('数据已更新，风险评估已自动重新计算');
    } else {
      await createRecord(data);
      setSuccessMsg('记录创建成功');
    }
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await deleteRecord(id);
      setSuccessMsg('记录已删除');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      const data = JSON.parse(importText);
      const result = await batchImport(data);
      setImportResult(result);
      setShowImport(false);
      setImportText('');
      setTimeout(() => setImportResult(null), 5000);
    } catch (e) {
      alert('JSON 格式错误: ' + (e as Error).message);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRecord(null);
  };

  const filterOptions = [
    { value: 'all', label: '全部' },
    { value: 'normal', label: '顺利' },
    { value: 'pending', label: '待确认' },
    { value: 'anomaly', label: '异常' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">采样记录管理</h1>
          <p className="text-slate-600">录入、补录、导入采样记录，支持批量操作</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchRecords}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            刷新
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-cyan-700 font-medium bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            批量导入
          </button>
          <button
            onClick={() => { setEditingRecord(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 text-white font-medium bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors shadow-lg shadow-cyan-900/20"
          >
            <Plus className="w-4 h-4" />
            新增记录
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
          {successMsg}
        </div>
      )}

      {importResult && (
        <div className="mb-6 p-4 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-800 text-sm">
          批量导入完成：成功 {importResult.imported} 条，失败 {importResult.failed} 条
        </div>
      )}

      <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">筛选：</span>
        </div>
        <div className="flex gap-2">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === opt.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-sm text-slate-500">
          共 {filteredRecords.length} 条记录
        </div>
      </div>

      {loading && filteredRecords.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          加载中...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">暂无符合条件的记录</p>
          <button
            onClick={() => setFilter('all')}
            className="px-4 py-2 text-cyan-700 font-medium bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors text-sm"
          >
            查看全部记录
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map(record => (
            <div key={record.id} className="relative group">
              <RecordCard
                record={record}
                onEdit={handleEdit}
                onViewImpact={(id) => fetchImpactChain(id)}
              />
              <button
                onClick={() => handleDelete(record.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 w-9 h-9 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all"
                title="删除记录"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RecordForm
          record={editingRecord}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
        />
      )}

      {impactChain && (
        <ImpactChain
          data={impactChain}
          onClose={clearImpactChain}
        />
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">批量导入记录</h3>
                <p className="text-sm text-slate-600 mt-1">
                  粘贴 JSON 数组格式的数据，支持通过 curl 或脚本批量写入
                </p>
              </div>
              <button
                onClick={() => setShowImport(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-600 mb-2 font-medium">示例格式：</p>
                <pre className="text-xs text-slate-700 overflow-auto">
{`[
  {
    "date": "2026-06-13",
    "area": "北滩D区",
    "species": "青蛤",
    "wind_wave_forecast": "南风3级，浪高0.6m",
    "tide_data": "大潮汐，潮差4.0m",
    "water_quality": "pH 8.0, DO 7.0mg/L"
  }
]`}
                </pre>
              </div>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={12}
                placeholder="粘贴 JSON 数组..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowImport(false)}
                  className="px-5 py-2.5 text-slate-700 font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  className="px-5 py-2.5 text-white font-medium bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors"
                >
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
