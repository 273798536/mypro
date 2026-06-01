import { useState } from 'react'
import { useLatticeStore } from '../store/latticeStore'
import { generateSampleLattice, generateAnomalySample, generateStressData, generateStressExplosionSample } from '../data/sampleData'

export const ImportPanel = () => {
  const importLatticeData = useLatticeStore(state => state.importLatticeData)
  const importStressData = useLatticeStore(state => state.importStressData)
  const clearAll = useLatticeStore(state => state.clearAll)
  const nodes = useLatticeStore(state => state.nodes)
  const stresses = useLatticeStore(state => state.stresses)
  const history = useLatticeStore(state => state.history)

  const [latticeJson, setLatticeJson] = useState('')
  const [stressJson, setStressJson] = useState('')
  const [error, setError] = useState('')

  const handleLoadNormalSample = () => {
    const { nodes, defects } = generateSampleLattice(3)
    importLatticeData(nodes, defects)
    setError('')
  }

  const handleLoadAnomalySample = () => {
    const { nodes, defects } = generateAnomalySample()
    importLatticeData(nodes, defects)
    setError('')
  }

  const handleLoadNormalStress = () => {
    const stressData = generateStressData(nodes, false)
    importStressData(stressData)
    setError('')
  }

  const handleLoadExplosionStress = () => {
    const stressData = generateStressExplosionSample(nodes)
    importStressData(stressData)
    setError('')
  }

  const handleImportLattice = () => {
    try {
      const data = JSON.parse(latticeJson)
      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error('缺少 nodes 数组')
      }
      importLatticeData(data.nodes, data.defects || [])
      setError('')
    } catch (e) {
      setError(`格式错误: ${e.message}`)
    }
  }

  const handleImportStress = () => {
    try {
      const data = JSON.parse(stressJson)
      importStressData(data)
      setError('')
    } catch (e) {
      setError(`格式错误: ${e.message}`)
    }
  }

  const hasLatticeData = nodes.length > 0
  const hasStressData = Object.keys(stresses).length > 0

  return (
    <div className="panel">
      <h3 style={{ margin: '0 0 12px 0', color: '#60a5fa' }}>📥 数据导入</h3>
      
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '12px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
            第一步: 晶格节点 + 缺陷
          </span>
          <span style={{
            color: hasLatticeData ? '#22c55e' : '#9ca3af',
            fontSize: '12px'
          }}>
            {hasLatticeData ? '✓ 已导入' : '○ 未导入'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button
            onClick={handleLoadNormalSample}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '11px' }}
          >
            正常样例
          </button>
          <button
            onClick={handleLoadAnomalySample}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '11px', background: '#fef3c7', color: '#92400e' }}
          >
            含异常样例
          </button>
        </div>

        <textarea
          value={latticeJson}
          onChange={(e) => setLatticeJson(e.target.value)}
          placeholder={`粘贴 JSON:\n{\n  "nodes": [...],\n  "defects": [...]\n}`}
          style={{
            width: '100%',
            height: '60px',
            padding: '6px',
            fontSize: '10px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            fontFamily: 'monospace',
            marginBottom: '6px'
          }}
        />
        <button
          onClick={handleImportLattice}
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '12px' }}
        >
          导入晶格数据
        </button>
      </div>

      <div style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: '12px',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
            第二步: 应力值
          </span>
          <span style={{
            color: hasStressData ? '#22c55e' : '#9ca3af',
            fontSize: '12px'
          }}>
            {hasStressData ? '✓ 已导入' : '○ 未导入'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button
            onClick={handleLoadNormalStress}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '11px' }}
            disabled={!hasLatticeData}
          >
            正常应力
          </button>
          <button
            onClick={handleLoadExplosionStress}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '11px', background: '#fee2e2', color: '#991b1b' }}
            disabled={!hasLatticeData}
          >
            应力爆炸
          </button>
        </div>

        <textarea
          value={stressJson}
          onChange={(e) => setStressJson(e.target.value)}
          placeholder={`粘贴应力 JSON:\n{\n  "node_0": {"xx": 100, ...},\n  "node_1": {...}\n}`}
          style={{
            width: '100%',
            height: '60px',
            padding: '6px',
            fontSize: '10px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            fontFamily: 'monospace',
            marginBottom: '6px'
          }}
          disabled={!hasLatticeData}
        />
        <button
          onClick={handleImportStress}
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '12px' }}
          disabled={!hasLatticeData}
        >
          导入应力数据
        </button>
      </div>

      <button
        onClick={clearAll}
        className="btn btn-secondary"
        style={{
          width: '100%',
          fontSize: '12px',
          background: '#fef2f2',
          color: '#dc2626',
          borderColor: '#fecaca'
        }}
      >
        清除所有数据
      </button>

      {history.length > 0 && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}>
            📋 操作记录
          </div>
          {history.map((h, i) => (
            <div key={i} style={{
              fontSize: '11px',
              padding: '4px 0',
              color: '#6b7280',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{h.description}</span>
              <span style={{ color: '#9ca3af' }}>
                {new Date(h.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
