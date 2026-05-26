import React from 'react';
import { AlertTriangle, Thermometer, Droplet, XCircle, AlertCircle, Info } from 'lucide-react';
import { RiskEvent, RiskType, Severity } from '../../types';
import { RiskEngine } from '../../engine/RiskEngine';
import { ScoringEngine } from '../../engine/ScoringEngine';

interface RiskIndicatorProps {
  risks: RiskEvent[];
}

const riskTypeIcons: Record<RiskType, React.ElementType> = {
  [RiskType.INCOMPATIBLE_NEIGHBOR]: XCircle,
  [RiskType.TEMPERATURE_EXCEED]: Thermometer,
  [RiskType.HUMIDITY_EXCEED]: Droplet,
  [RiskType.INSUFFICIENT_DISTANCE]: AlertCircle,
  [RiskType.RESTRICTED_CATEGORY]: AlertTriangle
};

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({ risks }) => {
  const riskEngine = new RiskEngine([], { id: '', name: '', rows: 0, cols: 0, slots: [], baseTemperature: 0, baseHumidity: 0 });

  const criticalCount = risks.filter(r => r.severity === Severity.CRITICAL).length;
  const dangerCount = risks.filter(r => r.severity === Severity.DANGER).length;
  const warningCount = risks.filter(r => r.severity === Severity.WARNING).length;

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className={risks.length > 0 ? 'text-red-400' : 'text-green-400'} />
          <h3 className="text-lg font-semibold text-white">风险监控</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {criticalCount > 0 && (
            <span className="px-2 py-1 bg-red-600 text-white rounded text-xs">
              严重 {criticalCount}
            </span>
          )}
          {dangerCount > 0 && (
            <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs">
              危险 {dangerCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">
              警告 {warningCount}
            </span>
          )}
          {risks.length === 0 && (
            <span className="px-2 py-1 bg-green-500 text-white rounded text-xs">
              安全
            </span>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {risks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            <p>当前未检测到风险</p>
          </div>
        ) : (
          risks.map(risk => {
            const Icon = riskTypeIcons[risk.type] || AlertTriangle;
            const bgColor = risk.severity === Severity.CRITICAL 
              ? 'bg-red-900/30 border-red-500' 
              : risk.severity === Severity.DANGER 
                ? 'bg-orange-900/30 border-orange-500' 
                : 'bg-yellow-900/30 border-yellow-500';
            const iconColor = risk.severity === Severity.CRITICAL 
              ? 'text-red-400' 
              : risk.severity === Severity.DANGER 
                ? 'text-orange-400' 
                : 'text-yellow-400';

            return (
              <div
                key={risk.id}
                className={`p-3 rounded-lg border ${bgColor} transition-all`}
              >
                <div className="flex items-start gap-2">
                  <Icon size={16} className={`mt-0.5 ${iconColor} flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {riskEngine.getRiskTypeName(risk.type)}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded text-white`} 
                        style={{ backgroundColor: ScoringEngine.getSeverityColor(risk.severity) }}>
                        {ScoringEngine.getSeverityLabel(risk.severity)}
                      </span>
                      <span className="text-[10px] text-red-400">-{risk.penalty}分</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {risk.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
