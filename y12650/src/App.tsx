import { useEffect } from 'react';
import ThreeScene from './components/ThreeScene';
import Toolbar from './components/Toolbar';
import HUD from './components/HUD';
import Alerts from './components/Alerts';
import ParamsPanel from './components/ParamsPanel';
import ViewsPanel from './components/ViewsPanel';
import RecordsPanel from './components/RecordsPanel';
import ImportPanel from './components/ImportPanel';
import { useAppStore } from './store';

type TabKey = 'params' | 'views' | 'records' | 'import';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'params', label: '参数' },
  { key: 'views', label: '视角' },
  { key: 'records', label: '评审' },
  { key: 'import', label: '导入' },
];

export default function App() {
  const { activeTab, setActiveTab, initDemoData, records, pipelines } = useAppStore();

  useEffect(() => {
    if (records.length === 0 && pipelines.length === 0) {
      initDemoData();
    }
  }, [initDemoData, records.length, pipelines.length]);

  return (
    <div className="app-container">
      <div className="viewport">
        <ThreeScene />
        <Toolbar />
        <HUD />
        <Alerts />
      </div>

      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>海底管线三维避障</h1>
          <p>评审复核 · 视角溯源 · 坐标管理</p>
        </div>

        <div className="sidebar-tabs">
          {TABS.map((t) => (
            <div
              key={t.key}
              className={`sidebar-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>

        <div className="sidebar-content">
          {activeTab === 'params' && <ParamsPanel />}
          {activeTab === 'views' && <ViewsPanel />}
          {activeTab === 'records' && <RecordsPanel />}
          {activeTab === 'import' && <ImportPanel />}
        </div>
      </aside>
    </div>
  );
}
