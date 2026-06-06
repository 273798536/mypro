import { useStore } from '../store/useStore'
import type { Annotation } from '../types'
import './SettlementPage.css'

export function SettlementPage() {
  const {
    settlement,
    currentLevel,
    annotations,
    exportData,
    resetSession,
    setCurrentLevel
  } = useStore()

  if (!settlement || !currentLevel) return null

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds}秒`
  }

  const getStatusColor = () => {
    if (settlement.status === 'passed') return '#10b981'
    if (settlement.status === 'needs_review') return '#f59e0b'
    return '#ef4444'
  }

  const getStatusLabel = () => {
    if (settlement.status === 'passed') return '通过 · 可直接使用'
    if (settlement.status === 'needs_review') return '需安全培训师复核'
    return '未通过 · 请重新训练'
  }

  const getStatusDescription = () => {
    if (settlement.status === 'passed') {
      return '所有标注已确认且准确率≥80%，结果可直接用于实际工作。'
    }
    if (settlement.status === 'needs_review') {
      return '部分标注仍为待确认或准确率未达到优秀标准，必须由安全培训师复核后方可使用。'
    }
    return '标注准确率＜60%，建议重新训练或咨询安全培训师。'
  }

  const usableAnnotations = annotations.filter(
    a => a.status === 'confirmed'
  )
  const reviewAnnotations = annotations.filter(
    a => a.status === 'pending' || a.status === 'needs_review'
  )
  const rejectedAnnotations = annotations.filter(a => a.status === 'rejected')

  const anomalyTypeLabel: Record<string, string> = {
    boundary_violation: '边界违规',
    gps_drift: 'GPS漂移',
    duplicate_point: '重复点',
    speed_anomaly: '速度异常',
    missing_data: '数据缺失'
  }

  const handleExport = () => {
    const jsonStr = exportData()
    if (!jsonStr) return

    try {
      const parsed = JSON.parse(jsonStr)
      if (parsed.summary.status !== settlement.status) {
        alert(
          '导出校验失败：页面状态与导出文件不一致，请重新完成标注。'
        )
        return
      }
    } catch {
      // ignore
    }

    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `轨迹纠偏_${currentLevel.name}_${new Date()
      .toISOString()
      .slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderAnnotationRecord = (a: Annotation) => (
    <div key={a.id} className="annotation-record">
      <div className="annotation-header">
        <span className="annotation-type">{anomalyTypeLabel[a.type] || a.type}</span>
        <span className="annotation-line">原始行号 #{a.sourceReference.lineNumber}</span>
      </div>
      <div className="annotation-source">
        {a.sourceReference.imageName && (
          <span>截图: {a.sourceReference.imageName}</span>
        )}
        {a.sourceReference.note && (
          <span>来源备注: {a.sourceReference.note}</span>
        )}
      </div>
      {a.comment && <div className="annotation-comment">备注: {a.comment}</div>}
    </div>
  )

  return (
    <div className="settlement-page">
      <div className="settlement-header">
        <button
          className="back-btn"
          onClick={() => setCurrentLevel(null)}
        >
          ← 返回关卡列表
        </button>
        <h1>农机作业轨迹纠偏 · 结算报告</h1>
        <div className="level-info">
          <span className="level-name">{currentLevel.name}</span>
        </div>
      </div>

      <div className="settlement-content">
        <div className="status-banner" style={{ backgroundColor: getStatusColor() }}>
          <div className="status-icon">
            {settlement.status === 'passed' ? '✓' :
             settlement.status === 'needs_review' ? '?' : '✗'}
          </div>
          <div className="status-text">
            <h2>{getStatusLabel()}</h2>
            <p>{getStatusDescription()}</p>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <h3>准确率</h3>
            <div className="big-number" style={{ color: getStatusColor() }}>
              {settlement.accuracy.toFixed(1)}%
            </div>
            <div className="detail">
              正确 {settlement.correctAnnotations} /
              错误 {settlement.incorrectAnnotations} /
              遗漏 {settlement.missedAnnotations}
            </div>
          </div>

          <div className="summary-card">
            <h3>用时</h3>
            <div className="big-number">{formatTime(settlement.timeSpent)}</div>
            <div className="detail">轨迹点总数: {settlement.totalPoints}</div>
          </div>

          <div className="summary-card">
            <h3>操作统计</h3>
            <div className="stats-list">
              <div className="stat-row"><span>撤销次数:</span><span>{settlement.undoCount}</span></div>
              <div className="stat-row"><span>重做次数:</span><span>{settlement.redoCount}</span></div>
              <div className="stat-row"><span>边界失败:</span><span>{settlement.boundaryFailures}</span></div>
            </div>
          </div>
        </div>

        <div className="classification-section">
          <h3>标注分类（一眼分清用途）</h3>

          <div className="classification-group success">
            <div className="group-header">
              <span className="group-badge success">可直接使用</span>
              <span className="group-count">{usableAnnotations.length} 条</span>
            </div>
            {usableAnnotations.length > 0 ? (
              <div className="annotation-list-inline">
                {usableAnnotations.map(renderAnnotationRecord)}
              </div>
            ) : (
              <p className="empty-tip">暂无已确认可直接使用的标注</p>
            )}
          </div>

          <div className="classification-group warning">
            <div className="group-header">
              <span className="group-badge warning">需安全培训师复核</span>
              <span className="group-count">{reviewAnnotations.length} 条</span>
            </div>
            {reviewAnnotations.length > 0 ? (
              <div className="annotation-list-inline">
                {reviewAnnotations.map(renderAnnotationRecord)}
              </div>
            ) : (
              <p className="empty-tip">所有标注均已确认，无需复核</p>
            )}
          </div>

          {rejectedAnnotations.length > 0 && (
            <div className="classification-group danger">
              <div className="group-header">
                <span className="group-badge danger">已驳回（误判）</span>
                <span className="group-count">{rejectedAnnotations.length} 条</span>
              </div>
              <div className="annotation-list-inline">
                {rejectedAnnotations.map(renderAnnotationRecord)}
              </div>
            </div>
          )}
        </div>

        {settlement.details.length > 0 && (
          <div className="details-section">
            <h3>逐行复核明细（含原始行号追溯）</h3>
            <table className="details-table">
              <thead>
                <tr>
                  <th>原始行号</th>
                  <th>来源截图</th>
                  <th>来源备注</th>
                  <th>您的操作</th>
                  <th>预期操作</th>
                  <th>结果</th>
                </tr>
              </thead>
              <tbody>
                {settlement.details.map((detail, index) => (
                  <tr key={index} className={detail.isCorrect ? 'correct' : 'incorrect'}>
                    <td>#{detail.sourceReference.lineNumber}</td>
                    <td>{detail.sourceReference.imageName || '—'}</td>
                    <td className="note-cell">{detail.sourceReference.note || '—'}</td>
                    <td>
                      {detail.userAction === 'confirmed' ? '已确认' :
                       detail.userAction === 'rejected' ? '已驳回' : '遗漏未标'}
                    </td>
                    <td>{detail.expectedAction === 'confirm' ? '应标注确认' : '应驳回'}</td>
                    <td className={detail.isCorrect ? 'correct' : 'incorrect'}>
                      {detail.isCorrect ? '✓ 正确' : '✗ 错误'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="actions-section">
          <button className="btn-primary" onClick={handleExport}>
            导出完整报告（JSON）
          </button>
          <button className="btn-secondary" onClick={resetSession}>
            重开本关卡
          </button>
          <button className="btn-ghost" onClick={() => setCurrentLevel(null)}>
            选择其他关卡
          </button>
        </div>

        <div className="guidance-section">
          <h3>后续指引</h3>
          <div className="guidance-content">
            {settlement.status === 'passed' && (
              <div className="guidance-item success">
                <h4>✓ 可以直接使用</h4>
                <p>您的标注结果准确率达标且全部确认，可直接用于实际工作。</p>
                <ul>
                  <li>导出的 JSON 文件可直接提交归档</li>
                  <li>每条标注均保留原始行号、截图名、来源备注，可追溯到具体记录</li>
                  <li>导出文件 summary.status 与本页结论完全一致</li>
                </ul>
              </div>
            )}

            {settlement.status === 'needs_review' && (
              <div className="guidance-item warning">
                <h4>? 需要安全培训师复核</h4>
                <p>您的标注结果存在待确认项或准确率未达到优秀标准。</p>
                <ul>
                  <li>请将导出的 JSON 报告提交给安全培训师</li>
                  <li>培训师会根据原始行号和截图名核对来源材料</li>
                  <li>复核通过并在系统中更新状态后，标注才可用于实际工作</li>
                </ul>
              </div>
            )}

            {settlement.status === 'failed' && (
              <div className="guidance-item danger">
                <h4>✗ 需要重新训练</h4>
                <p>准确率低于 60%，建议重开本关卡或咨询安全培训师。</p>
                <ul>
                  <li>点击「重开本关卡」重新练习</li>
                  <li>留意逐行复核明细中标记为错误的行号</li>
                  <li>遇到疑问随时联系安全培训师获取指导</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettlementPage
