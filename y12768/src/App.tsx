import React, { useState, useMemo } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import {
  RatingDistributionChart,
  StatusPieChart,
  TrendLineChart
} from './components/Charts';
import { RecordsTable } from './components/RecordsTable';
import { DuplicateTracker } from './components/DuplicateTracker';
import { ReportExport } from './components/ReportExport';
import { SafetyTips } from './components/SafetyTips';
import { ReagentManager } from './components/ReagentManager';
import { findDuplicateBatches } from './utils/analysis';
import './styles/index.css';

type Tab = 'export' | 'charts' | 'records' | 'duplicates' | 'reagents' | 'safety';

function Dashboard() {
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>('export');

  const duplicates = useMemo(() => findDuplicateBatches(state.records), [state.records]);
  const pendingCount = state.records.filter(r => r.conclusion === 'pending').length;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'export', label: '📄 报告导出' },
    { key: 'charts', label: '📊 图表分析' },
    { key: 'records', label: '📋 评级记录' },
    { key: 'duplicates', label: '🔍 批号追踪', badge: duplicates.length },
    { key: 'reagents', label: '🧪 试剂台账' },
    { key: 'safety', label: '⚠️ 安全提示', badge: pendingCount }
  ];

  return (
    <div className="app">
      <div className="header">
        <h1>盐雾试验腐蚀评级系统</h1>
        <p>Salt Spray Corrosion Rating Management · 数据本地化存储 · 批号追踪 · 报告导出</p>
      </div>

      <nav className="nav">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`nav-item ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.badge && t.badge > 0 && <span className="nav-badge">{t.badge}</span>}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'export' && <ReportExport />}

        {tab === 'charts' && (
          <>
            <div className="chart-row">
              <RatingDistributionChart records={state.records} />
              <StatusPieChart records={state.records} />
            </div>
            <TrendLineChart records={state.records} />
          </>
        )}

        {tab === 'records' && <RecordsTable records={state.records} />}

        {tab === 'duplicates' && <DuplicateTracker />}

        {tab === 'reagents' && <ReagentManager />}

        {tab === 'safety' && <SafetyTips />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  );
}
