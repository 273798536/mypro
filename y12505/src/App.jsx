import { useLatticeStore } from './store/latticeStore'
import { LatticeScene } from './components/LatticeScene'
import { ImportPanel } from './components/ImportPanel'
import { DetailPanel } from './components/DetailPanel'
import { AnomalyPanel } from './components/AnomalyPanel'
import { LegendPanel } from './components/LegendPanel'
import { HelpPanel } from './components/HelpPanel'

function App() {
  const nodes = useLatticeStore(state => state.nodes)
  const defects = useLatticeStore(state => state.defects)
  const stresses = useLatticeStore(state => state.stresses)
  const anomalies = useLatticeStore(state => state.anomalies)

  const criticalCount = anomalies.filter(a => a.type === 'STRESS_EXPLOSION').length
  const warningCount = anomalies.filter(a => a.type === 'DEFECT_OVERLAP').length
  const errorCount = anomalies.filter(a => a.type === 'NODE_OUT_OF_BOUNDS').length

  return (
    <div className="app-container">
      <div className="sidebar">
        <ImportPanel />
        <LegendPanel />
      </div>

      <div className="main-content">
        <div className="header">
          <h1>🔬 材料晶格应力沙盒</h1>
          <div className="stats">
            <div className="stat-item">
              <span>🔵 节点:</span>
              <span className="stat-value">{nodes.length}</span>
            </div>
            <div className="stat-item">
              <span>💎 缺陷:</span>
              <span className="stat-value">{defects.length}</span>
            </div>
            <div className="stat-item">
              <span>📊 应力:</span>
              <span className="stat-value">{Object.keys(stresses).length}</span>
            </div>
            {anomalies.length > 0 && (
              <>
                {criticalCount > 0 && (
                  <div className="stat-item stat-error">
                    <span>🔴 严重:</span>
                    <span>{criticalCount}</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="stat-item stat-error">
                    <span>🟠 错误:</span>
                    <span>{errorCount}</span>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="stat-item stat-warning">
                    <span>🟡 警告:</span>
                    <span>{warningCount}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="canvas-container">
          <LatticeScene />
        </div>
      </div>

      <div className="right-panel">
        <DetailPanel />
        <AnomalyPanel />
        <HelpPanel />
      </div>
    </div>
  )
}

export default App
