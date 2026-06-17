import { useState } from 'react'
import type { GisPoint, ImportResult } from '../types'
import { seatService } from '../services/seatService'

interface ImportDialogProps {
  onClose: () => void
  onImport: () => void
}

export function ImportDialog({ onClose, onImport }: ImportDialogProps) {
  const [gisPoints, setGisPoints] = useState<GisPoint[]>([
    {
      id: '',
      name: '',
      street: '',
      lng: 0,
      lat: 0,
    },
  ])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [step, setStep] = useState<'input' | 'result'>('input')

  const handleAddRow = () => {
    setGisPoints(prev => [...prev, {
      id: `gis-${Date.now()}`,
      name: '',
      street: '',
      lng: 0,
      lat: 0,
    }])
  }

  const handleRemoveRow = (index: number) => {
    if (gisPoints.length <= 1) return
    setGisPoints(prev => prev.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof GisPoint, value: string | number) => {
    setGisPoints(prev => prev.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ))
  }

  const handleImport = () => {
    const valid = gisPoints.filter(p => p.name.trim() && p.street.trim())
    if (valid.length === 0) {
      alert('请至少填写一条有效的GIS点位数据')
      return
    }
    const importResult = seatService.importFromGis(valid)
    setResult(importResult)
    setStep('result')
  }

  const handleClose = () => {
    if (step === 'result') {
      onImport()
    }
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>从GIS点位导入</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="dialog-body">
          {step === 'input' ? (
            <>
              <p className="dialog-tip">请填写GIS点位信息，支持批量导入</p>
              <div className="gis-point-table">
                <div className="gis-point-row header">
                  <span>GIS编号</span>
                  <span>点位名称</span>
                  <span>街口位置</span>
                  <span>经度</span>
                  <span>纬度</span>
                  <span>操作</span>
                </div>
                {gisPoints.map((point, index) => (
                  <div key={index} className="gis-point-row">
                    <input
                      type="text"
                      value={point.id}
                      onChange={e => handleChange(index, 'id', e.target.value)}
                      placeholder="GIS-001"
                      className="table-input"
                    />
                    <input
                      type="text"
                      value={point.name}
                      onChange={e => handleChange(index, 'name', e.target.value)}
                      placeholder="如：幸福路口袋公园"
                      className="table-input"
                    />
                    <input
                      type="text"
                      value={point.street}
                      onChange={e => handleChange(index, 'street', e.target.value)}
                      placeholder="如：幸福路与阳光街交叉口"
                      className="table-input"
                    />
                    <input
                      type="number"
                      value={point.lng || ''}
                      onChange={e => handleChange(index, 'lng', parseFloat(e.target.value) || 0)}
                      placeholder="经度"
                      className="table-input"
                    />
                    <input
                      type="number"
                      value={point.lat || ''}
                      onChange={e => handleChange(index, 'lat', parseFloat(e.target.value) || 0)}
                      placeholder="纬度"
                      className="table-input"
                    />
                    <button
                      className="link-btn danger"
                      onClick={() => handleRemoveRow(index)}
                      disabled={gisPoints.length <= 1}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <button className="link-btn add-row-btn" onClick={handleAddRow}>
                + 添加一行
              </button>
            </>
          ) : (
            <div className="import-result">
              <div className="result-item success">
                <h4>✅ 导入成功 ({result?.success.length || 0} 条)</h4>
                {result?.success.map(r => (
                  <p key={r.id}>• {r.gisPoint.name}</p>
                ))}
              </div>
              {result && result.warnings.length > 0 && (
                <div className="result-item warning">
                  <h4>⚠️ 注意事项 ({result.warnings.length} 条)</h4>
                  {result.warnings.map((w, i) => (
                    <p key={i}>• {w.message}</p>
                  ))}
                </div>
              )}
              {result && result.errors.length > 0 && (
                <div className="result-item error">
                  <h4>❌ 导入失败 ({result.errors.length} 条)</h4>
                  {result.errors.map((e, i) => (
                    <p key={i}>• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          {step === 'input' ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>取消</button>
              <button className="btn btn-primary" onClick={handleImport}>开始导入</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleClose}>完成</button>
          )}
        </div>
      </div>
    </div>
  )
}
