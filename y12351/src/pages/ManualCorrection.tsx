import { useState } from 'react';
import { Card, Select, Button, Input, Tag, message, Divider, Timeline } from 'antd';
import { useParameterStore } from '../store/parameterStore';
import {
  TISSUE_TYPE_LABELS,
  ARTIFACT_TYPE_LABELS,
  TissueType,
  ArtifactType,
} from '../types';
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
  const results = selectedParameterId ? getParameterResults(selectedParameterId) : [];
  const histories = selectedParameterId ? getParameterHistories(selectedParameterId) : [];

  const handleSelectParam = (id: string) => {
    setSelectedParameter(id);
    const param = parameters.find((p) => p.id === id);
    if (param) {
      setSelectedTissueType(param.tissueType || '');
      setSelectedArtifact(param.artifactLabel || '');
    }
    setChangeReason('');
  };

  const handleSaveTissueType = () => {
    if (!selectedParameterId || !selectedTissueType) {
      message.error('请选择参数和组织类型');
      return;
    }
    correctTissueType(selectedParameterId, selectedTissueType, changeReason);
    message.success('组织类型已更新，版本历史已记录');
    setChangeReason('');
  };

  const handleSaveArtifact = () => {
    if (!selectedParameterId || !selectedArtifact) {
      message.error('请选择参数和伪影类型');
      return;
    }
    updateArtifactLabel(selectedParameterId, selectedArtifact, changeReason);
    message.success('伪影标签已更新，版本历史已记录');
    setChangeReason('');
  };

  const formatImpact = (change: number | undefined) => {
    if (change === undefined) return null;
    if (change > 0) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendingUp className="w-4 h-4" />
          +{change}
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center gap-1 text-red-600">
          <TrendingDown className="w-4 h-4" />
          {change}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-slate-500">
        <Minus className="w-4 h-4" />
        无变化
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">手动修正</h1>
        <p className="text-slate-500 mt-1">
          医学物理讲师手动修正组织类型和伪影标签，新旧结果并排对比
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Edit3 className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">修正说明</h3>
            <p className="text-blue-600 text-sm mt-1">
              手动修正会记录完整的版本历史，包括修改前后的数据、修改原因和影响分析。修正后可在报告导出中查看完整的修改痕迹。
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
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  组织类型
                </label>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-lg font-semibold text-slate-800">
                    {selectedParam.tissueType
                      ? TISSUE_TYPE_LABELS[selectedParam.tissueType]
                      : '未设置'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  伪影标签
                </label>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-lg font-semibold text-slate-800">
                    {selectedParam.artifactLabel
                      ? ARTIFACT_TYPE_LABELS[selectedParam.artifactLabel]
                      : '未设置'}
                  </span>
                </div>
              </div>

              <Divider />

              <div>
                <h4 className="font-medium text-slate-700 mb-3">当前计算结果</h4>
                <div className="space-y-3">
                  {results.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-slate-50 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-700">{r.interfaceName}</p>
                        <p className="text-xs text-slate-500">
                          质量分数 {r.resultData.qualityScore} | 置信度{' '}
                          {(r.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                      <Tag color={r.resultData.recommended ? 'success' : 'error'}>
                        {r.resultData.recommended ? '推荐' : '不推荐'}
                      </Tag>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card
            title={
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                修改后（新值）
              </div>
            }
            className="border-green-200"
          >
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  组织类型
                </label>
                <Select
                  value={selectedTissueType}
                  onChange={(v) => setSelectedTissueType(v as TissueType)}
                  style={{ width: '100%' }}
                  placeholder="选择新的组织类型"
                  options={Object.entries(TISSUE_TYPE_LABELS).map(([value, label]) => ({
                    label,
                    value,
                  }))}
                  size="large"
                />
                <Button
                  type="primary"
                  onClick={handleSaveTissueType}
                  icon={<Save className="w-4 h-4" />}
                  className="mt-3 w-full"
                  disabled={!selectedTissueType || selectedTissueType === selectedParam.tissueType}
                >
                  保存组织类型修改
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  伪影标签
                </label>
                <Select
                  value={selectedArtifact}
                  onChange={(v) => setSelectedArtifact(v as ArtifactType)}
                  style={{ width: '100%' }}
                  placeholder="选择新的伪影类型"
                  options={Object.entries(ARTIFACT_TYPE_LABELS).map(([value, label]) => ({
                    label,
                    value,
                  }))}
                  size="large"
                />
                <Button
                  type="primary"
                  onClick={handleSaveArtifact}
                  icon={<Save className="w-4 h-4" />}
                  className="mt-3 w-full"
                  disabled={!selectedArtifact || selectedArtifact === selectedParam.artifactLabel}
                >
                  保存伪影标签修改
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  修改原因
                </label>
                <TextArea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  rows={3}
                  placeholder="请输入修改原因，将记录在版本历史中..."
                />
              </div>

              <Divider />

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeftRight className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">预期影响预览</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">伪影解释变化</span>
                    <Tag color="orange">可能变化</Tag>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">质量分数变化</span>
                    <span className="text-slate-800">± 10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">推荐状态变化</span>
                    <Tag color="blue">可能变化</Tag>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="text-center py-12">
          <p className="text-slate-500">请选择一个扫描参数进行手动修正</p>
        </Card>
      )}

      {selectedParam && histories.length > 0 && (
        <Card title="版本历史">
          <Timeline
            items={histories
              .sort((a, b) => b.version - a.version)
              .map((h) => ({
                color: 'blue',
                children: (
                  <div className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Tag color="blue">版本 {h.version}</Tag>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">
                      <strong>修改人：</strong>
                      {h.modifiedBy}
                    </p>
                    {h.changeReason && (
                      <p className="text-sm text-slate-600 mb-3">
                        <strong>原因：</strong>
                        {h.changeReason}
                      </p>
                    )}
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg mb-3">
                      <div>
                        <span className="text-xs text-slate-500">修改前</span>
                        <p className="font-medium text-slate-700">
                          {h.beforeData.tissueType
                            ? TISSUE_TYPE_LABELS[h.beforeData.tissueType as TissueType]
                            : h.beforeData.artifactLabel
                            ? ARTIFACT_TYPE_LABELS[h.beforeData.artifactLabel as ArtifactType]
                            : '-'}
                        </p>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-xs text-slate-500">修改后</span>
                        <p className="font-medium text-blue-600">
                          {h.afterData.tissueType
                            ? TISSUE_TYPE_LABELS[h.afterData.tissueType as TissueType]
                            : h.afterData.artifactLabel
                            ? ARTIFACT_TYPE_LABELS[h.afterData.artifactLabel as ArtifactType]
                            : '-'}
                        </p>
                      </div>
                    </div>
                    {h.impactAnalysis && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-2 bg-white rounded border">
                          <p className="text-xs text-slate-500">伪影解释变化</p>
                          <p className="text-sm mt-1">
                            {h.impactAnalysis.artifactInterpretationChange ? (
                              <span className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="w-3 h-3" />
                                有变化
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                无变化
                              </span>
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
                ),
              }))}
          />
        </Card>
      )}
    </div>
  );
};
