import { useState } from 'react';
import { api } from '../api';
import { DriftCalculationResult } from '../types';

export default function DriftCalculator() {
  const [reportedLat, setReportedLat] = useState(22.3056);
  const [reportedLng, setReportedLng] = useState(113.9123);
  const [actualLat, setActualLat] = useState(22.312);
  const [actualLng, setActualLng] = useState(113.92);
  const [result, setResult] = useState<DriftCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalc = async () => {
    setLoading(true);
    try {
      const r = await api.calculateDrift({
        reportedLat: Number(reportedLat),
        reportedLng: Number(reportedLng),
        actualLat: Number(actualLat),
        actualLng: Number(actualLng),
      });
      setResult(r);
    } catch (e) {
      alert('计算失败: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>
        轨迹漂移计算工具
        <span className="badge">独立工具</span>
      </h2>

      <div className="note-box">
        🧮 <strong>使用说明：</strong>
        本工具使用 Haversine 公式计算两点球面距离，适用于锚地近距离漂移判断。
        公式、单位、适用范围和失败原因会在结果区完整展示，方便直接引用到通报里。
      </div>

      <div className="form-row">
        <div>
          <div className="section-title" style={{ marginTop: 0 }}>上报位置（预报）</div>
          <div className="form-group">
            <label>纬度 (°N)</label>
            <input
              type="number"
              step="0.0001"
              value={reportedLat}
              onChange={(e) => setReportedLat(parseFloat(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>经度 (°E)</label>
            <input
              type="number"
              step="0.0001"
              value={reportedLng}
              onChange={(e) => setReportedLng(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>实际位置（实测）</div>
          <div className="form-group">
            <label>纬度 (°N)</label>
            <input
              type="number"
              step="0.0001"
              value={actualLat}
              onChange={(e) => setActualLat(parseFloat(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>经度 (°E)</label>
            <input
              type="number"
              step="0.0001"
              value={actualLng}
              onChange={(e) => setActualLng(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={handleCalc} disabled={loading}>
          {loading ? '计算中...' : '开始计算'}
        </button>
      </div>

      {result && (
        <div className="calc-box">
          <div className={result.applicable ? 'result' : 'result fail'}>
            {result.distance}
            <span className="unit">{result.unit}</span>
            {!result.applicable && <span style={{ fontSize: 14, marginLeft: 10 }}>（不可用）</span>}
          </div>

          <div className="meta">
            <p><strong>📐 计算公式：</strong>{result.formula}</p>
            <p><strong>📏 单位说明：</strong>结果以「海里」为单位输出（1海里 = 1.852公里）。航海与港口调度通用单位。</p>
            <p><strong>🌍 适用范围：</strong>{result.scope}</p>
            {result.failReason && (
              <p><strong>⚠️ {result.failReason}</strong></p>
            )}
            <p>
              <strong>📝 输入值：</strong>
              上报 ({result.input.lat1}, {result.input.lng1}) →
              实际 ({result.input.lat2}, {result.input.lng2})
            </p>
          </div>
        </div>
      )}

      <div className="note-box" style={{ background: '#f0fdf4', borderLeftColor: '#16a34a', color: '#14532d' }}>
        💡 <strong>快速引用：</strong>
        计算结果可以直接复制到风险通报。公式和适用范围部分建议放在通报末尾作为说明附件，
        遇到失败原因时，优先检查「经纬度是否填反」「是否用了度分秒而非十进制度」「是否单位是米而不是度」。
      </div>
    </div>
  );
}
