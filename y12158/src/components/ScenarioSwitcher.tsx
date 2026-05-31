import { CheckCircle, AlertTriangle, XCircle, Clock, Zap } from 'lucide-react';
import type { ScenarioType, ScenarioStats } from '../types';

interface ScenarioSwitcherProps {
  currentScenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
  stats: ScenarioStats;
  description: string;
}

const scenarios: { type: ScenarioType; name: string; icon: any; color: string }[] = [
  { type: 'normal', name: '正常运行', icon: CheckCircle, color: 'emerald' },
  { type: 'missing', name: '潮位缺测', icon: AlertTriangle, color: 'red' },
  { type: 'outage', name: '设备停机', icon: XCircle, color: 'orange' },
  { type: 'conflict', name: '检修冲突', icon: Clock, color: 'amber' },
];

export function ScenarioSwitcher({
  currentScenario,
  onScenarioChange,
  stats,
  description,
}: ScenarioSwitcherProps) {
  const getColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'emerald':
          return 'bg-emerald-500 text-white ring-2 ring-emerald-300';
        case 'red':
          return 'bg-red-500 text-white ring-2 ring-red-300';
        case 'orange':
          return 'bg-orange-500 text-white ring-2 ring-orange-300';
        case 'amber':
          return 'bg-amber-500 text-white ring-2 ring-amber-300';
        default:
          return 'bg-slate-500 text-white';
      }
    }
    return 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">演示场景</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {scenarios.map(({ type, name, icon: Icon, color }) => (
          <button
            key={type}
            onClick={() => onScenarioChange(type)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              getColorClasses(color, currentScenario === type)
            }`}
          >
            <Icon className="w-4 h-4" />
            {name}
          </button>
        ))}
      </div>

      <div className={`p-3 rounded-lg mb-4 ${
        currentScenario === 'normal' ? 'bg-emerald-50 border border-emerald-200' :
        currentScenario === 'missing' ? 'bg-red-50 border border-red-200' :
        currentScenario === 'outage' ? 'bg-orange-50 border border-orange-200' :
        'bg-amber-50 border border-amber-200'
      }`}>
        <p className={`text-sm font-medium ${
          currentScenario === 'normal' ? 'text-emerald-700' :
          currentScenario === 'missing' ? 'text-red-700' :
          currentScenario === 'outage' ? 'text-orange-700' :
          'text-amber-700'
        }`}>
          {description}
        </p>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          当日统计
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 mb-0.5">总发电量</div>
            <div className="text-lg font-bold text-blue-700">
              {stats.totalGeneration} <span className="text-xs font-normal">MWh</span>
            </div>
          </div>
          <div className="p-2 bg-emerald-50 rounded-lg">
            <div className="text-xs text-emerald-600 mb-0.5">预估收益</div>
            <div className="text-lg font-bold text-emerald-700">
              ¥{stats.totalRevenue.toLocaleString()}
            </div>
          </div>
          {stats.missingDataCount > 0 && (
            <div className="p-2 bg-red-50 rounded-lg">
              <div className="text-xs text-red-600 mb-0.5">缺测数据</div>
              <div className="text-lg font-bold text-red-700">
                {stats.missingDataCount} <span className="text-xs font-normal">条</span>
              </div>
            </div>
          )}
          {stats.outageHours > 0 && (
            <div className="p-2 bg-orange-50 rounded-lg">
              <div className="text-xs text-orange-600 mb-0.5">停机时长</div>
              <div className="text-lg font-bold text-orange-700">
                {stats.outageHours} <span className="text-xs font-normal">小时</span>
              </div>
            </div>
          )}
          {stats.conflictCount > 0 && (
            <div className="p-2 bg-amber-50 rounded-lg col-span-2">
              <div className="text-xs text-amber-600 mb-0.5">冲突/异常</div>
              <div className="text-lg font-bold text-amber-700">
                {stats.conflictCount} <span className="text-xs font-normal">处</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
