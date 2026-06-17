import { useState, useEffect, useMemo } from 'react';
import { FilterPanel } from './components/FilterPanel';
import { StatsPanel } from './components/StatsPanel';
import { TensionChart } from './components/TensionChart';
import { DetailTable } from './components/DetailTable';
import { JumpAnalysisPanel } from './components/JumpAnalysisPanel';
import { PageSummary } from './components/PageSummary';
import { FileUpload } from './components/FileUpload';
import { SAMPLE_DATA } from './data/sampleData';
import { parseSensorLogs } from './utils/dataParser';
import { analyzeRecords, buildAnalysisResult, DEFAULT_ANALYSIS_CONFIG } from './utils/analyzer';
import { addHistoryEntry, loadHistory } from './utils/history';
import {
  TensionRecord,
  FilterCondition,
  ProcessingStatus,
  AnalysisResult,
  RawSensorLog,
} from './types';
import './App.css';

function App() {
  const [allRecords, setAllRecords] = useState<TensionRecord[]>([]);
  const [filter, setFilter] = useState<FilterCondition>({
    statuses: Object.values(ProcessingStatus),
    showJumpOnly: false,
  });
  const [operator, setOperator] = useState('小宋');

  useEffect(() => {
    loadHistory();
  }, []);

  const analysisResult: AnalysisResult = useMemo(() => {
    return buildAnalysisResult(allRecords, filter);
  }, [allRecords, filter]);

  const handleLoadSample = () => {
    const parsed = parseSensorLogs(SAMPLE_DATA as RawSensorLog[], 'sample_data.json');
    const analyzed = analyzeRecords(parsed, DEFAULT_ANALYSIS_CONFIG);
    setAllRecords(analyzed);
    setFilter({
      statuses: Object.values(ProcessingStatus),
      showJumpOnly: false,
    });
  };

  const handleFileLoad = (data: unknown[], filename: string) => {
    const parsed = parseSensorLogs(data as RawSensorLog[], filename);
    const analyzed = analyzeRecords(parsed, DEFAULT_ANALYSIS_CONFIG);
    setAllRecords(analyzed);
    setFilter({
      statuses: Object.values(ProcessingStatus),
      showJumpOnly: false,
    });
  };

  const handleStatusChange = (recordId: string, newStatus: ProcessingStatus, reason: string, operator: string) => {
    const record = allRecords.find(r => r.id === recordId);
    if (!record) return;

    addHistoryEntry(record, newStatus, reason, operator);

    setAllRecords(prev =>
      prev.map(r =>
        r.id === recordId
          ? {
              ...r,
              processingStatus: newStatus,
              statusReason: reason,
            }
          : r
      )
    );
  };

  const materialOptions = useMemo(() => {
    const map = new Map<string, string>();
    allRecords.forEach(r => {
      if (!map.has(r.materialId)) {
        map.set(r.materialId, r.materialName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ materialId: id, materialName: name }));
  }, [allRecords]);

  const pulleyOptions = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => set.add(r.pulleyGroupId));
    return Array.from(set).map(id => ({ pulleyGroupId: id }));
  }, [allRecords]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>滑轮组张力参数回放</h1>
        <div className="header-actions">
          <span className="operator-label">操作人：</span>
          <input
            type="text"
            value={operator}
            onChange={e => setOperator(e.target.value)}
            className="operator-input"
          />
        </div>
      </header>

      <div className="upload-section">
        <FileUpload onFileLoad={handleFileLoad} onLoadSample={handleLoadSample} />
      </div>

      {allRecords.length > 0 && (
        <>
          <section className="summary-section">
            <PageSummary result={analysisResult} />
          </section>

          <div className="main-content">
            <aside className="sidebar">
              <FilterPanel
                filter={filter}
                materialOptions={materialOptions}
                pulleyOptions={pulleyOptions}
                onFilterChange={setFilter}
              />
            </aside>

            <main className="content">
              <section className="stats-section">
                <StatsPanel stats={analysisResult.stats} />
              </section>

              <section className="chart-section">
                <TensionChart records={analysisResult.records} />
              </section>

              <section className="jump-section">
                <JumpAnalysisPanel jumpPoints={analysisResult.jumpPoints} />
              </section>

              <section className="table-section">
                <DetailTable
                  records={analysisResult.records}
                  defaultOperator={operator}
                  onStatusChange={handleStatusChange}
                />
              </section>
            </main>
          </div>
        </>
      )}

      {allRecords.length === 0 && (
        <div className="empty-state-full">
          <div className="empty-icon">📊</div>
          <h2>欢迎使用滑轮组张力参数回放系统</h2>
          <p>点击"加载示例数据"快速体验，或上传您的传感器日志文件开始分析</p>
          <div className="empty-tips">
            <h3>功能特点：</h3>
            <ul>
              <li>✓ 自动识别不同字段名的传感器日志</li>
              <li>✓ 统一数据源：筛选、统计、明细、摘要来自同一结果</li>
              <li>✓ 智能检测极端值、噪声、跳变点</li>
              <li>✓ 跳变原因分析：阈值/单位/材料名不一致</li>
              <li>✓ 人工修改历史保留，交接班不丢信息</li>
            </ul>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>滑轮组张力参数回放系统 · 评审会专用版</p>
      </footer>
    </div>
  );
}

export default App;
