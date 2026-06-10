import { useState } from 'react';
import type { ExperimentRecord } from './types';
import { SAMPLE_RECORDS } from './data/sampleData';
import ExperimentForm from './components/ExperimentForm';
import RecordList from './components/RecordList';
import RecordDetail from './components/RecordDetail';
import BucketSummary from './components/BucketSummary';
import { FlaskConical, List, Plus, Beaker, AlertCircle } from 'lucide-react';

type ViewType = 'list' | 'form' | 'detail' | 'summary';

function App() {
  const [records, setRecords] = useState<ExperimentRecord[]>(SAMPLE_RECORDS);
  const [view, setView] = useState<ViewType>('summary');
  const [selectedRecord, setSelectedRecord] = useState<ExperimentRecord | null>(null);

  const handleCreateRecord = (record: ExperimentRecord) => {
    setRecords(prev => [record, ...prev]);
    setSelectedRecord(record);
    setView('detail');
  };

  const handleViewRecord = (record: ExperimentRecord) => {
    setSelectedRecord(record);
    setView('detail');
  };

  const navItems: { key: ViewType; label: string; icon: any }[] = [
    { key: 'summary', label: '废液分桶汇总', icon: Beaker },
    { key: 'list', label: '实验记录', icon: List },
    { key: 'form', label: '录入新记录', icon: Plus },
  ];

  const abnormalCount = records.filter(r => r.hasAbnormalities).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FlaskConical className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">化学实验废液分桶管理系统</h1>
                <p className="text-xs text-gray-500">环境监测员专用 · 试剂浓度校验 · 异常留痕追踪</p>
              </div>
            </div>
            {abnormalCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                <AlertCircle size={16} className="text-red-600" />
                <span className="text-sm text-red-700">{abnormalCount} 条记录存在异常，需要关注</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setView(item.key);
                    setSelectedRecord(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'list' && (
          <RecordList records={records} onViewRecord={handleViewRecord} />
        )}
        {view === 'form' && (
          <ExperimentForm
            onSubmit={handleCreateRecord}
            onCancel={() => setView('list')}
          />
        )}
        {view === 'detail' && selectedRecord && (
          <RecordDetail
            record={selectedRecord}
            onBack={() => setView('list')}
          />
        )}
        {view === 'summary' && (
          <BucketSummary records={records} onViewRecord={handleViewRecord} />
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          化学实验废液分桶管理系统 · 请在月底转交前完成所有记录的复核
        </div>
      </footer>
    </div>
  );
}

export default App;
