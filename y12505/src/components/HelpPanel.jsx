import { useState } from 'react'

export const HelpPanel = () => {
  const [expanded, setExpanded] = useState('format')

  const sections = [
    {
      id: 'format',
      title: '📄 数据格式',
      content: (
        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 8px 0' }}><strong>晶格节点 (nodes):</strong></p>
          <pre style={{
            background: '#f3f4f6',
            padding: '6px',
            borderRadius: '4px',
            fontSize: '10px',
            overflow: 'auto',
            margin: '0 0 10px 0'
          }}>
{`{
  "id": "node_0",
  "position": { "x": 0, "y": 0, "z": 0 },
  "type": "lattice"
}`}
          </pre>
          <p style={{ margin: '0 0 8px 0' }}><strong>缺陷 (defects):</strong></p>
          <pre style={{
            background: '#f3f4f6',
            padding: '6px',
            borderRadius: '4px',
            fontSize: '10px',
            overflow: 'auto',
            margin: '0'
          }}>
{`{
  "id": "defect_1",
  "type": "VACANCY",
  "position": { "x": 1, "y": 0, "z": 0 },
  "description": "说明文字"
}`}
          </pre>
        </div>
      )
    },
    {
      id: 'defects',
      title: '💎 缺陷类型说明',
      content: (
        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            <li><strong>VACANCY</strong> - 空位缺陷：晶格节点缺失</li>
            <li><strong>INTERSTITIAL</strong> - 间隙原子：晶格间隙中的额外原子</li>
            <li><strong>DISLOCATION</strong> - 位错：晶格排列错位</li>
            <li><strong>GRAIN_BOUNDARY</strong> - 晶界：晶粒边界</li>
            <li><strong>IMPURITY</strong> - 杂质原子：异类原子</li>
          </ul>
        </div>
      )
    },
    {
      id: 'anomalies',
      title: '⚠️ 异常检测说明',
      content: (
        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 8px 0' }}>系统自动检测以下异常：</p>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            <li><strong style={{ color: '#f59e0b' }}>缺陷重叠</strong>：两缺陷距离小于 0.5</li>
            <li><strong style={{ color: '#dc2626' }}>应力爆炸</strong>：应力值超过 1000</li>
            <li><strong style={{ color: '#ef4444' }}>节点越界</strong>：位置超出 ±5 范围</li>
          </ul>
        </div>
      )
    },
    {
      id: 'tutorial',
      title: '🎮 操作指南',
      content: (
        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            <li><strong>旋转视角</strong>：鼠标左键拖动</li>
            <li><strong>平移</strong>：鼠标右键拖动</li>
            <li><strong>缩放</strong>：滚轮</li>
            <li><strong>查看详情</strong>：点击节点/缺陷/异常</li>
            <li><strong>取消选择</strong>：点击空白处</li>
          </ul>
        </div>
      )
    }
  ]

  return (
    <div className="panel">
      <h3 style={{ margin: '0 0 12px 0', color: '#60a5fa' }}>❓ 帮助</h3>
      
      {sections.map(section => (
        <div key={section.id} style={{ marginBottom: '8px' }}>
          <button
            onClick={() => setExpanded(expanded === section.id ? null : section.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 8px',
              background: expanded === section.id ? '#eff6ff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{section.title}</span>
            <span style={{ color: '#9ca3af' }}>
              {expanded === section.id ? '−' : '+'}
            </span>
          </button>
          {expanded === section.id && (
            <div style={{
              padding: '8px',
              background: '#f9fafb',
              borderRadius: '4px',
              marginTop: '4px'
            }}>
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
