import { useState, useEffect } from 'react';
import type { Booth, Issue, PageSummary, AllStates } from './types';
import { boothsApi, stateApi } from './services/api';
import SummaryPanel from './components/SummaryPanel';
import BoothList from './components/BoothList';
import BoothDetail from './components/BoothDetail';

export default function App() {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState<PageSummary | null>(null);
  const [appState, setAppState] = useState<AllStates | null>(null);
  const [selectedBoothId, setSelectedBoothId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [boothsData, stateData] = await Promise.all([
        boothsApi.getAll(),
        stateApi.getAll(),
      ]);
      setBooths(boothsData);
      setAppState(stateData);
      if (stateData.page_summary?.value) {
        setSummary(stateData.page_summary.value);
      }
      if (stateData.last_scan_time?.value) {
        setLastScanTime(stateData.last_scan_time.value);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    try {
      const [issuesData, summaryData] = await Promise.all([
        boothsApi.scanIssues(),
        boothsApi.getSummary(),
      ]);
      setIssues(issuesData);
      setSummary(summaryData);
      setLastScanTime(new Date().toISOString());
    } catch (err) {
      console.error('扫描失败:', err);
    }
  };

  const handleBoothUpdated = (booth: Booth) => {
    setBooths((prev) => prev.map((b) => (b.id === booth.id ? booth : b)));
    loadAll();
  };

  const handleNoteAdded = () => {
    loadAll();
    if (selectedBoothId) {
      // 触发详情刷新
      setSelectedBoothId(null);
      setTimeout(() => setSelectedBoothId(selectedBoothId), 0);
    }
  };

  useEffect(() => {
    loadAll();
    runScan();
  }, []);

  const selectedBooth = booths.find((b) => b.id === selectedBoothId) || null;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>🎪 音乐节摊位清单归档</h1>
          <div className="subtitle">
            厂牌运营工作台 — 摊位记录、排练备注、授权管理、历史追溯
          </div>
        </div>
        <div className="header-actions">
          {lastScanTime && (
            <span className="scan-indicator">
              <span className="scan-dot"></span>
              上次扫描: {new Date(lastScanTime).toLocaleString('zh-CN')}
            </span>
          )}
          <button className="btn btn-outline btn-sm" onClick={runScan}>
            🔍 重新扫描
          </button>
          <button className="btn btn-primary btn-sm" onClick={loadAll}>
            ↻ 刷新
          </button>
        </div>
      </header>

      {issues.length > 0 && (
        <div className="issue-banner warning">
          ⚠️ 检测到 {issues.length} 个问题：
          {issues.map((issue, i) => (
            <span key={i} style={{ marginLeft: '8px' }}>
              {issue.message}
            </span>
          ))}
        </div>
      )}

      <div className="main-layout">
        <SummaryPanel
          summary={summary}
          appState={appState}
          onRefresh={loadAll}
        />

        <div>
          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <BoothList
              booths={booths}
              issues={issues}
              onSelect={setSelectedBoothId}
            />
          )}
        </div>
      </div>

      {selectedBooth && (
        <BoothDetail
          boothId={selectedBooth.id}
          onClose={() => setSelectedBoothId(null)}
          onUpdated={handleBoothUpdated}
          onNoteAdded={handleNoteAdded}
        />
      )}
    </div>
  );
}
