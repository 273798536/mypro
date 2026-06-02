import { useState, useMemo } from 'react';
import { Card, Select, Button, Input, Tag, message, Divider, Timeline } from 'antd';
import { useParameterStore } from '../store/parameterStore';
import {
  TISSUE_TYPE_LABELS,
  ARTIFACT_TYPE_LABELS,
  TissueType,
  ArtifactType,
  InterfaceResult,
  VersionHistory,
} from '../types';
import { computeResults } from '../services/mockData';
import {
  Edit3,
  Save,
  ArrowLeftRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

const { TextArea } = Input;

interface RowDef {
  key: string;
  label: string;
  get: (r: InterfaceResult) => string | number;
}

const METRIC_ROWS: RowDef[] = [
  { key: 'snr', label: '信噪比 (SNR)', get: (r) => r.resultData.snr?.toFixed(1) ?? '-' },
  { key: 'cnr', label: '对比度噪声比 (CNR)', get: (r) => r.resultData.cnr?.toFixed(1) ?? '-' },
  { key: 'tissueContrast', label: '组织对比度', get: (r) => r.resultData.tissueContrast?.toFixed(2) ?? '-' },
  { key: 'scanTime', label: '扫描时间 (秒)', get: (r) => r.resultData.scanTime ?? '-' },
  { key: 'artifactProbability', label: '伪影概率', get: (r) => r.resultData.artifactProbability != null ? `${(r.resultData.artifactProbability * 100).toFixed(1)}%` : '-' },
  { key: 'qualityScore', label: '质量分数', get: (r) => r.resultData.qualityScore ?? '-' },
  { key: 'recommended', label: '推荐状态', get: (r) => r.resultData.recommended ? '推荐' : '不推荐' },
  { key: 'confidence', label: '置信度', get: (r) => `${(r.confidence * 100).toFixed(0)}%` },
];

function DiffCell({ oldVal, newVal, lowerIsBetter }: { oldVal: string | number; newVal: string | number; lowerIsBetter?: boolean }) {
  if (oldVal === '-' || newVal === '-') return <span>-</span>;
  const o = typeof oldVal === 'string' ? parseFloat(oldVal) : oldVal;
  const n = typeof newVal === 'string' ? parseFloat(newVal) : newVal;
  if (isNaN(o) || isNaN(n)) return <span>{String(newVal)}</span>;
  const diff = n - o;
  if (Math.abs(diff) < 0.01) return <span className="text-slate-400">-</span>;
  const positive = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
      {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {diff > 0 ? '+' : ''}{Number.isInteger(diff) ? diff : diff.toFixed(1)}
    </span>
  );
}

export const ManualCorrection = () => {
  const {
    parameters,
    selectedParameterId,
    setSelectedParameter,
    getParameterResults,
    getParameterHistories,
    correctTissueType,
    updateArtifactLabel,
  } = useParameterStore();

  const [selectedTissueType, setSelectedTissueType] = useState<TissueType | ''>('');
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType | ''>('');
  const [changeReason, setChangeReason] = useState('');

  const selectedParam = parameters.find((p) => p.id === selectedParameterId);
  const currentResults = selectedParameterId ? getParameterResults(selectedParameterId) : [];
  const histories = selectedParameterId ? getParameterHistories(selectedParameterId) : [];

  const previewResults = useMemo(() => {
    if (!selectedParam) return [];
    const preview: typeof selectedParam = {
      ...selectedParam,
      tissueType: (selectedTissueType || selectedParam.tissueType) as TissueType | undefined,
      artifactLabel: (selectedArtifact || selectedParam.artifactLabel) as ArtifactType | undefined,
    };
    return computeResults(preview);
  }, [selectedParam, selectedTissueType, selectedArtifact]);

  const hasTissueChange = selectedTissueType && selectedTissueType !== selectedParam?.tissueType;
  const hasArtifactChange = selectedArtifact && selectedArtifact !== selectedParam?.artifactLabel;
  const hasAnyChange = hasTissueChange || hasArtifactChange;

  const handleSelectParam = (id: string) => {
    setSelectedParameter(id);
    const param = parameters.find((p) => p.id === id);
    if (param) {
      setSelectedTissueType(param.tissueType || '');
      setSelectedArtifact(param.artifactLabel || '');
    }
    setChangeReason('');
  };

  const handleSave = () => {
    if (!selectedParameterId || !hasAnyChange) {
      message.error('未做任何修改');
      return;
    }
    if (hasTissueChange) {
      correctTissueType(selectedParameterId, selectedTissueType as TissueType, changeReason);
    }
    if (hasArtifactChange) {
      updateArtifactLabel(selectedParameterId, selectedArtifact as ArtifactType, changeReason);
    }
    message.success('修正已保存，参数对比和异常检测结果已重新计算');
    setChangeReason('');
  };

  const labelOfBefore = (h: VersionHistory) => {
    if (h.beforeData.tissueType) return TISSUE_TYPE_LABELS[h.beforeData.tissueType as TissueType];
    if (h.beforeData.artifactLabel) return ARTIFACT_TYPE_LABELS[h.beforeData.artifactLabel as ArtifactType];
    return '-';
  };
  const labelOfAfter = (h: VersionHistory) => {
    if (h.afterData.tissueType) return TISSUE_TYPE_LABELS[h.afterData.tissueType as TissueType];
    if (h.afterData.artifactLabel) return ARTIFACT_TYPE_LABELS[h.afterData.artifactLabel as ArtifactType];
    return '-';
  };

  const formatImpact = (change: number | undefined) => {
    if (change === undefined) return <span className="text-slate-400">-</span>;
    if (change > 0) {
      return <span className="flex items-center gap-1 text-green-600"><TrendingUp className="w-4 h-4" />+{change}</span>;
    }
    if (change < 0) {
      return <span className="flex items-center gap-1 text-red-600"><TrendingDown className="w-4 h-4" />{change}</span>;
    }
    return <span className="flex items-center gap-1 text-slate-500"><Minus className="w-4 h-4" />无变化</span>;
  };

  const sortedHistories = histories.length > 0 ? [...histories].sort((a, b) => b.version - a.version) : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">手动修正</h1>
        <p className="text-slate-500 mt-1">
          医学物理讲师手动修正组织类型和伪影标签，修正后自动重新计算参数对比和异常检测
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Edit3 className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">修正说明</h3>
            <p className="text-blue-600 text-sm mt-1">
              修正组织类型或伪影标签后，系统会自动重新计算所有接口结果并更新异常检测。修改前后的计算结果将在下方并排展示，版本历史记录真实的数值差异。
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <span className="text-slate-600 font-medium">选择参数：</span>
        <Select
          value={selectedParameterId}
          onChange={handleSelectParam}
          style={{ width: 400 }}
          placeholder="请选择一个扫描参数进行修正"
          options={parameters.map((p) => ({
            label: `${p.id} - ${p.scanType}`,
            value: p.id,
          }))}
        />
      </div>

      {selectedParam ? (
        <>
          <div className="grid grid-cols-2 gap-6">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  修改前（当前值）
                </div>
              }
              className="border-amber-200"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">组织类型</label>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-lg font-semibold text-slate-800">
                        {selectedParam.tissueType ? TISSUE_TYPE_LABELS[selectedParam.tissueType] : '未设置'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">伪影标签</label>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-lg font-semibold text-slate-800">
                        {selectedParam.artifactLabel ? ARTIFACT_TYPE_LABELS[selectedParam.artifactLabel] : '未设置'}
                      </span>
                    </div>
                  </div>
                </div>

                {currentResults.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-amber-50">
                          <th className="p-2 text-left border font-medium text-slate-600">指标</th>
                          {currentResults.map((r) => (
                            <th key={r.interfaceName} className="p-2 text-center border font-medium text-slate-600">{r.interfaceName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {METRIC_ROWS.map((row) => (
                          <tr key={row.key}>
                            <td className="p-2 border text-slate-600">{row.label}</td>
                            {currentResults.map((r) => (
                              <td key={r.interfaceName} className="p-2 text-center border">
                                {row.key === 'recommended'
                                  ? <Tag color={r.resultData.recommended ? 'success' : 'error'}>{row.get(r)}</Tag>
                                  : row.get(r)
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>

            <Card
              title={
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  修改后（预览）
                  {hasAnyChange && <Tag color="blue">有改动</Tag>}
                </div>
              }
              className="border-green-200"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">组织类型</label>
                    <Select
                      value={selectedTissueType}
                      onChange={(v) => setSelectedTissueType(v as TissueType)}
                      style={{ width: '100%' }}
                      placeholder="选择新的组织类型"
                      options={Object.entries(TISSUE_TYPE_LABELS).map(([value, label]) => ({ label, value }))}
                      size="large"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">伪影标签</label>
                    <Select
                      value={selectedArtifact}
                      onChange={(v) => setSelectedArtifact(v as ArtifactType)}
                      style={{ width: '100%' }}
                      placeholder="选择新的伪影类型"
                      options={Object.entries(ARTIFACT_TYPE_LABELS).map(([value, label]) => ({ label, value }))}
                      size="large"
                    />
                  </div>
                </div>

                {previewResults.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-green-50">
                          <th className="p-2 text-left border font-medium text-slate-600">指标</th>
                          {previewResults.map((r) => (
                            <th key={r.interfaceName} className="p-2 text-center border font-medium text-slate-600">{r.interfaceName}</th>
                          ))}
                          {hasAnyChange && <th className="p-2 text-center border font-medium text-slate-600">差异</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {METRIC_ROWS.map((row) => (
                          <tr key={row.key}>
                            <td className="p-2 border text-slate-600">{row.label}</td>
                            {previewResults.map((r) => {
                              const val = row.get(r);
                              return (
                                <td key={r.interfaceName} className="p-2 text-center border">
                                  {row.key === 'recommended'
                                    ? <Tag color={r.resultData.recommended ? 'success' : 'error'}>{val}</Tag>
                                    : val
                                  }
                                </td>
                              );
                            })}
                            {hasAnyChange && (
                              <td className="p-2 text-center border">
                                {(() => {
                                  const oldR = currentResults[0];
                                  const newR = previewResults[0];
                                  if (!oldR || !newR) return '-';
                                  const oVal = parseFloat(String(row.get(oldR)));
                                  const nVal = parseFloat(String(row.get(newR)));
                                  if (isNaN(oVal) || isNaN(nVal)) return <span className="text-slate-400">-</span>;
                                  return <DiffCell oldVal={oVal} newVal={nVal} lowerIsBetter={row.key === 'scanTime' || row.key === 'artifactProbability'} />;
                                })()}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Divider />

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">修改原因</label>
                  <TextArea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    rows={2}
                    placeholder="请输入修改原因，将记录在版本历史中..."
                  />
                </div>

                <Button
                  type="primary"
                  onClick={handleSave}
                  icon={<Save className="w-4 h-4" />}
                  className="w-full"
                  disabled={!hasAnyChange}
                  size="large"
                >
                  保存修正并重新计算
                </Button>
              </div>
            </Card>
          </div>

          {hasAnyChange && (
            <Card
              title={
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                  新旧结果逐指标对比
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-3 text-left border font-medium text-slate-600">指标</th>
                      <th className="p-3 text-center border font-medium text-amber-600">修改前 (均值)</th>
                      <th className="p-3 text-center border font-medium text-green-600">修改后 (均值)</th>
                      <th className="p-3 text-center border font-medium text-blue-600">变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {METRIC_ROWS.filter((r) => r.key !== 'recommended').map((row) => {
                      const oldAvg = currentResults.length > 0
                        ? currentResults.reduce((s, r) => s + (parseFloat(String(row.get(r))) || 0), 0) / currentResults.length
                        : NaN;
                      const newAvg = previewResults.length > 0
                        ? previewResults.reduce((s, r) => s + (parseFloat(String(row.get(r))) || 0), 0) / previewResults.length
                        : NaN;
                      return (
                        <tr key={row.key} className="hover:bg-slate-50">
                          <td className="p-3 border font-medium text-slate-700">{row.label}</td>
                          <td className="p-3 text-center border text-amber-700">
                            {isNaN(oldAvg) ? '-' : (Number.isInteger(oldAvg) ? oldAvg : oldAvg.toFixed(2))}
                          </td>
                          <td className="p-3 text-center border text-green-700">
                            {isNaN(newAvg) ? '-' : (Number.isInteger(newAvg) ? newAvg : newAvg.toFixed(2))}
                          </td>
                          <td className="p-3 text-center border">
                            {isNaN(oldAvg) || isNaN(newAvg) ? '-' : (
                              <DiffCell
                                oldVal={Math.round(oldAvg * 10) / 10}
                                newVal={Math.round(newAvg * 10) / 10}
                                lowerIsBetter={row.key === 'scanTime' || row.key === 'artifactProbability'}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {sortedHistories.length > 0 && (
            <Card title="版本历史">
              <Timeline mode="left">
                {sortedHistories.map((h) => (
                  <Timeline.Item key={h.id} color="blue">
                    <div className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Tag color="blue">版本 {h.version}</Tag>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(h.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">
                        <strong>修改人：</strong>{h.modifiedBy}
                      </p>
                      {h.changeReason && (
                        <p className="text-sm text-slate-600 mb-3">
                          <strong>原因：</strong>{h.changeReason}
                        </p>
                      )}
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg mb-3">
                        <div>
                          <span className="text-xs text-slate-500">修改前</span>
                          <p className="font-medium text-slate-700">
                            {labelOfBefore(h)}
                          </p>
                        </div>
                        <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="text-xs text-slate-500">修改后</span>
                          <p className="font-medium text-blue-600">
                            {labelOfAfter(h)}
                          </p>
                        </div>
                      </div>
                      {h.impactAnalysis && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-2 bg-white rounded border">
                            <p className="text-xs text-slate-500">伪影解释变化</p>
                            <p className="text-sm mt-1">
                              {h.impactAnalysis.artifactInterpretationChange ? (
                                <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" />有变化</span>
                              ) : (
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" />无变化</span>
                              )}
                            </p>
                          </div>
                          <div className="p-2 bg-white rounded border">
                            <p className="text-xs text-slate-500">质量分数变化</p>
                            <p className="text-sm mt-1">{formatImpact(h.impactAnalysis.qualityScoreChange)}</p>
                          </div>
                          <div className="p-2 bg-white rounded border">
                            <p className="text-xs text-slate-500">推荐状态变化</p>
                            <p className="text-sm mt-1">
                              {h.impactAnalysis.recommendationChange ? (
                                <Tag color="orange">有变化</Tag>
                              ) : (
                                <Tag color="green">无变化</Tag>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          )}
        </>
      ) : (
        <Card className="text-center py-12">
          <p className="text-slate-500">请选择一个扫描参数进行手动修正</p>
        </Card>
      )}
    </div>
  );
};
