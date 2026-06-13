function FormulaPanel({ formulas }) {
  if (!formulas || formulas.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '20px 0' }}>
        暂无公式
      </div>
    )
  }

  return (
    <div className="formula-list">
      {formulas.map((formula, index) => (
        <div key={index} className="formula-item">
          <div className="formula-name">{formula.name}</div>
          <div className="formula-expr">{formula.expression}</div>
          <div className="formula-desc">{formula.description}</div>
          <details style={{ marginTop: 6, fontSize: 11 }}>
            <summary style={{ cursor: 'pointer', color: '#4a5568' }}>变量说明</summary>
            <ul style={{ marginTop: 6, paddingLeft: 16, color: '#718096' }}>
              {Object.entries(formula.variables || {}).map(([key, value]) => (
                <li key={key}><strong>{key}</strong>：{value}</li>
              ))}
            </ul>
          </details>
        </div>
      ))}
    </div>
  )
}

export default FormulaPanel
