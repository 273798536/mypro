function SampleList({ samples, selectedId, onSelect }) {
  const getStatusBadge = (sample) => {
    if (sample.anomalyType === 'direction') {
      return <span className="badge warning">方向异常</span>
    }
    if (sample.isBoundary) {
      return <span className="badge caution">边界样本</span>
    }
    if (sample.hasUnitIssue) {
      return <span className="badge info">单位换算</span>
    }
    if (sample.isNormal) {
      return <span className="badge success">正常</span>
    }
    return null
  }

  const getItemClass = (sample) => {
    let cls = 'sample-item'
    if (sample.id === selectedId) cls += ' active'
    if (sample.anomalyType === 'direction') cls += ' anomaly'
    else if (sample.isBoundary) cls += ' boundary'
    return cls
  }

  return (
    <div className="sample-list">
      {samples.map(sample => (
        <div
          key={sample.id}
          className={getItemClass(sample)}
          onClick={() => onSelect(sample.id)}
        >
          <div className="sample-name">{sample.name}</div>
          <div className="sample-status">
            {getStatusBadge(sample)} {sample.flowStatus}
          </div>
        </div>
      ))}
    </div>
  )
}

export default SampleList
