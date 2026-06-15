import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { RiskMatrix } from '../components/RiskMatrix';
import { QualityCard } from '../components/QualityCard';
import { StatusBadge } from '../components/StatusBadge';
import { useRiskStore } from '../store/useRiskStore';
import { DataStatus } from '../types/common';
import { AlertTriangle, Play, ChevronRight, Info, Droplets, Thermometer, Activity, Gauge, Waves } from 'lucide-react';
import { getRiskLevelColor, getRiskGradientColor } from '../utils/color';
import { formatNumber, getRiskLevelLabel } from '../utils/format';

export const RiskAssessmentPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const {
    waterRecords,
    riskMatrix,
    assessmentResult,
    isLoading,
    loadWaterData,
    runAssessment,
  } = useRiskStore();

  useEffect(() => {
    if (taskId) {
      loadWaterData(taskId);
    }
  }, [taskId, loadWaterData]);

  const handleRunAssessment = () => {
    if (taskId) {
      runAssessment(taskId);
    }
  };

  const unitMismatchCount = waterRecords.filter(r => r.unitMismatch).length;
  const salinityIssues = waterRecords.filter(r => r.salinityStatus !== DataStatus.AVAILABLE).length;
  const phIssues = waterRecords.filter(r => r.phStatus !== DataStatus.AVAILABLE).length;
  const doIssues = waterRecords.filter(r => r.dissolvedOxygenStatus !== DataStatus.AVAILABLE).length;

  return (
    <AppLayout
      title="风险评估"
      subtitle="明珠海珍品 · 2026年6月巡检 · 水质与风险分层"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(`/tasks/${taskId}/tide`)}
            className="text-slate-500 hover:text-ocean-600 transition-colors text-sm flex items-center gap-1"
          >
            ← 返回潮汐计算
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 text-sm">风险评估</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <QualityCard
            title="综合风险评分"
            value={assessmentResult?.overallRiskScore || 0}
            unit="/100"
            description="基于潮汐、盐度、pH、溶解氧、水温5个维度加权计算"
            type="score"
            delay={0}
          />
          <QualityCard
            title="盐度异常"
            value={salinityIssues}
            unit="处"
            description="盐度超出正常范围或单位不明确的记录"
            type="unit"
            delay={100}
          />
          <QualityCard
            title="pH异常"
            value={phIssues}
            unit="处"
            description="pH值超出养殖适宜范围（7.5-8.5）的记录"
            type="range"
            delay={200}
          />
          <QualityCard
            title="溶解氧偏低"
            value={doIssues}
            unit="处"
            description="溶解氧低于5mg/L，可能影响贝类存活"
            type="null"
            delay={300}
          />
          <QualityCard
            title="单位混用"
            value={unitMismatchCount}
            unit="处"
            description="盐度单位混用（PSU、‰、ppt），已统一转换"
            type="unit"
            delay={400}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleRunAssessment}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
          >
            <Play className="w-4 h-4" />
            {assessmentResult ? '重新评估' : '运行风险评估'}
          </button>

          {assessmentResult && (
            <span
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${getRiskLevelColor(assessmentResult.overallRiskLevel)}`}
            >
              <Activity className="w-4 h-4 inline mr-1.5" />
              风险等级：{getRiskLevelLabel(assessmentResult.overallRiskLevel)}
            </span>
          )}
        </div>

        {assessmentResult && (
          <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-ocean-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-ocean-800">
                  <span className="font-medium">评估说明：</span>
                  {assessmentResult.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {assessmentResult && assessmentResult.factors && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessmentResult.factors.map((factor, index) => (
              <div
                key={factor.id}
                className="bg-white rounded-xl border border-slate-200 p-5 opacity-0 animate-fade-in-up hover:shadow-md transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${getRiskGradientColor(factor.riskScore)}20` }}
                    >
                      {factor.name.includes('潮汐') && <Waves className="w-5 h-5" style={{ color: getRiskGradientColor(factor.riskScore) }} />}
                      {factor.name.includes('盐度') && <Droplets className="w-5 h-5" style={{ color: getRiskGradientColor(factor.riskScore) }} />}
                      {factor.name.includes('水温') && <Thermometer className="w-5 h-5" style={{ color: getRiskGradientColor(factor.riskScore) }} />}
                      {factor.name.includes('溶解氧') && <Gauge className="w-5 h-5" style={{ color: getRiskGradientColor(factor.riskScore) }} />}
                      {factor.name.includes('pH') && <Activity className="w-5 h-5" style={{ color: getRiskGradientColor(factor.riskScore) }} />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{factor.name}</h4>
                      <p className="text-xs text-slate-500">权重 {factor.weight * 100}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-2xl font-bold font-mono"
                      style={{ color: getRiskGradientColor(factor.riskScore) }}
                    >
                      {formatNumber(factor.riskScore, 1)}
                    </div>
                    <p className="text-xs text-slate-500">风险评分</p>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${factor.riskScore}%`,
                      backgroundColor: getRiskGradientColor(factor.riskScore),
                    }}
                  />
                </div>

                <p className="text-sm text-slate-600 mb-2">{factor.explanation}</p>
                <p className="text-xs text-ocean-600">
                  <span className="font-medium">建议：</span>
                  {factor.suggestion}
                </p>
              </div>
            ))}
          </div>
        )}

        <RiskMatrix
          matrix={riskMatrix}
          title="风险矩阵热力图"
          explanation="横轴为影响程度，纵轴为发生可能性。单元格颜色越深、数字越大，表示该风险等级的记录越多。"
        />

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">水质记录详情</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">共 {waterRecords.length} 条记录</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-700">点位</th>
                  <th className="p-3 text-left font-semibold text-slate-700">时间</th>
                  <th className="p-3 text-left font-semibold text-slate-700">盐度</th>
                  <th className="p-3 text-left font-semibold text-slate-700">pH</th>
                  <th className="p-3 text-left font-semibold text-slate-700">溶解氧</th>
                  <th className="p-3 text-left font-semibold text-slate-700">水温</th>
                  <th className="p-3 text-left font-semibold text-slate-700">状态</th>
                  <th className="p-3 text-left font-semibold text-slate-700">说明</th>
                </tr>
              </thead>
              <tbody>
                {waterRecords.map((record, index) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-medium">{record.pointId}</td>
                    <td className="p-3 text-slate-600">{record.recordTime.toLocaleString('zh-CN')}</td>
                    <td className="p-3">
                      <span className={`font-mono ${record.salinityStatus !== DataStatus.AVAILABLE ? 'text-status-review' : ''}`}>
                        {record.salinity !== null ? record.salinity.toFixed(1) : '—'}
                      </span>
                      {record.unitMismatch && (
                        <span className="ml-1 text-xs text-status-pending">⚠️ 单位混用</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`font-mono ${record.phStatus !== DataStatus.AVAILABLE ? 'text-status-review' : ''}`}>
                        {record.ph !== null ? record.ph.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`font-mono ${record.dissolvedOxygenStatus !== DataStatus.AVAILABLE ? 'text-status-recollect' : ''}`}>
                        {record.dissolvedOxygen !== null ? record.dissolvedOxygen.toFixed(1) : '—'} mg/L
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`font-mono ${record.temperatureStatus !== DataStatus.AVAILABLE ? 'text-status-pending' : ''}`}>
                        {record.temperature !== null ? record.temperature.toFixed(1) : '—'}°C
                      </span>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={record.overallStatus} size="sm" />
                    </td>
                    <td className="p-3 max-w-xs">
                      {record.qualityIssues && record.qualityIssues.length > 0 ? (
                        <div className="text-xs text-slate-500">
                          {record.qualityIssues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-status-pending" />
                              <span>{issue.description}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">正常</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={() => navigate(`/tasks/${taskId}/review`)}
            className="flex items-center gap-2 px-6 py-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-all shadow-sm hover:shadow-md"
          >
            下一步：复核工作台
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
};
