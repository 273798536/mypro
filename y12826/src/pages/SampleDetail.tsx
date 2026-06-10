import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Microscope,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  GitCompare,
  Info,
  Sparkles,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import ActionPanel from '@/components/ActionPanel';
import { formatDateTime, formatNumber, contaminationTypeLabels as ctLabels } from '@/utils/formatters';
import { compareVersions, formatChange } from '@/utils/versionDiff';

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const { getSampleById, getSampleVersions, qcThresholds } = useAuditStore();

  const sample = getSampleById(id || '');
  const versions = getSampleVersions(id || '');
  const [showVersionCompare, setShowVersionCompare] = useState(false);
  const [compareVersion, setCompareVersion] = useState<number>(1);

  if (!sample) {
    return (
      <div className="p-6">
        <p className="text-slate-400">样本不存在</p>
        <Link to="/" className="text-teal-400 hover:text-teal-300 text-sm">
          返回看板
        </Link>
      </div>
    );
  }

  const metrics = sample.qualityMetrics;
  const oldVersion = versions.find(v => v.version === compareVersion);
  const newVersion = versions.find(v => v.version === sample.currentVersion);
  const versionDiff =
    oldVersion && newVersion && oldVersion.version !== newVersion.version
      ? compareVersions(oldVersion, newVersion)
      : null;

  const metricItems = [
    {
      key: 'proteinConcentration',
      label: '蛋白浓度',
      value: metrics.proteinConcentration,
      unit: 'μg/mL',
      threshold: `≥ ${qcThresholds.minProteinConcentration}`,
      pass: metrics.proteinConcentration >= qcThresholds.minProteinConcentration,
      warning:
        metrics.proteinConcentration >= qcThresholds.minProteinConcentration &&
        metrics.proteinConcentration < qcThresholds.minProteinConcentration * 1.2,
    },
    {
      key: 'purity',
      label: '纯度',
      value: metrics.purity,
      unit: '%',
      threshold: `≥ ${qcThresholds.minPurity}%`,
      pass: metrics.purity >= qcThresholds.minPurity,
      warning:
        metrics.purity >= qcThresholds.minPurity &&
        metrics.purity < qcThresholds.minPurity + 5,
    },
    {
      key: 'integrity',
      label: '完整性',
      value: metrics.integrity,
      unit: '%',
      threshold: `≥ ${qcThresholds.minIntegrity}%`,
      pass: metrics.integrity >= qcThresholds.minIntegrity,
      warning:
        metrics.integrity >= qcThresholds.minIntegrity &&
        metrics.integrity < qcThresholds.minIntegrity + 5,
    },
    {
      key: 'backgroundNoise',
      label: '背景噪声',
      value: metrics.backgroundNoise,
      unit: 'dB',
      threshold: `≤ ${qcThresholds.maxBackgroundNoise} dB`,
      pass: metrics.backgroundNoise <= qcThresholds.maxBackgroundNoise,
      warning:
        metrics.backgroundNoise <= qcThresholds.maxBackgroundNoise &&
        metrics.backgroundNoise > qcThresholds.maxBackgroundNoise * 0.8,
    },
    {
      key: 'particleCount',
      label: '颗粒计数',
      value: metrics.particleCount,
      unit: '个',
      threshold: '参考值',
      pass: true,
      warning: false,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl text-slate-100">{sample.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={sample.status} />
              <span className="text-xs text-slate-500">
                v{sample.currentVersion} · {formatDateTime(sample.collectedAt)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowVersionCompare(!showVersionCompare)}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
            showVersionCompare
              ? 'bg-teal-700 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          版本对比
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card title="显微照片" subtitle="样本显微镜成像">
            <div className="space-y-4">
              <div className="relative rounded overflow-hidden bg-slate-950">
                <img
                  src={sample.micrographUrl}
                  alt={sample.name}
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                  原始照片
                </div>
              </div>
              {sample.micrographModifiedUrl && (
                <div className="relative rounded overflow-hidden bg-slate-950">
                  <img
                    src={sample.micrographModifiedUrl}
                    alt={`${sample.name} 修改后`}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-teal-900/80 rounded text-xs text-teal-200">
                    处理后照片
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="样本信息" subtitle="基础元数据">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">样本ID</dt>
                <dd className="text-slate-300 font-mono">{sample.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">来源材料</dt>
                <dd className="text-slate-300 text-right">{sample.sourceMaterial}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">采集时间</dt>
                <dd className="text-slate-300 text-right">{formatDateTime(sample.collectedAt)}</dd>
              </div>
              <div className="flex justify-between items-start">
                <dt className="text-slate-500">物种名称</dt>
                <dd className="text-slate-300 text-right">{sample.species}</dd>
              </div>
              {sample.hasSpeciesSynonymIssue && (
                <div className="bg-amber-900/20 border border-amber-700/50 rounded p-3 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-300 font-medium">物种同义名提醒</p>
                      <p className="text-xs text-amber-400/80 mt-1">
                        录入名：{sample.species}
                        <br />
                        标准名：{sample.speciesCanonical}
                      </p>
                      <p className="text-xs text-amber-400/60 mt-2">
                        系统已自动识别为同义名，如误判请人工复核。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </dl>
          </Card>

          <Card title="操作面板" subtitle="审计操作工具">
            <ActionPanel batchId={sample.batchId} sampleId={sample.id} />
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="质控指标" subtitle="与阈值对比">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metricItems.map(item => (
                <div
                  key={item.key}
                  className={`p-4 rounded border ${
                    item.pass
                      ? item.warning
                        ? 'bg-amber-900/10 border-amber-700/30'
                        : 'bg-slate-800/50 border-slate-700'
                      : 'bg-red-900/10 border-red-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">{item.label}</span>
                    {item.pass ? (
                      item.warning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-teal-500" />
                      )
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-display text-2xl ${
                        item.pass ? (item.warning ? 'text-amber-400' : 'text-slate-100') : 'text-red-400'
                      }`}
                    >
                      {formatNumber(item.value, item.key === 'particleCount' ? 0 : 2)}
                    </span>
                    <span className="text-sm text-slate-500">{item.unit}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">阈值：{item.threshold}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="污染检测结果" subtitle="污染类型与置信度">
            <div
              className={`p-5 rounded border ${
                sample.contamination.detected
                  ? sample.status === 'contaminated'
                    ? 'bg-red-900/20 border-red-700/40'
                    : 'bg-amber-900/20 border-amber-700/40'
                  : 'bg-teal-900/10 border-teal-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {sample.contamination.detected ? (
                    <AlertTriangle
                      className={`w-6 h-6 ${
                        sample.status === 'contaminated' ? 'text-red-500' : 'text-amber-500'
                      }`}
                    />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-teal-500" />
                  )}
                  <div>
                    <p
                      className={`font-semibold ${
                        sample.contamination.detected
                          ? sample.status === 'contaminated'
                            ? 'text-red-300'
                            : 'text-amber-300'
                          : 'text-teal-300'
                      }`}
                    >
                      {sample.contamination.detected
                        ? `检测到${ctLabels[sample.contamination.type] || '异常'}`
                        : '未检测到污染'}
                    </p>
                    <p className="text-sm text-slate-400">
                      置信度：{(sample.contamination.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="w-32 h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sample.contamination.confidence > 0.8
                        ? 'bg-red-500'
                        : sample.contamination.confidence > 0.6
                        ? 'bg-amber-500'
                        : 'bg-teal-500'
                    }`}
                    style={{ width: `${sample.contamination.confidence * 100}%` }}
                  />
                </div>
              </div>

              {sample.contamination.detected && sample.contamination.suspectedSource && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-400">疑似污染来源</p>
                      <p className="text-sm text-slate-200 mt-1">
                        {sample.contamination.suspectedSource}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {sample.manualNote && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-indigo-300">人工确认备注</p>
                      <p className="text-sm text-slate-300 mt-1">{sample.manualNote}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {showVersionCompare && (
            <Card
              title="版本对比"
              subtitle={`对比 v${compareVersion} 与 v${sample.currentVersion}`}
              headerAction={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">对比版本：</span>
                  <select
                    value={compareVersion}
                    onChange={e => setCompareVersion(parseInt(e.target.value))}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none"
                  >
                    {versions.map(v => (
                      <option key={v.version} value={v.version}>
                        v{v.version} - {v.reason}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              {versionDiff ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-800/50 rounded">
                      <p className="text-xs text-slate-500 mb-1">旧状态</p>
                      <StatusBadge status={versionDiff.oldStatus} size="sm" />
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded">
                      <p className="text-xs text-slate-500 mb-1">新状态</p>
                      <StatusBadge status={versionDiff.newStatus} size="sm" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-slate-400">质控指标变化</p>
                    {versionDiff.metrics.map(m => (
                      <div
                        key={m.metric}
                        className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                      >
                        <span className="text-sm text-slate-300">{m.metric}</span>
                        <div className="flex items-center gap-4 text-sm font-mono">
                          <span className="text-slate-500">{m.oldValue.toFixed(2)}</span>
                          <span className="text-slate-600">→</span>
                          <span className="text-slate-200">{m.newValue.toFixed(2)}</span>
                          <span
                            className={`text-xs ${
                              m.change > 0 ? 'text-teal-400' : m.change < 0 ? 'text-red-400' : 'text-slate-500'
                            }`}
                          >
                            {formatChange(m.change, m.changePercent)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {versionDiff.contaminationChanged && (
                    <div className="p-3 bg-amber-900/20 border border-amber-700/40 rounded">
                      <p className="text-sm text-amber-300 font-medium mb-2">污染检测结果变化</p>
                      <div className="text-xs text-amber-200/80 space-y-1">
                        <p>
                          旧：
                          {versionDiff.oldContamination.detected
                            ? `${ctLabels[versionDiff.oldContamination.type]} (${(versionDiff.oldContamination.confidence * 100).toFixed(1)}%)`
                            : '未检测到'}
                        </p>
                        <p>
                          新：
                          {versionDiff.newContamination.detected
                            ? `${ctLabels[versionDiff.newContamination.type]} (${(versionDiff.newContamination.confidence * 100).toFixed(1)}%)`
                            : '未检测到'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">
                  请选择不同版本进行对比
                </p>
              )}
            </Card>
          )}

          <Card title="版本历史" subtitle={`共 ${versions.length} 个版本`}>
            <div className="space-y-0">
              {[...versions].reverse().map((v, idx) => (
                <div
                  key={v.version}
                  className={`flex items-start gap-4 py-3 ${
                    idx !== versions.length - 1 ? 'border-b border-slate-800' : ''
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        v.version === sample.currentVersion
                          ? 'bg-teal-500'
                          : 'bg-slate-600'
                      }`}
                    />
                    {idx !== versions.length - 1 && (
                      <div className="w-px h-full bg-slate-800 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">版本 v{v.version}</span>
                      <StatusBadge status={v.status} size="sm" />
                      {v.version === sample.currentVersion && (
                        <span className="text-xs text-teal-400 bg-teal-900/30 px-2 py-0.5 rounded">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(v.timestamp)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {v.reason === 'initial'
                          ? '初始版本'
                          : v.reason === 're_run'
                          ? '重复运行'
                          : v.reason === 'qc_param_change'
                          ? '质控参数变更'
                          : '补录样本'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
