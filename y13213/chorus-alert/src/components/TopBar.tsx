import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  buildMarkdownReport,
  downloadMarkdown,
  defaultReportFileName,
} from '../utils/markdown';

export default function TopBar() {
  const { filteredRecords, filterCriteria, history, reloadMockData, records } = useApp();
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);
  const [exportFeedback, setExportFeedback] = useState(false);

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await reloadMockData();
      setResetFeedback(true);
      setTimeout(() => setResetFeedback(false), 1500);
    } catch (err) {
      console.error('重置数据失败:', err);
      alert('重置数据失败，请刷新页面重试。');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExport = () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const content = buildMarkdownReport(filteredRecords, filterCriteria, history);
      downloadMarkdown(defaultReportFileName(), content);
      setExportFeedback(true);
      setTimeout(() => setExportFeedback(false), 1500);
    } catch (err) {
      console.error('导出 Markdown 失败:', err);
      alert('导出失败，请重试。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="logo">🎵</div>
        <div>
          <h1 className="app-title">合唱声部异常提醒</h1>
          <div className="app-subtitle">演出统筹阿蓝专用 · 排练记录管理与导出工具</div>
        </div>
      </div>
      <div className="topbar-right">
        <span className="stats-pill">
          共 <strong>{records.length}</strong> 条记录
          {filteredRecords.length !== records.length && (
            <> · 筛选后 <strong>{filteredRecords.length}</strong> 条</>
          )}
        </span>
        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={isResetting}
          title="重新加载示例数据"
        >
          {resetFeedback ? '✅ 已重置' : isResetting ? '⏳ 重置中...' : '🔄 重置示例数据'}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={isExporting || filteredRecords.length === 0}
        >
          {exportFeedback
            ? '✅ 已导出'
            : isExporting
              ? '⏳ 导出中...'
              : `📄 导出 Markdown 报告`}
        </button>
      </div>
    </header>
  );
}
