import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { STATUS_LABEL } from '../types';
import type {
  BufferComponent,
  TemperaturePoint,
  WeighingRecord,
  RecordStatus,
} from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyComponent = (): BufferComponent => ({
  reagent_name: '',
  formula: '',
  molar_mass: 0,
  target_concentration: 0,
  actual_concentration: null,
  theoretical_mass: null,
  actual_mass: null,
  purity: 100,
});

const emptyTempPoint = (): TemperaturePoint => ({
  time_minute: 0,
  set_temp: 25,
  actual_temp: 25,
});

const emptyWeighing = (): WeighingRecord => ({
  reagent_name: '',
  theoretical_mass: 0,
  actual_mass: 0,
  tolerance_pct: 0.5,
  error_pct: null,
  is_pass: null,
});

export default function NewRecordPage() {
  const navigate = useNavigate();

  const [batchNo, setBatchNo] = useState('');
  const [recordDate, setRecordDate] = useState(todayStr());
  const [bufferName, setBufferName] = useState('');
  const [targetPh, setTargetPh] = useState<string>('');
  const [targetVolume, setTargetVolume] = useState<string>('');
  const [actualPh, setActualPh] = useState<string>('');
  const [actualVolume, setActualVolume] = useState<string>('');
  const [operator, setOperator] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [remark, setRemark] = useState('');
  const [status, setStatus] = useState<RecordStatus>('draft');

  const [components, setComponents] = useState<BufferComponent[]>([emptyComponent()]);
  const [tempPoints, setTempPoints] = useState<TemperaturePoint[]>([emptyTempPoint()]);
  const [weighings, setWeighings] = useState<WeighingRecord[]>([emptyWeighing()]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addComponent = () => setComponents((prev) => [...prev, emptyComponent()]);
  const removeComponent = (idx: number) =>
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  const updateComponent = (idx: number, field: keyof BufferComponent, value: any) =>
    setComponents((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );

  const addTempPoint = () => setTempPoints((prev) => [...prev, emptyTempPoint()]);
  const removeTempPoint = (idx: number) =>
    setTempPoints((prev) => prev.filter((_, i) => i !== idx));
  const updateTempPoint = (idx: number, field: keyof TemperaturePoint, value: any) =>
    setTempPoints((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );

  const addWeighing = () => setWeighings((prev) => [...prev, emptyWeighing()]);
  const removeWeighing = (idx: number) =>
    setWeighings((prev) => prev.filter((_, i) => i !== idx));
  const updateWeighing = (idx: number, field: keyof WeighingRecord, value: any) =>
    setWeighings((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, [field]: value } : w))
    );

  const handleSubmit = async () => {
    setError('');

    if (!batchNo || !recordDate || !bufferName || !targetPh || !targetVolume) {
      setError('请填写所有必填字段（带 * 标记）');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createRecord({
        batch_no: batchNo,
        record_date: recordDate,
        buffer_name: bufferName,
        target_ph: parseFloat(targetPh),
        target_volume: parseFloat(targetVolume),
        actual_ph: actualPh ? parseFloat(actualPh) : null,
        actual_volume: actualVolume ? parseFloat(actualVolume) : null,
        operator: operator || null,
        reviewer: reviewer || null,
        remark: remark || null,
        status,
        components: components.map((c) => ({
          ...c,
          molar_mass: Number(c.molar_mass) || 0,
          target_concentration: Number(c.target_concentration) || 0,
          purity: Number(c.purity) || 100,
          actual_concentration: c.actual_concentration ? Number(c.actual_concentration) : null,
          theoretical_mass: c.theoretical_mass ? Number(c.theoretical_mass) : null,
          actual_mass: c.actual_mass ? Number(c.actual_mass) : null,
        })),
        temperature_points: tempPoints.map((t) => ({
          time_minute: Number(t.time_minute) || 0,
          set_temp: Number(t.set_temp) || 0,
          actual_temp: Number(t.actual_temp) || 0,
        })),
        weighing_records: weighings.map((w) => ({
          ...w,
          theoretical_mass: Number(w.theoretical_mass) || 0,
          actual_mass: Number(w.actual_mass) || 0,
          tolerance_pct: Number(w.tolerance_pct) || 0,
        })),
      });
      navigate(`/records/${res.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '创建失败';
      if (msg.includes('重复') || msg.includes('duplicate') || msg.includes('Duplicate')) {
        setError(`重复导入：${msg}`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">新建记录</h1>
      <p className="page-subtitle">录入缓冲液配制的完整信息，所有必填字段需填写完整</p>

      <div className="card">
        <h3>基本信息</h3>
        <div className="form-grid">
          <div className="form-item">
            <label>批次号 *</label>
            <input
              type="text"
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              placeholder="例如：BUF-2025-001"
            />
          </div>
          <div className="form-item">
            <label>记录日期 *</label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
            />
          </div>
          <div className="form-item">
            <label>缓冲液名称 *</label>
            <input
              type="text"
              value={bufferName}
              onChange={(e) => setBufferName(e.target.value)}
              placeholder="例如：PBS pH7.4"
            />
          </div>
          <div className="form-item">
            <label>目标 pH *</label>
            <input
              type="number"
              step="0.01"
              value={targetPh}
              onChange={(e) => setTargetPh(e.target.value)}
            />
          </div>
          <div className="form-item">
            <label>目标体积(L) *</label>
            <input
              type="number"
              step="0.01"
              value={targetVolume}
              onChange={(e) => setTargetVolume(e.target.value)}
            />
          </div>
          <div className="form-item">
            <label>实际 pH</label>
            <input
              type="number"
              step="0.01"
              value={actualPh}
              onChange={(e) => setActualPh(e.target.value)}
            />
          </div>
          <div className="form-item">
            <label>实际体积(L)</label>
            <input
              type="number"
              step="0.01"
              value={actualVolume}
              onChange={(e) => setActualVolume(e.target.value)}
            />
          </div>
          <div className="form-item">
            <label>操作人</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </div>
          <div className="form-item">
            <label>复核人</label>
            <input
              type="text"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
            />
          </div>
          <div className="form-item">
            <label>状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RecordStatus)}
            >
              <option value="draft">{STATUS_LABEL.draft}</option>
              <option value="imported">{STATUS_LABEL.imported}</option>
            </select>
          </div>
          <div className="form-item" style={{ gridColumn: '1 / -1' }}>
            <label>备注</label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="可选填写"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>配方组分</h3>
          <button className="btn btn-secondary btn-sm" onClick={addComponent}>
            + 添加一行
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>试剂名称</th>
              <th>分子式</th>
              <th>摩尔质量(g/mol)</th>
              <th>目标浓度(mol/L)</th>
              <th>实际浓度(mol/L)</th>
              <th>理论质量(g)</th>
              <th>实际质量(g)</th>
              <th>纯度(%)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={c.reagent_name}
                    onChange={(e) => updateComponent(idx, 'reagent_name', e.target.value)}
                    style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={c.formula || ''}
                    onChange={(e) => updateComponent(idx, 'formula', e.target.value)}
                    style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={c.molar_mass || ''}
                    onChange={(e) => updateComponent(idx, 'molar_mass', e.target.value)}
                    style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.0001"
                    value={c.target_concentration || ''}
                    onChange={(e) => updateComponent(idx, 'target_concentration', e.target.value)}
                    style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.0001"
                    value={c.actual_concentration ?? ''}
                    onChange={(e) => updateComponent(idx, 'actual_concentration', e.target.value)}
                    style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.001"
                    value={c.theoretical_mass ?? ''}
                    onChange={(e) => updateComponent(idx, 'theoretical_mass', e.target.value)}
                    style={{ width: 90, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.001"
                    value={c.actual_mass ?? ''}
                    onChange={(e) => updateComponent(idx, 'actual_mass', e.target.value)}
                    style={{ width: 90, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={c.purity || ''}
                    onChange={(e) => updateComponent(idx, 'purity', e.target.value)}
                    style={{ width: 70, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeComponent(idx)}
                    disabled={components.length <= 1}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>温度曲线</h3>
          <button className="btn btn-secondary btn-sm" onClick={addTempPoint}>
            + 添加一行
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>时间(min)</th>
              <th>设定温度(°C)</th>
              <th>实际温度(°C)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tempPoints.map((t, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="number"
                    value={t.time_minute || ''}
                    onChange={(e) => updateTempPoint(idx, 'time_minute', e.target.value)}
                    style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.1"
                    value={t.set_temp || ''}
                    onChange={(e) => updateTempPoint(idx, 'set_temp', e.target.value)}
                    style={{ width: 120, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.1"
                    value={t.actual_temp || ''}
                    onChange={(e) => updateTempPoint(idx, 'actual_temp', e.target.value)}
                    style={{ width: 120, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeTempPoint(idx)}
                    disabled={tempPoints.length <= 1}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>称量记录</h3>
          <button className="btn btn-secondary btn-sm" onClick={addWeighing}>
            + 添加一行
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>试剂名称</th>
              <th>理论质量(g)</th>
              <th>实际质量(g)</th>
              <th>容差(%)</th>
              <th>误差(%)</th>
              <th>是否合格</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {weighings.map((w, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={w.reagent_name}
                    onChange={(e) => updateWeighing(idx, 'reagent_name', e.target.value)}
                    style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.001"
                    value={w.theoretical_mass || ''}
                    onChange={(e) => updateWeighing(idx, 'theoretical_mass', e.target.value)}
                    style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.001"
                    value={w.actual_mass || ''}
                    onChange={(e) => updateWeighing(idx, 'actual_mass', e.target.value)}
                    style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={w.tolerance_pct || ''}
                    onChange={(e) => updateWeighing(idx, 'tolerance_pct', e.target.value)}
                    style={{ width: 80, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={w.error_pct ?? ''}
                    onChange={(e) => updateWeighing(idx, 'error_pct', e.target.value)}
                    style={{ width: 80, padding: '4px 8px', fontSize: 13 }}
                  />
                </td>
                <td>
                  <select
                    value={w.is_pass === null ? '' : String(w.is_pass)}
                    onChange={(e) =>
                      updateWeighing(
                        idx,
                        'is_pass',
                        e.target.value === '' ? null : e.target.value === 'true'
                      )
                    }
                    style={{ padding: '4px 8px', fontSize: 13 }}
                  >
                    <option value="">未判定</option>
                    <option value="true">合格</option>
                    <option value="false">不合格</option>
                  </select>
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeWeighing(idx)}
                    disabled={weighings.length <= 1}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="card">
          <div className="error-text">{error}</div>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/records')}
        >
          取消
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '提交中...' : '提交'}
        </button>
      </div>
    </div>
  );
}
