import { useState } from 'react';
import { AlertTriangle, Moon, Layers, Calculator, ChevronDown, ChevronUp, Lightbulb, Target } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getRiskColor, getRiskBorderColor, getSeverityColor, getSeverityLabel } from '../../utils/riskAnalysis';
import { RiskItem } from '../../types';

export function RisksPanel() {
  const { risks, currentPeriod } = useGameStore();
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const nightRisks = risks.filter((r) => r.type === 'night_threshold');
  const overlapRisks = risks.filter((r) => r.type === 'source_overlap');
  const decibelRisks = risks.filter((r) => r.type === 'decibel_error');

  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'night_threshold':
        return <Moon size={18} className="text-warning-night" />;
      case 'source_overlap':
        return <Layers size={18} className="text-warning-overlap" />;
      case 'decibel_error':
        return <Calculator size={18} className="text-warning-decibel" />;
      default:
        return <AlertTriangle size={18} />;
    }
  };

  const getRiskTypeLabel = (type: string) => {
    switch (type) {
      case 'night_threshold':
        return '夜间阈值';
      case 'source_overlap':
        return '声源重叠';
      case 'decibel_error':
        return '分贝计算';
      default:
        return '风险';
    }
  };

  const RiskCard = ({ risk }: { risk: RiskItem }) => (
    <div
      className={`border-l-4 ${getRiskBorderColor(risk.type)} bg-white rounded-r-lg shadow-sm overflow-hidden`}
    >
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
      >
        <div className="flex items-center gap-3">
          {getRiskIcon(risk.type)}
          <div>
            <h4 className="font-semibold text-gray-800 text-sm">{risk.title}</h4>
            <p className="text-xs text-gray-500">{risk.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(risk.severity)}`}>
            {getSeverityLabel(risk.severity)}
          </span>
          {expandedRisk === risk.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expandedRisk === risk.id && (
        <div className="px-3 pb-3 border-t">
          <div className="mt-3 space-y-3">
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Target size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-orange-800 text-sm">原因分析</p>
                  <p className="text-orange-700 text-xs mt-1 whitespace-pre-line">{risk.cause}</p>
                </div>
              </div>
            </div>

            <div className="bg-eco-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-eco-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-eco-800 text-sm">处理建议</p>
                  <p className="text-eco-700 text-xs mt-1 whitespace-pre-line">{risk.suggestion}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              触发于第 {risk.triggeredAt} 回合
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">⚠️ 风险分析</h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning-night"></span>
            <span className="text-gray-600">夜间阈值</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning-overlap"></span>
            <span className="text-gray-600">声源重叠</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning-decibel"></span>
            <span className="text-gray-600">分贝误区</span>
          </div>
        </div>
      </div>

      {currentPeriod === 'night' && nightRisks.length === 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Moon size={16} className="text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">夜间模式已激活</p>
              <p className="text-xs text-blue-600">
                当前所有区域噪声均在夜间阈值内，继续保持！
              </p>
            </div>
          </div>
        </div>
      )}

      {risks.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-gray-600">当前无风险警报</p>
          <p className="text-sm text-gray-400 mt-1">声环境状态良好</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {nightRisks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                <Moon size={14} className="text-warning-night" />
                夜间阈值风险 ({nightRisks.length})
              </h4>
              <div className="space-y-2">
                {nightRisks.map((risk) => (
                  <RiskCard key={risk.id} risk={risk} />
                ))}
              </div>
            </div>
          )}

          {overlapRisks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                <Layers size={14} className="text-warning-overlap" />
                声源重叠风险 ({overlapRisks.length})
              </h4>
              <div className="space-y-2">
                {overlapRisks.map((risk) => (
                  <RiskCard key={risk.id} risk={risk} />
                ))}
              </div>
            </div>
          )}

          {decibelRisks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                <Calculator size={14} className="text-warning-decibel" />
                分贝计算误区 ({decibelRisks.length})
              </h4>
              <div className="space-y-2">
                {decibelRisks.map((risk) => (
                  <RiskCard key={risk.id} risk={risk} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          💡 学习要点：分贝是对数单位，不能直接相加。夜间阈值比白天更严格，居民区对噪声最敏感。
        </p>
      </div>
    </div>
  );
}
