import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { AlertTriangle, X, ChevronDown, ChevronUp, User, FileText, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

const RISK_TYPE_LABELS: Record<string, string> = {
  over_concentration: '单行业过重',
  missing_fee: '手续费漏算',
  panic_sell: '恐慌卖出',
  chasing_rally: '追涨行为',
};

const RISK_TYPE_COLORS: Record<string, string> = {
  over_concentration: 'from-orange-500 to-red-500',
  missing_fee: 'from-yellow-500 to-amber-500',
  panic_sell: 'from-red-500 to-rose-500',
  chasing_rally: 'from-purple-500 to-pink-500',
};

export default function RiskAlert() {
  const { gameState, industryCards } = useGameStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!gameState || gameState.riskEvents.length === 0) {
    return null;
  }

  const latestRiskEvents = gameState.riskEvents.slice(-3).reverse();

  return (
    <div className="space-y-3 animate-slide-down">
      {latestRiskEvents.map((event, idx) => {
        const industry = industryCards.find(
          (c) =>
            c.id ===
            gameState.decisions.find((d) => d.id === event.id)?.industryCardId
        );
        const isExpanded = expandedId === event.id;

        return (
          <div
            key={event.id}
            className={cn(
              'card border-l-4 border-red-500 animate-risk-pulse overflow-hidden',
              idx === 0 && 'animate-pulse-slow'
            )}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div
              className="p-4 cursor-pointer hover:bg-red-50/50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : event.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg bg-gradient-to-br text-white',
                      RISK_TYPE_COLORS[event.type]
                    )}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-800">
                        {RISK_TYPE_LABELS[event.type]}
                      </h4>
                      <span className="risk-badge bg-red-100 text-red-700">
                        -{event.penalty} 分
                      </span>
                      <span className="text-xs text-gray-500">
                        第 {event.round} 回合
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 animate-slide-down">
                <div className="h-px bg-gray-200" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <User className="w-4 h-4" />
                      负责人
                    </div>
                    <p className="font-medium text-gray-800">
                      {event.responsiblePerson}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <FileText className="w-4 h-4" />
                      需修改文档
                    </div>
                    <p className="font-medium text-gray-800">{event.fixDocument}</p>
                  </div>
                </div>

                <div className="p-3 bg-primary-50 rounded-lg border border-primary-100">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-primary-700">
                        后续操作指引
                      </p>
                      <p className="text-sm text-primary-600 mt-1">
                        请联系 {event.responsiblePerson}，在「{event.fixDocument}」中修正相关配置，避免此类风险事件在实际投资中发生。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
