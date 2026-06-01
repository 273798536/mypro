import { useState } from 'react';
import { AppProvider, useApp } from './store.tsx';
import { BatchList } from './components/BatchList';
import { RecordList } from './components/RecordList';
import { RecordForm } from './components/RecordForm';
import { RecordDetail } from './components/RecordDetail';
import { BatchComparison } from './components/BatchComparison';
import type { PendulumRecord } from './types';
import { Clock, Plus, RotateCcw, Info } from 'lucide-react';

const AppContent = () => {
  const { state, selectRecord } = useApp();
  const [editingRecord, setEditingRecord] = useState<PendulumRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'records' | 'comparison'>('records');

  const handleEdit = (record: PendulumRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleSelect = (_record: PendulumRecord) => {
    setEditingRecord(null);
    setShowForm(false);
  };

  const handleCloseDetail = () => {
    selectRecord(null);
  };

  const handleReset = () => {
    if (confirm('确定要重置所有数据吗？这将清除所有记录并重新加载样例数据。')) {
      localStorage.removeItem('pendulum-error-panel-state');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
                <Clock size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">摆钟周期误差面板</h1>
                <p className="text-sm text-slate-500">
                  物理实验数据管理 · 误差分析 · 批次对比
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="btn btn-secondary text-sm"
              >
                <RotateCcw size={14} className="mr-1" />
                重置数据
              </button>
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setShowForm(!showForm);
                }}
                className="btn btn-primary text-sm"
              >
                <Plus size={14} className="mr-1" />
                新增记录
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">使用说明</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>点击记录可查看完整溯源路径：原始记录 → 周期计算 → 误差分析 → 异常说明</li>
                <li>样例数据包含三种场景：标准小角度、大角度近似、异常检测（单位错误、漏拍）</li>
                <li>修改任意数据后，系统会自动重新计算周期、误差估计和异常检测</li>
                <li>批次对比页面可导出JSON/CSV报告，包含完整的计算过程和对应关系</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-80 flex-shrink-0 space-y-6">
            <BatchList />
            
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-slate-800">快速统计</h3>
              </div>
              <div className="card-body space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">总记录数</span>
                  <span className="font-bold text-slate-800">{state.records.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">总批次数</span>
                  <span className="font-bold text-slate-800">{state.batches.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">异常记录</span>
                  <span className={`font-bold ${state.anomalies.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {new Set(state.anomalies.map(a => a.recordId)).size} 条
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">已生成报告</span>
                  <span className="font-bold text-slate-800">{state.reports.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('records')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'records'
                    ? 'text-primary-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                记录列表
                {activeTab === 'records' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'comparison'
                    ? 'text-primary-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                批次对比与导出
                {activeTab === 'comparison' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                )}
              </button>
            </div>

            {activeTab === 'records' && (
              <>
                {showForm && (
                  <RecordForm 
                    editingRecord={editingRecord}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingRecord(null);
                    }}
                  />
                )}

                {state.selectedRecordId && !showForm && (
                  <RecordDetail
                    recordId={state.selectedRecordId}
                    onClose={handleCloseDetail}
                  />
                )}

                <RecordList
                  onEdit={handleEdit}
                  onSelect={handleSelect}
                />
              </>
            )}

            {activeTab === 'comparison' && (
              <BatchComparison />
            )}
          </div>
        </div>
      </div>

      <footer className="mt-12 py-6 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>摆钟周期误差面板 · 单摆实验数据管理与分析系统</p>
          <p className="mt-1">
            核心公式: T = 2π√(L/g) · [1 + (1/2)²sin²(θ/2) + (1·3/2·4)²sin⁴(θ/2) + ...]
          </p>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
