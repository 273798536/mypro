function ExportPanel({ onExport }) {
  return (
    <div className="export-panel">
      <button className="export-btn" onClick={() => onExport('html')}>
        📄 导出 HTML 报告
      </button>
      <button className="export-btn" onClick={() => window.print()}>
        🖨️ 打印当前页面
      </button>
      <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 8 }}>
        导出的报告包含：样本详情、异常清单、公式说明、结论
      </p>
    </div>
  )
}

export default ExportPanel
