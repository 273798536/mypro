import { useState } from 'react'
import type { RawDataRow } from '../types'

interface Props {
  rows: RawDataRow[]
}

export default function RawRowsView({ rows }: Props) {
  const [highlight, setHighlight] = useState<string | null>(null)

  return (
    <div className="detail-section">
      <h4>
        🔗 原始数据溯源（共 {rows.length} 行，指向具体行号与对象）
      </h4>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
        坏数据不会带偏系统，点击任意行高亮显示。所有人工修正都可追溯到原始行。
      </p>
      <table className="raw-rows-table">
        <thead>
          <tr>
            <th>原始行号</th>
            <th>对象ID</th>
            <th>对象名称</th>
            <th>原始分</th>
            <th>原始标签</th>
            <th>样本哈希</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={highlight === row.id ? 'trace-highlight' : ''}
              onClick={() => setHighlight(row.id === highlight ? null : row.id)}
              style={{ cursor: 'pointer' }}
            >
              <td className="row-num-cell">L{row.rowNumber}</td>
              <td className="obj-id-cell">{row.objectId}</td>
              <td>{row.objectName}</td>
              <td>{row.rawScore.toFixed(3)}</td>
              <td>{row.rawLabel}</td>
              <td className="hash-cell">{row.sampleHash}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {highlight && (
        <div style={{ marginTop: 10, padding: 8, background: '#fffbeb', borderRadius: 4, fontSize: 12.5 }}>
          🎯 已选中溯源对象：
          <strong>
            {rows.find((r) => r.id === highlight)?.objectId} -{' '}
            {rows.find((r) => r.id === highlight)?.objectName}
          </strong>
          （原始行 L{rows.find((r) => r.id === highlight)?.rowNumber}）
        </div>
      )}
    </div>
  )
}
