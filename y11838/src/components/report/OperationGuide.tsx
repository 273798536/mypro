import { useGameStore } from '@/store/useGameStore';
import {
  AlertTriangle,
  User,
  FileText,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  DollarSign,
  HeartCrack,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const RISK_TYPE_CONFIG: Record<string, {
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
  lesson: string;
}> = {
  over_concentration: {
    icon: ShieldAlert,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    title: '单行业过重',
    lesson: '分散投资是降低风险的基本原则，单一行业仓位不宜超过30%',
  },
  missing_fee: {
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    title: '手续费漏算',
    lesson: '交易成本会显著影响长期收益，每次交易都要计入手续费',
  },
  panic_sell: {
    icon: HeartCrack,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    title: '恐慌卖出',
    lesson: '在市场下跌时盲目卖出往往错失反弹机会，应理性分析基本面',
  },
  chasing_rally: {
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    title: '追涨行为',
    lesson: '追涨容易买在高位，建议在回调时分批建仓而非追高',
  },
};

export default function OperationGuide() {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  const riskEvents = gameState.riskEvents;

  if (riskEvents.length === 0) {
    return (
      <div className="card p-6">
        <div className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            🎉 恭喜！无风险事件触发
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            你的投资决策非常稳健，成功规避了所有风险事件。
            继续保持理性投资，做好风险控制！
          </p>
        </div>
      </div>
    );
  }

  const groupedRisks = riskEvents.reduce((acc, event) => {
    if (!acc[event.type]) {
      acc[event.type] = [];
    }
    acc[event.type].push(event);
    return acc;
  }, {} as Record<string, typeof riskEvents>);

  const totalPenalty = riskEvents.reduce((sum, r) => sum + r.penalty, 0);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-primary-600 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-accent-warning" />
          风险事件追溯与操作指引
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-500">累计扣分</p>
          <p className="text-2xl font-mono font-bold text-accent-loss">
            -{totalPenalty} 分
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedRisks).map(([type, events], groupIdx) => {
          const config = RISK_TYPE_CONFIG[type];
          const IconComponent = config.icon;
          const totalTypePenalty = events.reduce((sum, e) => sum + e.penalty, 0);

          return (
            <div
              key={type}
              className={cn(
                'rounded-xl border-2 overflow-hidden animate-slide-up',
                config.bgColor,
                config.borderColor
              )}
              style={{ animationDelay: `${groupIdx * 0.1}s` }}
            >
              <div className="p-4 border-b border-white/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2.5 rounded-lg bg-white/60',
                        config.color
                      )}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h4
                        className={cn('text-lg font-bold', config.color)}
                      >
                        {config.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-0.5">
                        触发 {events.length} 次，累计扣除 {totalTypePenalty} 分
                      </p>
                    </div>
                  </div>
                  <span className="risk-badge bg-white/80 text-gray-700">
                    {events.length} 次
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-white/60 rounded-lg p-4">
                  <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    投教要点
                  </h5>
                  <p className="text-gray-700">{config.lesson}</p>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    触发记录与操作指引
                  </h5>
                  {events.map((event, idx) => (
                    <div
                      key={event.id}
                      className="bg-white/80 rounded-lg p-4 border border-gray-100 animate-slide-up"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-sm text-gray-500">
                            第 {event.round} 回合
                          </span>
                          <p className="text-gray-800 mt-0.5">{event.description}</p>
                        </div>
                        <span className="risk-badge bg-red-100 text-red-700">
                          -{event.penalty} 分
                        </span>
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-600">联系:</span>
                            <span className="font-medium text-blue-700">
                              {event.responsiblePerson}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-600">修改:</span>
                            <span className="font-medium text-blue-700">
                              {event.fixDocument}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100">
        <h5 className="font-bold text-primary-700 mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          下一步操作建议
        </h5>
        <ol className="space-y-2 text-sm text-gray-700">
          {Object.entries(groupedRisks).map(([type, events], idx) => {
            const config = RISK_TYPE_CONFIG[type];
            const firstEvent = events[0];
            return (
              <li key={type} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span>
                  联系 <strong>{firstEvent.responsiblePerson}</strong>，在{' '}
                  <strong>{firstEvent.fixDocument}</strong> 中修正「{config.title}」相关配置
                </span>
              </li>
            );
          })}
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">
              ✓
            </span>
            <span>
              更新完成后，重新运行游戏验证风险事件是否已被正确识别和提示
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
