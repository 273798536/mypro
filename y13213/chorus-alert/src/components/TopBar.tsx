import { useApp } from '../context/AppContext';
import {
  buildMarkdownReport,
  downloadMarkdown,
  defaultReportFileName,
} from '../utils/markdown';

export default function TopBar() {
  const { filteredRecords, filterCriteria, history, reloadMockData, records } = useApp();

  const handleExport = () => {
    const content = buildMarkdownReport(filteredRecords, filterCriteria, history);
    downloadMarkdown(defaultReportFileName(), content);
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
        <button className="btn btn-secondary" onClick={reloadMockData} title="重新加载示例数据">
          🔄 重置示例数据
        </button>
        <button className="btn btn-primary" onClick={handleExport}>
          📄 导出 Markdown 报告
        </button>
      </div>
    </header>
  );
}
