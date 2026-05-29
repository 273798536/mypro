import { useGameStore } from '@/store/useGameStore';
import { Newspaper, TrendingUp, TrendingDown, Minus, Clock, BookOpen, Tag } from 'lucide-react';
import { cn } from '@/utils/cn';

const IMPACT_COLORS = {
  positive: 'border-l-green-500 bg-green-50',
  negative: 'border-l-red-500 bg-red-50',
  neutral: 'border-l-gray-400 bg-gray-50',
};

const IMPACT_ICONS = {
  positive: <TrendingUp className="w-5 h-5 text-green-500" />,
  negative: <TrendingDown className="w-5 h-5 text-red-500" />,
  neutral: <Minus className="w-5 h-5 text-gray-500" />,
};

const IMPACT_LABELS = {
  positive: '利好',
  negative: '利空',
  neutral: '中性',
};

const IMPACT_BADGE_COLORS = {
  positive: 'bg-green-100 text-green-700',
  negative: 'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-700',
};

export default function NewsPanel() {
  const { getCurrentNews, getIndustryById, gameState } = useGameStore();
  const news = getCurrentNews();
  const industry = news ? getIndustryById(news.industryCardId) : null;

  if (!gameState) return null;

  if (!news) {
    return (
      <div className="card p-6 text-center py-12">
        <Newspaper className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">第 {gameState.currentRound} 回合暂无新闻</p>
        <p className="text-sm text-gray-400 mt-2">请直接进入下一回合</p>
      </div>
    );
  }

  const magnitudePercent = (news.impactMagnitude * 100).toFixed(1);
  const isSignificant = Math.abs(news.impactMagnitude) >= 0.05;

  return (
    <div
      className={cn(
        'card p-6 border-l-4 animate-slide-up',
        IMPACT_COLORS[news.impactType]
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              news.impactType === 'positive'
                ? 'bg-green-100'
                : news.impactType === 'negative'
                ? 'bg-red-100'
                : 'bg-gray-100'
            )}
          >
            {IMPACT_ICONS[news.impactType]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-800">{news.title}</h3>
              <span className={cn('risk-badge', IMPACT_BADGE_COLORS[news.impactType])}>
                {IMPACT_LABELS[news.impactType]}
              </span>
              {isSignificant && (
                <span className="risk-badge bg-amber-100 text-amber-700 animate-pulse-slow">
                  重要新闻
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                第 {news.round} 回合
              </span>
              {news.source && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {news.source}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">预计影响</p>
          <p
            className={cn(
              'text-2xl font-mono font-bold',
              news.impactType === 'positive'
                ? 'text-accent-profit'
                : news.impactType === 'negative'
                ? 'text-accent-loss'
                : 'text-gray-600'
            )}
          >
            {news.impactMagnitude >= 0 ? '+' : ''}
            {magnitudePercent}%
          </p>
        </div>
      </div>

      <div className="bg-white/50 rounded-lg p-4 mb-4">
        <p className="text-gray-700 leading-relaxed">{news.content}</p>
      </div>

      {industry && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm">
            <Tag className="w-4 h-4 text-primary-500" />
            <span className="text-gray-600">关联行业:</span>
            <span className="font-medium text-primary-600">{industry.name}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm">
            <span className="text-gray-600">板块:</span>
            <span className="font-medium text-gray-800">{industry.sector}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm">
            <span className="text-gray-600">风险等级:</span>
            <span
              className={cn(
                'font-medium',
                industry.riskLevel === 'low'
                  ? 'text-green-600'
                  : industry.riskLevel === 'medium'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              )}
            >
              {industry.riskLevel === 'low'
                ? '低风险'
                : industry.riskLevel === 'medium'
                ? '中风险'
                : '高风险'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm">
            <span className="text-gray-600">预期收益:</span>
            <span className="font-mono font-medium text-accent-profit">
              +{(industry.expectedReturn * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
        <p className="text-sm text-primary-700">
          💡 <span className="font-medium">决策提示:</span>{' '}
          {news.impactType === 'positive'
            ? '利好消息可能推动行业上涨，但追涨需警惕回调风险。'
            : news.impactType === 'negative'
            ? '利空消息可能导致行业下跌，恐慌卖出可能错过反弹机会。'
            : '中性消息对市场影响有限，可考虑持有观望。'}
        </p>
      </div>
    </div>
  );
}
