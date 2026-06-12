import { useEffect, useState } from 'react';
import { useStore } from '../store/index';
import RecordCard from '../components/RecordCard';
import ImpactChain from '../components/ImpactChain';
import RecordForm from '../components/RecordForm';
import type { SamplingRecord, SamplingRecordInput } from '../../shared/types';
import { RefreshCw, AlertTriangle, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function AnomaliesPage() {
  const { anomalyGroup, loading, fetchAnomalies, fetchImpactChain, clearImpactChain, impactChain, updateRecord } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SamplingRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'anomaly' | 'pending' | 'normal'>('anomaly');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const tabs = [
    { key: 'anomaly' as const, label: '异常', icon: AlertTriangle, color: 'text-rose-600 bg-rose-100', border: 'border-rose-200' },
    { key: 'pending' as const, label: '待确认', icon: Clock, color: 'text-amber-600 bg-amber-100', border: 'border-amber-200' },
    { key: 'normal' as const, label: '顺利', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100', border: 'border-emerald-200' }
  ];

  const handleEdit = (record: SamplingRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleSubmit = async (data: SamplingRecordInput & { confirmed?: boolean }) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, data);
      setSuccessMsg('数据已更新，风险评估已自动重新计算，报告导出内容将同步更新');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRecord(null);
  };

  const currentRecords = anomalyGroup ? anomalyGroup[activeTab] : [];
  const count = anomalyGroup ? anomalyGroup.summary[activeTab] : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">异常追踪</h1>
          <p className="text-slate-600">风险分层看板，查看数据晚到影响的结论范围</p>
        </div>
        <button
          onClick={fetchAnomalies}
          className="flex items-center gap-2 px-4 py-2.5 text-slate-700 font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          刷新
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
          {successMsg}
        </div>
      )}

      <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          风险分层说明
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <div key={tab.key} className="bg-white/10 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tab.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold">{tab.label}</span>
                  <span className="ml-auto text-2xl font-bold">
                    {count}
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  {tab.key === 'normal' && '所有数据完备，风险评估通过，可正常执行采样'}
                  {tab.key === 'pending' && '存在数据缺失（如风浪预报晚到），结论为暂定值，需补录后确认'}
                  {tab.key === 'anomaly' && '存在异常风险（如禁航区越界、风浪超标），采样计划需暂停'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                isActive
                  ? `bg-white border-2 ${tab.border} shadow-md`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? tab.color.split(' ')[0] : ''}`} />
              {tab.label}
              <span className={`px-2 py-0.5 text-xs rounded-full ${isActive ? tab.color : 'bg-slate-200 text-slate-600'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab !== 'normal' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">重要提示</p>
            <p className="text-amber-700">
              当水质记录晚到时，系统会明确提示哪些结论受影响，不会悄悄覆盖旧结果。
              点击「查看影响」按钮可查看完整影响链。数据补录后，风险评估自动刷新，
              报告导出也会同步更新。
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          加载中...
        </div>
      ) : currentRecords.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">暂无{tabs.find(t => t.key === activeTab)?.label}记录</p>
          <p className="text-sm text-slate-400">
            {activeTab === 'anomaly' && '所有采样计划风险评估正常'}
            {activeTab === 'pending' && '所有数据均已完备，无需补录'}
            {activeTab === 'normal' && '暂无正常记录'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentRecords.map(record => (
            <div key={record.id} className="relative">
              {record.risk_level !== 'normal' && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10">
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center">
                    <ArrowRight className="w-2 h-2 text-amber-600" />
                  </div>
                </div>
              )}
              <RecordCard
                record={record}
                onEdit={handleEdit}
                onViewImpact={(id) => fetchImpactChain(id)}
              />
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
    </div>
  );
}
