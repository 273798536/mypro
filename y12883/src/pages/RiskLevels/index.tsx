import {
  AlertTriangle,
  Shield,
  AlertCircle,
  ChevronRight,
  Database,
  Calculator,
  Info,
  Waves,
  Wind,
  Eye,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import { calculationFormulaInfo } from '@/utils/calculator';
import { SAFETY_LEVEL_LABELS } from '@/types';

export default function RiskLevelsPage() {
  const { buoyData, windWindowResults, isFirstVisit } = useAppStore();

  if (isFirstVisit) return null;

  const availableCount = buoyData.filter((d) => d.status === 'available').length;
  const pendingCount = buoyData.filter((d) => d.status === 'pending').length;
  const recollectCount = buoyData.filter((d) => d.status === 'recollect').length;

  const riskLevels = [
    {
      level: 'safe' as const,
      label: '安全',
      color: 'emerald',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400',
      description: '海况良好，可正常进行船员换班作业',
      criteria: [
        '风速 ≤ 8.0 m/s（5级风以下）',
        '浪高 ≤ 1.0 m',
        '能见度 ≥ 2000 m',
        '无雷暴、大雾等恶劣天气预警',
      ],
      recommendations: [
        '可按计划正常换班',
        '保持常规安全措施',
        '建议每2小时复核一次海况',
      ],
    },
    {
      level: 'caution' as const,
      label: '注意',
      color: 'amber',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-400',
      description: '海况基本满足要求，需谨慎作业，建议加强安全措施',
      criteria: [
        '风速 8.0 ~ 10.8 m/s（5-6级风）',
        '浪高 1.0 ~ 1.5 m',
        '能见度 1000 ~ 2000 m',
        '无强对流天气预警',
      ],
      recommendations: [
        '可进行换班作业，需加倍小心',
        '增加船员安全防护装备',
        '安排经验丰富的船员操作',
        '作业期间全程监控海况变化',
      ],
    },
    {
      level: 'danger' as const,
      label: '危险',
      color: 'red',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      description: '海况恶劣，不建议进行换班作业，应择期进行',
      criteria: [
        '风速 > 10.8 m/s（6级风以上）',
        '浪高 > 1.5 m',
        '能见度 < 1000 m',
        '有台风、雷暴、大雾等预警',
      ],
      recommendations: [
        '建议推迟换班计划',
        '等待海况好转后再作业',
        '如必须作业需经安全评估并升级安全等级',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display mb-1">风险分层说明</h1>
          <p className="text-gray-400 text-sm">月底/课前查看，风险等级解释与数据依据</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {riskLevels.map((level, index) => {
          const Icon = level.level === 'safe' ? Shield : level.level === 'caution' ? AlertCircle : AlertTriangle;
          return (
            <div
              key={level.level}
              className={`relative overflow-hidden rounded-2xl border ${level.borderColor} ${level.bgColor} p-6
                         transition-all duration-300 hover:shadow-lg`}
              style={{
                opacity: 0,
                animation: `fadeInUp 0.5s ease-out ${index * 100}ms forwards`,
              }}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${level.color}-500 to-transparent`} />
              
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${level.bgColor}`}>
                  <Icon size={28} className={level.textColor} />
                </div>
                <StatusBadge type="safety" status={level.level} />
              </div>

              <h3 className={`text-xl font-bold font-display ${level.textColor} mb-2`}>
                {level.label}等级
              </h3>
              <p className="text-sm text-gray-400 mb-4">{level.description}</p>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <Calculator size={12} />
                    判定标准
                  </h4>
                  <ul className="space-y-1.5">
                    {level.criteria.map((c, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-${level.color}-500`} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <Shield size={12} />
                    作业建议
                  </h4>
                  <ul className="space-y-1.5">
                    {level.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                        <ChevronRight size={12} className={`mt-0.5 flex-shrink-0 ${level.textColor}`} />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-xl border border-white/10 bg-white/5 p-6"
          style={{ opacity: 0, animation: 'fadeInUp 0.5s ease-out 0.3s forwards' }}
        >
          <h3 className="text-lg font-semibold text-white font-display mb-4 flex items-center gap-2">
            <Database size={20} className="text-ocean-400" />
            数据依据说明
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Wind size={18} className="text-ocean-400" />
                <span className="text-sm font-medium text-white">风速数据</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1 ml-7">
                <li>• 数据来源：浮标自动采集 + 人工校验</li>
                <li>• 采集频率：每3小时一次</li>
                <li>• 测量精度：±0.1 m/s</li>
                <li>• 数据状态：{availableCount} 条可用 / {pendingCount} 条暂缓 / {recollectCount} 条需重采</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Waves size={18} className="text-ocean-400" />
                <span className="text-sm font-medium text-white">浪高数据</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1 ml-7">
                <li>• 数据来源：波浪传感器实时测量</li>
                <li>• 有效波高（H1/3）统计</li>
                <li>• 测量精度：±0.1 m</li>
                <li>• 同步测量浪周期数据</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Eye size={18} className="text-ocean-400" />
                <span className="text-sm font-medium text-white">能见度数据</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1 ml-7">
                <li>• 数据来源：能见度仪 + 人工观测校准</li>
                <li>• 测量范围：10m ~ 20000m</li>
                <li>• 大雾预警阈值：1000m</li>
                <li>• 人工修正需留痕记录</li>
              </ul>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl border border-white/10 bg-white/5 p-6"
          style={{ opacity: 0, animation: 'fadeInUp 0.5s ease-out 0.4s forwards' }}
        >
          <h3 className="text-lg font-semibold text-white font-display mb-4 flex items-center gap-2">
            <Info size={20} className="text-ocean-400" />
            计算公式说明
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-deep-700/50 border border-white/10">
              <p className="text-xs text-gray-500 mb-2">综合安全指数</p>
              <p className="text-sm text-ocean-300 font-mono">
                {calculationFormulaInfo.formula}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">权重分配</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">风速权重</span>
                    <span className="text-white">40%</span>
                  </div>
                  <div className="h-2 rounded-full bg-deep-700 overflow-hidden">
                    <div className="h-full w-2/5 bg-ocean-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">浪高权重</span>
                    <span className="text-white">40%</span>
                  </div>
                  <div className="h-2 rounded-full bg-deep-700 overflow-hidden">
                    <div className="h-full w-2/5 bg-ocean-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">能见度权重</span>
                    <span className="text-white">20%</span>
                  </div>
                  <div className="h-2 rounded-full bg-deep-700 overflow-hidden">
                    <div className="h-full w-1/5 bg-ocean-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">等级划分</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-lg font-bold text-emerald-400">≤40%</p>
                  <p className="text-xs text-emerald-300/70">安全</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                  <p className="text-lg font-bold text-amber-400">40-70%</p>
                  <p className="text-xs text-amber-300/70">注意</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                  <p className="text-lg font-bold text-red-400">{'＞70%'}</p>
                  <p className="text-xs text-red-300/70">危险</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border border-white/10 bg-white/5 p-6"
        style={{ opacity: 0, animation: 'fadeInUp 0.5s ease-out 0.5s forwards' }}
      >
        <h3 className="text-lg font-semibold text-white font-display mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-ocean-400" />
          适用范围与限制
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
              ✓ 适用情况
            </h4>
            <ul className="space-y-2">
              {calculationFormulaInfo.scope.map((item, i) => (
                <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-2 bg-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
              ✗ 不适用情况
            </h4>
            <ul className="space-y-2">
              {calculationFormulaInfo.limitations.map((item, i) => (
                <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-2 bg-red-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
