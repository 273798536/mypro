function ReportHeader({ report, onExport }) {
  return (
    <div className="report-header">
      <div>
        <h1>🌬️ 风洞烟线报告导出系统</h1>
        <div className="subtitle">
          {report ? `${report.name} · ${report.id}` : '加载中...'}
        </div>
      </div>
      <div className="header-actions">
        <button className="btn btn-primary" onClick={() => onExport('html')}>
          📄 导出 HTML 报告
        </button>
      </div>
    </div>
  )
}

export default ReportHeader
