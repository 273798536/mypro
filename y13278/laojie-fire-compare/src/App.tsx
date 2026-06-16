import { useState } from 'react';
import { AppProvider, useApp } from './state/AppContext';
import { PlanList } from './components/PlanList';
import { PlanDetail } from './components/PlanDetail';
import { ConflictPanel } from './components/ConflictPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { CreatePlanModal } from './components/CreatePlanModal';
import { NotificationToast } from './components/NotificationToast';
import './App.css';

function AppInner() {
  const [showCreate, setShowCreate] = useState(false);
  const [rightTab, setRightTab] = useState<'conflicts' | 'history'>('conflicts');
  const { currentUser, setCurrentUser, currentView } = useApp();

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo">🏛️</span>
          <h1>老街消防方案比选</h1>
          <span className="app-subtitle">数据一致 · 历史可溯 · 冲突必复核</span>
        </div>
        <div className="app-user">
          <label>
            操作员：
            <input
              type="text"
              value={currentUser}
              onChange={e => setCurrentUser(e.target.value)}
              className="user-input"
            />
          </label>
        </div>
      </header>

      <main className="app-main">
        <aside className="app-sidebar">
          <PlanList onCreateClick={() => setShowCreate(true)} />
        </aside>

        <section className="app-content">
          <PlanDetail />
        </section>

        <aside className="app-rightbar">
          <div className="tab-bar">
            <button
              className={`tab ${rightTab === 'conflicts' ? 'active' : ''}`}
              onClick={() => setRightTab('conflicts')}
            >
              冲突检测
              {currentView && currentView.plan.conflicts.filter(c => !c.resolved).length > 0 && (
                <span className="tab-badge">
                  {currentView.plan.conflicts.filter(c => !c.resolved).length}
                </span>
              )}
            </button>
            <button
              className={`tab ${rightTab === 'history' ? 'active' : ''}`}
              onClick={() => setRightTab('history')}
            >
              变更历史
            </button>
          </div>
          <div className="tab-content">
            {rightTab === 'conflicts' ? <ConflictPanel /> : <HistoryPanel />}
          </div>
        </aside>
      </main>

      {showCreate && <CreatePlanModal onClose={() => setShowCreate(false)} />}
      <NotificationToast />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default App;
