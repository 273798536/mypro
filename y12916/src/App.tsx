import React, { useState } from 'react';
import OverviewStats from './components/OverviewStats';
import VersionTimeline from './components/VersionTimeline';
import GrayscaleDiff from './components/GrayscaleDiff';
import SampleTable from './components/SampleTable';
import BoundaryCases from './components/BoundaryCases';
import ReviewReportComp from './components/ReviewReport';
import { modelVersions, reviewReport } from './mockData';

type TabKey = 'overview' | 'samples' | 'boundary' | 'report';

const App: React.FC = () => {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    modelVersions[modelVersions.length - 1].id,
  );
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const latest = modelVersions[modelVersions.length - 1];
  const rollback = modelVersions.find((v) => v.status === 'rollback');

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: '版本总览', icon: '📊' },
    { key: 'samples', label: '样本溯源', icon: '🔍' },
    { key: 'boundary', label: '边界案例', icon: '⚠️' },
    { key: 'report', label: '评审报告', icon: '📋' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">ML</div>
          <div>
            <div className="header-title">上线灰度回滚记录 · 工作流工具</div>
            <div className="header-subtitle">
              样本 · 版本 · 人工修正 · 分组指标串联追踪
            </div>
          </div>
        </div>
        <div className="header-right">
          <span className="badge badge-info">
            <span className="badge-dot" />
            评审报告 {reviewReport.reportId}
          </span>
          {rollback && (
            <span className="badge badge-danger">
              <span className="badge-dot" />
              上次回滚 {rollback.versionName}
            </span>
          )}
          <span className="badge badge-success">
            <span className="badge-dot" />
            当前 {latest.versionName} · accuracy {(latest.overallAccuracy * 100).toFixed(1)}%
          </span>
        </div>
      </header>

      <main className="app-main">
        <div style={{ marginBottom: 20, display: 'flex', gap: 4 }} className="tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
              style={{ fontSize: 13, padding: '10px 20px' }}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <OverviewStats />
            <VersionTimeline selectedId={selectedVersionId} onSelect={setSelectedVersionId} />
            <GrayscaleDiff />
          </>
        )}

        {activeTab === 'samples' && <SampleTable />}

        {activeTab === 'boundary' && <BoundaryCases />}

        {activeTab === 'report' && (
          <>
            <ReviewReportComp />
            <BoundaryCases />
          </>
        )}

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          ML 灰度回滚记录工作流 · 为算法产品经理设计 · 所有样例数据贴近日常真实场景
        </div>
      </main>
    </div>
  );
};

export default App;
