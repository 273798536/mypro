import { useEffect, useState } from 'react';
import { useStore } from '../store/index';
import { useNavigate } from 'react-router-dom';
import RecordCard from '../components/RecordCard';
import RiskSnapshot from '../components/RiskSnapshot';
import RecordForm from '../components/RecordForm';
import ImpactChain from '../components/ImpactChain';
import type { SamplingRecord, SamplingRecordInput } from '../../shared/types';
import { Plus, RefreshCw, FileText } from 'lucide-react';

export default function HomePage() {
  const { records, loading, fetchRecords, updateRecord, createRecord, anomalyGroup, fetchAnomalies, impactChain, fetchImpactChain, clearImpactChain } = useStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SamplingRecord | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
    fetchAnomalies();
  }, []);

  const handleEdit = (record: SamplingRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleSubmit = async (data: SamplingRecordInput & { confirmed?: boolean }) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, data);
      setSuccessMsg('数据已更新，风险评估已自动重新计算，报告导出内容将同步更新');
    } else {
      await createRecord(data);
      setSuccessMsg('记录创建成功，已完成初始风险评估');
    }
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRecord(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">日程总览</h1>
          <p className="text-slate-600">按日期查看所有采样任务，实时跟踪风险状态</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { fetchRecords(); fetchAnomalies(); }}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            刷新
          </button>
          <button
            onClick={() => navigate('/export')}
            className="flex items-center gap-2 px-4 py-2.5 text-cyan-700 font-medium bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4" />
            导出报告
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

      {anomalyGroup && (
        <RiskSnapshot summary={anomalyGroup.summary} />
      )}

      {loading && records.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          加载中...
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <p className="text-slate-600 mb-4">暂无采样记录</p>
          <button
            onClick={() => { setEditingRecord(null); setShowForm(true); }}
            className="px-5 py-2 text-cyan-700 font-medium bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
          >
            创建第一条记录
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map(record => (
            <RecordCard
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onViewImpact={(id) => fetchImpactChain(id)}
            />
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
    </div>
  );
}
