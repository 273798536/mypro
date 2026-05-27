import React from 'react';
import { RiskWarning } from '../../types/game.types';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

interface RiskDashboardProps {
  riskBudget: number;
  riskUsed: number;
  warnings: RiskWarning[];
}

const RiskDashboard: React.FC<RiskDashboardProps> = ({
  riskBudget,
  riskUsed,
  warnings,
}) => {
  const riskPercentage = Math.min((riskUsed / riskBudget) * 100, 100);
  const isOverBudget = riskUsed > riskBudget;
  
  const getRiskColor = () => {
    if (riskPercentage < 50) return 'text-green-400';
    if (riskPercentage < 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskBgColor = () => {
    if (riskPercentage < 50) return 'from-green-500 to-emerald-400';
    if (riskPercentage < 75) return 'from-yellow-500 to-orange-400';
    return 'from-red-500 to-rose-400';
  };

  const getWarningIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getWarningBg = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  const getWarningTypeText = (type: string) => {
    switch (type) {
      case 'concentration':
        return '集中度风险';
      case 'chasing':
        return '追涨杀跌';
      case 'fee_erosion':
        return '手续费侵蚀';
      case 'leverage':
        return '杠杆风险';
      default:
        return '风险提示';
    }
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (riskPercentage / 100) * circumference;

  return (
    <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold text-white">风险仪表盘</h3>
      </div>

      <div className="flex items-center gap-6 mb-5">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="45"
              fill="none"
              stroke="#334155"
              strokeWidth="8"
            />
            <circle
              cx="56"
              cy="56"
              r="45"
              fill="none"
              stroke="url(#riskGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={riskPercentage < 50 ? '#10B981' : riskPercentage < 75 ? '#F59E0B' : '#EF4444'} />
                <stop offset="100%" stopColor={riskPercentage < 50 ? '#34D399' : riskPercentage < 75 ? '#FB923C' : '#F87171'} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold font-mono ${getRiskColor()}`}>
              {riskPercentage.toFixed(0)}%
            </span>
            <span className="text-xs text-slate-400">风险使用</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">风险预算</span>
              <span className="text-white font-mono">{riskBudget}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${getRiskBgColor()} transition-all duration-500`}
                style={{ width: `${riskPercentage}%` }}
              />
            </div>
          </div>
          <div className={`text-sm ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
            {isOverBudget ? '⚠️ 已超风险预算' : '✓ 风险控制良好'}
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium">风险预警</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {warnings.slice(-5).reverse().map((warning) => (
              <div
                key={warning.id}
                className={`p-3 rounded-lg border ${getWarningBg(warning.severity)}`}
              >
                <div className="flex items-start gap-2">
                  {getWarningIcon(warning.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-300">
                        {getWarningTypeText(warning.type)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        warning.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        warning.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {warning.severity === 'high' ? '高' : warning.severity === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{warning.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length === 0 && (
        <div className="text-center py-6 text-slate-500">
          <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无风险预警</p>
        </div>
      )}
    </div>
  );
};

export default RiskDashboard;
