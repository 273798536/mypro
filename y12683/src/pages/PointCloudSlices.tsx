import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  FileText,
  CheckCircle,
  Calendar,
  Hash,
  ArrowRight,
  ArrowLeft,
  Plus,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store';
import CrossSectionViewer from '@/components/CrossSectionViewer';
import { RiskBadge, ResultBadge, ImportSliceStatusBadge } from '@/components/StatusBadge';
import { formatDate, formatNumber, formatDateShort } from '@/utils/format';
import { calculateWithFormula, getFormulaById } from '@/utils/formulas';

export default function PointCloudSlices() {
  const navigate = useNavigate();
  const {
    slices,
    selectedSliceId,
    selectSlice,
    measurements,
    conclusions,
    getMeasurementsBySlice,
    getConclusionsByMeasurement,
    addMeasurement,
    addConclusion,
    updateMeasurement,
    updateConclusion,
  } = useAppStore();

  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);
  const [editingConclusion, setEditingConclusion] = useState<string | null>(null);
  const [newConclusionText, setNewConclusionText] = useState('');
  const [showNewMeasurement, setShowNewMeasurement] = useState(false);
  const [measurementParams, setMeasurementParams] = useState<Record<string, number>>({});

  const selectedSlice = slices.find((s) => s.id === selectedSliceId) || slices[0];
  const sliceMeasurements = selectedSlice
    ? getMeasurementsBySlice(selectedSlice.id)
    : [];

  const handleQuickCalc = (sliceId: string, formulaType: string) => {
    const slice = slices.find((s) => s.id === sliceId);
    if (!slice) return;

    const formula = getFormulaById(formulaType);
    if (!formula) return;

    const params: Record<string, number> = {};
    formula.parameters.forEach((p) => {
      params[p.name] = p.defaultValue ?? 0;
    });

    const result = calculateWithFormula(formulaType, params);

    if (result.success) {
      const calculatedValues: Record<string, number> = {};
      if (formulaType.includes('olume') || formulaType === 'cylindrical' || formulaType === 'spherical' || formulaType === 'conical') {
        calculatedValues.volume = result.value ?? 0;
      } else {
        calculatedValues.result = result.value ?? 0;
      }

      addMeasurement({
        relatedSliceId: sliceId,
        tankId: slice.tankId,
        tankName: slice.tankName,
        parameters: params,
        calculatedValues,
        formulaType,
        notes: '切片快速计算生成',
      });
      setShowNewMeasurement(false);
    }
  };

  const handleGenerateConclusion = (measurementId: string) => {
    const measurement = measurements.find((m) => m.id === measurementId);
    if (!measurement) return;

    const volume = measurement.calculatedValues.volume ?? measurement.calculatedValues.result ?? 0;
    let result: 'pass' | 'warning' | 'fail' = 'pass';
    let summary = '';
    let details = '';

    if (volume > 450) {
      result = 'pass';
      summary = `${measurement.tankName}容量正常`;
      details = `实际容积${formatNumber(volume)}m³，在标准范围内(±5%)。点云质量良好。`;
    } else if (volume > 350) {
      result = 'warning';
      summary = `${measurement.tankName}需关注`;
      details = `容积${formatNumber(volume)}m³略低于标准值，建议近期复检确认。`;
    } else {
      result = 'fail';
      summary = `${measurement.tankName}容量异常`;
      details = `容积${formatNumber(volume)}m³明显低于标准值，请立即安排检修。`;
    }

    addConclusion({
      relatedMeasurementId: measurementId,
      result,
      summary,
      details,
    });
    setNewConclusionText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">点云切片处理</h1>
          <p className="text-tech-gray-400 mt-1">切片整理与剖面图回看 - 测量记录与结论双向关联</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-deep-sea-400" />
            切片列表
          </h3>
          <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-thin pr-1">
            {slices.map((slice) => (
              <button
                key={slice.id}
                onClick={() => selectSlice(slice.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  selectedSliceId === slice.id
                    ? 'bg-deep-sea-500/20 border border-deep-sea-500/30'
                    : 'bg-tech-gray-900/40 border border-transparent hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium">{slice.tankName}</span>
                  <ImportSliceStatusBadge status={slice.importStatus} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-tech-gray-500">{formatDateShort(slice.timestamp)}</p>
                  {slice.collisionRisk && <RiskBadge risk={slice.collisionRisk} />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-3 space-y-6">
          {selectedSlice ? (
            <>
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      {selectedSlice.tankName}
                      <span className="text-xs font-mono text-tech-gray-500">{selectedSlice.id}</span>
                    </h2>
                    <p className="text-sm text-tech-gray-400 mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(selectedSlice.timestamp)}
                      <Hash className="w-3 h-3 inline ml-3 mr-1" />
                      {formatNumber(selectedSlice.pointCount, 0)} 个点
                      <span className="ml-3 font-mono text-xs text-tech-gray-500">
                        {selectedSlice.fingerprint}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedSlice.collisionRisk && <RiskBadge risk={selectedSlice.collisionRisk} />}
                    <ImportSliceStatusBadge status={selectedSlice.importStatus} />
                  </div>
                </div>
                <CrossSectionViewer crossSection={selectedSlice.crossSection} height="320px" />
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-tech-gray-900/40">
                    <p className="text-xs text-tech-gray-500">点密度</p>
                    <p className="text-white font-semibold">{selectedSlice.pointDensity} points/m³</p>
                  </div>
                  <div className="p-3 rounded-lg bg-tech-gray-900/40">
                    <p className="text-xs text-tech-gray-500">间距偏差</p>
                    <p className={`font-semibold ${
                      (selectedSlice.spacingDeviation ?? 0) > 15 ? 'text-warning-orange-500' : 'text-white'
                    }`}>
                      {selectedSlice.spacingDeviation}%
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-tech-gray-900/40">
                    <p className="text-xs text-tech-gray-500">碰撞指数</p>
                    <p className={`font-semibold ${
                      (selectedSlice.collisionIndex ?? 0) > 1500 ? 'text-warning-orange-500' : 'text-white'
                    }`}>
                      {selectedSlice.collisionIndex}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-deep-sea-400" />
                    测量记录
                    <span className="text-xs text-tech-gray-500 font-normal">
                      ({sliceMeasurements.length} 条)
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowNewMeasurement(!showNewMeasurement)}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    快速计算
                  </button>
                </div>

                {showNewMeasurement && (
                  <div className="mb-4 p-4 rounded-xl bg-tech-gray-900/60 border border-deep-sea-500/30">
                    <p className="text-sm text-white mb-3">选择计算公式快速生成测量记录：</p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleQuickCalc(selectedSlice.id, 'cylindrical')} className="btn-secondary text-sm">
                        圆柱形舱体
                      </button>
                      <button onClick={() => handleQuickCalc(selectedSlice.id, 'conical')} className="btn-secondary text-sm">
                        锥形舱体
                      </button>
                      <button onClick={() => handleQuickCalc(selectedSlice.id, 'pointDensity')} className="btn-secondary text-sm">
                        点云密度
                      </button>
                      <button onClick={() => handleQuickCalc(selectedSlice.id, 'collisionIndex')} className="btn-secondary text-sm">
                        碰撞风险
                      </button>
                      <button onClick={() => setShowNewMeasurement(false)} className="btn-secondary text-sm">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {sliceMeasurements.length === 0 ? (
                    <p className="text-tech-gray-500 text-center py-8">暂无测量记录，点击"快速计算"生成</p>
                  ) : (
                    sliceMeasurements.map((measurement) => {
                      const relatedConclusions = getConclusionsByMeasurement(measurement.id);
                      const isEditingMeas = editingMeasurement === measurement.id;

                      return (
                        <div
                          key={measurement.id}
                          className="p-4 rounded-xl bg-tech-gray-900/40 border border-white/10"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-white font-semibold">{measurement.id}</span>
                                {measurement.isSupplementary && (
                                  <span className="status-badge bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                    补录数据
                                  </span>
                                )}
                                <span className="text-xs text-tech-gray-500">
                                  {formatDate(measurement.createdAt)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-2">
                                {Object.entries(measurement.parameters).map(([key, value]) => (
                                  <div key={key} className="text-sm">
                                    <span className="text-tech-gray-500">{key}: </span>
                                    {isEditingMeas ? (
                                      <input
                                        type="number"
                                        defaultValue={value}
                                        className="w-20 px-2 py-1 rounded bg-tech-gray-800 border border-white/10 text-white text-sm"
                                        onBlur={(e) => {
                                          const newParams = { ...measurement.parameters, [key]: parseFloat(e.target.value) };
                                          const result = calculateWithFormula(measurement.formulaType, newParams);
                                          updateMeasurement(measurement.id, {
                                            parameters: newParams,
                                            calculatedValues: result.success
                                              ? { ...measurement.calculatedValues, volume: result.value, result: result.value }
                                              : measurement.calculatedValues,
                                          });
                                        }}
                                      />
                                    ) : (
                                      <span className="text-white">{value}</span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-tech-gray-500">计算结果:</span>
                                {Object.entries(measurement.calculatedValues).map(([key, value]) => (
                                  <span key={key} className="text-deep-sea-400 font-medium">
                                    {formatNumber(value)} {key === 'volume' ? 'm³' : ''}
                                  </span>
                                ))}
                              </div>

                              {measurement.notes && (
                                <p className="text-xs text-tech-gray-500 mt-2">备注: {measurement.notes}</p>
                              )}
                            </div>

                            <button
                              onClick={() => setEditingMeasurement(isEditingMeas ? null : measurement.id)}
                              className="p-2 rounded-lg hover:bg-white/10 text-tech-gray-400 hover:text-white transition-colors"
                            >
                              {isEditingMeas ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                            </button>
                          </div>

                          {relatedConclusions.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <p className="text-xs text-tech-gray-500 mb-2 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" />
                                关联结论
                              </p>
                              {relatedConclusions.map((conclusion) => {
                                const isEditingConc = editingConclusion === conclusion.id;
                                return (
                                  <div
                                    key={conclusion.id}
                                    className="p-3 rounded-lg bg-deep-sea-500/10 border border-deep-sea-500/20"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <ResultBadge result={conclusion.result} />
                                          <span className="text-white text-sm font-medium">
                                            {conclusion.summary}
                                          </span>
                                          <button
                                            onClick={() => navigate('/')}
                                            className="text-xs text-deep-sea-400 hover:text-deep-sea-300 flex items-center gap-0.5"
                                          >
                                            <ArrowLeft className="w-3 h-3" /> 回看点云
                                          </button>
                                        </div>
                                        {isEditingConc ? (
                                          <textarea
                                            defaultValue={conclusion.details}
                                            className="w-full mt-2 p-2 rounded-lg bg-tech-gray-900/80 border border-white/10 text-sm text-white"
                                            rows={2}
                                            onBlur={(e) => updateConclusion(conclusion.id, { details: e.target.value })}
                                          />
                                        ) : (
                                          <p className="text-sm text-tech-gray-400">{conclusion.details}</p>
                                        )}
                                        <p className="text-xs text-tech-gray-600 mt-1">
                                          {conclusion.id} · {formatDate(conclusion.createdAt)}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => setEditingConclusion(isEditingConc ? null : conclusion.id)}
                                        className="p-1.5 rounded hover:bg-white/10 text-tech-gray-400 hover:text-white transition-colors"
                                      >
                                        {isEditingConc ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {relatedConclusions.length === 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="输入结论详情..."
                                  value={newConclusionText}
                                  onChange={(e) => setNewConclusionText(e.target.value)}
                                  className="flex-1 input-field text-sm py-2"
                                />
                                <button
                                  onClick={() => handleGenerateConclusion(measurement.id)}
                                  className="btn-success text-sm flex items-center gap-1.5"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                  生成结论
                                </button>
                              </div>
                              <p className="text-xs text-tech-gray-500 mt-2">
                                点击按钮将根据测量数据自动生成结论，也可手动编辑
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center text-tech-gray-500">
              请从左侧选择切片查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
