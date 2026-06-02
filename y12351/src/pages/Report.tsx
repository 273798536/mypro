import { useState, useRef } from 'react';
import { Card, Select, Button, message, Tag, Divider, Timeline } from 'antd';
import { useParameterStore } from '../store/parameterStore';
import {
  TISSUE_TYPE_LABELS,
  ARTIFACT_TYPE_LABELS,
  ANOMALY_TYPE_LABELS,
  TissueType,
  ArtifactType,
  VersionHistory,
} from '../types';
import {
  FileText,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

export const Report = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const {
    parameters,
    selectedParameterId,
    setSelectedParameter,
    getParameterResults,
    getParameterAnomalies,
    getParameterHistories,
  } = useParameterStore();

  const [isExporting, setIsExporting] = useState(false);

  const selectedParam = parameters.find((p) => p.id === selectedParameterId);
  const results = selectedParameterId ? getParameterResults(selectedParameterId) : [];
  const anomalies = selectedParameterId ? getParameterAnomalies(selectedParameterId) : [];
  const histories = selectedParameterId ? getParameterHistories(selectedParameterId) : [];

  const hasManualChanges = histories.length > 0;

  const handleExportPDF = async () => {
    if (reportRef.current) {
      setIsExporting(true);
      try {
        const opt = {
          margin: 10,
          filename: '核磁信号参数报告.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        await html2pdf().set(opt).from(reportRef.current).save();
        message.success('PDF导出成功');
      } catch (error) {
        message.error('PDF导出失败');
      } finally {
        setIsExporting(false);
      }
    }
  };

  const artifactExplanation = (artifact: ArtifactType | undefined) => {
    const explanations: Record<string, string> = {
      motion: '运动伪影通常由患者在扫描过程中的身体移动引起，导致图像模糊。建议使用扫描序列或增加激励次数可以减少影响。',
      susceptibility: '磁敏感伪影由组织间磁化率差异导致，常见于空气-组织界面。可使用相位掩模或专用序列改善。',
      chemical_shift: '化学位移伪影由脂肪和水中质子的共振频率差异引起，表现为脂肪组织边缘信号异常。可使用脂肪抑制技术改善。',
      aliasing: '卷绕伪影由视野小于解剖区域导致，图像边缘出现折叠。扩大视野或使用并行采集技术可解决。',
      noise: '噪声伪影表现为图像颗粒感增加，信噪比下降。可通过增加扫描时间、提高场强或优化序列参数改善。',
      gradient_nonlinearity: '梯度非线性伪影导致图像几何畸变，尤其在边缘区域明显。可使用梯度非线性校正改善。',
      rf_feedthrough: 'RF馈通伪影表现为图像中心区域信号异常，由射频系统干扰导致。需检查射频线圈和系统校准。',
      none: '未检测到明显伪影，图像质量良好。',
    };
    return artifact ? explanations[artifact] || '伪影类型未定义' : '未设置伪影标签';
  };

  const formatQualityChange = (change: number | undefined) => {
    if (change === undefined) return <span className="text-slate-500">无变化</span>;
    if (change > 0) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendingUp className="w-4 h-4" />
          +{change}
        </span>
      );
    }
    if (change < 0) {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">报告导出</h1>
          <p className="text-slate-500 mt-1">
            生成完整的参数分析报告，包含人工修改影响和伪影解释
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            打印
          </Button>
          <Button
            type="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportPDF}
            loading={isExporting}
            disabled={!selectedParam}
          >
            导出PDF
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-slate-600 font-medium">选择参数：</span>
        <Select
          value={selectedParameterId}
          onChange={setSelectedParameter}
          style={{ width: 400 }}
          placeholder="请选择一个扫描参数生成报告"
          options={parameters.map((p) => ({
            label: `${p.id} - ${p.scanType}`,
            value: p.id,
          }))}
        />
      </div>

      {selectedParam && (
        <div className="flex gap-2">
          {hasManualChanges && (
            <Tag color="orange" icon={<ArrowLeftRight className="w-3 h-3" />}>
              包含人工修改
            </Tag>
          )}
          {anomalies.some((a) => a.status === 'pending') && (
            <Tag color="red" icon={<AlertTriangle className="w-3 h-3" />}>
              有待确认异常
            </Tag>
          )}
        </div>
      )}

      {selectedParam ? (
        <>
          <div ref={reportRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">核磁信号参数分析报告</h2>
                  <p className="text-blue-100 mt-1">NMR Signal Parameter Analysis Report</p>
                </div>
              </div>
              <div className="text-right text-sm text-blue-100">
                <p>生成时间：{new Date().toLocaleString()}</p>
                <p>参数ID：{selectedParam.id}</p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-500 rounded"></span>
                  一、基本参数信息
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">扫描类型</p>
                    <p className="text-lg font-semibold text-slate-800">{selectedParam.scanType}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">TR / TE</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {selectedParam.tr}ms / {selectedParam.te}ms
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">翻转角</p>
                    <p className="text-lg font-semibold text-slate-800">{selectedParam.flipAngle}°</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">层厚</p>
                    <p className="text-lg font-semibold text-slate-800">{selectedParam.sliceThickness || '-'}mm</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">组织类型</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {selectedParam.tissueType
                        ? TISSUE_TYPE_LABELS[selectedParam.tissueType]
                        : '未设置'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">伪影标签</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {selectedParam.artifactLabel
                        ? ARTIFACT_TYPE_LABELS[selectedParam.artifactLabel]
                        : '未设置'}
                    </p>
                  </div>
                </div>
              </section>

              <Divider />

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-green-500 rounded"></span>
                  二、接口计算结果对比
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-3 text-left text-sm font-semibold text-slate-600 border">指标</th>
                        {results.map((r) => (
                          <th
                            key={r.id}
                            className="p-3 text-center text-sm font-semibold text-slate-600 border"
                          >
                            {r.interfaceName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 text-sm text-slate-600 border">信噪比 (SNR)</td>
                        {results.map((r) => (
                          <td key={r.id} className="p-3 text-center text-sm border">
                            {r.resultData.snr?.toFixed(1)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 text-sm text-slate-600 border">对比度噪声比 (CNR)</td>
                        {results.map((r) => (
                          <td key={r.id} className="p-3 text-center text-sm border">
                            {r.resultData.cnr?.toFixed(1)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 text-sm text-slate-600 border">组织对比度</td>
                        {results.map((r) => (
                          <td key={r.id} className="p-3 text-center text-sm border">
                            {r.resultData.tissueContrast?.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 text-sm text-slate-600 border">扫描时间 (秒)</td>
                        {results.map((r) => (
                          <td key={r.id} className="p-3 text-center text-sm border">
                            {r.resultData.scanTime}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 text-sm text-slate-600 border">伪影概率</td>
                        {results.map((r) => (
                          <td key={r.id} className="p-3 text-center text-sm border">
                            {r.resultData.artifactProbability
                              ? `${(r.resultData.artifactProbability * 100).toFixed(1)}%`
                              : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 text-sm text-slate-600 border">质量分数</td>
                        {results.map((r) => (
                          <td key={r.id} className="p-3 text-center text-sm border">
                            <span
                              className={`font-semibold ${
                                r.resultData.qualityScore && r.resultData.qualityScore >= 80
                                  ? 'text-green-600'
                                  : r.resultData.qualityScore && r.resultData.qualityScore >= 60
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {r.resultData.qualityScore}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 text-sm text-slate-600 border">推荐状态</td>
                        {results.map((r) => (
                          <td key={r.id} className="p-3 text-center text-sm border">
                            <Tag color={r.resultData.recommended ? 'success' : 'error'}>
                              {r.resultData.recommended ? '推荐' : '不推荐'}
                            </Tag>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <Divider />

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-amber-500 rounded"></span>
                  三、伪影解释
                </h3>
                <div className="p-6 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800">
                        {selectedParam.artifactLabel
                          ? ARTIFACT_TYPE_LABELS[selectedParam.artifactLabel]
                          : '未检测'}
                      </p>
                      <p className="text-amber-700 mt-2">
                        {artifactExplanation(selectedParam.artifactLabel)}
                      </p>
                    </div>
                  </div>
                  {hasManualChanges && (
                    <div className="mt-4 p-3 bg-orange-100 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-800 font-medium">
                        ⚠️ 注意：此伪影解释基于人工修正后的组织类型重新生成。原始自动检测结果可能与最初自动检测结果存在差异。
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {anomalies.length > 0 && (
                <>
                  <Divider />

                  <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="w-1 h-6 bg-red-500 rounded"></span>
                      四、异常检测结果
                    </h3>
                    <div className="space-y-3">
                      {anomalies.map((a) => (
                        <div key={a.id} className="p-4 rounded-lg border">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                              style={{
                                backgroundColor:
                                  a.severity === 'high'
                                    ? '#EF4444'
                                    : a.severity === 'medium'
                                    ? '#F59E0B'
                                    : '#9CA3AF',
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-700">
                                  {ANOMALY_TYPE_LABELS[a.type]}
                                </span>
                                <Tag
                                  color={
                                    a.status === 'pending'
                                      ? 'warning'
                                      : a.status === 'confirmed'
                                      ? 'processing'
                                      : 'success'
                                  }
                                >
                                  {a.status === 'pending'
                                    ? '待确认'
                                    : a.status === 'confirmed'
                                    ? '已确认'
                                    : '已解决'}
                                </Tag>
                                <Tag
                                  color={
                                    a.severity === 'high'
                                      ? 'error'
                                      : a.severity === 'medium'
                                      ? 'warning'
                                      : 'default'
                                  }
                                >
                                  严重程度:{' '}
                                  {a.severity === 'high'
                                    ? '高'
                                    : a.severity === 'medium'
                                    ? '中'
                                    : '低'}
                                </Tag>
                              </div>
                              <p className="text-sm text-slate-600">
                                {a.description}
                              </p>
                              {a.handlerNote && (
                                <p className="text-sm text-slate-500 mt-2">
                                  <strong>处理说明:</strong> {a.handlerNote}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {hasManualChanges && (
                <>
                  <Divider />

                  <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="w-1 h-6 bg-purple-500 rounded"></span>
                      五、人工修改记录及影响分析
                    </h3>
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-purple-800">
                            修改影响说明
                          </p>
                          <p className="text-purple-700 text-sm mt-1">
                            以下记录显示了人工修改对伪影解释和推荐结果的影响。
                          </p>
                        </div>
                      </div>
                    </div>

                    <Timeline
                      items={histories
                        .sort((a, b) => b.version - a.version)
                        .map((h) => ({
                          children: (
                            <div className="pb-4">
                              <div className="flex items-center gap-3 mb-2">
                                <Tag color="purple">版本 {h.version}</Tag>
                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(h.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 mb-2">
                                <strong>修改人:</strong> {h.modifiedBy}
                              </p>
                              {h.changeReason && (
                                <p className="text-sm text-slate-600 mb-3">
                                  <strong>原因:</strong> {h.changeReason}
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
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                  <div className="p-3 bg-white rounded border">
                                    <p className="text-xs text-slate-500">
                                      伪影解释变化
                                    </p>
                                    <p className="text-sm mt-1">
                                      {h.impactAnalysis.artifactInterpretationChange ? (
                                        <span className="flex items-center gap-1 text-amber-600">
                                          <AlertTriangle className="w-4 h-4" />
                                          有变化
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-green-600">
                                          <CheckCircle className="w-4 h-4" />
                                          无变化
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-white rounded border">
                                    <p className="text-xs text-slate-500">
                                      质量分数变化
                                    </p>
                                    <p className="text-sm mt-1">
                                      {formatQualityChange(
                                        h.impactAnalysis.qualityScoreChange
                                      )}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-white rounded border">
                                    <p className="text-xs text-slate-500">
                                      推荐状态变化
                                    </p>
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
                  </section>
                </>
              )}

              <Divider />

              <section className="text-center text-slate-400 text-sm">
                <p>--- 报告结束 ---</p>
                <p className="mt-2">
                  本报告由核磁信号参数调试系统自动生成
                </p>
              </section>
            </div>
          </div>
        </>
      ) : (
        <Card className="text-center py-12">
          <p className="text-slate-500">
            请选择一个扫描参数生成报告
          </p>
        </Card>
      )}
    </div>
  );
};
