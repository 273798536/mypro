import { useState, useEffect } from 'react';
import { AnchorageRecord } from './types';
import { api } from './api';
import RecordList from './components/RecordList';
import DriftCalculator from './components/DriftCalculator';
import ImportPanel from './components/ImportPanel';
import ReportPanel from './components/ReportPanel';
import RecordDetail from './components/RecordDetail';

type TabKey = 'review' | 'calc' | 'import' | 'report';

export default function App() {
  const [tab, setTab] = useState<TabKey>('review');
  const [records, setRecords] = useState<AnchorageRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRecords = async () => {
    try {
      const data = await api.getRecords();
      setRecords(data);
    } catch (e) {
      console.error('加载记录失败', e);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [refreshKey]);

  const handleRecordUpdate = () => {
    setRefreshKey((k) => k + 1);
  };

  const tabs: { key: TabKey; label: string; desc: string }[] = [
    { key: 'review', label: '复核备注', desc: '日常入口：审核记录、查看照片、人工修正' },
    { key: 'calc', label: '漂移计算工具', desc: '独立计算公式：公式/单位/适用范围/失败原因' },
    { key: 'import', label: '数据导入', desc: 'CSV/Excel 导入，自动去重' },
    { key: 'report', label: '月报导出', desc: '月底/课前导出月报，附完整说明' },
  ];

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🌊 台风避风锚地推荐系统</h1>
          <div className="subtitle">
            {tabs.find((t) => t.key === tab)?.desc}
          </div>
        </div>
        <div className="tabs">
          {tabs.map((t) => (
            <div
              key={t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>
      </header>

      <main className="main">
        {tab === 'review' && (
          <RecordList
            records={records}
            onViewDetail={(id) => setSelectedId(id)}
            onUpdate={handleRecordUpdate}
          />
        )}
        {tab === 'calc' && <DriftCalculator />}
        {tab === 'import' && (
          <ImportPanel onImported={() => {
            handleRecordUpdate();
            setTab('review');
          }} />
        )}
        {tab === 'report' && <ReportPanel records={records} />}
      </main>

      {selectedId && (
        <RecordDetail
          recordId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={handleRecordUpdate}
        />
      )}
    </div>
  );
}
