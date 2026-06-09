import { useState } from 'react';
import { api } from '../api';
import type { BalanceCalcResponse } from '../types';

export default function BalancePage() {
  const [targetPh, setTargetPh] = useState<string>('');
  const [acidPka, setAcidPka] = useState<string>('');
  const [totalConcentration, setTotalConcentration] = useState<string>('');
  const [volume, setVolume] = useState<string>('');
  const [acidMolarMass, setAcidMolarMass] = useState<string>('');
  const [saltMolarMass, setSaltMolarMass] = useState<string>('');
  const [acidName, setAcidName] = useState<string>('');
  const [saltName, setSaltName] = useState<string>('');
  const [result, setResult] = useState<BalanceCalcResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setError('');
    setResult(null);

    if (!targetPh || !acidPka || !totalConcentration || !volume || !acidMolarMass || !saltMolarMass) {
      setError('请填写所有必填参数');
      return;
    }

    setLoading(true);
    try {
      const res = await api.calcBalance({
        target_ph: parseFloat(targetPh),
        acid_pka: parseFloat(acidPka),
        total_concentration: parseFloat(totalConcentration),
        volume_l: parseFloat(volume),
        acid_molar_mass: parseFloat(acidMolarMass),
        salt_molar_mass: parseFloat(saltMolarMass),
        acid_name: acidName || undefined,
        salt_name: saltName || undefined,
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
      <h1 className="page-title">配平计算</h1>
      <p className="page-subtitle">月底或课前配置缓冲液时，根据 Henderson-Hasselbalch 方程计算酸/盐配比</p>

      <div className="card">
        <h3>输入参数</h3>
        <div className="form-grid">
          <div className="form-item">
            <label>目标 pH</label>
            <input
              type="number"
              step="0.01"
              value={targetPh}
              onChange={(e) => setTargetPh(e.target.value)}
              placeholder="例如：7.4"
            />
          </div>
          <div className="form-item">
            <label>弱酸 pKa</label>
            <input
              type="number"
              step="0.01"
              value={acidPka}
              onChange={(e) => setAcidPka(e.target.value)}
              placeholder="例如：7.21"
            />
          </div>
          <div className="form-item">
            <label>总浓度 (mol/L)</label>
            <input
              type="number"
              step="0.001"
              value={totalConcentration}
              onChange={(e) => setTotalConcentration(e.target.value)}
              placeholder="例如：0.1"
            />
          </div>
          <div className="form-item">
            <label>体积 (L)</label>
            <input
              type="number"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="例如：1"
            />
          </div>
          <div className="form-item">
            <label>酸摩尔质量 (g/mol)</label>
            <input
              type="number"
              value={acidMolarMass}
              onChange={(e) => setAcidMolarMass(e.target.value)}
              placeholder="例如：136.09"
            />
          </div>
          <div className="form-item">
            <label>盐摩尔质量 (g/mol)</label>
            <input
              type="number"
              value={saltMolarMass}
              onChange={(e) => setSaltMolarMass(e.target.value)}
              placeholder="例如：141.96"
            />
          </div>
          <div className="form-item">
            <label>酸名称（可选）</label>
            <input
              type="text"
              value={acidName}
              onChange={(e) => setAcidName(e.target.value)}
              placeholder="例如：KH2PO4"
            />
          </div>
          <div className="form-item">
            <label>盐名称（可选）</label>
            <input
              type="text"
              value={saltName}
              onChange={(e) => setSaltName(e.target.value)}
              placeholder="例如：Na2HPO4"
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
              <div className="k">[A⁻]/[HA] 比例</div>
              <div className="v">{result.ratio_base_acid.toFixed(4)}</div>
            </div>
            <div className="summary-item">
              <div className="k">目标 pH</div>
              <div className="v">{result.target_ph}</div>
            </div>
            <div className="summary-item">
              <div className="k">弱酸 pKa</div>
              <div className="v">{result.acid_pka}</div>
            </div>
            <div className="summary-item">
              <div className="k">{result.acid_name || '酸'}浓度</div>
              <div className="v">{result.acid_concentration.toFixed(5)} mol/L</div>
            </div>
            <div className="summary-item">
              <div className="k">{result.salt_name || '盐'}浓度</div>
              <div className="v">{result.salt_concentration.toFixed(5)} mol/L</div>
            </div>
            <div className="summary-item">
              <div className="k">需称{result.acid_name || '酸'}质量</div>
              <div className="v">{result.acid_mass_g.toFixed(3)} g</div>
            </div>
            <div className="summary-item">
              <div className="k">需称{result.salt_name || '盐'}质量</div>
              <div className="v">{result.salt_mass_g.toFixed(3)} g</div>
            </div>
          </div>
          {result.note && (
            <div style={{ marginTop: 14, padding: 12, background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
              <div className="muted" style={{ marginBottom: 4 }}>H-H 推导</div>
              <div style={{ fontSize: 14, color: '#0c4a6e', whiteSpace: 'pre-wrap' }}>{result.note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
