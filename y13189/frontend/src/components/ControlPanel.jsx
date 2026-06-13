function ControlPanel({ params, onChange, onRecalculate, isRecalculating, parameterChange }) {
  const handleInputChange = (field, value) => {
    onChange({ ...params, [field]: Number(value) || 0 })
  }

  return (
    <div className="control-form">
      <div className="form-group">
        <label>来流风速</label>
        <div className="form-row">
          <input
            type="number"
            value={params.windSpeed}
            onChange={(e) => handleInputChange('windSpeed', e.target.value)}
            min="5"
            max="100"
            step="1"
          />
          <span className="unit">m/s</span>
        </div>
      </div>

      <div className="form-group">
        <label>攻角</label>
        <div className="form-row">
          <input
            type="number"
            value={params.attackAngle}
            onChange={(e) => handleInputChange('attackAngle', e.target.value)}
            min="-20"
            max="30"
            step="1"
          />
          <span className="unit">度</span>
        </div>
      </div>

      {parameterChange && (parameterChange.windSpeedChange !== 0 || parameterChange.attackAngleChange !== 0) && (
        <div className="param-change">
          <div>
            风速变化：{parameterChange.windSpeedChange > 0 ? '+' : ''}{parameterChange.windSpeedChange.toFixed(1)} m/s
          </div>
          <div>
            攻角变化：{parameterChange.attackAngleChange > 0 ? '+' : ''}{parameterChange.attackAngleChange.toFixed(1)}°
          </div>
        </div>
      )}

      <button 
        className="recalculate-btn"
        onClick={onRecalculate}
        disabled={isRecalculating}
      >
        {isRecalculating ? '计算中...' : '🔄 重新计算'}
      </button>

      <p style={{ fontSize: 11, color: '#a0aec0', textAlign: 'center' }}>
        调一档参数，重新估算分离点位置
      </p>
    </div>
  )
}

export default ControlPanel
