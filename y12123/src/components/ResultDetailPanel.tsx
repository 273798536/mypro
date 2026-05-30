import { useState } from 'react';
import { FileText, Ruler, Target, AlertCircle, Lightbulb, ChevronDown, ChevronUp, Clock, Hash, CheckCircle } from 'lucide-react';
import type { CalculationResult, DataAnomaly } from '../types';
import { ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS } from '../types';
import { AnomalyCard } from './AnomalyCard';

interface ResultDetailPanelProps {
  result: CalculationResult | null;
}

export function ResultDetailPanel({ result }: ResultDetailPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    unit: true,
    scope: true,
    failures: false,
    anomalies: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!result) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-800">计算结果详情</h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          暂无计算结果
        </div>
      </div>
    );
  }

  const { metadata, anomalies } = result;

  const anomalyTypeCounts = anomalies.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const SectionHeader = ({
    icon: Icon,
    title,
    section,
    badge,
  }: {
    icon: any;
    title: string;
    section: string;
    badge?: string | number;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <Icon className="w-4 h-4 text-slate-600" />
      <span className="text-sm font-medium text-gray-800">{title}</span>
      {badge !== undefined && (
        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
          {badge}
        </span>
      )}
      <div className="ml-auto">
        {expandedSections[section] ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">计算结果详情</h3>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <Hash className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-blue-700">{metadata.totalMembers}</div>
          <div className="text-xs text-blue-600">分析会员数</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-emerald-700">{metadata.validTransitions}</div>
          <div className="text-xs text-emerald-600">有效转移</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-amber-700">{metadata.invalidTransitions}</div>
          <div className="text-xs text-amber-600">异常转移</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <Clock className="w-5 h-5 text-slate-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-slate-700">{metadata.calculationTime.toFixed(0)}ms</div>
          <div className="text-xs text-slate-600">计算耗时</div>
        </div>
      </div>

      <div className="space-y-1">
        <SectionHeader icon={Ruler} title="计算单位" section="unit" />
        {expandedSections.unit && (
          <div className="px-3 pb-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">单位说明</span>
              </div>
              <p className="text-sm text-blue-700">
                <strong>流失概率：</strong>{metadata.unit}，表示会员在未来30天内从当前状态转移到"流失"状态的概率
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>优先级分数：</strong>0-100分，综合考虑流失概率、会员价值和任期，分数越高召回优先级越高
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>转移概率：</strong>{metadata.unit}，表示从一个状态转移到另一个状态的概率
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>置信度：</strong>{(metadata.confidenceLevel * 100).toFixed(0)}%，基于样本量和冷启动情况计算
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>迭代次数：</strong>{metadata.iterationCount}次，Markov链收敛迭代次数
              </p>
            </div>
          </div>
        )}

        <SectionHeader icon={Target} title="适用范围" section="scope" />
        {expandedSections.scope && (
          <div className="px-3 pb-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">适用范围说明</span>
              </div>
              <p className="text-sm text-emerald-700 whitespace-pre-line">
                {metadata.applicableScope}
              </p>
              {metadata.coldStartApplied && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-xs text-amber-700">
                    <Lightbulb className="w-3.5 h-3.5 inline mr-1" />
                    注意：由于样本量不足，已应用冷启动修正，结果仅供参考
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <SectionHeader
          icon={AlertCircle}
          title="失败原因"
          section="failures"
          badge={metadata.failureReasons.length}
        />
        {expandedSections.failures && (
          <div className="px-3 pb-3">
            {metadata.failureReasons.length > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <ul className="space-y-2">
                  {metadata.failureReasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-sm text-gray-500">
                无失败原因，计算过程正常
              </div>
            )}
          </div>
        )}

        <SectionHeader
          icon={Lightbulb}
          title="数据异常与修正建议"
          section="anomalies"
          badge={anomalies.length}
        />
        {expandedSections.anomalies && (
          <div className="px-3 pb-3">
            {anomalies.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(anomalyTypeCounts).map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${ANOMALY_TYPE_COLORS[type as keyof typeof ANOMALY_TYPE_COLORS]}20`,
                        color: ANOMALY_TYPE_COLORS[type as keyof typeof ANOMALY_TYPE_COLORS],
                      }}
                    >
                      {ANOMALY_TYPE_LABELS[type as keyof typeof ANOMALY_TYPE_LABELS]}: {count}条
                    </span>
                  ))}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {anomalies.map((anomaly, idx) => (
                    <AnomalyCard key={idx} anomaly={anomaly} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-sm text-gray-500">
                数据质量良好，未发现异常
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
