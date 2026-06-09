import { useState } from 'react';
import { api } from '../api';
import type { ConcentrationCalcResponse } from '../types';

export default function ConcentrationPage() {
  const [molarMass, setMolarMass] = useState<string>('');
  const [volume, setVolume] = useState<string>('');
  const [concentration, setConcentration] = useState<string>('');
  const [mass, setMass] = useState<string>('');
  const [result, setResult] = useState<ConcentrationCalcResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setError('');
    setResult(null);

    if (!molarMass || !volume) {
      setError('请填写摩尔质量和体积');
      return;
    }
    if (!concentration && !mass) {
      setError('浓度和质量请任选其一填写');
      return;
    }
    if (concentration && mass) {
      setError('浓度和质量只能填写一个');
      return;
    }

    setLoading(true);
    try {
      const res = await api.calcConcentration({
        molar_mass: parseFloat(molarMass),
        volume_l: parseFloat(volume),
        concentration_mol: concentration ? parseFloat(concentration) : null,
        mass_g: mass ? parseFloat(mass) : null,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '计算失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">浓度换算</h1>
      <p className="page-subtitle">根据摩尔质量、体积和浓度/质量，计算所需参数</p>

      <div className="card">
        <h3>输入参数</h3>
        <div className="form-grid">
          <div className="form-item">
            <label>摩尔质量 (g/mol)</label>
            <input
              type="number"
              value={molarMass}
              onChange={(e) => setMolarMass(e.target.value)}
              placeholder="例如：58.44"
            />
          </div>
          <div className="form-item">
            <label>体积 (L)</label>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="例如：1"
            />
          </div>
          <div className="form-item">
            <label>浓度 (mol/L)</label>
            <input
              type="number"
              value={concentration}
              onChange={(e) => {
                setConcentration(e.target.value);
                if (e.target.value) setMass('');
              }}
              placeholder="浓度或质量任选其一"
            />
          </div>
          <div className="form-item">
            <label>质量 (g)</label>
            <input
              type="number"
              value={mass}
              onChange={(e) => {
                setMass(e.target.value);
                if (e.target.value) setConcentration('');
              }}
              placeholder="浓度或质量任选其一"
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={handleCalculate}
            disabled={loading}
          >
            {loading ? '计算中...' : '计算'}
          </button>
          {error && <span className="error-text">{error}</span>}
        </div>
      </div>

      {result && (
        <div className="card">
          <h3>计算结果</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="k">摩尔质量</div>
              <div className="v">{result.molar_mass} g/mol</div>
            </div>
            <div className="summary-item">
              <div className="k">体积</div>
              <div className="v">{result.volume_l} L</div>
            </div>
            {result.concentration_mol !== null && result.concentration_mol !== undefined && (
              <div className="summary-item">
                <div className="k">浓度</div>
                <div className="v">{result.concentration_mol} mol/L</div>
              </div>
            )}
            {result.mass_g !== null && result.mass_g !== undefined && (
              <div className="summary-item">
                <div className="k">需称量质量</div>
                <div className="v">{result.mass_g} g</div>
              </div>
            )}
          </div>
          {result.note && (
            <div style={{ marginTop: 14, padding: 12, background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
              <div className="muted" style={{ marginBottom: 4 }}>说明</div>
              <div style={{ fontSize: 14, color: '#0c4a6e' }}>{result.note}</div>
            </div>
          )}
        </div>
      )}

      <div className="muted" style={{ marginTop: 20, textAlign: 'center' }}>
        日常使用：先算需要称量多少克，再去记录管理录入。
      </div>
    </div>
  );
}
